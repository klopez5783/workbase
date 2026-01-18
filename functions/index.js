const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {onCall} = require("firebase-functions/v2/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {defineSecret} = require("firebase-functions/params");
const admin = require("firebase-admin");
const twilio = require("twilio");
const crypto = require("crypto");

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