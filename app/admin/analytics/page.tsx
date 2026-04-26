"use client"

import { useEffect, useState, useMemo } from "react"
import { cn } from "@/lib/utils"

import { rtdb, db } from "@/lib/firebase"
import { ref, onValue, get, child } from "firebase/database"
import { collection, query, getDocs, orderBy, limit } from "firebase/firestore"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card"
import {
    Activity,
    Users,
    Smartphone,
    Monitor,
    Clock,
    Globe,
    MousePointerClick,
    ArrowUpRight,
    ArrowDownRight,
    Map as MapIcon,
    BarChart3,
    LineChart as LineChartIcon,
    PieChart as PieChartIcon,
    Laptop,
    Chrome,
    Utensils,
    Download,
    TrendingUp,
    CheckCircle2
} from "lucide-react"
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
    BarChart,
    Bar,
    LineChart,
    Line
} from "recharts"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
// Use try-catch or conditional import if possible, but for Next.js explicit import is better.
// Assuming WorldMap is created in previous step.
import WorldMap from "@/components/admin/analytics/world-map"
import { useLanguage } from "@/hooks/use-language"
import { useAuth } from "@/components/admin/admin-auth-provider"
import { useRestaurant } from "@/components/admin/restaurant-provider"

// --- TYPES ---
type SessionData = {
    id: string
    device: string
    os: string
    browser: string
    screen: string
    language: string
    country?: string
    status: string
    startTime: number
    lastActive: number
    path: string
    referrer: string
    pages?: Record<string, { title: string, path: string, timestamp: number }>
    restaurantId?: string
}

type OnlineUser = {
    id: string
    device: string
    os: string
    browser: string
    country?: string
    path: string
    restaurantId?: string
    startTime: number
}

// --- CONSTANTS ---
// Professional Colors based on Primary (Blue/Indigo usually)
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']
const PRIMARY_GRADIENT = ["bg-primary", "#eff6ff"] // Indigo/Blue based

