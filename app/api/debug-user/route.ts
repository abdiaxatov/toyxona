
import { type NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
    try {
        const admin = await import("firebase-admin")
        if (!admin.apps.length) {
            // Basic init logic (simplified for debugging)
            const projectId = process.env.FIREBASE_PROJECT_ID
            const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
            let privateKey = process.env.FIREBASE_PRIVATE_KEY
            if (privateKey) {
                if (privateKey.startsWith('"') || privateKey.startsWith("'")) privateKey = privateKey.slice(1);
                if (privateKey.endsWith('"') || privateKey.endsWith("'")) privateKey = privateKey.slice(0, -1);
                privateKey = privateKey.replace(/\\n/g, "\n");
            }

            admin.initializeApp({
                credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
            })
        }

        const db = admin.firestore();
        const targetUid = "t5VHxdOm5xQC0Ak1yjUtmN1o2ja2"; // The user from logs

        const results = {
            scanTime: new Date().toISOString(),
            targetUid,
            foundInRoot: false,
            foundInCollectionGroup: [] as string[],
            restored: false,
            message: ""
        };

        // 1. Check Root
        const rootDoc = await db.collection("users").doc(targetUid).get();
        if (rootDoc.exists) {
            results.foundInRoot = true;
        }

        // 2. Check Collection Group
        // Note: This needs index, but might work for small sets or if index exists
        try {
            const querySnapshot = await db.collectionGroup("users").where("uid", "==", targetUid).get();
            querySnapshot.forEach(doc => {
                results.foundInCollectionGroup.push(doc.ref.path);
            });
        } catch (e: any) {
            results.message = "CollectionGroup query failed: " + e.message;
        }

        // 3. ATTEMPT REPAIR if missing
        // If not found anywhere, we assume this is the OWNER trying to setup.
        // We will put them in the root users collection temporarily so they can create others.
        if (!results.foundInRoot && results.foundInCollectionGroup.length === 0) {

            // Try to find a restaurant to link them to
            let linkedRestaurantId = null;
            const restSnapshot = await db.collection("restaurants").limit(1).get();
            if (!restSnapshot.empty) {
                linkedRestaurantId = restSnapshot.docs[0].id;
            }

            await db.collection("users").doc(targetUid).set({
                uid: targetUid,
                name: "Recovered Admin",
                email: "ali@gmail.com", // From logs
                role: "owner",
                status: "active",
                restaurantId: linkedRestaurantId, // CRITICAL: Link to restaurant
                createdAt: new Date(),
                repairedByDebugScript: true
            });
            results.restored = true;
            results.message += ` | User restored to Root 'users' collection as Owner. Linked to Restaurant: ${linkedRestaurantId || "NONE"}`;
        }

        return NextResponse.json(results, { status: 200 })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
