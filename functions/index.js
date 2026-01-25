const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {onCall} = require("firebase-functions/v2/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {defineSecret} = require("firebase-functions/params");
const admin = require("firebase-admin");
const twilio = require("twilio");
const crypto = require("crypto");
const vision = require('@google-cloud/vision');
const {HttpsError} = require("firebase-functions/v2/https");

admin.initializeApp();

const twilioSid = defineSecret("TWILIO_ACCOUNT_SID");
const twilioToken = defineSecret("TWILIO_AUTH_TOKEN");
const twilioPhone = defineSecret("TWILIO_PHONE_NUMBER");
const twilioMessagingServiceSid = defineSecret("TWILIO_MESSAGING_SERVICE_SID");

/**
 * Formats a phone number to E.164 format for Twilio
 * @param {string} phone - Phone number (10 digits or already formatted)
 * @return {string} - Formatted phone number with +1 prefix
 */
function formatPhoneForTwilio(phone) {
  if (!phone) return null;
  const cleaned = phone.replace(/\D/g, "");
  return phone.startsWith("+") ? phone : `+1${cleaned}`;
}

/**
 * Helper function to delete user's Firestore data
 */
async function deleteUserData(db, userId) {
  const batch = db.batch();
  
  // Timecards
  const timecards = await db.collection('timecardEntries')
    .where('userId', '==', userId)
    .get();
  timecards.docs.forEach(doc => batch.delete(doc.ref));
  
  // Employees
  const employees = await db.collection('employees')
    .where('userId', '==', userId)
    .get();
  employees.docs.forEach(doc => batch.delete(doc.ref));
  
  await batch.commit();
}

/**
 * Helper function to check if anonymous user should be deleted
 */
async function shouldDeleteAnonymousUser(db, userId) {
  // Don't delete if they have an active shift
  const activeShift = await db.collection('timecardEntries')
    .where('userId', '==', userId)
    .where('clockOut', '==', null)
    .limit(1)
    .get();
  
  if (!activeShift.empty) {
    console.log(`Keeping ${userId} - has active shift`);
    return false;
  }
  
  // Don't delete if they're associated with a worker record
  const worker = await db.collection('workers')
    .where('userId', '==', userId)
    .limit(1)
    .get();
  
  if (!worker.empty) {
    console.log(`Keeping ${userId} - linked to worker`);
    return false;
  }
  
  return true;
}

// ============================================================================
// SCHEDULED FUNCTION: Cleanup Anonymous Users (runs daily)
// ============================================================================
exports.cleanupAnonymousUsers = onSchedule(
  {
    schedule: 'every 24 hours',
    timeZone: 'America/New_York',
    region: 'us-east1',
    memory: '256MiB',
  },
  async (event) => {
    const auth = admin.auth();
    const db = admin.firestore();
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7); // Delete users inactive for 7+ days
    
    let deletedCount = 0;
    let checkedCount = 0;
    let nextPageToken;
    
    try {
      do {
        const listUsersResult = await auth.listUsers(1000, nextPageToken);
        
        for (const user of listUsersResult.users) {
          checkedCount++;
          
          // Check if user is anonymous (no provider data)
          if (user.providerData.length === 0) {
            const creationTime = new Date(user.metadata.creationTime);
            const lastSignInTime = new Date(user.metadata.lastSignInTime);
            
            // Check if old enough to delete
            if (creationTime < cutoffDate && lastSignInTime < cutoffDate) {
              // Additional safety check
              const shouldDelete = await shouldDeleteAnonymousUser(db, user.uid);
              
              if (shouldDelete) {
                console.log(`Deleting anonymous user: ${user.uid} (created: ${creationTime})`);
                
                // Delete Firestore data first
                await deleteUserData(db, user.uid);
                
                // Delete auth record
                await auth.deleteUser(user.uid);
                
                deletedCount++;
              }
            }
          }
        }
        
        nextPageToken = listUsersResult.pageToken;
      } while (nextPageToken);
      
      console.log(`✅ Cleanup complete! Checked ${checkedCount} users, deleted ${deletedCount} anonymous users.`);
      return { success: true, deletedCount, checkedCount };
      
    } catch (error) {
      console.error('❌ Error cleaning up anonymous users:', error);
      throw error;
    }
  }
);

