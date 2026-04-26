import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import { AliPOSService, AliPOSConfig } from "@/lib/alipos-service"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const resId = searchParams.get("resId")

    if (!resId) {
      return NextResponse.json({ connected: false, error: "Missing resId" }, { status: 400 })
    }

    const restaurantDoc = await getDoc(doc(db, "restaurants", resId))
    if (!restaurantDoc.exists()) {
      return NextResponse.json({ connected: false, error: "Restaurant not found" }, { status: 404 })
    }

    const config: AliPOSConfig = restaurantDoc.data().integrations?.alipos
    if (!config || !config.clientId) {
      return NextResponse.json({ connected: false, error: "AliPOS not configured" })
    }

    const service = new AliPOSService(config)
    
    // Quick check: try to get restaurants list with a short timeout
    // AliPOSService already has a 10s timeout internally
    const restaurants = await service.getRestaurants()
    
    return NextResponse.json({ 
      connected: Array.isArray(restaurants),
      count: restaurants?.length || 0
    })
  } catch (error: any) {
    console.error("AliPOS Status Check Error:", error)
    return NextResponse.json({ connected: false, error: error.message })
  }
}
