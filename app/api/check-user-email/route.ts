import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json()

        if (!email) {
            return NextResponse.json({ message: "Email is required" }, { status: 400 })
        }

        // Import Firebase Admin SDK dynamically
        const admin = await import("firebase-admin")

        // Initialize Firebase Admin if not already initialized
        if (!admin.apps.length) {
            const serviceAccount = {
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
            }

            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            })
        }

        try {
            const userRecord = await admin.auth().getUserByEmail(email)
            return NextResponse.json({ exists: true, uid: userRecord.uid }, { status: 200 })
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                return NextResponse.json({ exists: false }, { status: 200 })
            }
            throw error
        }

    } catch (error: any) {
        console.error("Error checking user:", error)
        return NextResponse.json({ message: error.message || "Failed to check user" }, { status: 500 })
    }
}
