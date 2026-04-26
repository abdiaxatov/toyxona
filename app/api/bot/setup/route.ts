import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { token, restaurantId, webAppUrl: customWebAppUrl } = body

        if (!token || !restaurantId) {
            return NextResponse.json({ error: "Token va Restaurant ID kiritilmagan" }, { status: 400 })
        }

        // Get origin from request URL or headers (handles localhost and production/ngrok domains)
        const forwardedHost = req.headers.get("x-forwarded-host") || req.headers.get("host")
        const protocol = req.headers.get("x-forwarded-proto") || "https" // Fallback to https (Telegram requires HTTPS)
        const origin = forwardedHost ? `${protocol}://${forwardedHost}` : new URL(req.url).origin

        // Setup the specific webhook path
        const secret = token.split(":")[0] // Use first part of bot token as a basic security secret
        const webhookUrl = `${origin}/api/bot/webhook?restaurantId=${restaurantId}&secret=${secret}`

        // 1. Trigger telegram setWebhook
        const webhookResponse = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                url: webhookUrl,
                drop_pending_updates: true // Good practice to drop pending to prevent old message loops
            })
        })

        if (!webhookResponse.ok) {
            const data = await webhookResponse.json()
            console.error("Telegram setWebhook error:", data)
            return NextResponse.json({ error: data.description || "Telegram API dagi xatolik (Webhook)" }, { status: 400 })
        }

        // 2. Synchronize Menu Button URL (Crucial for ID detection)
        const finalWebAppUrl = customWebAppUrl || `${origin}/demo`
        const menuButtonResponse = await fetch(`https://api.telegram.org/bot${token}/setChatMenuButton`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                menu_button: {
                    type: "web_app",
                    text: "🍴 Menyu",
                    web_app: {
                        url: finalWebAppUrl
                    }
                }
            })
        })

        if (!menuButtonResponse.ok) {
            const data = await menuButtonResponse.json()
            console.warn("Telegram setChatMenuButton error:", data)
            // We don't fail the whole setup if only menu button fails, but we log it
        }

        return NextResponse.json({ success: true, message: "Webhook va Menu tugmasi muvaffaqiyatli sozlandi!" })
    } catch (error) {
        console.error("Bot setup error:", error)
        return NextResponse.json({ error: "Server xatoligi" }, { status: 500 })
    }
}
