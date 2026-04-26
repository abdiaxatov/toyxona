import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { restaurantId, tableNumber, waiterId, waiterName } = body

        if (!restaurantId || !tableNumber) {
            return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
        }

        let restaurant: any = null;
        const restaurantDoc = await adminDb.collection("restaurants").doc(restaurantId).get()
        if (restaurantDoc.exists) {
            restaurant = restaurantDoc.data()
        }

        if (!restaurant) {
            return NextResponse.json({ success: false, error: "Restaurant not found" }, { status: 404 })
        }

        const botToken = restaurant?.telegramBotToken
        const adminChatId = restaurant?.telegramAdminChatId

        if (!botToken) {
            return NextResponse.json({ success: false, error: "Telegram bot not configured" }, { status: 400 })
        }

        // Format Message
        const message = `<b>🔔 Ofitsiant chaqiruvi!</b>\n\n` +
            `📍 Stol/Xona: <b>#${tableNumber}</b>\n` +
            (waiterName ? `👨‍🍳 Mas'ul: <b>${waiterName}</b>\n` : `👨‍🍳 Mas'ul: <i>Belgilanmagan</i>\n`) +
            `⏰ Vaqt: ${new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}`

        // Get recipients
        const chatIds = new Set<string>();
        let waiterFound = false;

        // 1. Try to add Assigned Waiter Chat ID first
        if (waiterId) {
            try {
                console.log(`[WaiterCall] Looking for waiter: ${waiterId} in restaurant: ${restaurantId}`);
                let waiterDoc = null;
                
                // Try restaurant subcollection first
                if (restaurantId && restaurantId !== "default") {
                    waiterDoc = await adminDb.collection("restaurants").doc(restaurantId).collection("users").doc(waiterId).get();
                }
                
                // Fallback to root users collection
                if (!waiterDoc || !waiterDoc.exists) {
                    waiterDoc = await adminDb.collection("users").doc(waiterId).get();
                }

                if (waiterDoc && waiterDoc.exists) {
                    const waiterData = waiterDoc.data();
                    console.log(`[WaiterCall] Waiter found: ${waiterData?.name}, ChatID: ${waiterData?.telegramChatId}`);
                    if (waiterData?.telegramChatId) {
                        const trimmed = waiterData.telegramChatId.toString().trim();
                        if (trimmed) {
                            chatIds.add(trimmed);
                            waiterFound = true;
                            console.log(`[WaiterCall] Routing waiter call specifically to waiter ${waiterId} Chat ID: ${trimmed}`);
                        }
                    } else {
                        console.log(`[WaiterCall] Waiter ${waiterId} has no telegramChatId set.`);
                    }
                } else {
                    console.log(`[WaiterCall] Waiter ${waiterId} document not found in any collection.`);
                }
            } catch (err) {
                console.error("[WaiterCall] Error fetching waiter for call notification:", err);
            }
        }

        // 2. Always add Admin IDs (as requested: "admin botigayam borishi kerak")
        if (adminChatId) {
            const splitIds = adminChatId.toString().split(/[\s,]+/)
            splitIds.forEach(id => {
                const trimmed = id.trim();
                if (trimmed) chatIds.add(trimmed);
            })
        }
        
        if (Array.isArray(restaurant?.adminTelegramIds)) {
            restaurant.adminTelegramIds.forEach((id: any) => {
                const trimmed = id?.toString().trim();
                if (trimmed) chatIds.add(trimmed);
            });
        }

        if (chatIds.size === 0) {
            return NextResponse.json({ success: true, warning: "No chat IDs configured for Telegram" })
        }

        // Send to all Telegram recipients
        const sendPromises = Array.from(chatIds).map(async (chat_id) => {
            try {
                const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        chat_id,
                        text: message,
                        parse_mode: "HTML",
                    })
                });
                return await response.json();
            } catch (err: any) {
                return { ok: false, error: err.message };
            }
        });

        const results = await Promise.all(sendPromises);
        const successCount = results.filter(r => r.ok).length;

        return NextResponse.json({ success: true, count: successCount })
    } catch (error: any) {
        console.error("Waiter call notification error:", error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