// ============================================================================
// FIRESTORE TRIGGER: Send SMS when worker is created
// ============================================================================
exports.sendWorkerClockInLink = onDocumentCreated(
  {
    document: "workers/{workerId}",
    secrets: [twilioSid, twilioToken, twilioPhone, twilioMessagingServiceSid],
    memory: "256MiB",
    region: "us-east1",
  },
  async (event) => {
    const worker = event.data.data();
    const workerId = event.params.workerId;

    try {
      const client = twilio(twilioSid.value(), twilioToken.value());
      const workerPhone = formatPhoneForTwilio(worker.phone);

      if (!workerPhone) {
        console.log("No phone number found for worker");
        return null;
      }

      const baseUrl = "https://workbase-8dfe2.firebaseapp.com";
      const clockInLink = `${baseUrl}/worker/${worker.accessKey}`;
      const message = `Hi ${worker.name}! Welcome to the team. Use this link to clock in (valid for 30 minutes): ${clockInLink}`;

      const result = await client.messages.create({
        body: message,
        messagingServiceSid: twilioMessagingServiceSid.value(),
        to: workerPhone,
      });

      console.log("SMS sent successfully:", result.sid);
      return {success: true, messageSid: result.sid};
    } catch (error) {
      console.error("Error sending SMS:", error);
      return {success: false, error: error.message};
    }
  }
);

// ============================================================================
// CALLABLE FUNCTION: Resend worker link
// ============================================================================
exports.resendWorkerLink = onCall(
  {
    region: "us-east1",
    secrets: [twilioSid, twilioToken, twilioPhone, twilioMessagingServiceSid],
    memory: "256MiB",
    cors: [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://127.0.0.1:5173",
      "http://192.168.1.53:3000",
      "https://192.168.1.53:3000",
      "https://workbase-8dfe2.firebaseapp.com",
    ],
  },
  async (request) => {
    const {workerId} = request.data;

    if (!workerId) {
      throw new Error("Worker ID is required");
    }

    try {
      const workerDoc = await admin.firestore()
        .collection("workers")
        .doc(workerId)
        .get();

      if (!workerDoc.exists) {
        throw new Error("Worker not found");
      }

      const worker = workerDoc.data();

      // Generate new access key with new expiration
      const newAccessKey = crypto.randomUUID();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes

      await admin.firestore()
        .collection("workers")
        .doc(workerId)
        .update({
          accessKey: newAccessKey,
          accessKeyCreatedAt: now.toISOString(),
          accessKeyExpiresAt: expiresAt.toISOString(),
          updatedAt: now.toISOString(),
        });

      const client = twilio(twilioSid.value(), twilioToken.value());
      const baseUrl = "https://workbase-8dfe2.firebaseapp.com";
      const clockInLink = `${baseUrl}/worker/${newAccessKey}`;
      const message = `Hi ${worker.name}! Here's your clock-in link (valid for 30 minutes): ${clockInLink}`;
      const formattedPhone = formatPhoneForTwilio(worker.phone);

      const result = await client.messages.create({
        body: message,
        messagingServiceSid: twilioMessagingServiceSid.value(),
        to: formattedPhone,
      });

      console.log("SMS resent successfully:", result.sid);
      return {success: true, messageSid: result.sid, newAccessKey};
    } catch (error) {
      console.error("Error resending SMS:", error);
      throw new Error(error.message);
    }
  }
);

