"use client"

import { useEffect, useRef, Suspense } from "react"
import { rtdb } from "@/lib/firebase"
import { ref, onValue, push, onDisconnect, set, serverTimestamp, update } from "firebase/database"
import { usePathname, useSearchParams } from "next/navigation"
import { v4 as uuidv4 } from "uuid"

// Helper to get OS
const getOS = (userAgent: string) => {
    const ua = userAgent.toLowerCase()
    if (/android/i.test(ua)) return "Android"
    if (/ipad|iphone|ipod/.test(ua)) return "iOS"
    if (/windows phone/i.test(ua)) return "Windows Phone"
    if (/win/i.test(ua)) return "Windows"
    if (/mac/i.test(ua)) return "MacOS"
    if (/linux/i.test(ua)) return "Linux"
    if (/cros/i.test(ua)) return "Chrome OS"
    return "Unknown OS"
}

// Helper to get Browser
const getBrowser = (userAgent: string) => {
    const ua = userAgent.toLowerCase()
    if (/edg/.test(ua)) return "Edge"
    if (/opr\//.test(ua) || /opera/.test(ua)) return "Opera"
    if (/chrome|crios/.test(ua)) {
        if (/brave/.test(ua)) return "Brave"
        return "Chrome"
    }
    if (/firefox|fxios/.test(ua)) return "Firefox"
    if (/safari/.test(ua)) return "Safari"
    return "Unknown Browser"
}

// Helper to get Device Model (Approximation)
const getDeviceModel = (userAgent: string) => {
    const ua = userAgent.toLowerCase()
    if (/ipad/.test(ua)) return "iPad"
    if (/iphone/.test(ua)) return "iPhone"
    if (/android/.test(ua)) {
        // Try to extract model from UA string "Android ...; Model Build/..."
        const match = ua.match(/android.+;\s([a-z0-9\s\-_]+)\sbuild\//)
        if (match && match[1]) return match[1].toUpperCase()
        return "Android Device"
    }
    if (/mac/.test(ua)) return "Mac"
    if (/win/.test(ua)) return "Windows PC"
    return "Desktop/Laptop"
}

// Helper to guess Country by Timezone
const getCountryByTimezone = () => {
    try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
        if (!tz) return "Unknown"

        // Simple mapping for common timezones
        if (tz.includes("Tashkent") || tz.includes("Samarkand") || tz.includes("Bukhara")) return "Uzbekistan"
        if (tz.includes("Moscow") || tz.includes("Vladivostok") || tz.includes("Yekaterinburg")) return "Russia"
        if (tz.includes("New_York") || tz.includes("Los_Angeles") || tz.includes("Chicago") || tz.includes("Denver")) return "USA"
        if (tz.includes("London")) return "UK"
        if (tz.includes("Seoul")) return "South Korea"
        if (tz.includes("Dubai")) return "UAE"
        if (tz.includes("Istanbul")) return "Turkey"
        if (tz.includes("Almaty") || tz.includes("Astana")) return "Kazakhstan"

        // Fallback: Return the region part of the timezone (e.g. "Asia" from "Asia/Tashkent")
        // Or if it splits by /, take the 2nd part which is often the city/country proxy
        const parts = tz.split("/")
        if (parts.length > 1) return parts[1].replace("_", " ") // "New_York" -> "New York"

        return tz
    } catch (e) {
        return "Unknown"
    }
}

export default function AnalyticsTracker({ restaurantId }: { restaurantId?: string }) {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const sessionIdRef = useRef<string | null>(null)

    useEffect(() => {
        if (typeof window === "undefined") return

        // 1. Initialize Session
        let sessionId = sessionStorage.getItem("analytics_session_id")
        let storedStartTime = sessionStorage.getItem("analytics_session_start_time")

        const isNewSession = !sessionId

        if (!sessionId) {
            sessionId = uuidv4()
            sessionStorage.setItem("analytics_session_id", sessionId)
            storedStartTime = Date.now().toString()
            sessionStorage.setItem("analytics_session_start_time", storedStartTime)
        }
        sessionIdRef.current = sessionId

        const userAgent = window.navigator.userAgent
        const deviceType = /mobile|android|iphone|ipad|ipod/i.test(userAgent) ? "Mobile" : "Desktop"
        const os = getOS(userAgent)
        const browser = getBrowser(userAgent)
        const country = getCountryByTimezone()
        const language = window.navigator.language
        const screenRes = `${window.screen.width}x${window.screen.height}`
        const deviceModel = getDeviceModel(userAgent)

        const today = new Date().toISOString().split('T')[0]

        // Define paths
        const globalSessionRef = ref(rtdb, `analytics/sessions/${today}/${sessionId}`)
        const globalOnlineRef = ref(rtdb, `analytics/online/${sessionId}`)

        // Ensure restaurantId is a string to avoid [object Object] bug
        const rid = restaurantId ? String(restaurantId) : null

        // Restaurant specific paths
        const restSessionRef = rid ? ref(rtdb, `analytics/restaurants/${rid}/sessions/${today}/${sessionId}`) : null
        const restOnlineRef = rid ? ref(rtdb, `analytics/restaurants/${rid}/online/${sessionId}`) : null

        // Use valid timestamp
        const startTimeVal = storedStartTime ? parseInt(storedStartTime) : serverTimestamp()

        // Construct full path including query params
        const queryString = searchParams.toString()
        const fullPath = queryString ? `${pathname}?${queryString}` : pathname

        const sessionData = {
            id: sessionId,
            startTime: startTimeVal,
            lastActive: serverTimestamp(),
            device: deviceType,
            deviceModel,
            os,
            browser,
            country,
            screen: screenRes,
            language,
            path: fullPath, // Use fullPath
            referrer: document.referrer || "Direct",
            status: "active",
            restaurantId: restaurantId || null
        }

        const updateData = {
            lastActive: serverTimestamp(),
            status: "active",
            country: country,
            deviceModel,
            path: fullPath // Use fullPath
        }

        // 2. Set Session Data
        if (isNewSession) {
            set(globalSessionRef, sessionData)
            if (restSessionRef) set(restSessionRef, sessionData)
        } else {
            // Update Global typically just needs activity update
            update(globalSessionRef, updateData)

            // For Restaurant: It might be the FIRST time we see this session in THIS restaurant context.
            // So we should perform a 'set' (or update with full data) to ensure the node exists with start time.
            // Using 'update' with full sessionData merges everything safely.
            if (restSessionRef) update(restSessionRef, sessionData)
        }

        // 3. Online Presence with Heartbeat
        const connectedRef = ref(rtdb, ".info/connected")

        const unsubConnected = onValue(connectedRef, (snap) => {
            if (snap.val() === true) {
                // Global cleanup
                onDisconnect(globalOnlineRef).remove()
                onDisconnect(globalSessionRef).update({
                    status: "ended",
                    lastActive: serverTimestamp()
                })

                // Restaurant cleanup
                if (restOnlineRef) onDisconnect(restOnlineRef).remove()
                if (restSessionRef) onDisconnect(restSessionRef).update({
                    status: "ended",
                    lastActive: serverTimestamp()
                })

                const onlineData = {
                    id: sessionId,
                    device: deviceType,
                    deviceModel,
                    os,
                    browser,
                    country,
                    path: fullPath, // Use fullPath
                    startTime: serverTimestamp(),
                    restaurantId: restaurantId || null
                }

                set(globalOnlineRef, onlineData)
                if (restOnlineRef) set(restOnlineRef, onlineData)
            }
        })

        // 4. Track Page Views
        const pageViewData = {
            path: fullPath, // Use fullPath
            timestamp: serverTimestamp(),
            title: document.title
        }

        const globalPageViewRef = ref(rtdb, `analytics/sessions/${today}/${sessionId}/pages`)
        push(globalPageViewRef, pageViewData)

        if (rid) {
            const restPageViewRef = ref(rtdb, `analytics/restaurants/${rid}/sessions/${today}/${sessionId}/pages`)
            push(restPageViewRef, pageViewData)
        }

        // Update current path in online status
        update(globalOnlineRef, { path: fullPath }) // Use fullPath
        if (restOnlineRef) update(restOnlineRef, { path: fullPath }) // Use fullPath

        return () => {
            unsubConnected()
        }
    }, [pathname, searchParams, restaurantId]) // Re-run if restaurantId changes

    return null
}
