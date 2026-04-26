import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
    try {
        const forwardedHost = req.headers.get("x-forwarded-host") || req.headers.get("host")
        const protocol = req.headers.get("x-forwarded-proto") || "https"
        const detectedUrl = forwardedHost ? `${protocol}://${forwardedHost}` : new URL(req.url).origin // e.g., ngrok URL

        const diagnostics = {
            env: {
                firebaseProjectId: !!process.env.FIREBASE_PROJECT_ID,
                firebaseClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
                firebasePrivateKey: !!process.env.FIREBASE_PRIVATE_KEY
            },
            detectedUrl
        }

        return NextResponse.json(diagnostics)
    } catch (error) {
        console.error("Error fetching bot diagnostics:", error)
        return NextResponse.json({ error: "Failed to load diagnostics" }, { status: 500 })
    }
}
