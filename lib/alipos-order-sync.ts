import { adminDb } from "@/lib/firebase-admin"
import { AliPOSService } from "@/lib/alipos-service"

export async function syncOrderToAliPOS(orderId: string, restaurantId: string) {
  try {
    if (!orderId || !restaurantId) {
      return { success: false, error: "Missing parameters" }
    }

    // 1. Get Order Data
    let orderDoc = await adminDb
      .collection("restaurants")
      .doc(restaurantId)
      .collection("orders")
      .doc(orderId)
      .get()

    // Fallback unnested order structure
    if (!orderDoc.exists) {
       orderDoc = await adminDb.collection("orders").doc(orderId).get()
    }

    if (!orderDoc.exists) {
      return { success: false, error: "Order not found" }
    }

    const order = orderDoc.data()
    if (!order) return { success: false, error: "Order data empty" }

    // 2. Get AliPOS Config
    const restaurantDoc = await adminDb.collection("restaurants").doc(restaurantId).get()
    const aliposConfig = restaurantDoc.data()?.integrations?.alipos

    if (!aliposConfig || !aliposConfig.clientId || !aliposConfig.restaurantId) {
      return { success: false, error: "AliPOS not configured" }
    }

    const service = new AliPOSService(aliposConfig)

    // 3. Map items to AliPOS format
    let calculatedItemsCost = 0
    const items = await Promise.all(order.items.map(async (item: any) => {
      const itemPrice = Number(item.price) || 0
      const itemQty = Number(item.quantity) || 1
      calculatedItemsCost += itemPrice * itemQty

      // If aliposId is missing, try to fetch it from the product document
      let aliposId = item.aliposId
      if (!aliposId) {
        const pId = item.productId || (item.id.includes("-") ? item.id.split("-")[0] : item.id)
        const pDoc = await adminDb.collection("restaurants").doc(restaurantId).collection("menuItems").doc(pId).get()
        if (pDoc.exists) {
          aliposId = pDoc.data()?.aliposId
        } else {
          // Fallback root
          const rootDoc = await adminDb.collection("menuItems").doc(pId).get()
          if (rootDoc.exists) aliposId = rootDoc.data()?.aliposId
        }
      }

      const modifications = item.modifiers ? item.modifiers.map((mod: any) => {
        const modPrice = Number(mod.price) || 0
        const modQty = Number(mod.quantity) || 1
        calculatedItemsCost += modPrice * modQty

        return {
          id: mod.aliposId || mod.id || "00000000-0000-0000-0000-000000000000",
          quantity: modQty,
          price: modPrice
        }
      }) : []
      
      return {
        id: aliposId || item.productId || item.id,
        quantity: itemQty,
        price: itemPrice,
        modifications: modifications
      }
    }))

    if (items.length === 0) {
       return { success: false, error: "No syncable items found in order" }
    }

    // 4. Prepare AliPOS Order
    // Marketplace bo'limida chiqishi uchun discriminator doim "marketplace" bo'lishi tavsiya etiladi
    let discriminator = "marketplace" 
    
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let tableId = null
    if (order.tableId && guidRegex.test(order.tableId)) {
        // Table buyurtmalari uchun "inplace" ishlatsa bo'ladi, lekin ko'pincha web-buyurtmalar ham marketplace bo'ladi
        // tableId = order.tableId
    }

    let commentText = order.notes || ""
    if (order.tableNumber || order.roomNumber) {
        commentText = `Joylashuv: ${order.seatingType || ""} ${order.tableNumber || order.roomNumber}. ${commentText}`
    }

    let customerName = order.customerName || "Mijoz"
    if (customerName.length < 2) customerName = "Mijoz"

    let phoneNum = order.phoneNumber || order.customerPhone || ""
    if (phoneNum) {
        phoneNum = "+" + phoneNum.replace(/\D/g, "")
    }
    // AliPOS terminali uchun kamida 9 ta raqam bo'lishi shart (tel raqami bo'sh bo'lmasligi kerak)
    if (!phoneNum || phoneNum.length < 10) {
        phoneNum = "+998000000000" 
    }

    // AliPOS expectations for Totals:
    // itemsCost: sum of (item * qty) + sum of (modifier * qty)
    // total: itemsCost + deliveryFee
    const deliveryFee = Number(order.deliveryFee || 0)
    const totalOrderSum = calculatedItemsCost + deliveryFee

    const aliposOrder: any = {
      discriminator: discriminator,
      platform: (aliposConfig.platform && aliposConfig.platform.length >= 2) ? aliposConfig.platform : "FoodHub",
      eatsId: String(orderId),
      restaurantId: aliposConfig.restaurantId,
      comment: String(commentText),
      items: items,
      deliveryInfo: {
        clientName: customerName,
        phoneNumber: phoneNum || "+998000000000",
      },
      paymentInfo: {
        paymentId: order.paymentMethod === "card" 
          ? AliPOSService.PAYMENT_CARD 
          : (order.paymentMethod === "rahmat" ? AliPOSService.PAYMENT_RAHMAT : AliPOSService.PAYMENT_CASH),
        itemsCost: calculatedItemsCost,
        total: totalOrderSum,
        deliveryFee: deliveryFee
      }
    }

    if (discriminator === "delivery") {
      aliposOrder.deliveryInfo.deliveryAddress = {
        full: order.address || order.customerAddress || "Manzil kiritilmagan",
        latitude: order.latitude ? String(order.latitude) : "0",
        longitude: order.longitude ? String(order.longitude) : "0"
      }
    }

    if (tableId) {
       aliposOrder.tableId = tableId
    }

    console.log("SENDING ALIPOS ORDER PAYLOAD:", JSON.stringify(aliposOrder, null, 2))
    const result = await service.createOrder(aliposOrder)
    console.log("ALIPOS SUCCESS:", result)

    // 5. Update local order
    const updateData = {
        aliposSynced: true,
        aliposOrderId: result.id || result.orderNumber || null,
        aliposStatus: "NEW",
        updatedAt: new Date(),
        aliposError: null // clear previous errors
    }

    await adminDb.collection("orders").doc(orderId).update(updateData).catch(() => {})
    await adminDb.collection("restaurants").doc(restaurantId).collection("orders").doc(orderId).update(updateData).catch(() => {})

    return { success: true, result }
  } catch (error: any) {
    console.error("AliPOS Sync Order Error in Helper:", error)
    
    // Xatolikni bazaga yozib qoyish, foydalanuvchi korishi uchun
    const errData = {
       aliposSynced: false,
       aliposError: error.message || "Unknown AliPOS API Error",
       updatedAt: new Date()
    }
    await adminDb.collection("orders").doc(orderId).update(errData).catch(() => {})
    await adminDb.collection("restaurants").doc(restaurantId).collection("orders").doc(orderId).update(errData).catch(() => {})

    return { success: false, error: error.message }
  }
}
