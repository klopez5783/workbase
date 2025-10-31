const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {onCall} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const admin = require("firebase-admin");
const twilio = require("twilio");

admin.initializeApp();

const twilioSid = defineSecret("TWILIO_ACCOUNT_SID");
const twilioToken = defineSecret("TWILIO_AUTH_TOKEN");
const twilioPhone = defineSecret("TWILIO_PHONE_NUMBER");

// Automatically send SMS when a new worker is created
exports.sendWorkerClockInLink = onDocumentCreated(
    {
      document: "workers/{workerId}",
      secrets: [twilioSid, twilioToken, twilioPhone],
      memory: "256MiB",
      region: "us-east1",
    },
    async (event) => {
      const worker = event.data.data();
      const workerId = event.params.workerId;

      try {
        const client = twilio(twilioSid.value(), twilioToken.value());

        const workerPhone = worker.phone;

        if (!workerPhone) {
          console.log("No phone number found for worker");
          return null;
        }

        // Generate the clock-in link
        const baseUrl = "https://workbase-8dfe2.firebaseapp.com"; // ← Added https://
        const clockInLink = `${baseUrl}/worker/${worker.accessKey}`;

        // SMS message
        const message = `Hi ${worker.name}! Welcome to the team. Use this link to clock in/out: ${clockInLink}`;

        // Send SMS
        const result = await client.messages.create({
          body: message,
          from: twilioPhone.value(),
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

// Callable function to manually resend SMS to a worker
exports.resendWorkerLink = onCall(
    {
      secrets: [twilioSid, twilioToken, twilioPhone],
      memory: "256MiB",
      region: "us-east1",
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
        const client = twilio(twilioSid.value(), twilioToken.value());

        // Generate link
        const baseUrl = "https://workbase-8dfe2.firebaseapp.com"; // ← Made consistent
        const clockInLink = `${baseUrl}/worker/${worker.accessKey}`;

        // Send SMS
        const message = `Hi ${worker.name}! Here's your clock-in link again: ${clockInLink}`;

        const result = await client.messages.create({
          body: message,
          from: twilioPhone.value(),
          to: worker.phone,
        });

        console.log("SMS resent successfully:", result.sid);
        return {success: true, messageSid: result.sid};
      } catch (error) {
        console.error("Error resending SMS:", error);
        throw new Error(error.message);
      }
    }
);