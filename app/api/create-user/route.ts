import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, role, adminUid, restaurantId, adminPath, telegramChatId } = await req.json()

    console.log("Create user request received:", { name, email, role, adminUid, restaurantId, adminPath, telegramChatId })

    if (!name || !email || !password || !role || !adminUid) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 })
    }

    // Import Firebase Admin SDK dynamically
    const admin = await import("firebase-admin")

    // FORCE CLEAN INITIALIZATION (Like debug-user)
    if (admin.apps.length) {
      try {
        await admin.app().delete()
        console.log("[API] Existing Firebase app deleted.")
      } catch (e) {
        // ignore 
      }
    }

    const projectId = process.env.FIREBASE_PROJECT_ID
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    let privateKey = process.env.FIREBASE_PRIVATE_KEY

    // Normalize Key
    if (privateKey) {
      if (privateKey.startsWith('"') || privateKey.startsWith("'")) privateKey = privateKey.slice(1);
      if (privateKey.endsWith('"') || privateKey.endsWith("'")) privateKey = privateKey.slice(0, -1);
      privateKey = privateKey.replace(/\\n/g, "\n");
    }

    if (!projectId || !clientEmail || !privateKey) {
      console.error("[API] Critical: Missing .env credentials.")
      return NextResponse.json({ message: "Server Config Error: Missing .env" }, { status: 500 })
    }

    console.log(`[API] Initializing Firebase for Project: ${projectId}`);

    try {
      admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      })
    } catch (e: any) {
      console.error("[API] Init failed:", e);
      return NextResponse.json({ message: "Firebase Init Failed" }, { status: 500 })
    }

    const adminAuth = admin.auth()
    const adminDb = admin.firestore()

    // Verifying DB connection
    console.log(`[API] Connected to Firestore Project: ${projectId}`);

    // 1. Verify if the requesting user is an admin
    try {
      const uidToCheck = adminUid || "missing_uid"
      console.log(`[API] Checking permissions for Admin UID: ${uidToCheck} `);

      let adminDoc;
      let adminData;

      // STRATEGY 0: Check exact path if provided (Most Robust for Multi-tenancy)
      if (adminPath) {
        console.log(`[API] Verifying via provided path: ${adminPath} `);
        const pathDoc = await adminDb.doc(adminPath).get();
        if (pathDoc.exists) {
          const data = pathDoc.data();
          // SECURITY CHECK: Ensure the doc actually belongs to this UID
          if (data?.uid === uidToCheck || pathDoc.id === uidToCheck) {
            adminDoc = pathDoc;
            adminData = data;
            console.log("[API] Admin verified via path.");
          } else {
            console.warn(`[API] Path provided ${adminPath} does not match UID ${uidToCheck}.Ignoring.`);
          }
        }
      }

      if (!adminDoc) {
        // Try Root Collection first
        let rootDoc = await adminDb.collection("users").doc(uidToCheck).get()

        if (rootDoc.exists) {
          adminDoc = rootDoc;
          adminData = rootDoc.data();
        } else {
          console.log(`[API] Admin not found in root 'users'.Searching subcollections...`);
          // If we know the restaurantId, check there directly
          if (restaurantId) {
            const subDoc = await adminDb.collection("restaurants").doc(restaurantId).collection("users").doc(uidToCheck).get();
            if (subDoc.exists) {
              adminDoc = subDoc;
              adminData = subDoc.data();
            }
          }
        }
      }

      // If still not found...
      if (!adminDoc || !adminDoc.exists) {
        console.warn(`[API] Admin verification failed.Path: ${adminPath}, Root and Subcollection checked.`);
        return NextResponse.json({ message: `Unauthorized: Admin user not found.` }, { status: 401 })
      }

      const adminRole = (adminData?.role || "").toLowerCase()
      console.log(`[API] Resolved role: '${adminRole}' for UID: ${uidToCheck} `);

      // Allow admin or owner
      if (adminRole !== "admin" && adminRole !== "owner" && adminRole !== "super_admin" && adminRole !== "co_founder") {
        console.warn(`Unauthorized create - user attempt: ${adminRole} `)
        return NextResponse.json({ message: `Unauthorized: Only admins / owners can create users(Your role: ${adminRole || "none"})` }, { status: 403 })
      }
    } catch (error: any) {
      console.error("Error verifying admin:", error)
      return NextResponse.json({ message: `Admin verification failed: ${error.message} ` }, { status: 401 })
    }

    // 2. Check if email already exists
    try {
      await adminAuth.getUserByEmail(email)
      return NextResponse.json({ message: "Bu email allaqachon ro'yxatdan o'tgan" }, { status: 409 })
    } catch (error: any) {
      if (error.code !== "auth/user-not-found") {
        console.error("Error checking existing user:", error)
        return NextResponse.json({ message: "Foydalanuvchini tekshirishda xatolik yuz berdi" }, { status: 500 })
      }
    }

    // Capture the restaurantId for the new user
    // If Admin is restricted to a restaurant, ensure they can only create users for THAT restaurant?
    // For now we assume the frontend passes the correct restaurantId.
    if (!restaurantId && role !== 'super_admin') {
      // Fallback: Use admin's restaurantId if not passed? 
      // But we should expect it from client.
      console.warn("[API] No restaurantId provided for new user! Defaulting to legacy root user (not recommended for multi-tenant).");
    }

    // Create user in Firebase Authentication
    // Note: custom claims for restaurantId could also be set here if needed for security rules
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    })

    console.log("User created in Auth:", userRecord.uid)

    // Set custom claims for the role (and possibly restaurantId)
    await adminAuth.setCustomUserClaims(userRecord.uid, { role, restaurantId })

    // 3. Add user data to Firestore (Nested path if restaurantId exists)
    const userData = {
      uid: userRecord.uid,
      name,
      email,
      role,
      restaurantId: restaurantId || null,
      telegramChatId: telegramChatId || null,
      status: "active",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (restaurantId) {
      // 1. Write to SUBCOLLECTION: restaurants/{id}/users/{uid}
      await adminDb.collection("restaurants").doc(restaurantId).collection("users").doc(userRecord.uid).set(userData)
      console.log(`User data saved to restaurants / ${restaurantId} /users/${userRecord.uid} `)

      // 2. CRITICAL: Write POINTER to Root 'users' collection
      // This allows 'getDoc' to work immediately during login without requiring a Collection Group Index.
      await adminDb.collection("users").doc(userRecord.uid).set({
        uid: userRecord.uid,
        name,
        email,
        role,
        restaurantId,
        telegramChatId: telegramChatId || null,
        isPointer: true,
        updatedAt: new Date()
      })
      console.log("Root pointer created for multi-tenant user (Login optimization).")

    } else {
      // Legacy Root (No subcollection)
      await adminDb.collection("users").doc(userRecord.uid).set(userData)
      console.log("User data saved to root 'users' collection (Legacy/No Restaurant ID)")
    }

    return NextResponse.json({ message: "User created successfully", uid: userRecord.uid }, { status: 200 })
  } catch (error: any) {
    console.error("Error creating user:", error)
    return NextResponse.json({ message: error.message || "Failed to create user" }, { status: 500 })
  }
}
