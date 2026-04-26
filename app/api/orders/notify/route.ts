import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { formatOrderMessage } from "@/lib/telegram-format"

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { orderId, waiterId, waiterName } = body
        let { restaurantId } = body

        if (!orderId) {
            return NextResponse.json({ success: false, error: "Missing required orderId field" }, { status: 400 })
        }

        let restaurant: any = null;

        if (!restaurantId || restaurantId === "default") {
            // Find the first restaurant that has telegram configs
            const restaurantsQuery = await adminDb.collection("restaurants")
                .where("telegramBotToken", "!=", "")
                .limit(1)
                .get();
                
            if (!restaurantsQuery.empty) {
                const restDocs = restaurantsQuery.docs.filter(doc => doc.data().telegramAdminChatId);
                if (restDocs.length > 0) {
                    restaurant = restDocs[0].data();
                    restaurantId = restDocs[0].id;
                }
            }
        } else {
            // Get specific Restaurant Config
            const restaurantDoc = await adminDb.collection("restaurants").doc(restaurantId).get()
            if (restaurantDoc.exists) {
                restaurant = restaurantDoc.data()
            }
        }

        if (!restaurant) {
            return NextResponse.json({ success: false, error: "Restaurant not found or correctly configured" }, { status: 404 })
        }
        const botToken = restaurant?.telegramBotToken
        const adminChatId = restaurant?.telegramAdminChatId

        // Get Order Data
        let orderDoc;
        
        if (restaurantId && restaurantId !== "default") {
            orderDoc = await adminDb.collection("restaurants").doc(restaurantId).collection("orders").doc(orderId).get()
        }
        
        if (!orderDoc || !orderDoc.exists) {
            orderDoc = await adminDb.collection("orders").doc(orderId).get()
        }

        if (!orderDoc.exists) {
            return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 })
        }

        const order = orderDoc.data()

        // 🚀 AliPOS Sync Integration (Telegram'dan qat'iy nazar ishlaydi)
        if (restaurant?.integrations?.alipos?.clientId && restaurant?.integrations?.alipos?.restaurantId) {
            try {
                const { syncOrderToAliPOS } = await import("@/lib/alipos-order-sync")
                const result = await syncOrderToAliPOS(orderId, restaurantId)
                if (result.success) {
                    console.log(`AliPOS Sync Completed for order ${orderId} in restaurant ${restaurantId}`)
                } else {
                    console.error("AliPOS Sync Logic Error:", result.error)
                }
            } catch (err) {
                console.error("Failed to trigger AliPOS Sync:", err)
            }
        }

        const message = formatOrderMessage(order, orderId, restaurant);

        const recipientIds = new Set<string>();

        // 1. Try to add Assigned Waiter Chat ID first
        let waiterFound = false;
        const effectiveWaiterId = waiterId || order?.waiterId;
        
        if (effectiveWaiterId) {
            try {
                console.log(`[Notification] Looking for waiter: ${effectiveWaiterId} in restaurant: ${restaurantId}`);
                let waiterDoc = null;
                
                // Try restaurant subcollection first
                if (restaurantId && restaurantId !== "default") {
                    waiterDoc = await adminDb.collection("restaurants").doc(restaurantId).collection("users").doc(effectiveWaiterId).get();
                }
                
                // Fallback to root users collection
                if (!waiterDoc || !waiterDoc.exists) {
                    waiterDoc = await adminDb.collection("users").doc(effectiveWaiterId).get();
                }

                if (waiterDoc && waiterDoc.exists) {
                    const waiterData = waiterDoc.data();
                    console.log(`[Notification] Waiter found: ${waiterData?.name}, ChatID: ${waiterData?.telegramChatId}`);
                    if (waiterData?.telegramChatId) {
                        const trimmed = waiterData.telegramChatId.toString().trim();
                        if (trimmed) {
                            recipientIds.add(trimmed);
                            waiterFound = true;
                            console.log(`[Notification] Routing specifically to waiter ${effectiveWaiterId} Chat ID: ${trimmed}`);
                        }
                    } else {
                        console.log(`[Notification] Waiter ${effectiveWaiterId} has no telegramChatId set.`);
                    }
                } else {
                    console.log(`[Notification] Waiter ${effectiveWaiterId} document not found in any collection.`);
                }
            } catch (err) {
                console.error("[Notification] Error fetching waiter for conditional notification:", err);
            }
        }

        // 2. Always add Admins (as requested: "admin botigayam borishi kerak barchasi")
        if (adminChatId) {
            const splitIds = adminChatId.toString().split(/[\s,]+/)
            splitIds.forEach(id => {
                const trimmed = id.trim();
                if (trimmed) recipientIds.add(trimmed);
            })
        }
        
        if (Array.isArray(restaurant?.adminTelegramIds)) {
            restaurant.adminTelegramIds.forEach((id: any) => {
                const trimmed = id?.toString().trim();
                if (trimmed) recipientIds.add(trimmed);
            });
        }

        if (recipientIds.size === 0) {
            return NextResponse.json({ success: true, aliposStatus: "Executed if active", warning: "No recipients configured" })
        }

        // Send to all detected recipients
        const sendPromises = Array.from(recipientIds).map(async (chat_id) => {
            try {
                const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        chat_id,
                        text: message,
                        parse_mode: "HTML",
                        disable_web_page_preview: false,
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {
                                        text: "✅ Tasdiqlash",
                                        callback_data: `confirm_order_${orderId}_${restaurantId}`
                                    }
                                ]
                            ]
                        }
                    })
                });
                
                const result = await response.json();
                if (!result.ok) {
                    console.error(`Telegram API error for chat ${chat_id}:`, result);
                }
                return result;
            } catch (err: any) {
                console.error(`Fetch error for chat ${chat_id}:`, err);
                return { ok: false, error: err.message };
            }
        });

        const results = await Promise.all(sendPromises);
        const successCount = results.filter(r => r.ok).length;

        if (successCount === 0) {
            const firstError = results.find(r => !r.ok)?.description || "Unknown Telegram error";
            return NextResponse.json({ success: false, error: firstError }, { status: 400 })
        }

        // Send to customer if they came from Telegram
        if (order?.chatId && botToken) {
            try {
                const userMsg = `✅ <b>Buyurtmangiz qabul qilindi!</b>\n\nBuyurtma raqami: #${orderId.substring(0, 8)}\n\nTez orada administratorimiz siz bilan bog'lanadi yoki buyurtmani tasdiqlaydi. E'tiboringiz uchun rahmat! 😊`
                await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        chat_id: order.chatId,
                        text: userMsg,
                        parse_mode: "HTML"
                    })
                });
            } catch (err) {
                console.error("Error notifying customer via TG:", err)
            }
        }



        return NextResponse.json({ success: true, count: successCount })
    } catch (error: any) {
        console.error("Order notification error:", error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
