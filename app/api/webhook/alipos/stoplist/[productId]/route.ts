import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

export async function POST(
  req: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const { productId } = params
    const { searchParams } = new URL(req.url)
    const restaurantId = searchParams.get("restaurantId") || searchParams.get("RestaurantId")
    const count = searchParams.get("count") || searchParams.get("Count")

    if (!restaurantId || !productId) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
    }

    // 1. Find local products mapping
    const productsRef = adminDb
      .collection("restaurants")
      .doc(restaurantId)
      .collection("menuItems")
      .where("aliposId", "==", productId)

    const snapshot = await productsRef.get()
    if (snapshot.empty) {
      return NextResponse.json({ message: "Product not found" }, { status: 404 })
    }

    // 2. Update availability (Based on documentation: -1 is infinite)
    const isAvailable = count === "-1" || parseInt(count || "0") > 0
    const remainingServings = count === "-1" ? null : parseInt(count || "0")

    const batch = adminDb.batch()
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        isAvailable,
        available: isAvailable,
        remainingServings,
        updatedAt: new Date()
      })
    })

    await batch.commit()
    return NextResponse.json({ success: true, count: snapshot.size })
  } catch (error: any) {
    console.error("StopList Webhook Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
