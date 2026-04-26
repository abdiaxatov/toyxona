
import { type NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
    try {
        const admin = await import("firebase-admin")
        if (!admin.apps.length) {
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

        const { searchParams } = new URL(req.url)
        const targetUid = searchParams.get("uid") || "1QADFIQTsqT64CW9eypvNZGd3ep1";

        const results = {
            scanTime: new Date().toISOString(),
            targetUid,
            action: "Repairing User Login Pointer",
            foundIn: "",
            success: false,
            message: ""
        };

        // 1. Check if Root doc exists
        const rootRef = db.collection("users").doc(targetUid);
        const rootDoc = await rootRef.get();

        if (rootDoc.exists) {
            results.message = "Root document already exists. No action needed.";
            results.success = true;
            return NextResponse.json(results, { status: 200 })
        }

        // 2. Find the user in Subcollections
        let foundData = null;

        // Attempt A: Collection Group Query (May fail if no index)
        try {
            console.log("Attempting CollectionGroup Query...")
            const querySnapshot = await db.collectionGroup("users").where("uid", "==", targetUid).get();
            if (!querySnapshot.empty) {
                foundData = querySnapshot.docs[0].data();
                results.foundIn = "CollectionGroup (Index exists)";
            }
        } catch (e) {
            console.log("CollectionGroup failed (expected if no index). Falling back to Brute Force.");
        }

        // Attempt B: Brute Force Search (Iterate Restaurants)
        if (!foundData) {
            console.log("Attempting Brute Force Search across restaurants...")
            const restaurantsSnap = await db.collection("restaurants").get();

            for (const restDoc of restaurantsSnap.docs) {
                const userSnap = await restDoc.ref.collection("users").doc(targetUid).get();
                if (userSnap.exists) {
                    foundData = userSnap.data();
                    // Ensure restaurantId is set
                    if (!foundData.restaurantId) foundData.restaurantId = restDoc.id;
                    results.foundIn = `restaurants/${restDoc.id}`;
                    break; // Found it!
                }
            }
        }

        // 3. Create Root Document if found
        if (foundData) {
            await rootRef.set({
                ...foundData,
                isPointer: true,
                updatedAt: new Date(),
                repairedByScript: true
            });
            results.message = `REPAIRED: Created Root Pointer for ${foundData.email}. Login should work now.`;
            results.success = true;
        } else {
            results.message = "User NOT FOUND in any restaurant subcollection. Cannot repair.";
            results.success = false;
        }

        return NextResponse.json(results, { status: 200 })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