export default function AnalyticsPage() {
    // --- STATE ---
    const [dateRange, setDateRange] = useState<"today" | "week" | "month" | "year">("today")
    const [chartType, setChartType] = useState<"area" | "bar" | "line">("area")
    const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
    const [sessions, setSessions] = useState<SessionData[]>([])
    const [allRestaurants, setAllRestaurants] = useState<any[]>([])
    const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | "all">("all")
    const [restaurantRevenue, setRestaurantRevenue] = useState<Record<string, number>>({})
    const [restaurantNames, setRestaurantNames] = useState<Record<string, string>>({})
    const [categoryMap, setCategoryMap] = useState<Record<string, { name: string, color?: string }>>({})
    const [itemToCategoryMap, setItemToCategoryMap] = useState<Record<string, string>>({})
    const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [fetchingRevenue, setFetchingRevenue] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const { t, language } = useLanguage()
    const { userRole, restaurantId } = useAuth() // Get role and ID

    // --- DATA FETCHING ---
    useEffect(() => {
        if (onlineUsers.length > 0 && !selectedCountry) {
            const topC = onlineUsers[0].country
            if (topC) setSelectedCountry(topC)
        }
    }, [onlineUsers])
    useEffect(() => {
        setLoading(true)
        setError(null)

        // Determine Base Path
        // If Super Admin -> Use Global "analytics/" (or allow selection in future, currently Global)
        // If Admin -> Use "analytics/restaurants/{id}/"
        const isGlobalAdmin = userRole === "super_admin" || userRole === "co_founder"
        const basePath = (isGlobalAdmin || !restaurantId) ? "analytics" : `analytics/restaurants/${restaurantId}`

        // 1. Online Users (Real-time)
        const onlineRef = ref(rtdb, `${basePath}/online`)
        const unsubOnline = onValue(onlineRef,
            (snap) => {
                if (snap.exists()) {
                    setOnlineUsers(Object.values(snap.val()))
                } else {
                    setOnlineUsers([])
                }
            },

            (err) => {
                console.error("Online Error:", err)
                setError(err.message)
                setLoading(false)
            }
        )

        // Safety timeout in case Firebase hangs
        const timeoutId = setTimeout(() => {
            setLoading(false)
        }, 5000)

        // 2. Session History (Multi-day support)
        const fetchSessions = async () => {
            try {
                // Fetch Restaurant Names for Mapping
                let restaurantNames: Record<string, string> = {}
                try {
                    const rSnap = await getDocs(query(collection(db, "restaurants")))
                    const rNames: Record<string, string> = {}
                    const rList: any[] = []
                    rSnap.forEach(d => {
                        const data = d.data()
                        rNames[d.id] = data.name || "Nomsiz Restoran"
                        rList.push({ id: d.id, ...data })
                    })
                    setRestaurantNames(rNames)
                    setAllRestaurants(rList)

                    // Fetch Categories and Menu Items for ID mapping
                    // In a real app with many restaurants, we'd only fetch for the current one
                    // but for simplicity and better global analytics, we fetch what we can.
                    const cRef = (isGlobalAdmin || !restaurantId) ? collection(db, "categories") : collection(db, `restaurants/${restaurantId}/categories`)
                    const iRef = (isGlobalAdmin || !restaurantId) ? collection(db, "menuItems") : collection(db, `restaurants/${restaurantId}/menuItems`)

                    const [cSnap, iSnap] = await Promise.all([getDocs(cRef), getDocs(iRef)])

                    const cMap: Record<string, { name: string, color?: string }> = {}
                    cSnap.forEach(d => {
                        const data = d.data()
                        cMap[d.id] = {
                            name: language === 'uz' ? (data.name_uz || data.name) : (data.name_ru || data.name),
                            color: data.color
                        }
                    })
                    setCategoryMap(cMap)

                    const itcMap: Record<string, string> = {}
                    iSnap.forEach(d => {
                        const data = d.data()
                        itcMap[d.id] = data.categoryId
                    })
                    setItemToCategoryMap(itcMap)
                } catch (e) { console.error("Error fetching mapping data", e) }

                const dates: string[] = []
                const today = new Date()

                let daysToFetch = 1
                if (dateRange === 'week') daysToFetch = 7
                if (dateRange === 'month') daysToFetch = 30
                if (dateRange === 'year') daysToFetch = 365

                for (let i = 0; i < daysToFetch; i++) {
                    const d = new Date()
                    d.setDate(today.getDate() - i)
                    dates.push(d.toISOString().split('T')[0])
                }

                // We listen to "Today" in real-time
                // We fetch past days once to avoid too many listeners

                // Base path logic repeated or captured from above scope? 
                // It is inside the same effect, so variables are accessible.
                // Wait, I replaced lines 96-121, but now I am targeting 133+. The basePath variable is in scope of the useEffect.

                const todayStr = dates[0]
                const pastDates = dates.slice(1)
                let allSessions: SessionData[] = []

                // Fetch past
                if (pastDates.length > 0) {
                    const promises = pastDates.map(date => {
                        return get(child(ref(rtdb), `${basePath}/sessions/${date}`))
                    })
                    const snapshots = await Promise.all(promises)
                    snapshots.forEach(snap => {
                        if (snap.exists()) {
                            // @ts-ignore
                            allSessions = [...allSessions, ...Object.values(snap.val())]
                        }
                    })
                }

                // Listen to Today
                const todayRef = ref(rtdb, `${basePath}/sessions/${todayStr}`)
                const unsubToday = onValue(todayRef, (snap) => {
                    let todaySessions: any[] = []
                    if (snap.exists()) {
                        todaySessions = Object.values(snap.val())
                    }

                    // Combine Past + Today
                    // We need to deduplicate if logic changes, but here dates are distinct keys
                    setSessions([...todaySessions, ...allSessions])
                    setLoading(false)
                }, (err) => {
                    console.error("Today Sessions Error:", err)
                    setError(err.message)
                    setLoading(false)
                })

                return () => unsubToday()
            } catch (e: any) {
                console.error("Fetch Error:", e)
                setError(e.message)
                setLoading(false)
                return () => { }
            }
        }

        // 3. Fetch Revenue (If Super Admin)
        const fetchRevenue = async () => {
            if (userRole !== "super_admin" && userRole !== "co_founder") return

            setFetchingRevenue(true)
            try {
                // Fetch orders for the current range to estimate revenue
                // Since firestore doesn't support easy global cross-collection aggregation without subcollections,
                // we'll try to fetch recently updated orders if they are stored globally, 
                // but usually they are per restaurant.
                // For this implementation, we'll fetch from a global 'orders' collection if it exists,
                // or just leave it for visits unless we want to iterate all restaurants (too heavy).
                // Let's check if there's a global 'orders' collection.
                const ordersSnapshot = await getDocs(query(
                    collection(db, "orders"),
                    orderBy("createdAt", "desc"),
                    limit(500)
                ))

                const revMap: Record<string, number> = {}
                ordersSnapshot.forEach(doc => {
                    const data = doc.data()
                    if (data.status === "paid" && data.restaurantId) {
                        revMap[data.restaurantId] = (revMap[data.restaurantId] || 0) + (data.total || 0)
                    }
                })
                setRestaurantRevenue(revMap)
            } catch (e) {
                console.error("Revenue Fetch Error:", e)
            } finally {
                setFetchingRevenue(false)
            }
        }

        const cleanupPromise = fetchSessions()
        fetchRevenue()

        return () => {
            unsubOnline()
            clearTimeout(timeoutId)
            cleanupPromise.then(cleanup => cleanup && cleanup())
        }
    }, [dateRange, userRole, restaurantId])

    // --- FILTERED DATA ---
    const filteredSessions = useMemo(() => {
        const isGlobalAdmin = userRole === "super_admin" || userRole === "co_founder"
        if (isGlobalAdmin && selectedRestaurantId !== "all") {
            return sessions.filter(s => s.restaurantId === selectedRestaurantId)
        }
        return sessions
    }, [sessions, selectedRestaurantId, userRole])

    const filteredOnline = useMemo(() => {
        const isGlobalAdmin = userRole === "super_admin" || userRole === "co_founder"
        if (isGlobalAdmin && selectedRestaurantId !== "all") {
            return onlineUsers.filter(u => u.restaurantId === selectedRestaurantId)
        }
        return onlineUsers
    }, [onlineUsers, selectedRestaurantId, userRole])

    // --- AGGREGATIONS ---
    const metrics = useMemo(() => {
        const totalVisits = filteredSessions.length
        const totalPageviews = filteredSessions.reduce((acc, s) => acc + (s.pages ? Object.keys(s.pages).length : 1), 0)

        // Avg Duration (FIXED NaN and Huge Numbers)
        const validSessions = filteredSessions.filter(s => s.startTime && s.startTime > 1600000000000)

        const totalDurationMs = validSessions.reduce((acc, s) => {
            const start = s.startTime
            const end = s.lastActive || start
            const duration = end - start
            // Ignore valid-looking but negative or excessively long durations (e.g. > 24 hours) as glitches
            if (duration < 0 || duration > 86400000) return acc
            return acc + duration
        }, 0)

        const avgDurationSec = validSessions.length > 0 ? Math.round((totalDurationMs / validSessions.length) / 1000) : 0
        const formatDuration = (sec: number) => {
            if (isNaN(sec)) return "0m 0s"
            const min = Math.floor(sec / 60)
            const s = sec % 60
            return `${min}m ${s}s`
        }

        // Device Stats
        const devices: Record<string, number> = {}
        validSessions.forEach(s => {
            const d = s.device || "Unknown"
            devices[d] = (devices[d] || 0) + 1
        })
        const deviceData = Object.entries(devices).map(([name, value]) => ({ name, value }))

        // Country Stats (For Map - Merged with Online Users for Live status)
        const countries: Record<string, number> = {}
        // From sessions
        validSessions.forEach(s => {
            const c = s.name || s.country || "Unknown"
            countries[c] = (countries[c] || 0) + 1
        })
        // From online users - to ensure live countries are always listed/hit
        filteredOnline.forEach(u => {
            const c = u.country || "Unknown"
            // If they are online, they should at least show as a hit even if they haven't finished a session
            if (!countries[c]) countries[c] = 0
            countries[c] += 1
        })

        const countryData = Object.entries(countries)
            .filter(([name]) => name !== "Unknown") // Clean up cleanup
            .sort(([, a], [, b]) => b - a)
            .map(([name, value]) => ({ name, value }))

        // OS Stats
        const osCounts: Record<string, number> = {}
        validSessions.forEach(s => {
            const os = s.os || "Boshqa"
            osCounts[os] = (osCounts[os] || 0) + 1
        })
        const osData = Object.entries(osCounts).map(([name, value]) => ({ name, value }))

        // Browser Stats
        const browserCounts: Record<string, number> = {}
        validSessions.forEach(s => {
            const b = s.browser || "Boshqa"
            browserCounts[b] = (browserCounts[b] || 0) + 1
        })
        const browserData = Object.entries(browserCounts).map(([name, value]) => ({ name, value }))

        // Chart Data Aggregation based on DateRange
        let chartData: { label: string, visits: number }[] = []

        if (dateRange === 'today') {
            const hours = new Array(24).fill(0)
            validSessions.forEach(s => {
                const d = new Date(s.startTime)
                hours[d.getHours()]++
            })
            chartData = hours.map((visits, h) => ({ label: `${h}:00`, visits }))
        } else if (dateRange === 'week') {
            const dayNames = ["Yak", "Du", "Se", "Chor", "Pay", "Ju", "Sha"]
            const last7Days: Record<string, number> = {}
            for (let i = 6; i >= 0; i--) {
                const d = new Date()
                d.setDate(d.getDate() - i)
                last7Days[d.toISOString().split('T')[0]] = 0
            }
            validSessions.forEach(s => {
                const dateKey = new Date(s.startTime).toISOString().split('T')[0]
                if (last7Days[dateKey] !== undefined) last7Days[dateKey]++
            })
            chartData = Object.entries(last7Days).map(([date, visits]) => {
                const d = new Date(date)
                return { label: dayNames[d.getDay()], visits }
            })
        } else if (dateRange === 'month') {
            const last30Days: Record<string, number> = {}
            for (let i = 29; i >= 0; i--) {
                const d = new Date()
                d.setDate(d.getDate() - i)
                last30Days[d.toISOString().split('T')[0]] = 0
            }
            validSessions.forEach(s => {
                const dateKey = new Date(s.startTime).toISOString().split('T')[0]
                if (last30Days[dateKey] !== undefined) last30Days[dateKey]++
            })
            chartData = Object.entries(last30Days).map(([date, visits]) => {
                const d = new Date(date)
                return { label: d.getDate().toString(), visits }
            })
        } else if (dateRange === 'year') {
            const monthNames = ["Yan", "Feb", "Mar", "Apr", "May", "Iyun", "Iyul", "Avg", "Sen", "Okt", "Noy", "Dek"]
            const yearData = new Array(12).fill(0)
            const currentYear = new Date().getFullYear()
            validSessions.forEach(s => {
                const d = new Date(s.startTime)
                if (d.getFullYear() === currentYear) {
                    yearData[d.getMonth()]++
                }
            })
            chartData = yearData.map((visits, m) => ({ label: monthNames[m], visits }))
        }

        // Top Pages
        const pageCounts: Record<string, number> = {}
        validSessions.forEach(s => {
            if (s.pages) {
                Object.values(s.pages).forEach(p => {
                    // Use Title if available and meaningful, else fallback to Path
                    // Clean up path for display
                    let name = p.title || p.path
                    if (name === "7days-burger" || name === "Menu") {
                        // If generic title, try to use path to be more specific if it has params
                        if (p.path.includes("?")) {
                            try {
                                const url = new URL(p.path, "http://localhost")
                                const cat = url.searchParams.get("category")
                                if (cat) name = `Kategoriya: ${cat.charAt(0).toUpperCase() + cat.slice(1)}`
                            } catch (e) { }
                        }
                    }
                    pageCounts[name] = (pageCounts[name] || 0) + 1
                })
            } else {
                let name = s.path
                if (name.includes("?")) {
                    try {
                        const url = new URL(name, "http://localhost")
                        const cat = url.searchParams.get("category")
                        if (cat) name = `Kategoriya: ${cat.charAt(0).toUpperCase() + cat.slice(1)}`
                    } catch (e) { }
                }
                pageCounts[name] = (pageCounts[name] || 0) + 1
            }
        })
        const topPages = Object.entries(pageCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([name, value]) => ({ name, value }))

        // Popular Dishes Analytics
        const dishCounts: Record<string, number> = {}
        validSessions.forEach(s => {
            if (s.pages) {
                Object.values(s.pages).forEach(p => {
                    if (p.path && p.path.startsWith("dish:")) {
                        const name = p.title || p.path.split(":")[1]
                        dishCounts[name] = (dishCounts[name] || 0) + 1
                    }
                })
            }
        })
        const topDishes = Object.entries(dishCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([name, value]) => ({ name, value }))

        // Category Statistics
        const catStats: Record<string, number> = {}
        validSessions.forEach(s => {
            if (s.pages) {
                Object.values(s.pages).forEach(p => {
                    if (p.path && p.path.startsWith("dish:")) {
                        const dishId = p.path.split(":")[1]
                        const catId = itemToCategoryMap[dishId]
                        if (catId && categoryMap[catId]) {
                            const catName = categoryMap[catId].name
                            catStats[catName] = (catStats[catName] || 0) + 1
                        }
                    }
                })
            }
        })
        const topCategories = Object.entries(catStats)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([name, value]) => ({ name, value }))

        // Referrer Stats
        const referrerCounts: Record<string, number> = {}
        validSessions.forEach(s => {
            // Parse referrer to get domain or "Direct"
            let refStr = s.referrer || "Direct"
            if (refStr !== "Direct" && refStr.startsWith("http")) {
                try {
                    const url = new URL(refStr)
                    refStr = url.hostname
                } catch (e) { /* ignore */ }
            }
            referrerCounts[refStr] = (referrerCounts[refStr] || 0) + 1
        })
        const referrerData = Object.entries(referrerCounts).map(([name, value]) => ({ name, value }))

        // Device Model Stats (replacing OS for more detail or adding alongside)
        const modelCounts: Record<string, number> = {}
        validSessions.forEach(s => {
            // @ts-ignore - deviceModel might be missing in old data
            const model = s.deviceModel || s.os || "Unknown"
            modelCounts[model] = (modelCounts[model] || 0) + 1
        })
        const modelData = Object.entries(modelCounts).map(([name, value]) => ({ name, value }))

        // Restaurant Stats
        const restaurantStats: Record<string, { visits: number, online: number, name: string }> = {}

        validSessions.forEach(s => {
            if (s.restaurantId) {
                if (!restaurantStats[s.restaurantId]) {
                    restaurantStats[s.restaurantId] = { visits: 0, online: 0, name: restaurantNames[s.restaurantId] || s.restaurantId }
                }
                restaurantStats[s.restaurantId].visits += 1
            }
        })

        onlineUsers.forEach(u => {
            if (u.restaurantId) {
                if (!restaurantStats[u.restaurantId]) {
                    restaurantStats[u.restaurantId] = { visits: 0, online: 0, name: restaurantNames[u.restaurantId] || u.restaurantId }
                }
                restaurantStats[u.restaurantId].online += 1
            }
        })

        const topRestaurants = Object.entries(restaurantStats)
            .map(([id, data]) => ({
                id,
                ...data,
                revenue: restaurantRevenue[id] || 0
            }))
            .sort((a, b) => b.visits - a.visits)

        return {
            totalVisits,
            totalPageviews,
            avgDuration: formatDuration(avgDurationSec),
            deviceData,
            osData,
            browserData,
            countryData,
            chartData, // Dynamically aggregated
            topPages,
            topDishes,
            topCategories,
            referrerData,
            modelData,
            topRestaurants,
            bounceRate: "0%"
        }
    }, [sessions, onlineUsers, restaurantNames, categoryMap, itemToCategoryMap, language])

    // --- CHART RENDERER ---
    const { restaurant } = useRestaurant()
    const renderMainChart = () => {
        // Use CSS variable for color (extracted via simple string or just use a helper if possible, 
        // strictly recharts wants hex usually, but we can stick to a safe default that matches the CSS or use a known hex derived from 217 80% 10% which is #05152e)
        const PrimaryColor = restaurant?.primaryColor || "#0f172a" // Use restaurant color or default slate-900

        const CommonProps = {
            data: metrics.chartData,
            margin: { top: 10, right: 10, left: 0, bottom: 0 }
        }

        if (chartType === 'bar') {
            return (
                <BarChart {...CommonProps}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} stroke="#888" fontSize={11} />
                    <YAxis axisLine={false} tickLine={false} stroke="#888" fontSize={12} />
                    <Tooltip contentStyle={{ borderRadius: '12px' }} />
                    <Bar dataKey="visits" fill={PrimaryColor} radius={[4, 4, 0, 0]} />
                </BarChart>
            )
        }
        if (chartType === 'line') {
            return (
                <LineChart {...CommonProps}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} stroke="#888" fontSize={11} />
                    <YAxis axisLine={false} tickLine={false} stroke="#888" fontSize={12} />
                    <Tooltip contentStyle={{ borderRadius: '12px' }} />
                    <Line type="monotone" dataKey="visits" stroke={PrimaryColor} strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
            )
        }
        return (
            <AreaChart {...CommonProps}>
                <defs>
                    <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={PrimaryColor} stopOpacity={0.8} />
                        <stop offset="95%" stopColor={PrimaryColor} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} stroke="#888" fontSize={11} />
                <YAxis axisLine={false} tickLine={false} stroke="#888" fontSize={12} />
                <Tooltip contentStyle={{ borderRadius: '12px' }} />
                <Area type="monotone" dataKey="visits" stroke={PrimaryColor} strokeWidth={3} fillOpacity={1} fill="url(#colorTraffic)" />
            </AreaChart>
        )
    }

    const renderDishesChart = () => {
        const PrimaryColor = restaurant?.primaryColor || "#3b82f6"
        return (
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    layout="vertical"
                    data={metrics.topDishes}
                    margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
                    <XAxis type="number" hide />
                    <YAxis
                        dataKey="name"
                        type="category"
                        width={90}
                        axisLine={false}
                        tickLine={false}
                        fontSize={10}
                        tick={{ fill: 'currentColor', fontSize: '10px', fontWeight: 500 }}
                    />
                    <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 16px rgba(0,0,0,0.1)', fontSize: '12px' }}
                        cursor={{ fill: 'rgba(0,0,0,0.05)', radius: 4 }}
                    />
                    <Bar
                        dataKey="value"
                        fill={PrimaryColor}
                        radius={[0, 4, 4, 0]}
                        barSize={18}
                    >
                        {metrics.topDishes.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? PrimaryColor : `${PrimaryColor}88`} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        )
    }

    // --- UI RENDER ---
    if (error && error.includes("permission_denied")) {
        return (
            <div className="flex flex-col items-center justify-center h-[80vh] space-y-4 animate-in fade-in">
                <div className="p-4 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-full">
                    <Users className="w-12 h-12" />
                </div>
                <h2 className="text-2xl font-bold">Ruxsat Berilmadi</h2>
                <p className="text-center max-w-md text-muted-foreground">
                    Firebase Database Rules sozlanmagan. Iltimos, Firebase Console ga kirib "Rules" bo'limiga ruxsatlarni qo'shing.
                </p>
                <Button onClick={() => window.location.reload()}>Qayta Yuklash</Button>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="p-6 space-y-8 animate-in fade-in">
                <div className="space-y-2">
                    <div className="h-8 w-64 bg-muted/50 rounded animate-pulse" />
                    <div className="h-4 w-40 bg-muted/50 rounded animate-pulse" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-muted/50 rounded-xl animate-pulse" />)}
                </div>
                <div className="h-64 bg-muted/50 rounded-xl animate-pulse" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background/50 p-4 md:p-6 space-y-6 md:space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl md:text-5xl font-black tracking-tighter bg-gradient-to-r from-primary via-blue-600 to-emerald-500 bg-clip-text text-transparent uppercase">
                        {t("analytics.title")}
                    </h1>
                    <p className="text-muted-foreground mt-1 flex items-center gap-2">
                        <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        {t("analytics.subtitle")}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 bg-card p-1 rounded-lg border shadow-sm self-start lg:self-auto">
                    {(userRole === "super_admin" || userRole === "co_founder") && (
                        <div className="mr-2">
                            <Select
                                value={selectedRestaurantId}
                                onValueChange={(v) => setSelectedRestaurantId(v)}
                            >
                                <SelectTrigger className="h-8 w-[180px] text-xs md:text-sm border-none bg-muted/50 focus:ring-0">
                                    <SelectValue placeholder="Restoranni tanlang" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Barcha Restoranlar</SelectItem>
                                    {allRestaurants.map(r => (
                                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    {["today", "week", "month", "year"].map((r) => (
                        <Button
                            key={r}
                            variant={dateRange === r ? "default" : "ghost"}
                            onClick={() => setDateRange(r as any)}
                            className="capitalize rounded-md h-8 text-xs md:text-sm px-3"
                        >
                            {t(`common.${r}`)}
                        </Button>
                    ))}
                    <Button
                        variant="outline"
                        onClick={() => window.location.reload()}
                        className="h-8 w-8 p-0 ml-2"
                        title={t("common.updated")}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-rotate-cw"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /></svg>
                    </Button>
                    <Button
                        variant="default"
                        size="sm"
                        className="h-8 ml-2 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-md hidden md:flex"
                        onClick={() => alert(t("analytics.exportAlert") || "Eksport qilish funksiyasi tez kunda qo'shiladi")}
                    >
                        <Download className="w-3 h-3" />
                        <span>{t("analytics.exportPdf") || "PDF"}</span>
                    </Button>
                </div>
            </div>

            {/* Metrics -- SCROLLABLE ON MOBILE */}
            <div className="flex overflow-x-auto pb-4 gap-4 md:grid md:grid-cols-2 lg:grid-cols-4 md:gap-6 snap-x snap-mandatory -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
                <div className="min-w-[280px] snap-center">
                    <MetricCard
                        title={t("analytics.metrics.visits")}
                        value={metrics.totalVisits}
                        icon={<Users className="w-4 h-4 text-blue-500" />}
                        desc={t("analytics.metrics.yesterdayTrend")} trend="up"
                    />
                </div>
                <div className="min-w-[280px] snap-center">
                    <MetricCard
                        title={t("analytics.metrics.pageviews")}
                        value={metrics.totalPageviews}
                        icon={<MousePointerClick className="w-4 h-4 text-purple-500" />}
                        desc={t("analytics.metrics.pageVisit")} trend="up"
                    />
                </div>
                <div className="min-w-[280px] snap-center">
                    <MetricCard
                        title={t("analytics.metrics.avgTime")}
                        value={metrics.avgDuration}
                        icon={<Clock className="w-4 h-4 text-green-500" />}
                        desc={t("analytics.metrics.goodResult")} trend="up"
                    />
                </div>
                <div className="min-w-[280px] snap-center">
                    <Card className="border-none shadow-xl bg-primary text-white relative overflow-hidden group h-full">
                        {/* Decorative Elements */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-white/20 transition-all" />
                        <CardHeader className="flex flex-row items-center justify-between pb-2 z-10 relative">
                            <CardTitle className="text-sm font-medium text-white/80">{t("analytics.metrics.online")}</CardTitle>
                            <Activity className="h-4 w-4 animate-pulse text-white" />
                        </CardHeader>
                        <CardContent className="z-10 relative">
                            <div className="text-4xl font-bold">{onlineUsers.length}</div>
                            <p className="text-xs text-white/70 mt-1">{t("analytics.metrics.realtime")}</p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Main Chart Section */}
            <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
                <Card className="col-span-1 lg:col-span-4 border-none shadow-lg bg-card/60 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>{t("analytics.charts.dynamic")}</CardTitle>
                            <CardDescription>{dateRange === 'today' ? t("analytics.charts.hourly") : dateRange === 'week' ? t("analytics.charts.daily") : dateRange === 'month' ? t("analytics.charts.monthly") : t("analytics.charts.annual")}</CardDescription>
                        </div>
                        <div className="flex bg-muted rounded-lg p-1 gap-1">
                            <Button size="icon" variant={chartType === 'area' ? 'secondary' : 'ghost'} className="h-6 w-6" onClick={() => setChartType('area')}><Activity className="w-4 h-4" /></Button>
                            <Button size="icon" variant={chartType === 'bar' ? 'secondary' : 'ghost'} className="h-6 w-6" onClick={() => setChartType('bar')}><BarChart3 className="w-4 h-4" /></Button>
                            <Button size="icon" variant={chartType === 'line' ? 'secondary' : 'ghost'} className="h-6 w-6" onClick={() => setChartType('line')}><LineChartIcon className="w-4 h-4" /></Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                {renderMainChart()}
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* World Map & Country List -- Enhanced Layout */}
                <Card className="col-span-1 lg:col-span-3 border-none shadow-lg bg-card/60 backdrop-blur-sm overflow-hidden flex flex-col">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2"><Globe className="w-5 h-5 text-blue-500" /> {t("analytics.charts.geography")}</CardTitle>
                        <CardDescription>{t("analytics.charts.whereFrom")}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 flex flex-col md:flex-row">
                        <div className="flex-1 min-h-[250px] md:min-h-[300px] bg-blue-50/30 dark:bg-blue-900/10 relative">
                            {/* Map Overlay info */}
                            <div className="absolute top-4 left-4 z-10 bg-background/80 backdrop-blur px-3 py-1 rounded-full border text-xs font-medium shadow-sm">
                                {metrics.countryData.length} {t("analytics.charts.countries")}
                            </div>
                            <WorldMap
                                data={metrics.countryData}
                                selectedCountry={selectedCountry}
                                onCountryClick={(name) => setSelectedCountry(name === selectedCountry ? null : name)}
                            />
                        </div>
                        <div className="md:w-[250px] border-t md:border-t-0 md:border-l border-border/50 bg-background/40">
                            <div className="p-3 border-b border-border/50 bg-muted/20">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("analytics.charts.topCountries")}</span>
                            </div>
                            <ScrollArea className="h-[250px] md:h-[300px]">
                                {metrics.countryData.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">{t("analytics.charts.noData")}</p>}
                                {metrics.countryData.map((c, i) => (
                                    <div
                                        key={i}
                                        onClick={() => setSelectedCountry(c.name === selectedCountry ? null : c.name)}
                                        className={cn(
                                            "flex items-center justify-between py-3 px-4 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all border-b border-border/30 last:border-0 relative group cursor-pointer",
                                            selectedCountry === c.name && "bg-blue-50 dark:bg-blue-900/20 shadow-inner"
                                        )}
                                    >
                                        <div className={cn(
                                            "absolute left-0 top-0 bottom-0 w-[4px] bg-blue-500 transition-transform duration-300 origin-center",
                                            selectedCountry === c.name ? "scale-y-100" : "scale-y-0 group-hover:scale-y-100"
                                        )} />
                                        <div className="flex items-center gap-3">
                                            <span className={cn(
                                                "text-sm font-medium transition-colors",
                                                selectedCountry === c.name ? "text-blue-600 font-bold" : "text-foreground/70 group-hover:text-foreground"
                                            )}>
                                                {c.name}
                                            </span>
                                        </div>
                                        <Badge
                                            variant={selectedCountry === c.name ? "default" : "secondary"}
                                            className={cn(
                                                "font-bold transition-all",
                                                selectedCountry === c.name ? "bg-blue-600 scale-110" : "opacity-70 group-hover:opacity-100"
                                            )}
                                        >
                                            {c.value}
                                        </Badge>
                                    </div>
                                ))}
                            </ScrollArea>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Popular Dishes Section */}
            <Card className="border-none shadow-lg bg-card/60 backdrop-blur-sm overflow-hidden">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2">
                        <Utensils className="w-5 h-5 text-primary" />
                        {t("analytics.charts.popularDishes")}
                    </CardTitle>
                    <CardDescription>{t("analytics.charts.popularDishesDesc")}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
                        {/* Vizualizatsiya */}
                        <div className="bg-muted/10 rounded-2xl p-4 border border-border/50 h-[400px]">
                            {metrics.topDishes.length > 0 ? (
                                renderDishesChart()
                            ) : (
                                <div className="h-full flex items-center justify-center text-muted-foreground italic">
                                    {t("analytics.charts.noData")}
                                </div>
                            )}
                        </div>

                        {/* Ro'yxat */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {metrics.topDishes.map((dish, i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/40 border border-border/50 hover:bg-white/60 hover:shadow-md transition-all group">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "flex items-center justify-center w-7 h-7 rounded-full font-bold text-[10px]",
                                            i === 0 ? "bg-primary text-white scale-110 shadow-lg" : "bg-primary/10 text-primary"
                                        )}>
                                            {i + 1}
                                        </div>
                                        <span className="font-semibold text-xs group-hover:text-primary transition-colors truncate max-w-[120px]">{dish.name}</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-sm font-bold text-primary">{dish.value}</span>
                                        <span className="text-[8px] text-muted-foreground uppercase tracking-wider">{t("analytics.charts.views") || "ko'rishlar"}</span>
                                    </div>
                                </div>
                            ))}
                            {metrics.topDishes.length === 0 && (
                                <div className="col-span-full py-12 text-center text-muted-foreground italic bg-muted/20 rounded-xl border-2 border-dashed">
                                    {t("analytics.charts.noDishesYet")}
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Super Admin - Restaurant Breakdown */}
            {(userRole === "super_admin" || userRole === "co_founder") && (
                <div className="space-y-6">
                    <Card className="border-none shadow-xl bg-gradient-to-br from-indigo-900 via-slate-900 to-black text-white overflow-hidden relative group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-indigo-500/20 transition-all" />
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
                                        <TrendingUp className="w-6 h-6 text-indigo-400" />
                                        Restoranlar Reytingi
                                    </CardTitle>
                                    <CardDescription className="text-slate-400">Tizimdagi eng yaxshi ko'rsatkichli filiallar</CardDescription>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Jami Filiallar</p>
                                    <p className="text-3xl font-black">{allRestaurants.length}</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px] w-full mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={metrics.topRestaurants.slice(0, 8)}
                                        margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                                    >
                                        <CartesianGrid vertical={false} stroke="#ffffff10" strokeDasharray="3 3" />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            stroke="#94a3b8"
                                            fontSize={10}
                                            angle={-15}
                                            textAnchor="end"
                                        />
                                        <YAxis axisLine={false} tickLine={false} stroke="#94a3b8" fontSize={10} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#0f172a',
                                                borderColor: '#1e293b',
                                                color: '#fff',
                                                borderRadius: '12px',
                                                fontSize: '12px'
                                            }}
                                            itemStyle={{ color: '#818cf8' }}
                                        />
                                        <Bar
                                            dataKey="visits"
                                            fill="#6366f1"
                                            radius={[6, 6, 0, 0]}
                                            barSize={30}
                                        >
                                            {metrics.topRestaurants.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={index === 0 ? "#6366f1" : index === 1 ? "#818cf8" : "#4338ca"} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-lg bg-card/60 backdrop-blur-sm">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-xl flex items-center gap-2"><Utensils className="w-5 h-5 text-orange-500" /> Filiallar Analizasi</CardTitle>
                                <CardDescription>Filiallar bo'yicha batafsil statistik ma'lumotlar</CardDescription>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => setSelectedRestaurantId("all")} className="text-xs">Filterlarni tozalash</Button>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {metrics.topRestaurants.map((r, i) => (
                                    <div
                                        key={r.id}
                                        onClick={() => setSelectedRestaurantId(r.id)}
                                        className={cn(
                                            "p-5 rounded-2xl border transition-all duration-300 cursor-pointer relative group overflow-hidden",
                                            selectedRestaurantId === r.id
                                                ? "bg-primary text-white border-primary shadow-lg ring-2 ring-primary/20 scale-[1.02]"
                                                : "bg-white/40 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-primary/50 hover:shadow-md"
                                        )}
                                    >
                                        {/* Rank Badge */}
                                        <div className={cn(
                                            "absolute top-0 right-0 px-3 py-1 rounded-bl-xl font-bold text-[10px] uppercase tracking-tighter",
                                            i === 0 ? "bg-amber-500 text-white" : i === 1 ? "bg-slate-400 text-white" : "bg-orange-100 text-orange-600 dark:bg-orange-900/30"
                                        )}>
                                            Rank #{i + 1}
                                        </div>

                                        <div className="flex items-center gap-4 mb-4">
                                            <div className={cn(
                                                "w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shadow-sm group-hover:scale-110 transition-transform",
                                                selectedRestaurantId === r.id ? "bg-white/20" : "bg-primary/10 text-primary"
                                            )}>
                                                {r.name.substring(0, 1).toUpperCase()}
                                            </div>
                                            <div className="flex-1 truncate">
                                                <h4 className="font-bold truncate" title={r.name}>{r.name}</h4>
                                                <div className="flex items-center gap-2">
                                                    {r.online > 0 ? (
                                                        <span className="flex items-center gap-1 text-[10px] font-bold text-green-500">
                                                            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                                                            {r.online} ONLINE
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] opacity-70">OFFLINE</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-0.5">
                                                <p className={cn("text-[10px] uppercase tracking-wide font-medium", selectedRestaurantId === r.id ? "text-white/70" : "text-muted-foreground")}>Tashriflar</p>
                                                <p className="text-lg font-black">{r.visits.toLocaleString()}</p>
                                            </div>
                                            <div className="space-y-0.5 text-right">
                                                <p className={cn("text-[10px] uppercase tracking-wide font-medium", selectedRestaurantId === r.id ? "text-white/70" : "text-muted-foreground")}>Daromad</p>
                                                <p className="text-lg font-black text-emerald-500">{r.revenue > 0 ? `${(r.revenue / 1000).toLocaleString()}k` : '0'}</p>
                                            </div>
                                        </div>

                                        {/* Progress indicator for Relative Performance */}
                                        <div className="mt-4 pt-4 border-t border-slate-200/20">
                                            <div className="flex justify-between text-[10px] mb-1 opacity-80">
                                                <span>Relative Traffic</span>
                                                <span>{Math.round((r.visits / metrics.totalVisits) * 100)}%</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-200/20 rounded-full overflow-hidden">
                                                <div
                                                    className={cn("h-full transition-all duration-1000", selectedRestaurantId === r.id ? "bg-white" : "bg-primary")}
                                                    style={{ width: `${(r.visits / metrics.totalVisits) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {metrics.topRestaurants.length === 0 && (
                                    <div className="col-span-full py-20 flex flex-col items-center justify-center text-muted-foreground italic bg-muted/20 rounded-2xl border-2 border-dashed">
                                        <Utensils className="w-12 h-12 opacity-10 mb-4" />
                                        Ma'lumotlar mavjud emas
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Category Discovery & Detailed Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1 border-none shadow-lg bg-card/60 backdrop-blur-sm overflow-hidden flex flex-col">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <PieChartIcon className="w-4 h-4 text-purple-500" />
                            {t("analytics.charts.categoryShare")}
                        </CardTitle>
                        <CardDescription>{t("analytics.charts.categoryShareDesc")}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col justify-center items-center py-6">
                        <div className="h-[200px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={metrics.topCategories}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {metrics.topCategories.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 16px rgba(0,0,0,0.1)', fontSize: '10px' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="w-full mt-4 space-y-2">
                            {metrics.topCategories.map((cat, i) => (
                                <div key={i} className="flex items-center justify-between text-xs px-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                        <span className="font-medium">{cat.name}</span>
                                    </div>
                                    <span className="font-bold">{cat.value}</span>
                                </div>
                            ))}
                            {metrics.topCategories.length === 0 && (
                                <p className="text-center text-muted-foreground text-xs py-4 italic">{t("analytics.charts.noCategoriesYet")}</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <div className="lg:col-span-2 space-y-6">
                    <Card className="border-none shadow-lg bg-card/60 backdrop-blur-sm overflow-hidden h-full">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Activity className="w-4 h-4 text-emerald-500" />
                                {t("analytics.suggestions.title")}
                            </CardTitle>
                            <CardDescription>{t("analytics.suggestions.subtitle")}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                                <h4 className="font-bold text-sm text-blue-600 flex items-center gap-2">
                                    <Smartphone className="w-4 h-4" /> {t("analytics.suggestions.mobileTitle")}
                                </h4>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {t("analytics.suggestions.mobileDesc")?.replace("{value}", metrics.modelData.find(d => d.name === 'Mobile' || d.name === 'Smartphone')?.value || '70%')}
                                </p>
                            </div>
                            <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
                                <h4 className="font-bold text-sm text-orange-600 flex items-center gap-2">
                                    <Clock className="w-4 h-4" /> {t("analytics.suggestions.activeTimeTitle")}
                                </h4>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {t("analytics.suggestions.activeTimeDesc")?.replace("{time}", [...metrics.chartData].sort((a, b) => b.visits - a.visits)[0]?.label || "19:00")}
                                </p>
                            </div>
                            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                                <h4 className="font-bold text-sm text-purple-600 flex items-center gap-2">
                                    <Utensils className="w-4 h-4" /> {t("analytics.suggestions.trendTitle")?.replace("{name}", metrics.topDishes[0]?.name || "...")}
                                </h4>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {t("analytics.suggestions.trendDesc")}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Tech Specs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <TechCard title={t("analytics.tech.deviceType")} icon={<Smartphone className="w-4 h-4 text-pink-500" />} data={metrics.modelData} />
                <TechCard title={t("analytics.tech.os")} icon={<Laptop className="w-4 h-4 text-blue-500" />} data={metrics.osData} />
                <TechCard title={t("analytics.tech.browser")} icon={<Chrome className="w-4 h-4 text-orange-500" />} data={metrics.browserData} />
                <TechCard title="Ko'p Ko'rilgan Sahifalar" icon={<ArrowUpRight className="w-4 h-4 text-green-500" />} data={metrics.topPages} />
            </div>

            {/* Live Feed */}
            <Card className="border-none shadow-lg bg-card/60 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><MapIcon className="w-4 h-4 text-green-500" /> {t("analytics.charts.liveFeed")}</CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[200px]">
                        {onlineUsers.length === 0 && <p className="text-muted-foreground text-center py-8">{t("analytics.charts.noOneOnline")}</p>}
                        {onlineUsers.map((u, i) => (
                            <div key={i} className="flex items-center justify-between py-3 border-b last:border-0 hover:bg-muted/50 px-4 rounded transition-all animate-in slide-in-from-left-2">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2.5 h-2.5 rounded-full ${u.device === 'Mobile' ? 'bg-pink-500' : 'bg-blue-500'} animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]`} />
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold flex items-center gap-2">
                                            {u.country || "Unknown"} <span className="text-muted-foreground font-normal">• {u.os}</span>
                                        </span>
                                        <span className="text-xs text-muted-foreground">{u.path}</span>
                                        {(userRole === "super_admin" || userRole === "co_founder") && (
                                            <div className="flex items-center gap-1.5 mt-1">
                                                <div className="px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30 text-[9px] text-orange-600 font-bold uppercase">
                                                    {restaurantNames[u.restaurantId || ""] || "Global"}
                                                </div>
                                                <span className="text-[10px] text-muted-foreground font-mono truncate">{u.restaurantId || "---"}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <Badge variant="outline" className="bg-background/50 backdrop-blur">{new Date(u.startTime).toLocaleTimeString()}</Badge>
                            </div>
                        ))}
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    )
}

function MetricCard({ title, value, icon, desc, trend }: any) {
    return (
        <Card className="border-none shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-card/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                <div className="p-2 bg-muted rounded-full opacity-80">{icon}</div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <div className="flex items-center gap-1 mt-1">
                    {trend === "up" ? (
                        <ArrowUpRight className="w-3 h-3 text-green-500" />
                    ) : (
                        <ArrowDownRight className="w-3 h-3 text-red-500" />
                    )}
                    <p className={`text-xs ${trend === "up" ? "text-green-500" : "text-red-500"}`}>
                        {desc}
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}

function TechCard({ title, icon, data }: any) {
    const total = data.reduce((acc: number, item: any) => acc + item.value, 0)

    return (
        <Card className="border-none shadow-lg bg-card/60 backdrop-blur-sm overflow-hidden group">
            <CardHeader className="flex flex-row items-center gap-2 pb-2 bg-muted/20">
                <div className="p-1.5 bg-background rounded-md shadow-sm">{icon}</div>
                <CardTitle className="text-sm font-bold tracking-tight">{title}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="p-4 space-y-4">
                    <div className="h-[120px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={35}
                                    outerRadius={55}
                                    paddingAngle={2}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {data.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    trigger="hover"
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 16px rgba(0,0,0,0.1)', fontSize: '12px' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="space-y-2 px-4 pb-4">
                        {data.slice(0, 4).map((item: any, i: number) => (
                            <div key={i} className="flex flex-col gap-1">
                                <div className="flex justify-between text-xs font-medium">
                                    <span className="text-muted-foreground truncate max-w-[120px]">{item.name}</span>
                                    <span>{Math.round((item.value / total) * 100)}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full transition-all duration-500"
                                        style={{
                                            width: `${(item.value / total) * 100}%`,
                                            backgroundColor: COLORS[i % COLORS.length]
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                        {data.length === 0 && <p className="text-center text-xs text-muted-foreground py-4">Ma'lumot yo'q</p>}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
