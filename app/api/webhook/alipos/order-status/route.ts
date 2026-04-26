import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const { eatsId, status, restaurantId } = data

    if (!restaurantId || !eatsId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // 1. Map AliPOS status to local status (Based on documentation)
    let localStatus = status
    switch (status) {
      case "NEW":
        localStatus = "pending"
        break
      case "ACCEPTED_BY_RESTAURANT":
        localStatus = "accepted"
        break
      case "READY":
        localStatus = "ready"
        break
      case "TAKEN_BY_COURIER":
        localStatus = "delivered"
        break
      case "CANCELED":
        localStatus = "cancelled"
        break
    }

    // 2. Update local order
    const orderRef = adminDb
      .collection("restaurants")
      .doc(restaurantId)
      .collection("orders")
      .doc(eatsId)

    await orderRef.update({
      status: localStatus,
      aliposStatus: status,
      updatedAt: new Date()
    })

    return NextResponse.json({ success: true, message: "Order status updated" })
  } catch (error: any) {
    console.error("Order Status Webhook Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
