const { initializeApp, cert } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");

// Reads credentials from Render's Environment Variables — never from a file.
// FIREBASE_PRIVATE_KEY often has literal \n in some environments, so this
// handles both real newlines and escaped \n safely.
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    : undefined,
};

const app = initializeApp({
  credential: cert(serviceAccount),
});

const messaging = getMessaging(app);

module.exports = { messaging };