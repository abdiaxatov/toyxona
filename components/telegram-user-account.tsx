"use client"

import { useState, useEffect } from "react"
import { doc, getDoc, collection, query, where, onSnapshot, updateDoc, getDocs, limit, orderBy } from "firebase/firestore"
import { useToast } from "@/components/ui/use-toast"
import { Input } from "@/components/ui/input"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { 
    Loader2, User, Phone, Calendar, History, ShoppingBag, Star, 
    ShieldCheck, MessageCircle, Gift, ArrowRight, Trash2, 
    PlusCircle, Send, CheckCircle2, AlertCircle, Clock, 
    Check, RotateCcw, ChevronRight, Zap, Info, ExternalLink
} from "lucide-react"
import { format } from "date-fns"
import { uz } from "date-fns/locale"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface TelegramUser {
    telegramId: number
    firstName: string
    phone: string
    username?: string
    registeredAt?: any
    botState?: string
}

interface Order {
    id: string
    total: number
    status: string
    createdAt: any
    items: any[]
}

interface TelegramUserAccountProps {
    telegramId: number
    restaurantId: string
    primaryColor?: string
    onOrderClick?: (orderId: string) => void
    webAppUser?: any
    isTelegramWebApp?: boolean
}

export function TelegramUserAccount({ 
    telegramId: initialTelegramId, 
    restaurantId, 
    primaryColor, 
    onOrderClick,
    webAppUser: initialWebAppUser,
    isTelegramWebApp: initialIsTelegram 
}: TelegramUserAccountProps) {
    // Current user state
    const [user, setUser] = useState<TelegramUser | null>(null)
    const [orders, setOrders] = useState<Order[]>([])
    const [supportUrl, setSupportUrl] = useState<string>("")
    const [botUsername, setBotUsername] = useState<string>("")
    const [isLoading, setIsLoading] = useState(true)
    const [isSdkChecking, setIsSdkChecking] = useState(true)
    
    // Admins management (only for admins)
    const [adminIds, setAdminIds] = useState<string[]>([])
    const [newAdminId, setNewAdminId] = useState("")
    const [isAddingAdmin, setIsAddingAdmin] = useState(false)
    const [isUserAdmin, setIsUserAdmin] = useState(false)
    
    // Core ID & detection state
    const [telegramId, setTelegramId] = useState(initialTelegramId)
    const [webAppUser, setWebAppUser] = useState(initialWebAppUser)
    const [isTelegramWebApp, setIsTelegramWebApp] = useState(initialIsTelegram || false)

    const accentColor = primaryColor || "#0ea5e9"
    const { toast } = useToast()

    // 1. Mandatory Sync Props to Local State
    useEffect(() => {
        if (initialTelegramId) {
            setTelegramId(initialTelegramId)
            setIsSdkChecking(false)
        }
        if (initialWebAppUser) setWebAppUser(initialWebAppUser)
        if (initialIsTelegram !== undefined) setIsTelegramWebApp(initialIsTelegram)
    }, [initialTelegramId, initialWebAppUser, initialIsTelegram])

    // 2. High-Frequency Identification Fallback (Fixes ID: 0 issue)
    useEffect(() => {
        const detectTelegram = () => {
            if (typeof window !== "undefined" && (window as any).Telegram?.WebApp) {
                const webApp = (window as any).Telegram.WebApp;
                
                // If we have initData, we are definitely in a Telegram environment
                if (webApp.initData) {
                    const tgUser = webApp.initDataUnsafe?.user;
                    if (tgUser?.id) {
                        setTelegramId(tgUser.id)
                        setWebAppUser(tgUser)
                    }
                    setIsTelegramWebApp(true)
                    setIsSdkChecking(false)
                    return true
                }
            }
            return false
        }

        // 1. Immediate check
        if (detectTelegram()) return;

        // 2. Short-term polling (for slow SDK loads)
        const interval = setInterval(() => {
            if (detectTelegram()) {
                clearInterval(interval)
            }
        }, 100)

        // 3. Faster timeout for regular browsers (1.5s instead of 5s)
        const timeout = setTimeout(() => {
            clearInterval(interval)
            setIsSdkChecking(false)
        }, 1500)

        return () => {
            clearInterval(interval)
            clearTimeout(timeout)
        }
    }, [])

    // 3. Data Fetching (Firestore Watcher)
    useEffect(() => {
        if (!restaurantId) {
            setIsLoading(false);
            return;
        }

        // Fetch Restaurant Config (Support URL, Bot Username, etc.) - Only needs restaurantId
        const restaurantRef = doc(db, "restaurants", restaurantId)
        getDoc(restaurantRef).then(docSnap => {
            if (docSnap.exists()) {
                const data = docSnap.data()
                setSupportUrl(data.telegramSupportUrl || "")
                setAdminIds(data.telegramAdminChatIds || [])
                
                // 1. Prioritize explicit bot username from settings
                // 2. Fallback to token derivation or defaults
                if (data.telegramBotUsername) {
                    setBotUsername(data.telegramBotUsername.replace("@", ""))
                } else if (data.telegramBotToken) {
                    const botId = data.telegramBotToken.split(':')[0];
                    setBotUsername(`${botId}_bot`); 
                } else {
                    setBotUsername("7daysBurgerBot")
                }
            }
            
            // If we don't have a telegramId, we are likely in a regular browser
            // We must stop the loading spinner to show the "Login with Bot" button
            if (!telegramId) {
                setIsLoading(false)
            }
        })

        if (!telegramId) return;

        const userRef = doc(db, "telegram_users", `${restaurantId}_${telegramId}`)
        
        const unsubscribeUser = onSnapshot(userRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data() as TelegramUser
                setUser(data)
            } else {
                setUser(null)
            }
            setIsLoading(false)
        })

        // Fetch Orders for this user from the correct collection
        const ordersRef = collection(db, "restaurants", restaurantId, "orders") 

        const q = query(
            ordersRef, 
            where("telegramId", "==", telegramId),
            limit(10)
        )
        
        const unsubscribeOrders = onSnapshot(q, (snapshot) => {
            const orderList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order))
            
            // Client-side sorting: newest first
            const sortedOrders = orderList.sort((a, b) => {
                const dateA = a.createdAt?.toDate?.()?.getTime() || 0
                const dateB = b.createdAt?.toDate?.()?.getTime() || 0
                return dateB - dateA
            })
            
            setOrders(sortedOrders)
        })

        return () => {
            unsubscribeUser()
            unsubscribeOrders()
        }
    }, [restaurantId, telegramId])

    // Check if current user is admin
    useEffect(() => {
        if (telegramId && adminIds.length > 0) {
            setIsUserAdmin(adminIds.includes(telegramId.toString()))
        }
    }, [telegramId, adminIds])

    const handleRegister = async () => {
        const botName = botUsername || "7daysBurgerBot"
        const botUrl = `https://t.me/${botName}?start=${restaurantId}`

        if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initData) {
            const webApp = (window as any).Telegram.WebApp;
            
            // Native contact share (Version 6.9+)
            if (webApp.isVersionAtLeast?.('6.9')) {
                webApp.requestContact((shared: boolean) => {
                    if (shared) {
                        toast.success("Raqam kiritildi. Bot xabarni qayta ishlamoqda...")
                    }
                });
            } else {
                // TWA Fallback: Use SDK to open the link
                webApp.openTelegramLink(botUrl)
            }
        } else {
            // Regular Browser Fallback: Direct redirect to bot
            // This allows users opening the menu in Chrome/Safari to jump to the bot
            window.open(botUrl, "_blank")
        }
    }

    const handleAddAdmin = async () => {
        if (!newAdminId) return
        setIsAddingAdmin(true)
        try {
            const updatedAdmins = [...adminIds, newAdminId]
            await updateDoc(doc(db, "restaurants", restaurantId), {
                telegramAdminChatIds: updatedAdmins
            })
            setAdminIds(updatedAdmins)
            setNewAdminId("")
            toast.success("Admin qo'shildi")
        } catch (error) {
            toast.error("Xatolik yuz berdi")
        } finally {
            setIsAddingAdmin(false)
        }
    }

    const handleDeleteAdmin = async (idToDelete: string) => {
        try {
            const updatedAdmins = adminIds.filter(id => id !== idToDelete)
            await updateDoc(doc(db, "restaurants", restaurantId), {
                telegramAdminChatIds: updatedAdmins
            })
            setAdminIds(updatedAdmins)
            toast.success("Admin olib tashlandi")
        } catch (error) {
            toast.error("Xatolik yuz berdi")
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("uz-UZ", {
            style: "currency",
            currency: "UZS",
            maximumFractionDigits: 0,
        }).format(amount)
    }

    // --- RENDER LOGIC ---

    if (isLoading || isSdkChecking) {
        return (
            <div className="flex flex-col items-center justify-center py-32 gap-6 w-full px-4">
                <div className="relative">
                    <div className="absolute inset-0 rounded-full blur-2xl opacity-40 animate-pulse" style={{ backgroundColor: accentColor }} />
                    <Loader2 className="h-12 w-12 animate-spin relative z-10" style={{ color: accentColor }} />
                </div>
                <div className="text-center space-y-2">
                    <h3 className="text-lg font-black tracking-tighter text-zinc-800 dark:text-white uppercase italic">Yuklanmoqda...</h3>
                    <p className="text-xs text-zinc-400 font-medium max-w-[200px] leading-relaxed">
                        {isSdkChecking ? "Telegram ma'lumotlari aniqlanmoqda" : "Profilingiz bazadan olinmoqda"}
                    </p>
                </div>
            </div>
        )
    }

    const isRegistered = user && user.phone
    const isContactNative = isTelegramWebApp && typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.isVersionAtLeast?.('6.9')

    if (!isRegistered) {
        return (
            <div className="space-y-6 pt-4 px-1 pb-20">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="border-none shadow-2xl bg-white dark:bg-zinc-900 rounded-[40px] overflow-hidden p-8 text-center relative">
                        {/* Background Decoration */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-sky-50 dark:bg-sky-900/10 rounded-full blur-3xl -mr-16 -mt-16" />
                        <div className="absolute bottom-0 left-0 w-40 h-40 bg-pink-50 dark:bg-pink-900/10 rounded-full blur-3xl -ml-20 -mb-20" />

                        <div className="relative z-10 space-y-6">
                            <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-800 rounded-[30px] flex items-center justify-center mx-auto shadow-xl ring-4 ring-white dark:ring-zinc-900">
                                <ShieldCheck className="w-10 h-10" style={{ color: accentColor }} />
                            </div>
                            
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black tracking-tighter text-zinc-900 dark:text-white leading-tight">Profilni Tasdiqlash</h3>
                                <p className="text-zinc-500 text-xs font-medium leading-relaxed px-4">
                                    Buyurtmalaringizni kuzatish va chegirmalardan foydalanish uchun raqamingizni kiriting.
                                </p>
                            </div>

                            <Button 
                                onClick={handleRegister}
                                className="w-full h-15 rounded-[24px] font-black uppercase tracking-widest text-[11px] shadow-xl transition-all active:scale-[0.97] flex items-center justify-center gap-3 py-6"
                                style={{ backgroundColor: accentColor }}
                            >
                                {isContactNative ? (
                                    <>
                                        <Phone className="w-5 h-5 animate-bounce" />
                                        Raqamni Tasdiqlash
                                    </>
                                ) : (
                                    <>
                                        <MessageCircle className="w-5 h-5" />
                                        Bot orqali kirish
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </Button>
                            
                            <p className="text-[10px] text-zinc-400 dark:text-zinc-600 font-bold uppercase tracking-wider">
                                Xavfsiz va tezkor ro'yxatdan o'tish
                            </p>

                                    {/* Removed Diagnostics for cleaner look after user intention */}
                        </div>
                    </Card>
                </motion.div>
            </div>
        )
    }

    return (
        <div className="space-y-8 pt-6 px-1 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Premium Header Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative"
            >
                {/* Visual Glows */}
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-sky-400/10 rounded-full blur-3xl -z-10" />
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-pink-400/10 rounded-full blur-3xl -z-10" />
                
                <Card className="border-none shadow-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl rounded-[40px] overflow-hidden">
                    <CardContent className="p-0">
                        {/* Status bar / Color Banner */}
                        <div className="h-32 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}cc 100%)` }}>
                            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '16px 16px' }} />
                            <div className="absolute top-6 right-6 flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 shadow-lg">
                                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="text-[10px] font-black uppercase text-white tracking-widest">Active</span>
                            </div>
                        </div>

                        {/* User Profile Container */}
                        <div className="px-8 pb-8 -mt-12 relative z-10 transition-all">
                            <div className="flex flex-col items-center text-center">
                                {/* Avatar */}
                                <div className="relative group mb-5">
                                    <div className="absolute inset-0 rounded-[35px] blur-xl opacity-30 group-hover:opacity-50 transition-opacity" style={{ backgroundColor: accentColor }} />
                                    <div className="h-28 w-28 rounded-[35px] bg-white dark:bg-zinc-800 p-1.5 shadow-2xl relative z-10 ring-4 ring-white dark:ring-zinc-900 flex items-center justify-center overflow-hidden">
                                        {webAppUser?.photo_url ? (
                                            <img src={webAppUser.photo_url} alt="Profile" className="w-full h-full object-cover rounded-[28px]" />
                                        ) : (
                                            <div className="w-full h-full rounded-[28px] flex items-center justify-center text-4xl font-black text-white italic" style={{ backgroundColor: accentColor }}>
                                                {user.firstName?.charAt(0).toUpperCase() || "M"}
                                            </div>
                                        )}
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 h-9 w-9 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center shadow-2xl z-20 border-4 border-white dark:border-zinc-900">
                                        {isUserAdmin ? <ShieldCheck className="w-5 h-5" /> : <Star className="w-5 h-5 fill-current" />}
                                    </div>
                                </div>

                                {/* Names & ID */}
                                <div className="space-y-1">
                                    <h2 className="text-3xl font-black tracking-tighter text-zinc-900 dark:text-white leading-tight">
                                        {user.firstName}
                                    </h2>
                                    <div className="flex items-center justify-center gap-3">
                                        <Badge variant="secondary" className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[11px] font-black tracking-tighter px-3 h-6 border-none rounded-full">
                                            {user.phone}
                                        </Badge>
                                        <span className="h-1 w-1 rounded-full bg-zinc-200" />
                                        <div className="flex items-center gap-1.5 text-zinc-400 font-bold uppercase text-[9px] tracking-widest">
                                            ID <span className="text-zinc-500 dark:text-zinc-300 tabular-nums">{telegramId}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Chips */}
                                <div className="grid grid-cols-2 gap-3 w-full mt-8">
                                    <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-[30px] border border-zinc-100 dark:border-zinc-800 flex flex-col items-center">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <ShoppingBag className="w-3.5 h-3.5 text-zinc-400" />
                                            <span className="text-[9px] font-black uppercase text-zinc-400 tracking-wider">Buyurtmalar</span>
                                        </div>
                                        <p className="text-xl font-black text-zinc-900 dark:text-white tabular-nums">{orders.length}</p>
                                    </div>
                                    <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-[30px] border border-zinc-100 dark:border-zinc-800 flex flex-col items-center">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                                            <span className="text-[9px] font-black uppercase text-zinc-400 tracking-wider">A'zo</span>
                                        </div>
                                        <p className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-tight">
                                            {user.registeredAt ? format(user.registeredAt.toDate(), "MMM d", { locale: uz }) : "Yaqinda"}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Order History Section */}
            <div className="space-y-4 px-1">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-xl font-black tracking-tighter flex items-center gap-3 text-zinc-800 dark:text-white uppercase italic">
                        <History className="w-5 h-5" style={{ color: accentColor }} />
                        Mening Tarixim
                    </h3>
                    {orders.length > 0 && (
                        <Badge variant="outline" className="h-6 rounded-full border-zinc-200 dark:border-zinc-800 text-zinc-400 text-[9px] font-black">
                            Oxirgi 10 ta
                        </Badge>
                    )}
                </div>

                {orders.length === 0 ? (
                    <Card className="border-none shadow-sm bg-zinc-50/50 dark:bg-zinc-900/50 rounded-[35px] overflow-hidden py-14 flex flex-col items-center justify-center gap-4 border-2 border-dashed border-zinc-100 dark:border-zinc-800">
                        <div className="h-16 w-16 rounded-[24px] bg-white dark:bg-zinc-800 flex items-center justify-center shadow-xs">
                            <ShoppingBag className="w-7 h-7 text-zinc-200" />
                        </div>
                        <p className="text-xs font-black text-zinc-300 uppercase tracking-widest">Hali buyurtmalar yo'q</p>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {orders.map((order, i) => (
                            <motion.div 
                                key={order.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => onOrderClick?.(order.id)}
                            >
                                <div className="group relative flex items-center gap-4 bg-white dark:bg-zinc-900 p-4 rounded-[30px] border border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-xl hover:border-primary/30 transition-all duration-300">
                                    <div className="h-12 w-12 rounded-2xl bg-zinc-50 dark:bg-zinc-800 flex flex-col items-center justify-center text-zinc-400 shrink-0 border border-zinc-100 dark:border-zinc-700">
                                        <span className="text-[8px] font-black opacity-50">#</span>
                                        <span className="text-xs font-black text-zinc-600 dark:text-zinc-300">{order.id.slice(-4).toUpperCase()}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <span className="font-black text-zinc-900 dark:text-white text-[15px] tracking-tight">
                                                {formatCurrency(order.total)}
                                            </span>
                                            <div className={cn(
                                                "flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest px-2.5 h-5 rounded-full shadow-xs",
                                                order.status === 'completed' ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20" : 
                                                order.status === 'preparing' ? "text-sky-600 bg-sky-50 dark:bg-sky-900/20" : 
                                                order.status === 'cancelled' ? "text-rose-600 bg-rose-50 dark:bg-rose-900/20" :
                                                "text-amber-600 bg-amber-50 dark:bg-amber-900/20"
                                            )}>
                                                {order.status === 'completed' ? <Check className="w-2.5 h-2.5" /> : 
                                                 order.status === 'preparing' ? <Clock className="w-2.5 h-2.5" /> : 
                                                 <RotateCcw className="w-2.5 h-2.5" />}
                                                {order.status}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-1 text-zinc-400">
                                                <Calendar className="w-3 h-3" />
                                                <span className="text-[10px] font-bold uppercase tracking-tight">
                                                    {order.createdAt ? format(order.createdAt.toDate(), "d-MMM", { locale: uz }) : ""}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1 text-zinc-400">
                                                <History className="w-3 h-3" />
                                                <span className="text-[10px] font-bold uppercase tracking-tight tabular-nums">
                                                    {order.createdAt ? format(order.createdAt.toDate(), "HH:mm") : ""}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="h-10 w-10 rounded-2xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-300 group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                                        <ChevronRight className="w-5 h-5" />
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Admin Controls Section */}
            {isUserAdmin && (
                <div className="px-1 space-y-4">
                    <div className="flex items-center gap-3 px-2">
                        <div className="h-8 w-8 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center text-white dark:text-zinc-900">
                            <ShieldCheck className="w-4 h-4" />
                        </div>
                        <h3 className="text-lg font-black tracking-tighter text-zinc-800 dark:text-white uppercase italic">Ma'murlar Fazosi</h3>
                    </div>

                    <Card className="border-none shadow-xl bg-zinc-50 dark:bg-zinc-900 rounded-[35px] overflow-hidden p-6 border-2 border-white dark:border-zinc-800">
                        <div className="space-y-5">
                            <div className="flex gap-2 p-1.5 bg-white dark:bg-zinc-800 rounded-[28px] shadow-xs border border-zinc-100 dark:border-zinc-700">
                                <Input 
                                    placeholder="ID kiritish..."
                                    value={newAdminId}
                                    onChange={(e) => setNewAdminId(e.target.value)}
                                    className="border-none bg-transparent focus-visible:ring-0 text-sm font-bold shadow-none h-11 px-4"
                                />
                                <Button 
                                    onClick={handleAddAdmin}
                                    disabled={isAddingAdmin || !newAdminId}
                                    className="rounded-[22px] h-11 px-6 font-black uppercase text-[10px] tracking-widest transition-all"
                                    style={{ backgroundColor: accentColor }}
                                >
                                    {isAddingAdmin ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4 mr-2" />}
                                    Qo'shish
                                </Button>
                            </div>

                            <AnimatePresence>
                                <div className="space-y-2">
                                    {adminIds.map((id) => (
                                        <motion.div 
                                            key={id} 
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className="flex items-center justify-between p-3.5 bg-white dark:bg-zinc-800 rounded-[22px] border border-zinc-50 dark:border-zinc-700/50 shadow-xs hover:border-primary/20 transition-all"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center text-[10px] font-black text-zinc-400 border border-zinc-100 dark:border-zinc-800">ID</div>
                                                <span className="font-bold text-sm tabular-nums text-zinc-700 dark:text-zinc-300">{id}</span>
                                                {id === telegramId.toString() && <Badge className="text-[8px] h-4 rounded-full bg-primary/10 text-primary border-none font-black ml-1 px-1.5">Siz</Badge>}
                                            </div>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => handleDeleteAdmin(id)}
                                                className="h-9 w-9 rounded-xl text-zinc-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </motion.div>
                                    ))}
                                </div>
                            </AnimatePresence>
                        </div>
                    </Card>
                </div>
            )}

        </div>
    )
}
