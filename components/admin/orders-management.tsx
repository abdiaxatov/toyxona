"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, orderBy, limit, serverTimestamp, where, getDocs, writeBatch, Timestamp, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useRestaurant } from "@/components/admin/restaurant-provider"
import { useToast } from "@/components/ui/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { formatCurrency } from "@/lib/utils"
import {
  Loader2, CheckCircle2, Clock, XCircle, ShoppingBag, Truck, Utensils,
  Phone, MapPin, User, ChevronDown, ChevronUp, Search, Bell, Navigation,
  Hash, Trash2, TrendingUp, TrendingDown, DollarSign, BarChart3,
  Calendar, AlertTriangle, Package, Flame, Snowflake, Timer,
  CreditCard, Banknote
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from "recharts"

interface Order {
  id: string
  customerName?: string
  customerPhone?: string
  phoneNumber?: string
  items: any[]
  total: number
  status: string
  orderType: "table" | "delivery"
  tableNumber?: number
  roomNumber?: number
  seatingType?: string
  notes?: string
  paymentMethod?: string

  weddingDate?: string
  guestCount?: number
  hallDetails?: string
  createdAt?: any
  subtotal?: number
  deliveryFee?: number
  containerCost?: number
}

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6']

export function OrdersManagement() {
  const { restaurant } = useRestaurant()
  const { toast } = useToast()
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())
  const [filterStatus, setFilterStatus] = useState("all")
  const [activeView, setActiveView] = useState<"orders" | "stats" | "finance">("orders")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [autoDeleteRunning, setAutoDeleteRunning] = useState(false)
  const [timePeriod, setTimePeriod] = useState<"today" | "week" | "month" | "year">("today")

  // Sync search from URL
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const search = params.get("search");
      if (search) {
        setSearchQuery(search);
      }
    }
  }, []);

  // Load orders
  useEffect(() => {
    if (!restaurant?.id) return
    const ordersRef = collection(db, "restaurants", restaurant.id, "orders")
    const q = query(ordersRef, orderBy("createdAt", "desc"), limit(200))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Order[]
      const hasNewPending = ordersData.some(o =>
        o.status === "pending" && !orders.find(prev => prev.id === o.id)
      )
      if (hasNewPending && !isLoading) {
        try { new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3").play().catch(() => {}) } catch {}
      }
      setOrders(ordersData)
      setIsLoading(false)
    }, () => {
      toast({ title: "Xatolik", description: "Buyurtmalarni yuklashda xatolik", variant: "destructive" })
      setIsLoading(false)
    })
    return () => unsubscribe()
  }, [restaurant?.id])

  // Auto-delete orders older than 3 days
  useEffect(() => {
    if (!restaurant?.id) return
    const autoDeleteOldOrders = async () => {
      setAutoDeleteRunning(true)
      try {
        const threeDaysAgo = new Date()
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
        const cutoff = Timestamp.fromDate(threeDaysAgo)
        const oldOrdersQuery = query(
          collection(db, "restaurants", restaurant.id, "orders"),
          where("createdAt", "<", cutoff)
        )
        const snapshot = await getDocs(oldOrdersQuery)
        if (snapshot.empty) { setAutoDeleteRunning(false); return }
        const batch = writeBatch(db)
        snapshot.docs.forEach(d => batch.delete(d.ref))
        await batch.commit()
        toast({ title: "Avtomatik tozalash", description: `${snapshot.size} ta eski buyurtma o'chirildi (3+ kun)` })
      } catch (err) {
        console.error("Auto-delete error:", err)
      }
      setAutoDeleteRunning(false)
    }
    autoDeleteOldOrders()
    const interval = setInterval(autoDeleteOldOrders, 6 * 60 * 60 * 1000) // every 6 hours
    return () => clearInterval(interval)
  }, [restaurant?.id])

  // Status update
  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    if (!restaurant?.id) return
    try {
      const order = orders.find(o => o.id === orderId)
      
      await updateDoc(doc(db, "restaurants", restaurant.id, "orders", orderId), {
        status: newStatus, updatedAt: serverTimestamp()
      })

      // Auto-mark as busy in calendar if confirmed
      if (newStatus === "confirmed" && order?.weddingDate) {
        console.log("Marking date as busy:", order.weddingDate);
        const busyDateRef = doc(db, "restaurants", restaurant.id, "busy_dates", order.weddingDate)
        await setDoc(busyDateRef, {
          date: order.weddingDate,
          status: "busy",
          note: `Buyurtma #${orderId.slice(-4).toUpperCase()} (${order.customerName || "Mijoz"})`,
          orderId: orderId,
          updatedAt: new Date()
        }, { merge: true })
        toast({ title: "Sana band qilindi", description: `${order.weddingDate} sanasi kalendarda band qilindi.` })
      }

      toast({ title: "Muvaffaqiyatli", description: `Holat "${getStatusLabel(newStatus)}" ga o'zgartirildi` })
    } catch {
      toast({ title: "Xatolik", description: "Holatni yangilashda xatolik", variant: "destructive" })
    }
  }

  // Delete single order
  const handleDeleteOrder = async () => {
    if (!restaurant?.id || !orderToDelete) return
    setIsDeleting(true)
    try {
      await deleteDoc(doc(db, "restaurants", restaurant.id, "orders", orderToDelete))
      toast({ title: "O'chirildi", description: "Buyurtma muvaffaqiyatli o'chirildi" })
      setExpandedOrders(prev => { const s = new Set(prev); s.delete(orderToDelete); return s })
    } catch {
      toast({ title: "Xatolik", description: "O'chirishda xatolik", variant: "destructive" })
    }
    setIsDeleting(false)
    setDeleteDialogOpen(false)
    setOrderToDelete(null)
  }

  const toggleExpand = (id: string) => {
    setExpandedOrders(prev => {
      const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s
    })
  }

  const getStatusLabel = (s: string) => {
    const m: Record<string, string> = { pending: "Kutilmoqda", confirmed: "Tasdiqlandi", preparing: "Tayyorlanmoqda", ready: "Tayyor", delivered: "Yetkazildi", paid: "To'landi", cancelled: "Bekor qilindi" }
    return m[s] || s
  }
  const getStatusColor = (s: string) => {
    const m: Record<string, string> = {
      pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      confirmed: "bg-sky-500/10 text-sky-600 border-sky-500/20",
      preparing: "bg-orange-500/10 text-orange-600 border-orange-500/20",
      ready: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
      delivered: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      paid: "bg-green-500/10 text-green-600 border-green-500/20",
      cancelled: "bg-rose-500/10 text-rose-600 border-rose-500/20"
    }
    return m[s] || "bg-slate-100 text-slate-700"
  }

  // --- TIME PERIOD FILTER HELPER ---
  const getPeriodStart = useCallback((period: typeof timePeriod) => {
    const now = new Date()
    if (period === "today") {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate())
    } else if (period === "week") {
      const d = new Date(now); d.setDate(d.getDate() - 6); d.setHours(0,0,0,0); return d
    } else if (period === "month") {
      return new Date(now.getFullYear(), now.getMonth(), 1)
    } else {
      return new Date(now.getFullYear(), 0, 1)
    }
  }, [])

  const periodOrders = useMemo(() => {
    const start = getPeriodStart(timePeriod)
    return orders.filter(o => {
      const d = o.createdAt?.toDate ? o.createdAt.toDate() : o.createdAt ? new Date(o.createdAt) : null
      return d && d >= start
    })
  }, [orders, timePeriod, getPeriodStart])

  // --- STATISTICS ---
  const stats = useMemo(() => {
    const today = new Date()
    const todayStr = today.toDateString()
    const base = periodOrders // use filtered orders for stats

    const todayOrders = orders.filter(o => o.createdAt?.toDate?.().toDateString() === todayStr)
    const activeOrders = base.filter(o => o.status !== "cancelled")
    const paidOrders = base.filter(o => o.status === "paid" || o.status === "delivered")
    
    // Revenue counts all non-cancelled orders to reflect business volume
    const todayRevenue = todayOrders.filter(o => o.status !== "cancelled").reduce((s, o) => s + (Number(o.total) || 0), 0)
    const totalRevenue = activeOrders.reduce((s, o) => s + (Number(o.total) || 0), 0)
    const avgOrder = activeOrders.length > 0 ? totalRevenue / activeOrders.length : 0

    // Product stats (based on period)
    const productCount: Record<string, { name: string; qty: number; revenue: number }> = {}
    base.forEach(o => {
      if (o.status === "cancelled") return
      o.items?.forEach(item => {
        const name = item.name || "Noma'lum"
        if (!productCount[name]) productCount[name] = { name, qty: 0, revenue: 0 }
        productCount[name].qty += Number(item.quantity) || 1
        productCount[name].revenue += (Number(item.price) || 0) * (Number(item.quantity) || 1)
      })
    })
    const productList = Object.values(productCount).sort((a, b) => b.qty - a.qty)
    const topProducts = productList.slice(0, 8)
    const bottomProducts = [...productList].sort((a, b) => a.qty - b.qty).slice(0, 5)

    // Unified Period Chart Data
    let chartData: { label: string; orders: number; revenue: number }[] = []
    let peakLabel = ""
    let maxCount = -1

    if (timePeriod === "today") {
      const data = Array(24).fill(0).map((_, h) => ({ label: `${h}:00`, orders: 0, revenue: 0 }))
      base.forEach(o => {
        const d = o.createdAt?.toDate?.()
        if (!d) return
        const h = d.getHours()
        if (o.status !== "cancelled") {
          data[h].orders++
          data[h].revenue += Number(o.total) || 0
        }
      })
      chartData = data
    } else if (timePeriod === "week") {
      const dailyData: Record<string, { label: string; orders: number; revenue: number; ts: number }> = {}
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today); d.setDate(d.getDate() - i)
        const dayLabel = d.toLocaleDateString("uz-UZ", { weekday: "short", day: "numeric" })
        const key = d.toDateString()
        dailyData[key] = { label: dayLabel, orders: 0, revenue: 0, ts: d.getTime() }
      }
      base.forEach(o => {
        const d = o.createdAt?.toDate?.()
        if (!d) return
        const key = d.toDateString()
        if (dailyData[key]) {
          if (o.status !== "cancelled") {
            dailyData[key].orders++
            dailyData[key].revenue += Number(o.total) || 0
          }
        }
      })
      chartData = Object.values(dailyData).sort((a,b) => a.ts - b.ts).map(({label, orders, revenue}) => ({label, orders, revenue}))
    } else if (timePeriod === "month") {
      const weeks = [
        { label: "1-hafta", orders: 0, revenue: 0 },
        { label: "2-hafta", orders: 0, revenue: 0 },
        { label: "3-hafta", orders: 0, revenue: 0 },
        { label: "4-hafta", orders: 0, revenue: 0 },
      ]
      base.forEach(o => {
        const d = o.createdAt?.toDate?.()
        if (!d) return
        const day = d.getDate()
        const idx = Math.min(3, Math.floor((day - 1) / 7))
        if (o.status !== "cancelled") {
          weeks[idx].orders++
          weeks[idx].revenue += Number(o.total) || 0
        }
      })
      chartData = weeks
    } else {
      const months = ["Yan","Fev","Mar","Apr","May","Iyn","Iyl","Avg","Sen","Okt","Noy","Dek"]
      const data = months.map(m => ({ label: m, orders: 0, revenue: 0 }))
      base.forEach(o => {
        const d = o.createdAt?.toDate?.()
        if (!d || d.getFullYear() !== today.getFullYear()) return
        const mi = d.getMonth()
        if (o.status !== "cancelled") {
          data[mi].orders++
          data[mi].revenue += Number(o.total) || 0
        }
      })
      chartData = data
    }

    // Find peak
    chartData.forEach(d => {
      if (d.orders > maxCount) {
        maxCount = d.orders
        peakLabel = d.label
      }
    })

    // Order type distribution (period)
    const typeCount = { table: 0, delivery: 0 }
    base.forEach(o => { if (o.orderType === "delivery") typeCount.delivery++; else typeCount.table++ })
    const typeData = [
      { name: "Joyida", value: typeCount.table },
      { name: "Yetkazish", value: typeCount.delivery }
    ]

    return {
      totalOrders: orders.length,
      periodCount: base.length,
      todayOrders: todayOrders.length,
      todayRevenue, totalRevenue, avgOrder, topProducts, bottomProducts,
      chartData, peakLabel, typeData,
      pendingCount: orders.filter(o => o.status === "pending").length,
      completedCount: activeOrders.length,
      cancelledCount: base.filter(o => o.status === "cancelled").length
    }
  }, [orders, periodOrders, timePeriod])

  const filteredOrders = orders.filter(o => {
    const matchSearch = (o.customerName?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (o.customerPhone || o.phoneNumber || "").includes(searchQuery) || o.id.includes(searchQuery)
    return matchSearch && (filterStatus === "all" || o.status === filterStatus)
  })

  if (isLoading) {
    return (
      <div className="flex flex-col h-[60vh] items-center justify-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary opacity-40" />
        <p className="text-zinc-500 font-medium animate-pulse">Buyurtmalar yuklanmoqda...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-4xl font-black tracking-tight bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-500 dark:from-white dark:via-zinc-300 dark:to-zinc-500 bg-clip-text text-transparent">
              Buyurtmalar
            </h1>
            <p className="text-xs text-zinc-500 font-semibold flex items-center gap-1.5 mt-0.5">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" /> Real-vaqt · {autoDeleteRunning && "Tozalanmoqda..."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="rounded-xl border-2 relative">
              <Bell className="h-5 w-5" />
              {stats.pendingCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {stats.pendingCount}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex gap-1.5 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-2xl">
          {([
            { key: "orders", label: "Buyurtmalar", icon: ShoppingBag },
            { key: "stats", label: "Statistika", icon: BarChart3 },
            { key: "finance", label: "Moliya", icon: DollarSign }
          ] as const).map(v => (
            <button key={v.key} onClick={() => setActiveView(v.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${activeView === v.key ? "bg-white dark:bg-zinc-900 text-primary shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}>
              <v.icon className="h-4 w-4" /> {v.label}
            </button>
          ))}
        </div>

        {/* Time Period Filter — shown for stats & finance */}
        {activeView !== "orders" && (
          <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-2xl">
            {([
              { key: "today", label: "Bugun" },
              { key: "week", label: "Hafta" },
              { key: "month", label: "Oy" },
              { key: "year", label: "Yil" },
            ] as const).map(p => (
              <button key={p.key} onClick={() => setTimePeriod(p.key)}
                className={`flex-1 py-2 rounded-xl text-[11px] font-black transition-all ${
                  timePeriod === p.key
                    ? "bg-white dark:bg-zinc-900 text-primary shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700"
                }`}>
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ============= ORDERS VIEW ============= */}
      {activeView === "orders" && (
        <>
          {/* Quick Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { label: "Bugun", value: stats.todayOrders, icon: Calendar, color: "text-blue-600 bg-blue-50" },
              { label: "Kutilmoqda", value: stats.pendingCount, icon: Clock, color: "text-amber-600 bg-amber-50" },
              { label: "Bugungi tushum", value: `${stats.todayRevenue.toLocaleString()} $`, icon: TrendingUp, color: "text-emerald-600 bg-emerald-50" },
              { label: "Jami buyurtma", value: stats.totalOrders, icon: Package, color: "text-violet-600 bg-violet-50" }
            ].map((c, i) => (
              <div key={i} className="p-3 rounded-2xl bg-white dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${c.color}`}>
                    <c.icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">{c.label}</span>
                </div>
                <p className="text-xl font-black text-zinc-900 dark:text-white">{c.value}</p>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input placeholder="Mijoz, tel yoki ID..." className="h-11 pl-10 rounded-2xl border-2"
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>

          {/* Status Tabs */}
          <div className="sticky top-0 z-30 bg-zinc-50/90 dark:bg-zinc-950/90 backdrop-blur-xl -mx-2 px-2 py-2">
            <Tabs value={filterStatus} onValueChange={setFilterStatus}>
              <TabsList className="bg-transparent h-auto p-0 flex gap-1.5 overflow-x-auto no-scrollbar">
                {[
                  { id: "all", label: "Hammasi", count: orders.length },
                  { id: "pending", label: "Kutilmoqda", count: orders.filter(o => o.status === "pending").length },
                  { id: "confirmed", label: "Tasdiqlangan", count: orders.filter(o => o.status === "confirmed").length },
                  { id: "cancelled", label: "Bekor qilingan", count: orders.filter(o => o.status === "cancelled").length },
                ].map(tab => (
                  <TabsTrigger key={tab.id} value={tab.id}
                    className="h-8 px-3 rounded-full border-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-primary text-xs font-bold whitespace-nowrap bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                    {tab.label} {tab.count > 0 && <span className="ml-1 opacity-60">({tab.count})</span>}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* Orders List */}
          <div className="space-y-2.5">
            <AnimatePresence mode="popLayout">
              {filteredOrders.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex flex-col items-center py-16 bg-white/50 dark:bg-zinc-900/30 rounded-3xl border-2 border-dashed border-zinc-200 dark:border-zinc-800">
                  <ShoppingBag className="h-12 w-12 text-zinc-200 mb-3" />
                  <p className="text-zinc-400 font-bold text-sm">Buyurtmalar yo'q</p>
                </motion.div>
              ) : filteredOrders.map(order => (
                <motion.div key={order.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
                  <Card className={`border-2 rounded-3xl overflow-hidden transition-all ${expandedOrders.has(order.id) ? "border-primary/20 shadow-lg bg-white dark:bg-zinc-900 ring-2 ring-primary/5" : "border-zinc-100 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80"}`}>
                    <div className="p-3 flex items-center justify-between cursor-pointer" onClick={() => toggleExpand(order.id)}>
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border-2 ${order.orderType === "delivery" ? "bg-orange-50 text-orange-600 border-orange-100" : "bg-sky-50 text-sky-600 border-sky-100"}`}>
                          {order.orderType === "delivery" ? <Truck className="h-4 w-4" /> : <Utensils className="h-4 w-4" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black">#{order.id.slice(-4).toUpperCase()}</span>
                            <Badge className={`text-[9px] h-4 font-bold rounded-md border ${getStatusColor(order.status)}`}>{getStatusLabel(order.status)}</Badge>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-medium">
                            <Clock className="h-3 w-3" />
                            {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }) : "Hozir"}
                            <span className="w-1 h-1 rounded-full bg-zinc-300" />
                            <User className="h-3 w-3" />{order.customerName || "Gest"}
                            {order.waiterName && (
                              <>
                                <span className="w-1 h-1 rounded-full bg-zinc-300" />
                                <Utensils className="h-3 w-3" />{order.waiterName}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-black">{order.total?.toLocaleString("uz-UZ")}</p>
                          <span className="text-[9px] text-zinc-400 font-bold">$</span>
                        </div>
                        <div className={`h-7 w-7 rounded-full flex items-center justify-center ${expandedOrders.has(order.id) ? "bg-primary text-white" : "bg-zinc-100 text-zinc-400"}`}>
                          {expandedOrders.has(order.id) ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </div>
                      </div>
                    </div>

                    <AnimatePresence>
                      {expandedOrders.has(order.id) && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                          <div className="px-3 pb-5 space-y-4">
                            {order.orderType === "table" && (
                              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl flex items-center justify-between border">
                                <div className="flex items-center gap-2 text-sm font-bold"><MapPin className="h-4 w-4 text-primary" />{order.seatingType || "Stol"}</div>
                                <span className="text-xl font-black text-primary">#{order.tableNumber || order.roomNumber || "?"}</span>
                              </div>
                            )}
                            <div className="space-y-2">
                              <h4 className="text-[10px] uppercase tracking-widest font-black text-zinc-400 px-1">Taomlar · {order.items?.length ?? 0}</h4>
                              <div className="bg-zinc-50 dark:bg-zinc-800/30 rounded-2xl border divide-y divide-zinc-100 dark:divide-zinc-700/50">
                                {(order.items ?? []).map((item, idx) => (
                                  <div key={idx} className="p-2.5 flex justify-between items-center">
                                    <div className="flex items-center gap-2.5">
                                      <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs font-black">{item.quantity}</div>
                                      <div>
                                        <p className="text-sm font-bold line-clamp-1">{item.name}</p>
                                        {item.variantName && <p className="text-[10px] text-zinc-400">{item.variantName}</p>}
                                      </div>
                                    </div>
                                    <p className="text-sm font-bold whitespace-nowrap">{(item.price * item.quantity).toLocaleString("uz-UZ")}</p>
                                  </div>
                                ))}
                              </div>

                              <div className="px-1 space-y-1">
                                <div className="flex justify-between text-[11px] font-bold text-zinc-500 uppercase tracking-tight">
                                  <span>Taomlar:</span>
                                   <span>{(order.subtotal || (order.items ?? []).reduce((s, i) => s + (i.price * i.quantity), 0)).toLocaleString("uz-UZ")} $</span>
                                </div>
                                {order.containerCost > 0 && (
                                  <div className="flex justify-between text-[11px] font-bold text-zinc-500 uppercase tracking-tight">
                                    <span>Idish puli:</span>
                                     <span>{order.containerCost.toLocaleString("uz-UZ")} $</span>
                                  </div>
                                )}
                                {order.orderType === "delivery" && order.deliveryFee > 0 && (
                                  <div className="flex justify-between text-[11px] font-bold text-zinc-500 uppercase tracking-tight">
                                    <span>Yetkazib berish:</span>
                                     <span>{order.deliveryFee.toLocaleString("uz-UZ")} $</span>
                                  </div>
                                )}
                                <div className="flex justify-between text-sm font-black text-primary border-t pt-1 mt-1 uppercase tracking-tighter">
                                  <span>Jami summa:</span>
                                   <span>{order.total?.toLocaleString("uz-UZ")} $</span>
                                </div>
                              </div>
                              {order.notes && <div className="p-2.5 bg-amber-50/80 rounded-xl border border-amber-200/50 text-xs text-amber-700 italic">"{order.notes}"</div>}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border">
                                <span className="text-[9px] font-black text-zinc-400 uppercase">Telefon</span>
                                <div className="flex items-center justify-between gap-1 mt-0.5">
                                  <a href={`tel:${order.customerPhone || order.phoneNumber}`} className="text-sm font-black flex items-center gap-1 text-primary truncate">
                                    <Phone className="h-3.5 w-3.5" />{order.customerPhone || order.phoneNumber || "—"}
                                  </a>
                                  {(order.customerPhone || order.phoneNumber) && (
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-md hover:bg-zinc-100" onClick={(e) => {
                                      e.stopPropagation();
                                      navigator.clipboard.writeText(order.customerPhone || order.phoneNumber || "");
                                      toast({ title: "Nusxalanmadi", description: "Telefon raqami nusxalandi" });
                                    }}>
                                      <ShoppingBag className="h-3 w-3 text-zinc-400" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border">
                                <span className="text-[9px] font-black text-zinc-400 uppercase">Turi</span>
                                <div className="text-sm font-black flex items-center gap-1 mt-0.5">
                                  <Hash className="h-3.5 w-3.5 text-zinc-400" />{order.orderType === "delivery" ? "Yetkazish" : "Joyida"}
                                </div>
                              </div>
                              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border">
                                <span className="text-[9px] font-black text-zinc-400 uppercase">To'lov</span>
                                <div className="text-sm font-black flex items-center gap-1 mt-0.5">
                                  {order.paymentMethod === "card" ? (
                                    <>
                                      <CreditCard className="h-3.5 w-3.5 text-blue-500" />
                                      <span>Karta</span>
                                    </>
                                  ) : (
                                    <>
                                      <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                                      <span>Naqd</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              {order.weddingDate && (
                                <div className="col-span-2 p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Calendar className="h-4 w-4 text-red-500" />
                                    <span className="text-sm font-black text-red-700 dark:text-red-400 uppercase tracking-tight">To'y ma'lumotlari</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-[10px] font-bold text-zinc-400 uppercase">Sana</p>
                                      <p className="text-sm font-black">{order.weddingDate}</p>
                                    </div>
                                    <div>
                                      <p className="text-[10px] font-bold text-zinc-400 uppercase">Mehmonlar</p>
                                      <p className="text-sm font-black">{order.guestCount} kishi</p>
                                    </div>
                                    {order.hallDetails && (
                                      <div className="col-span-2">
                                        <p className="text-[10px] font-bold text-zinc-400 uppercase">Qo'shimcha ma'lumotlar</p>
                                        <p className="text-xs font-medium mt-0.5 whitespace-pre-wrap">{order.hallDetails}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                            </div>

                            {/* Actions */}
                            <div className="pt-1">
                              <div className="flex items-center gap-2 mb-2.5">
                                <span className="h-px flex-1 bg-zinc-100 dark:bg-zinc-800" />
                                <h4 className="text-[10px] uppercase font-black text-zinc-400">Amallar</h4>
                                <span className="h-px flex-1 bg-zinc-100 dark:bg-zinc-800" />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                {order.status === "pending" && (
                                  <Button onClick={() => handleStatusUpdate(order.id, "confirmed")} className="h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm col-span-2 shadow-lg shadow-emerald-600/20">
                                    <CheckCircle2 className="h-4 w-4 mr-1.5" />TASDIQLASH
                                  </Button>
                                )}
                                
                                {!["paid", "cancelled", "delivered"].includes(order.status) && (
                                  <Button variant="ghost" onClick={() => handleStatusUpdate(order.id, "cancelled")} className="h-11 text-rose-500 hover:bg-rose-50 font-bold text-sm">
                                    <XCircle className="h-4 w-4 mr-1.5" />BEKOR QILISH
                                  </Button>
                                )}
                                
                                {/* Delete Button */}
                                <Button variant="ghost" onClick={() => { setOrderToDelete(order.id); setDeleteDialogOpen(true) }}
                                  className={`h-11 text-red-500 hover:bg-red-50 font-bold text-sm border border-red-200/50 ${["paid", "cancelled", "delivered"].includes(order.status) ? "col-span-2" : ""}`}>
                                  <Trash2 className="h-4 w-4 mr-1.5" />O'CHIRISH
                                </Button>
                              </div>

                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </>
      )}

      {/* ============= STATISTICS VIEW ============= */}
      {activeView === "stats" && (
        <div className="space-y-4">
          {/* Period summary card */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Buyurtmalar", value: stats.periodCount, icon: ShoppingBag, color: "text-blue-600 bg-blue-50" },
              { label: "Yakunlangan", value: stats.completedCount, icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" },
              { label: "Bekor qilindi", value: stats.cancelledCount, icon: XCircle, color: "text-red-500 bg-red-50" },
            ].map((c, i) => (
              <div key={i} className="p-3 rounded-2xl bg-white dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 text-center">
                <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${c.color} mx-auto mb-1`}><c.icon className="h-4 w-4" /></div>
                <p className="text-xl font-black">{c.value}</p>
                <p className="text-[10px] font-bold text-zinc-400 uppercase">{c.label}</p>
              </div>
            ))}
          </div>

          {/* Buyurtmalar Dinamikasi */}
          <Card className="border-2 rounded-3xl overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Timer className="h-4 w-4 text-primary" />
                  {timePeriod === "today" ? "Soatlik" : timePeriod === "week" ? "Kunlik" : timePeriod === "month" ? "Haftalik" : "Oylik"} buyurtmalar
                </CardTitle>
                <Badge variant="outline" className="text-xs font-bold">Eng kop: {stats.peakLabel}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={timePeriod === "today" ? 2 : 0} axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 8px 32px rgba(0,0,0,0.12)", fontSize: 12 }} />
                    <Bar dataKey="orders" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card className="border-2 rounded-3xl overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2"><Flame className="h-4 w-4 text-orange-500" />Eng ko'p sotilganlar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {stats.topProducts.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`h-7 w-7 rounded-lg flex items-center justify-center text-xs font-black text-white ${i === 0 ? "bg-amber-500" : i === 1 ? "bg-zinc-400" : i === 2 ? "bg-amber-700" : "bg-zinc-300"}`}>{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{p.name}</p>
                    <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full mt-1 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60" style={{ width: `${(p.qty / (stats.topProducts[0]?.qty || 1)) * 100}%` }} />
                    </div>
                  </div>
                  <Badge variant="outline" className="font-bold text-xs shrink-0">{p.qty} ta</Badge>
                </div>
              ))}
              {stats.topProducts.length === 0 && <p className="text-zinc-400 text-sm text-center py-4">Ma'lumot yo'q</p>}
            </CardContent>
          </Card>

          {/* Least Sold */}
          <Card className="border-2 rounded-3xl overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2"><Snowflake className="h-4 w-4 text-blue-500" />Eng kam sotilganlar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {stats.bottomProducts.map((p, i) => (
                <div key={i} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-3.5 w-3.5 text-blue-400" />
                    <p className="text-sm font-medium">{p.name}</p>
                  </div>
                  <Badge variant="secondary" className="font-bold text-xs">{p.qty} ta</Badge>
                </div>
              ))}
              {stats.bottomProducts.length === 0 && <p className="text-zinc-400 text-sm text-center py-4">Ma'lumot yo'q</p>}
            </CardContent>
          </Card>

          {/* Order Type Pie */}
          <Card className="border-2 rounded-3xl overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2"><Package className="h-4 w-4 text-violet-500" />Buyurtma turlari</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.typeData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                      {stats.typeData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 mt-2">
                {stats.typeData.map((t, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs font-bold">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i] }} />
                    {t.name}: {t.value}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============= FINANCE VIEW ============= */}
      {activeView === "finance" && (
        <div className="space-y-4">
          {/* Finance Summary Cards */}
          <div className="grid grid-cols-2 gap-2.5">
            {[
              {
                label: timePeriod === "today" ? "Bugungi tushum" : timePeriod === "week" ? "Haftalik tushum" : timePeriod === "month" ? "Oylik tushum" : "Yillik tushum",
                value: formatCurrency(stats.totalRevenue), icon: DollarSign, color: "from-emerald-500 to-emerald-600"
              },
              { label: "Bugungi tushum", value: formatCurrency(stats.todayRevenue), icon: TrendingUp, color: "from-blue-500 to-blue-600" },
              { label: "O'rtacha chek", value: formatCurrency(stats.avgOrder), icon: BarChart3, color: "from-violet-500 to-violet-600" },
              { label: "Yakunlangan", value: `${stats.completedCount} ta`, icon: CheckCircle2, color: "from-amber-500 to-amber-600" }
            ].map((c, i) => (
              <div key={i} className={`p-4 rounded-2xl bg-gradient-to-br ${c.color} text-white relative overflow-hidden`}>
                <c.icon className="h-8 w-8 absolute -right-1 -bottom-1 opacity-15" />
                <p className="text-[10px] font-bold uppercase opacity-80">{c.label}</p>
                <p className="text-lg font-black mt-1">{c.value}</p>
              </div>
            ))}
          </div>

          {/* Revenue Chart */}
          <Card className="border-2 rounded-3xl overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                {timePeriod === "today" ? "Bugungi soatlik tushum" : timePeriod === "week" ? "Haftalik tushum" : timePeriod === "month" ? "Oylik tushum (haftalar bo'yicha)" : "Yillik tushum (oylar bo'yicha)"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.chartData}>
                    <defs>
                      <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} interval={timePeriod === "today" ? 2 : 0} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 8px 32px rgba(0,0,0,0.12)", fontSize: 12 }}
                      formatter={(v: number) => [`${v.toLocaleString("uz-UZ")} so'm`, "Tushum"]} />
                    <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} fill="url(#rg)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Top Revenue Products */}
          <Card className="border-2 rounded-3xl overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2"><DollarSign className="h-4 w-4 text-emerald-500" />Eng ko'p daromad keltirganlar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {stats.topProducts.sort((a, b) => b.revenue - a.revenue).slice(0, 6).map((p, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-zinc-50 dark:border-zinc-800 last:border-0">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-black text-zinc-400 w-5">{i + 1}.</span>
                    <p className="text-sm font-bold">{p.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-emerald-600">{p.revenue.toLocaleString("uz-UZ")}</p>
                    <p className="text-[9px] text-zinc-400">{p.qty} ta sotilgan</p>
                  </div>
                </div>
              ))}
              {stats.topProducts.length === 0 && <p className="text-zinc-400 text-sm text-center py-4">Ma'lumot yo'q</p>}
            </CardContent>
          </Card>

          {/* Cancelled vs Completed */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-100 dark:border-emerald-800/30">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 mb-1" />
              <p className="text-2xl font-black text-emerald-700">{stats.completedCount}</p>
              <p className="text-[10px] font-bold text-emerald-600 uppercase">Yakunlangan</p>
            </div>
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border-2 border-red-100 dark:border-red-800/30">
              <XCircle className="h-5 w-5 text-red-500 mb-1" />
              <p className="text-2xl font-black text-red-600">{stats.cancelledCount}</p>
              <p className="text-[10px] font-bold text-red-500 uppercase">Bekor qilingan</p>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="rounded-3xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-red-500" />Buyurtmani o'chirish</DialogTitle>
            <DialogDescription>Bu buyurtmani o'chirishni xohlaysizmi? Bu amalni qaytarib bo'lmaydi.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="rounded-xl flex-1">Bekor qilish</Button>
            <Button variant="destructive" onClick={handleDeleteOrder} disabled={isDeleting} className="rounded-xl flex-1">
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}O'chirish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
