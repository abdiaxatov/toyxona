import { NextRequest, NextResponse } from "next/server"
import { syncOrderToAliPOS } from "@/lib/alipos-order-sync"

export async function POST(req: NextRequest) {
  try {
    const { orderId, restaurantId } = await req.json()

    if (!orderId || !restaurantId) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
    }

    const res = await syncOrderToAliPOS(orderId, restaurantId)
    
    if (res.success) {
      return NextResponse.json(res)
    } else {
      return NextResponse.json({ error: res.error }, { status: 400 })
    }
  } catch (error: any) {
    console.error("AliPOS Sync Order Route Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