// ============================================================================
// CALLABLE FUNCTION: Send company invitation
// ============================================================================
exports.sendCompanyInvite = onCall(
  {
    region: "us-east1",
    secrets: [twilioSid, twilioToken, twilioPhone, twilioMessagingServiceSid],
    memory: "256MiB",
    cors: [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://127.0.0.1:5173",
      "http://192.168.1.50:3000",
      "https://192.168.1.50:3000",
      "https://workbase-8dfe2.firebaseapp.com",
    ],
  },
  async (request) => {
    const {phoneNumber, companyId, companyName, joinCode} = request.data;

    if (!phoneNumber || !companyId || !companyName || !joinCode) {
      throw new Error("Phone number, company ID, company name, and join code are required");
    }

    if (phoneNumber.length !== 10) {
      throw new Error("Phone number must be 10 digits");
    }

    try {
      const formattedPhone = `+1${phoneNumber}`;

      const companyDoc = await admin.firestore()
        .collection("companies")
        .doc(companyId)
        .get();

      if (!companyDoc.exists) {
        throw new Error("Company not found");
      }

      const companyData = companyDoc.data();
      if (companyData.joinCode !== joinCode) {
        throw new Error("Join code mismatch");
      }

      const client = twilio(twilioSid.value(), twilioToken.value());
      const baseUrl = "https://workbase-8dfe2.firebaseapp.com";
      const joinLink = `${baseUrl}/join-company?code=${joinCode}`;

      const message = `You've been invited to join ${companyName}!\n\n` +
        `Join Code: ${joinCode}\n\n` +
        `Or click here to join automatically: ${joinLink}\n\n` +
        `Download the app and enter the code, or click the link to join instantly.`;

      const result = await client.messages.create({
        body: message,
        messagingServiceSid: twilioMessagingServiceSid.value(),
        to: formattedPhone,
      });

      await admin.firestore()
        .collection("companyInvitations")
        .add({
          companyId: companyId,
          companyName: companyName,
          phoneNumber: formattedPhone,
          joinCode: joinCode,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          sentBy: request.auth?.uid || "unknown",
          messageSid: result.sid,
          status: "sent",
        });

      console.log("Company invitation sent successfully:", result.sid);
      return {success: true, messageSid: result.sid};
    } catch (error) {
      console.error("Error sending company invitation:", error);

      try {
        await admin.firestore()
          .collection("companyInvitations")
          .add({
            companyId: companyId,
            companyName: companyName,
            phoneNumber: `+1${phoneNumber}`,
            joinCode: joinCode,
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            sentBy: request.auth?.uid || "unknown",
            status: "failed",
            error: error.message,
          });
      } catch (logError) {
        console.error("Error logging failed invitation:", logError);
      }

      throw new Error(error.message);
    }
  }
);
// ============================================================================
// Check if running in emulator
const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';

// Only initialize Vision client in production
let visionClient;
if (!isEmulator) {
  visionClient = new vision.ImageAnnotatorClient();
}

// ============================================================================
// CALLABLE FUNCTION: Process Receipt with OCR
// ============================================================================
exports.processReceipt = onCall(
  {
    region: "us-east1",
    memory: "256MiB",
    cors: [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://127.0.0.1:5173",
      "https://workbase-8dfe2.firebaseapp.com",
    ],
  },
  async (request) => {
    //Authentication check
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'User must be authenticated to process receipts'
      );
    }

    const { imageUrl, projectId } = request.data;

    if (!imageUrl) {
      throw new HttpsError(
        'invalid-argument',
        'Image URL is required'
      );
    }

    // EMULATOR MODE: Return mock data for testing
    if (isEmulator) {
      console.log('🧪 EMULATOR MODE: Returning mock OCR data');
      return getMockOCRResult(imageUrl);
    }

    // PRODUCTION MODE: Real Cloud Vision API
    try {
      // Verify user has access to this project
      const projectDoc = await admin
        .firestore()
        .collection('projects')
        .doc(projectId)
        .get();

      if (!projectDoc.exists) {
        throw new HttpsError(
          'not-found',
          'Project not found'
        );
      }

      const projectData = projectDoc.data();
      const userId = request.auth.uid;
      const isMember = 
        projectData.adminId === userId ||
        (projectData.workers || []).some(w => w.uid === userId);

      if (!isMember) {
        throw new HttpsError(
          'permission-denied',
          'User does not have access to this project'
        );
      }

      // Perform OCR on the image
      console.log('Processing receipt image:', imageUrl);
      
      const [result] = await visionClient.textDetection(imageUrl);
      const detections = result.textAnnotations;

      if (!detections || detections.length === 0) {
        return {
          success: false,
          rawText: '',
          merchant: null,
          date: null,
          total: null,
          items: [],
          confidence: 0,
          message: 'No text detected in image'
        };
      }

      const fullText = detections[0].description;
      console.log('Extracted text:', fullText);

      const parsed = parseReceiptText(fullText);

      return {
        success: true,
        rawText: fullText,
        merchant: parsed.merchant,
        date: parsed.date,
        total: parsed.total,
        items: parsed.items,
        confidence: parsed.confidence
      };

    } catch (error) {
      console.error('Error processing receipt:', error);
      
      throw new HttpsError(
        'internal',
        `Failed to process receipt: ${error.message}`
      );
    }
  }
);

