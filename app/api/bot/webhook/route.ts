import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import { formatOrderMessage } from "@/lib/telegram-format"

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const restaurantId = searchParams.get("restaurantId")
        const incomingSecret = searchParams.get("secret")

        if (!restaurantId) {
            console.error("Webhook received without restaurantId")
            return NextResponse.json({ ok: true })
        }

        let body: any;
        try {
            const textBody = await req.text();
            if (!textBody) return NextResponse.json({ ok: true });
            body = JSON.parse(textBody);
        } catch (e) {
            return NextResponse.json({ ok: true });
        }

        const { message, callback_query } = body;
        const activeMessage = message || callback_query?.message;
        if (!activeMessage) return NextResponse.json({ ok: true })

        const chatId = activeMessage.chat.id
        const text = activeMessage.text
        const from = message ? message.from : callback_query?.from;
        const userId = from?.id
        if (!userId) return NextResponse.json({ ok: true })

        const userRef = adminDb.collection("telegram_users").doc(`${restaurantId}_${userId}`)
        const [userDoc, restaurantDoc] = await Promise.all([
            userRef.get(),
            adminDb.collection("restaurants").doc(restaurantId).get()
        ])

        if (!restaurantDoc.exists) return NextResponse.json({ ok: true })
        
        const userData = userDoc.exists ? userDoc.data() : null
        const restaurant = restaurantDoc.data()
        const botToken = restaurant?.telegramBotToken
        if (!botToken) return NextResponse.json({ ok: true })

        // Check Webhook Secret for security
        const currentSecret = botToken.split(":")[0]
        if (incomingSecret && incomingSecret !== currentSecret) {
            console.log(`[Security] Rejecting webhook: Wrong secret.`)
            return NextResponse.json({ ok: true })
        }

        const welcomeText = restaurant?.telegramWelcomeText || "Xush kelibsiz!"
        const successText = restaurant?.telegramSuccessText || "Muvaffaqiyatli ro'yxatdan o'tdingiz! \n\nQuyidagi tugma orqali menyuni ko'rishingiz mumkin:"
        const webAppUrl = restaurant?.telegramWebAppUrl || `https://menu.abdiaxatov.uz/${restaurant?.slug}`

        // Send Message Helper function
        const sendMessage = async (currentChatId: string | number, currentText: string, replyMarkup?: any) => {
            const bodyPayload: any = {
                chat_id: currentChatId,
                text: currentText,
                parse_mode: "HTML"
            }
            if (replyMarkup) {
                bodyPayload.reply_markup = replyMarkup
            }
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bodyPayload)
            }).catch(e => console.error("Telegram Send Error:", e))
        }

        // --- 1. HANDLE /START COMMAND ---
        if (message && (text === "/start" || text?.startsWith("/start "))) {
            if (userData?.phone && userData?.botState === "COMPLETED") {
                // Already registered
                await Promise.all([
                    userRef.update({ lastInteractionAt: FieldValue.serverTimestamp() }),
                    sendMessage(
                        chatId, 
                        `👋 <b>Assalomu alaykum yana bir bor, ${userData.firstName || from?.first_name}!</b>\n\nMenyuni ko'rish uchun pastdagi tugmani bosing:`,
                        {
                            inline_keyboard: [[{ text: "🍴 Menyuni ochish", web_app: { url: webAppUrl } }]]
                        }
                    )
                ])
                return NextResponse.json({ ok: true })
            } else {
                // Start NEW registration flow: Ask for Contact first
                await Promise.all([
                    userRef.set({
                        telegramId: userId,
                        chatId: chatId,
                        restaurantId: restaurantId,
                        username: from?.username || "",
                        telegram_firstName: from?.first_name || "",
                        telegram_lastName: from?.last_name || "",
                        firstName: from?.first_name || "Mijoz",
                        botState: "AWAITING_CONTACT",
                        lastInteractionAt: FieldValue.serverTimestamp()
                    }, { merge: true }),

                    sendMessage(
                        chatId,
                        `👋 <b>Assalomu alaykum, ${from?.first_name || "Mijoz"}!</b>\n\n${welcomeText}\n\n👇 Ro'yxatdan o'tish uchun iltimos, pastdagi <b>"📱 Raqamni yuborish"</b> tugmasini bosing:`,
                        {
                            keyboard: [[{ text: "📱 Raqamni yuborish", request_contact: true }]],
                            resize_keyboard: true,
                            one_time_keyboard: true,
                            is_persistent: false
                        }
                    )
                ])
                return NextResponse.json({ ok: true })
            }
        }

        // --- 3. HANDLE AWAITING CONTACT (User sends phone) ---
        if (message && message.contact) {
            const contact = message.contact
            const phone = contact.phone_number.startsWith("+") ? contact.phone_number : `+${contact.phone_number}`
            
            // If user natively shared contact without naming first, we fallback to their telegram name
            const currentName = userData?.firstName || from?.first_name || "Mijoz"

            await Promise.all([
                userRef.set({
                    telegramId: userId,
                    chatId: chatId,
                    restaurantId: restaurantId,
                    username: from?.username || "",
                    phone: phone,
                    firstName: currentName,
                    botState: "COMPLETED",
                    lastInteractionAt: FieldValue.serverTimestamp(),
                    registeredAt: userData?.registeredAt || FieldValue.serverTimestamp()
                }, { merge: true }),

                sendMessage(
                    chatId,
                    `✅ <b>Muvaffaqiyatli tasdiqlandi!</b>\n\n👤 Ism: <b>${currentName}</b>\n📱 Tel: <b>${phone}</b>\n\n${successText}`,
                    {
                        inline_keyboard: [[{ text: "🍴 Menyuni ochish", web_app: { url: webAppUrl } }]]
                    }
                )
            ])
            return NextResponse.json({ ok: true })
        }

        // --- 4. FALLBACKS ---
        if (message && text && !text.startsWith("/")) {
            if (userData?.botState === "AWAITING_CONTACT") {
                await sendMessage(
                    chatId,
                    "⚠️ <b>Iltimos, telefon raqamingizni yuboring!</b>\n\nPastki menyudagi <b>📱 Raqamni yuborish</b> maxsus tugmasini bosish orqali raqamingizni ulashing.",
                    {
                        keyboard: [[{ text: "📱 Raqamni yuborish", request_contact: true }]],
                        resize_keyboard: true,
                        one_time_keyboard: true,
                        is_persistent: false
                    }
                )
            } else if (!userData?.botState) {
                // Completely unknown user speaking
                await sendMessage(
                    chatId,
                    "Iltimos, botdan foydalanishni boshlash uchun /start buyrug'ini bosing."
                )
            }
            return NextResponse.json({ ok: true })
        }

        // --- 5. HANDLE CALLBACK QUERIES (Admin Confirmations, etc) ---
        if (callback_query) {
            const data = callback_query.data
            
            if (data?.startsWith("confirm_order_")) {
                const parts = data.split("_")
                const orderId = parts[2]
                const restId = parts[3] || restaurantId
                
                try {
                    const orderRef = adminDb.collection("restaurants").doc(restId).collection("orders").doc(orderId)
                    const orderDoc = await orderRef.get()
                    
                    if (orderDoc.exists) {
                        const orderData = orderDoc.data()
                        
                        // If the order belongs to a different restaurant than the one in the webhook URL, fetch its config
                        let currentRestaurant = restaurant;
                        if (restId !== restaurantId) {
                            const actualRestDoc = await adminDb.collection("restaurants").doc(restId).get();
                            if (actualRestDoc.exists) {
                                currentRestaurant = actualRestDoc.data();
                            }
                        }

                        // REGENERATE THE ORIGINAL MESSAGE TO PRESERVE HTML FORMATTING (links, bold, etc)
                        const regeneratedText = formatOrderMessage(orderData, orderId, currentRestaurant);

                        const actions: Promise<any>[] = [
                            orderRef.update({
                                status: "confirmed",
                                confirmedAt: FieldValue.serverTimestamp(),
                                confirmedBy: from?.username || from?.first_name || "Admin"
                            }),
                            
                            fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ callback_query_id: callback_query.id, text: "✅ Buyurtma tasdiqlandi!", show_alert: true })
                            }),
                            
                            fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    chat_id: chatId,
                                    message_id: callback_query.message.message_id,
                                    text: `${regeneratedText}\n\n✅ <b>TASDIQLANDI</b> (${new Date().toLocaleTimeString("uz-UZ")})`,
                                    parse_mode: "HTML",
                                    reply_markup: { inline_keyboard: [] }
                                })
                            })
                        ]

                        // Notify customer if they have a chatId
                        if (orderData?.chatId) {
                            actions.push(sendMessage(
                                orderData.chatId,
                                `✅ <b>Buyurtmangiz qabul qilindi!</b> (#${orderId.substring(0, 8)})\n\nTaomlaringiz tayyorlanishni boshladi. Yoqimli ishtaha! 😊`
                            ))
                        }

                        await Promise.all(actions)
                    }
                } catch (error) {
                    console.error("Confirmation error:", error)
                }
            }
            return NextResponse.json({ ok: true })
        }

        return NextResponse.json({ ok: true })
    } catch (error) {
        console.error("Webhook Error:", error)
        return NextResponse.json({ ok: true }) // Telegram requires exactly this
    }
}
