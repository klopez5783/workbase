const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {onCall} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const admin = require("firebase-admin");
const twilio = require("twilio");

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const twilioSid = defineSecret("TWILIO_ACCOUNT_SID");
const twilioToken = defineSecret("TWILIO_AUTH_TOKEN");
const twilioPhone = defineSecret("TWILIO_PHONE_NUMBER");
const twilioMessagingServiceSid = defineSecret("TWILIO_MESSAGING_SERVICE_SID"); // ✅ Add this

/**
 * Formats a phone number to E.164 format for Twilio
 * @param {string} phone - Phone number (10 digits or already formatted)
 * @return {string} - Formatted phone number with +1 prefix
 */
function formatPhoneForTwilio(phone) {
  if (!phone) return null;
  // Remove any non-digit characters
  const cleaned = phone.replace(/\D/g, "");
  // Add +1 if not already present
  return phone.startsWith("+") ? phone : `+1${cleaned}`;
}

// Automatically send SMS when a new worker is created
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

        // Generate the clock-in link
        const baseUrl = "https://workbase-8dfe2.firebaseapp.com";
        const clockInLink = `${baseUrl}/worker/${worker.accessKey}`;

        // SMS message with expiration notice
        const message = `Hi ${worker.name}! Welcome to the team. Use this link to clock in (valid for 30 minutes): ${clockInLink}`;

        // Send SMS
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

// Delete anonymous users after 7 days of inactivity
exports.cleanupAnonymousUsers = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    const listUsersResult = await admin.auth().listUsers(1000);
    const usersToDelete = [];

    listUsersResult.users.forEach((user) => {
      // Check if anonymous and inactive for 7+ days
      if (user.providerData.length === 0) { // Anonymous user
        const lastSignIn = new Date(user.metadata.lastSignInTime).getTime();
        if (lastSignIn < sevenDaysAgo) {
          usersToDelete.push(user.uid);
        }
      }
    });

    // Delete in batches
    if (usersToDelete.length > 0) {
      await admin.auth().deleteUsers(usersToDelete);
      console.log(`Deleted ${usersToDelete.length} inactive anonymous users`);
    }

    return null;
  });


  exports.cleanupAnonymousUsers = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    const listUsersResult = await admin.auth().listUsers(1000);
    const usersToDelete = [];

    listUsersResult.users.forEach((user) => {
      // Check if anonymous and inactive for 7+ days
      if (user.providerData.length === 0) { // Anonymous user
        const lastSignIn = new Date(user.metadata.lastSignInTime).getTime();
        if (lastSignIn < sevenDaysAgo) {
          usersToDelete.push(user.uid);
        }
      }
    });

    // Delete in batches
    if (usersToDelete.length > 0) {
      await admin.auth().deleteUsers(usersToDelete);
      console.log(`Deleted ${usersToDelete.length} inactive anonymous users`);
    }

    return null;
  });

// Callable function to manually resend SMS to a worker
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
        "https://192.168.1.53:3000", // <-- Add this line!
        "https://workbase-8dfe2.firebaseapp.com",
      ],
    },
    async (request) => {
      const {workerId} = request.data;

      if (!workerId) {
        throw new Error("Worker ID is required");
      }

      try {
        // Get worker data
        const workerDoc = await admin.firestore()
            .collection("workers")
            .doc(workerId)
            .get();

        if (!workerDoc.exists) {
          throw new Error("Worker not found");
        }

        const worker = workerDoc.data();

        // 🔥 GENERATE NEW ACCESS KEY WITH NEW EXPIRATION 🔥
        const newAccessKey = require("crypto").randomUUID();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes

        // Update worker with new access key
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

        // Generate link with NEW access key
        const baseUrl = "https://workbase-8dfe2.firebaseapp.com";
        const clockInLink = `${baseUrl}/worker/${newAccessKey}`;

        // Send SMS
        const message = `Hi ${worker.name}! Here's your clock-in link (valid for 30 minutes): ${clockInLink}`;
        
        console.log("Using Messaging Service SID:", twilioMessagingServiceSid.value());
        console.log("Sending to phone:", worker.phone);
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

// Callable function to send company invitation via SMS
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

      // Validate required fields
      if (!phoneNumber || !companyId || !companyName || !joinCode) {
        throw new Error("Phone number, company ID, company name, and join code are required");
      }

      // Validate phone number format (should be 10 digits)
      if (phoneNumber.length !== 10) {
        throw new Error("Phone number must be 10 digits");
      }

      try {
        // Format phone number for Twilio (add +1 for US)
        const formattedPhone = `+1${phoneNumber}`;

        // Get company to verify it exists
        const companyDoc = await admin.firestore()
            .collection("companies")
            .doc(companyId)
            .get();

        if (!companyDoc.exists) {
          throw new Error("Company not found");
        }

        // Verify join code matches
        const companyData = companyDoc.data();
        if (companyData.joinCode !== joinCode) {
          throw new Error("Join code mismatch");
        }

        const client = twilio(twilioSid.value(), twilioToken.value());

        // Generate join link
        const baseUrl = "https://workbase-8dfe2.firebaseapp.com";
        const joinLink = `${baseUrl}/join-company?code=${joinCode}`;

        // SMS message with both code and link
        const message = `You've been invited to join ${companyName}!\n\n` +
          `Join Code: ${joinCode}\n\n` +
          `Or click here to join automatically: ${joinLink}\n\n` +
          `Download the app and enter the code, or click the link to join instantly.`;

        // Send SMS
        const result = await client.messages.create({
          body: message,
          messagingServiceSid: twilioMessagingServiceSid.value(),
          to: formattedPhone,
        });

        // Log invitation for audit trail
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

        // Log failed invitation attempt
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