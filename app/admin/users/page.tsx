"use client"

import { useState, useEffect, useMemo } from "react"
import { collection, query, where, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useRestaurant } from "@/components/admin/restaurant-provider"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { 
    Loader2, 
    Search, 
    User, 
    Phone, 
    Calendar, 
    Download, 
    RefreshCw, 
    Users as UsersIcon, 
    UserPlus, 
    Activity,
    ArrowUpRight,
    MessageCircle,
    ExternalLink
} from "lucide-react"
import { format, isToday, startOfDay } from "date-fns"
import { uz } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { motion, AnimatePresence } from "framer-motion"

interface TelegramUser {
    id: string
    telegramId: number
    chatId?: number
    firstName: string
    lastName?: string
    username?: string
    phone: string
    registeredAt: any
    lastInteractionAt?: any
    restaurantId: string
}

export default function UsersPage() {
    const { restaurant, isLoading: restaurantLoading } = useRestaurant()
    const [users, setUsers] = useState<TelegramUser[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")

    useEffect(() => {
        if (!restaurant?.id) return

        setIsLoading(true)
        const usersRef = collection(db, "telegram_users")
        const q = query(
            usersRef, 
            where("restaurantId", "==", restaurant.id)
        )

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as TelegramUser))
            
            // Client-side sorting by registeredAt desc
            usersData.sort((a, b) => {
                const timeA = a.registeredAt?.seconds || 0;
                const timeB = b.registeredAt?.seconds || 0;
                return timeB - timeA;
            });

            setUsers(usersData)
            setIsLoading(false)
        }, (error) => {
            console.error("Error fetching telegram users:", error)
            setIsLoading(false)
        })

        return () => unsubscribe()
    }, [restaurant?.id])

    const filteredUsers = useMemo(() => {
        const lowerQuery = searchQuery.toLowerCase()
        return users.filter(user => 
            user.firstName?.toLowerCase().includes(lowerQuery) ||
            user.lastName?.toLowerCase().includes(lowerQuery) ||
            user.username?.toLowerCase().includes(lowerQuery) ||
            user.phone?.includes(lowerQuery)
        )
    }, [searchQuery, users])

    // Stats calculations
    const stats = useMemo(() => {
        const total = users.length
        const newToday = users.filter(u => u.registeredAt && isToday(u.registeredAt.toDate())).length
        const activeUsers = users.filter(u => {
            if (!u.lastInteractionAt) return false
            const lastActive = u.lastInteractionAt.toDate()
            const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
            return lastActive > dayAgo
        }).length

        return { total, newToday, activeUsers }
    }, [users])

    const handleExport = () => {
        const headers = ["Ismi", "Telegram ID", "Username", "Telefon", "Ro'yxatdan o'tgan sana"]
        const data = filteredUsers.map(user => [
            `${user.firstName} ${user.lastName || ""}`.trim(),
            user.telegramId,
            user.username ? `@${user.username}` : "yo'q",
            user.phone,
            user.registeredAt ? format(user.registeredAt.toDate(), "dd.MM.yyyy HH:mm") : "Noma'lum"
        ])

        const csvContent = [headers, ...data].map(row => row.join(",")).join("\n")
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.setAttribute("href", url)
        link.setAttribute("download", `mijozlar_${restaurant?.slug || 'users'}.csv`)
        link.style.visibility = "hidden"
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    if (restaurantLoading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-sky-500" />
            </div>
        )
    }

    return (
        <div className="space-y-8 p-4 md:p-8 bg-gradient-to-br from-gray-50/80 via-white to-sky-50/30 dark:from-zinc-950/90 dark:via-zinc-950 dark:to-zinc-900/50 min-h-screen animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-900 dark:from-white dark:via-gray-300 dark:to-white bg-clip-text text-transparent">
                        Mijozlar Bazasi
                    </h1>
                    <p className="text-zinc-500 dark:text-zinc-400 font-medium">
                        Telegram bot orqali bog'langan foydalanuvchilar tahlili
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button 
                        variant="outline" 
                        onClick={handleExport}
                        className="h-12 px-6 rounded-2xl border-2 border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 transition-all font-bold group shadow-sm"
                    >
                        <Download className="mr-2 h-5 w-5 text-sky-500 transition-transform group-hover:-translate-y-1" />
                        Export CSV
                    </Button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <Card className="border-none shadow-xl shadow-sky-200/20 dark:shadow-black/20 bg-white dark:bg-zinc-900 overflow-hidden relative group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-2xl" />
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                <UsersIcon className="w-4 h-4 text-sky-500" />
                                Jami Mijozlar
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-black text-zinc-900 dark:text-white">{stats.total}</span>
                                <span className="text-xs font-bold text-green-500 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full flex items-center">
                                    <ArrowUpRight className="w-3 h-3 mr-0.5" />
                                    100%
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <Card className="border-none shadow-xl shadow-sky-200/20 dark:shadow-black/20 bg-white dark:bg-zinc-900 overflow-hidden relative group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full blur-2xl" />
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                <UserPlus className="w-4 h-4 text-green-500" />
                                Bugungi Yangilari
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-black text-zinc-900 dark:text-white">{stats.newToday}</span>
                                <span className="text-xs font-medium text-zinc-400">mijoz</span>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    <Card className="border-none shadow-xl shadow-sky-200/20 dark:shadow-black/20 bg-zinc-900 text-white overflow-hidden relative group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl" />
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-bold text-sky-400 uppercase tracking-widest flex items-center gap-2">
                                <Activity className="w-4 h-4" />
                                Faol Mijozlar (24soat)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-black">{stats.activeUsers}</span>
                                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse mb-1" />
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* Table Section */}
            <Card className="border-none shadow-2xl shadow-zinc-200/50 dark:shadow-black/40 overflow-hidden bg-white dark:bg-zinc-900">
                <CardHeader className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800 p-6">
                    <div className="flex flex-col md:flex-row md:items-center gap-6 justify-between">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 transition-colors group-focus-within:text-sky-500" />
                            <Input
                                placeholder="Ismi, username yoki telefon orqali qidirish..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-12 pl-12 bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 focus:ring-sky-500 rounded-2xl transition-all text-base shadow-sm"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                             <Button variant="ghost" size="icon" onClick={() => setSearchQuery("")} className="h-12 w-12 rounded-2xl text-zinc-400 hover:text-sky-500 transition-colors">
                                <RefreshCw className="h-5 w-5" />
                             </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-zinc-50/30 dark:bg-zinc-800/30 border-b border-zinc-100 dark:border-zinc-800">
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="font-bold text-zinc-900 dark:text-white px-6 h-14">Mijoz</TableHead>
                                    <TableHead className="font-bold text-zinc-900 dark:text-white h-14">Username</TableHead>
                                    <TableHead className="font-bold text-zinc-900 dark:text-white h-14">Telefon Raqami</TableHead>
                                    <TableHead className="font-bold text-zinc-900 dark:text-white h-14">Ro'yxatdan O'tgan</TableHead>
                                    <TableHead className="font-bold text-zinc-900 dark:text-white h-14 text-right px-6">Amallar</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <AnimatePresence mode="popLayout">
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-96 text-center">
                                                <div className="flex flex-col items-center justify-center gap-4">
                                                    <div className="relative">
                                                        <div className="h-16 w-16 rounded-full border-4 border-zinc-100 border-t-sky-500 animate-spin" />
                                                        <UsersIcon className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-sky-500" />
                                                    </div>
                                                    <p className="text-zinc-500 font-bold tracking-tight">Ma'lumotlar yuklanmoqda...</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredUsers.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-96 text-center">
                                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center gap-4 text-zinc-400">
                                                    <div className="h-20 w-20 rounded-full bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center">
                                                        <Search className="h-10 w-10 opacity-20" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-xl font-black text-zinc-900 dark:text-white">Mijoz topilmadi</p>
                                                        <p className="text-sm">Qidiruv so'zini o'zgartirib ko'ring yoki botingizni tekshiring</p>
                                                    </div>
                                                </motion.div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredUsers.map((user, index) => (
                                            <motion.tr
                                                key={user.id}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.03 }}
                                                className="group hover:bg-sky-50/30 dark:hover:bg-sky-900/10 transition-colors border-b border-zinc-50 dark:border-zinc-800 last:border-0"
                                            >
                                                <TableCell className="px-6 py-5">
                                                    <div className="flex items-center gap-4">
                                                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white font-black shadow-lg text-lg ring-4 ring-white dark:ring-zinc-900 group-hover:scale-105 transition-transform">
                                                            {user.firstName[0]}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-zinc-900 dark:text-white text-base group-hover:text-sky-600 transition-colors">
                                                                {user.firstName} {user.lastName || ""}
                                                            </span>
                                                            <span className="text-xs font-mono text-zinc-400">ID: {user.telegramId}</span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {user.username ? (
                                                        <a 
                                                            href={`https://t.me/${user.username}`} 
                                                            target="_blank" 
                                                            className="inline-flex items-center gap-1.5 font-bold text-sky-500 hover:text-sky-600 hover:underline bg-sky-50 dark:bg-sky-900/20 px-3 py-1 rounded-full text-sm transition-all"
                                                        >
                                                            @{user.username}
                                                            <ExternalLink className="h-3 w-3" />
                                                        </a>
                                                    ) : (
                                                        <span className="text-zinc-400 italic text-sm">yo'q</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 font-black bg-zinc-50 dark:bg-zinc-800 w-fit px-4 py-1.5 rounded-xl border border-zinc-100 dark:border-zinc-700 shadow-sm">
                                                        <Phone className="h-3.5 w-3.5 text-sky-500" />
                                                        {user.phone}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-0.5">
                                                        <div className="flex items-center gap-2 text-zinc-900 dark:text-white font-bold text-sm">
                                                            <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                                                            {user.registeredAt ? format(user.registeredAt.toDate(), "d MMM yyyy", { locale: uz }) : "Hozirgina"}
                                                        </div>
                                                        <div className="text-[10px] text-zinc-400 ml-5.5 uppercase font-bold tracking-tight">
                                                            soat {user.registeredAt ? format(user.registeredAt.toDate(), "HH:mm") : "-"} da
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-6 text-right">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-10 w-10 rounded-xl hover:bg-sky-500 hover:text-white transition-all text-zinc-400"
                                                        onClick={() => {
                                                            if (user.username) window.open(`https://t.me/${user.username}`, "_blank")
                                                        }}
                                                    >
                                                        <MessageCircle className="h-5 w-5" />
                                                    </Button>
                                                </TableCell>
                                            </motion.tr>
                                        ))
                                    )}
                                </AnimatePresence>
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Footer */}
            <div className="text-center py-4">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center justify-center gap-2">
                    <Activity className="w-3 h-3 text-sky-500" />
                    Ma'lumotlar real vaqt rejimida yangilanmoqda
                </p>
            </div>
        </div>
    )
}
