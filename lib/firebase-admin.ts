import * as admin from "firebase-admin"

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
}

let adminAuth: admin.auth.Auth;
let adminDb: admin.firestore.Firestore;

if (!admin.apps.length) {
  if (serviceAccount.projectId && serviceAccount.clientEmail && serviceAccount.privateKey) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as any),
      })
      console.log("Firebase Admin initialized successfully")
    } catch (error) {
      console.error("Error initializing Firebase Admin:", error)
    }
  } else {
    console.warn("Firebase Admin credentials missing. Admin features will be disabled during build.")
  }
}

// Export getters or initialized instances
try {
  if (admin.apps.length) {
    adminAuth = admin.auth()
    adminDb = admin.firestore()
  }
} catch (e) {
  console.warn("Failed to get Admin services:", e.message)
}

export { adminAuth, adminDb, admin }