// Helper functions (keep these at the bottom)
function getMockOCRResult(imageUrl) {
  console.log('Generating mock result for:', imageUrl);
  
  return {
    success: true,
    rawText: `HOME DEPOT #1234
123 Main Street
Anytown, CA 12345
(555) 123-4567

Date: 01/15/2025
Time: 14:32

ITEMS:
2x4x8 Lumber         $8.47
Paint Primer 1gal    $24.99
Nails 3lb Box        $12.99
Drywall Screws       $7.99

SUBTOTAL            $54.44
TAX                 $4.36
TOTAL              $58.80

THANK YOU!`,
    merchant: 'HOME DEPOT',
    date: '01/15/2025',
    total: 58.80,
    items: [
      { description: '2x4x8 Lumber', amount: 8.47 },
      { description: 'Paint Primer 1gal', amount: 24.99 },
      { description: 'Nails 3lb Box', amount: 12.99 },
      { description: 'Drywall Screws', amount: 7.99 }
    ],
    confidence: 0.85,
    _isMockData: true
  };
}

function parseReceiptText(text) {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  
  const merchant = extractMerchant(lines);
  const date = extractDate(text);
  const total = extractTotal(text);
  const items = extractLineItems(lines);
  
  return {
    merchant,
    date,
    total,
    items,
    confidence: calculateConfidence({ merchant, date, total, items })
  };
}

function extractMerchant(lines) {
  const commonMerchants = [
    'HOME DEPOT', 'LOWES', 'MENARDS', 'ACE HARDWARE',
    'WALMART', 'TARGET', 'COSTCO'
  ];
  
  for (const line of lines.slice(0, 5)) {
    const upperLine = line.toUpperCase();
    for (const merchant of commonMerchants) {
      if (upperLine.includes(merchant)) {
        return merchant;
      }
    }
  }
  
  return lines[0] || 'Unknown Merchant';
}

function extractDate(text) {
  const patterns = [
    /(\d{1,2}\/\d{1,2}\/\d{2,4})/,
    /(\d{1,2}-\d{1,2}-\d{2,4})/,
    /(\d{4}-\d{2}-\d{2})/,
    /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0];
    }
  }
  
  return null;
}

function extractTotal(text) {
  const patterns = [
    /total[\s:$]*(\d+\.\d{2})/i,
    /amount[\s:$]*(\d+\.\d{2})/i,
    /balance[\s:$]*(\d+\.\d{2})/i,
    /grand\s+total[\s:$]*(\d+\.\d{2})/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return parseFloat(match[1]);
    }
  }
  
  const allAmounts = text.match(/\$?\d+\.\d{2}/g);
  if (allAmounts && allAmounts.length > 0) {
    const amounts = allAmounts.map(a => parseFloat(a.replace('$', '')));
    return Math.max(...amounts);
  }
  
  return null;
}

function extractLineItems(lines) {
  const items = [];
  const itemPattern = /^(.+?)\s+\$?(\d+\.\d{2})$/;
  
  for (const line of lines) {
    const match = line.match(itemPattern);
    if (match) {
      const description = match[1].trim();
      const amount = parseFloat(match[2]);
      
      const lowerDesc = description.toLowerCase();
      if (!lowerDesc.includes('total') && 
          !lowerDesc.includes('tax') &&
          !lowerDesc.includes('subtotal')) {
        items.push({ description, amount });
      }
    }
  }
  
  return items;
}

function calculateConfidence(parsed) {
  let score = 0;
  
  if (parsed.merchant && parsed.merchant !== 'Unknown Merchant') score += 0.3;
  if (parsed.date) score += 0.2;
  if (parsed.total) score += 0.3;
  if (parsed.items && parsed.items.length > 0) score += 0.2;
  
  return score;
}