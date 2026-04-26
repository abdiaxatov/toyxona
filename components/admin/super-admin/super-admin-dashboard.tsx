"use client"

import { useState, useEffect } from "react"
import { collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc, where } from "firebase/firestore"
import { db, auth } from "@/lib/firebase"
import { Plus, Store, Users, Activity, Search, Filter, ShieldCheck, ArrowUpRight, Trash2, Edit, MoreVertical, AlertTriangle, Check, User, Shield, Bell, MessageCircle, RefreshCw } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { useAuth } from "../admin-auth-provider"
import { RestaurantForm } from "./restaurant-form"
import { SuperAdminStaff } from "./super-admin-staff"
import { SuperAdminContacts } from "./super-admin-contacts"

interface Restaurant {
    id: string
    name: string
    slug: string
    customDomain?: string
    address: string
    contact: string
    status: string
    adminEmail?: string
    adminPassword?: string
    showDeveloperCredit?: boolean
    createdAt: any
    subscriptionPlan?: string
    subscriptionPrice?: number
    subscriptionStartDate?: string
    subscriptionEndDate?: string
}

export function SuperAdminDashboard() {
    const { userRole } = useAuth()
    const [restaurants, setRestaurants] = useState<Restaurant[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSheetOpen, setIsSheetOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [stats, setStats] = useState({
        totalRestaurants: 0,
        activeRestaurants: 0,
        totalAdmins: 0,
    })
    const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [restaurantToDelete, setRestaurantToDelete] = useState<Restaurant | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [notifications, setNotifications] = useState<{ id: string, name: string, daysLeft: number, type: 'expired' | 'warning' }[]>([])

    // Filter States
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'maintenance'>('all')
    const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name_asc' | 'name_desc'>('newest')

    const fetchRestaurants = async () => {
        setIsLoading(true)
        try {
            const q = query(collection(db, "restaurants"), orderBy("createdAt", "desc"))
            const querySnapshot = await getDocs(q)
            const data: Restaurant[] = []
            querySnapshot.forEach((doc) => {
                data.push({ id: doc.id, ...doc.data() } as Restaurant)
            })
            setRestaurants(data)

            // Fetch Users Count Optimized
            const { getCountFromServer } = await import("firebase/firestore")
            const usersCountSnap = await getCountFromServer(collection(db, "users"))
            const totalUsers = usersCountSnap.data().count

            setStats({
                totalRestaurants: data.length,
                activeRestaurants: data.filter(r => r.status === 'active').length,
                totalAdmins: totalUsers
            })
        } catch (error: any) {
            console.error("Error fetching restaurants:", error)
            toast.error("Ma'lumotlarni yuklashda xatolik: " + (error.message || "Noma'lum xato"))
        } finally {
            setIsLoading(false)
        }
    }

    const checkSubscriptions = (data: Restaurant[]) => {
        const today = new Date()
        const foundNotifications: any[] = []

        data.forEach(r => {
            if (r.subscriptionEndDate) {
                const endDate = new Date(r.subscriptionEndDate)
                const diffTime = endDate.getTime() - today.getTime()
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

                if (diffDays <= 0) {
                    foundNotifications.push({ id: r.id, name: r.name, daysLeft: diffDays, type: 'expired' })
                } else if (diffDays <= 7) {
                    foundNotifications.push({ id: r.id, name: r.name, daysLeft: diffDays, type: 'warning' })
                }
            }
        })
        setNotifications(foundNotifications.sort((a, b) => a.daysLeft - b.daysLeft))
    }

    const isOverlayOpen = isSheetOpen || deleteDialogOpen;

    useEffect(() => {
        if (typeof document === "undefined") return;
        if (isOverlayOpen) {
            document.body.style.overflow = "hidden";
            document.documentElement.classList.add("lenis-stopped");
        } else {
            document.body.style.overflow = "";
            document.documentElement.classList.remove("lenis-stopped");
        }
        return () => {
            document.body.style.overflow = "";
            document.documentElement.classList.remove("lenis-stopped");
        }
    }, [isOverlayOpen]);

    useEffect(() => {
        fetchRestaurants().then(() => {
            // Already fetched in fetchRestaurants but we need the data local to this effect for extra logic if needed
        })
    }, [])

    useEffect(() => {
        if (restaurants.length > 0) {
            checkSubscriptions(restaurants)
        }
    }, [restaurants])

    const handleCreate = () => {
        setEditingRestaurant(null)
        setIsSheetOpen(true)
    }

    const handleEdit = (restaurant: Restaurant) => {
        setEditingRestaurant(restaurant)
        setIsSheetOpen(true)
    }

    const handleToggleMaintenance = async (restaurant: Restaurant) => {
        try {
            const newStatus = restaurant.status === 'maintenance' ? 'active' : 'maintenance'
            await updateDoc(doc(db, "restaurants", restaurant.id), {
                status: newStatus,
                isMaintenance: newStatus === 'maintenance'
            })
            toast.success(`${restaurant.name} ${newStatus === 'maintenance' ? 'yangilanish rejimiga o\'tkazildi' : 'faollashtirildi'}`)
            fetchRestaurants()
        } catch (error) {
            toast.error("Xatolik yuz berdi")
        }
    }

    const handleManage = async (restaurantId: string) => {
        if (auth.currentUser) {
            try {
                await updateDoc(doc(db, "users", auth.currentUser.uid), {
                    restaurantId: restaurantId
                })
                window.location.href = "/admin/menu" // Redirect to main admin area
            } catch (error) {
                toast.error("O'tishda xatolik")
            }
        }
    }

    const handleDeleteClick = (restaurant: Restaurant) => {
        if (userRole === "co_founder") {
            toast.error("Co-founderlarda o'chirish huquqi yo'q")
            return
        }
        setRestaurantToDelete(restaurant)
        setDeleteDialogOpen(true)
    }

    const handleDeleteConfirm = async () => {
        if (!restaurantToDelete || !auth.currentUser) return

        setIsDeleting(true)
        try {
            // 1. Find associated users (Admins, Waiters, etc.)
            const usersQuery = query(collection(db, "users"), where("restaurantId", "==", restaurantToDelete.id))
            const usersSnapshot = await getDocs(usersQuery)

            // 2. Delete users via API (Auth + Firestore)
            const deletePromises = usersSnapshot.docs.map(async (userDoc) => {
                try {
                    await fetch("/api/delete-user", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            uid: userDoc.id,
                            adminUid: auth.currentUser?.uid
                        }),
                    })
                } catch (e) {
                    console.error("Failed to delete user:", userDoc.id, e)
                }
            })

            await Promise.all(deletePromises)

            // 3. Delete Restaurant Doc
            await deleteDoc(doc(db, "restaurants", restaurantToDelete.id))

            toast.success(`"${restaurantToDelete.name}" va unga tegishli barcha foydalanuvchilar o'chirildi`)
            setDeleteDialogOpen(false)
            setRestaurantToDelete(null)
            fetchRestaurants() // Refresh the list
        } catch (error) {
            console.error("Error deleting restaurant:", error)
            toast.error("O'chirishda xatolik yuz berdi")
        } finally {
            setIsDeleting(false)
        }
    }

    const filteredRestaurants = restaurants
        .filter(r => {
            const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.slug.toLowerCase().includes(searchQuery.toLowerCase())

            const matchesStatus = statusFilter === 'all'
                ? true
                : r.status === statusFilter

            return matchesSearch && matchesStatus
        })
        .sort((a, b) => {
            switch (sortBy) {
                case 'newest':
                    return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
                case 'oldest':
                    return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0)
                case 'name_asc':
                    return a.name.localeCompare(b.name)
                case 'name_desc':
                    return b.name.localeCompare(a.name)
                default:
                    return 0
            }
        })

    return (
        <div vaul-drawer-wrapper="" className="space-y-8 p-6 md:p-8 bg-gradient-to-br from-gray-50/80 via-white to-blue-50/30 dark:from-zinc-950/90 dark:via-zinc-950 dark:to-zinc-900/50 min-h-screen animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-900 dark:from-white dark:via-gray-300 dark:to-white bg-clip-text text-transparent">
                        Boshqaruv Markazi
                    </h1>
                    <p className="text-zinc-500 dark:text-zinc-400 font-medium">
                        Global tizim nazorati va monitoring
                    </p>
                </div>

                {/* Notifications Bell */}
                <div className="flex items-center gap-3">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className={`relative h-12 w-12 rounded-2xl border-2 transition-all hover:scale-105 ${notifications.length > 0 ? 'border-red-200 bg-red-50 text-red-600 animate-pulse' : 'border-zinc-100'}`}>
                                <Bell className="w-5 h-5" />
                                {notifications.length > 0 && (
                                    <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                                        {notifications.length}
                                    </span>
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-80 p-2 rounded-2xl shadow-2xl border-zinc-100 dark:bg-zinc-950">
                            <div className="px-4 py-3 border-b border-zinc-50 dark:border-zinc-800 mb-2">
                                <h4 className="font-bold text-lg">Xabarnomalar</h4>
                                <p className="text-xs text-muted-foreground">Obunasi tugayotgan restoranlar</p>
                            </div>
                            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                                {notifications.length === 0 ? (
                                    <div className="py-8 text-center text-muted-foreground italic text-sm">
                                        Hozircha xabarlar yo'q
                                    </div>
                                ) : (
                                    notifications.map(n => (
                                        <div
                                            key={n.id}
                                            className="p-3 mb-1 rounded-xl cursor-pointer flex gap-3 items-start hover:bg-zinc-50 dark:hover:bg-zinc-900 group transition-colors"
                                            onClick={() => handleEdit(restaurants.find(r => r.id === n.id)!)}
                                        >
                                            <div className={`p-2 rounded-lg shrink-0 ${n.type === 'expired' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                                                <AlertTriangle className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-sm truncate">{n.name}</div>
                                                <div className={`text-xs font-medium ${n.type === 'expired' ? 'text-red-500' : 'text-orange-500'}`}>
                                                    {n.type === 'expired' ? "Obuna muddati tugagan!" : `Obuna tugashiga ${n.daysLeft} kun qoldi`}
                                                </div>
                                            </div>
                                            <button
                                                className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteClick(restaurants.find(r => r.id === n.id)!);
                                                }}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Admin Tabs */}
            <Tabs defaultValue="restaurants" className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                    <TabsList className="bg-transparent h-12 p-1 gap-2 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full md:w-auto">
                        <TabsTrigger
                            value="restaurants"
                            className="flex items-center gap-2 rounded-xl py-2 px-6 data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-300 font-bold"
                        >
                            <Store className="w-4 h-4" />
                            Restoranlar
                        </TabsTrigger>
                        <TabsTrigger
                            value="staff"
                            className="flex items-center gap-2 rounded-xl py-2 px-6 data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-300 font-bold"
                        >
                            <ShieldCheck className="w-4 h-4" />
                            Global Jamoa
                        </TabsTrigger>
                        <TabsTrigger
                            value="contacts"
                            className="flex items-center gap-2 rounded-xl py-2 px-6 data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-300 font-bold"
                        >
                            <MessageCircle className="w-4 h-4" />
                            Murojaatlar
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="restaurants" className="mt-0">
                        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                            <SheetTrigger asChild>
                                <Button
                                    onClick={handleCreate}
                                    className="h-12 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xl shadow-blue-500/20 transition-all hover:scale-105 active:scale-95 font-semibold group w-full md:w-auto"
                                >
                                    <Plus className="mr-2 h-5 w-5 transition-transform group-hover:rotate-90 duration-300" />
                                    Restoran Qo'shish
                                </Button>
                            </SheetTrigger>
                            <SheetContent className="w-full sm:max-w-[90vw] md:max-w-[850px] p-0 bg-gray-50 dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800" side="right">
                                <div className="h-full flex flex-col">
                                    <div className="p-4 md:p-6 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                                        <SheetTitle className="text-2xl font-bold">{editingRestaurant ? "Restoranni Tahrirlash" : "Yangi Restoran"}</SheetTitle>
                                        <SheetDescription>Tizimga yangi filial qo'shish yoki tahrirlash</SheetDescription>
                                    </div>
                                    <div className="flex-1 overflow-y-auto">
                                        <RestaurantForm
                                            initialData={editingRestaurant}
                                            onSuccess={() => { setIsSheetOpen(false); fetchRestaurants(); }}
                                            onCancel={() => setIsSheetOpen(false)}
                                        />
                                    </div>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </TabsContent>
                </div>

                <TabsContent value="restaurants" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">

                    {/* Stats Grid - Enhanced Design */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="border-none shadow-xl shadow-gray-200/50 dark:shadow-black/20 bg-white dark:bg-zinc-900 overflow-hidden relative group cursor-default hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl" />
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Store className="w-24 h-24 text-blue-600" />
                            </div>
                            <CardHeader className="pb-2 relative z-10">
                                <CardTitle className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                    <Store className="w-4 h-4" />
                                    Jami Restoranlar
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="relative z-10">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                        {stats.totalRestaurants}
                                    </span>
                                    <span className="text-sm font-semibold text-green-600 flex items-center bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                                        <ArrowUpRight className="w-3 h-3 mr-1" /> +12%
                                    </span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-none shadow-xl shadow-gray-200/50 dark:shadow-black/20 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 dark:from-zinc-800 dark:via-zinc-700 dark:to-zinc-800 text-white overflow-hidden relative group cursor-default hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/10 to-white/5 rounded-full blur-3xl" />
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Activity className="w-24 h-24 text-white" />
                            </div>
                            <CardHeader className="pb-2 relative z-10">
                                <CardTitle className="text-sm font-medium text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                    <Activity className="w-4 h-4" />
                                    Faol Filiallar
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="relative z-10">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-black">{stats.activeRestaurants}</span>
                                    <span className="text-sm text-zinc-400">/ {stats.totalRestaurants}</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-none shadow-xl shadow-gray-200/50 dark:shadow-black/20 bg-white dark:bg-zinc-900 overflow-hidden relative group cursor-default hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-full blur-3xl" />
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Users className="w-24 h-24 text-blue-600" />
                            </div>
                            <CardHeader className="pb-2 relative z-10">
                                <CardTitle className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                    <Users className="w-4 h-4" />
                                    Jami Foydalanuvchilar
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="relative z-10">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-black bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                                        {stats.totalAdmins}
                                    </span>
                                    <span className="text-sm font-semibold text-blue-600 flex items-center bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                                        <Users className="w-3 h-3 mr-1" /> Aktiv
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* List Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm p-3 rounded-2xl shadow-lg border border-zinc-100 dark:border-zinc-800">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                <Input
                                    placeholder="Qidirish (Nomi, Slug)..."
                                    className="pl-11 border-none bg-transparent shadow-none focus-visible:ring-0 text-zinc-700 dark:text-zinc-300 h-11 rounded-xl"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className={`h-11 w-11 rounded-xl transition-colors ${statusFilter !== 'all' || sortBy !== 'newest' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-zinc-400 hover:text-zinc-600'}`}>
                                        <Filter className="w-4 h-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 p-2">
                                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        Holat bo'yicha
                                    </div>
                                    <DropdownMenuItem onClick={() => setStatusFilter('all')} className="flex items-center justify-between cursor-pointer">
                                        <span>Hammasi</span>
                                        {statusFilter === 'all' && <Check className="w-4 h-4 text-blue-600" />}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setStatusFilter('active')} className="flex items-center justify-between cursor-pointer">
                                        <span>Faol</span>
                                        {statusFilter === 'active' && <Check className="w-4 h-4 text-blue-600" />}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setStatusFilter('inactive')} className="flex items-center justify-between cursor-pointer">
                                        <span>Nofaol</span>
                                        {statusFilter === 'inactive' && <Check className="w-4 h-4 text-blue-600" />}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setStatusFilter('maintenance')} className="flex items-center justify-between cursor-pointer">
                                        <span>Yangilanish</span>
                                        {statusFilter === 'maintenance' && <Check className="w-4 h-4 text-blue-600" />}
                                    </DropdownMenuItem>

                                    <DropdownMenuSeparator className="my-2" />

                                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        Saralash
                                    </div>
                                    <DropdownMenuItem onClick={() => setSortBy('newest')} className="flex items-center justify-between cursor-pointer">
                                        <span>Eng yangi</span>
                                        {sortBy === 'newest' && <Check className="w-4 h-4 text-blue-600" />}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setSortBy('oldest')} className="flex items-center justify-between cursor-pointer">
                                        <span>Eng eski</span>
                                        {sortBy === 'oldest' && <Check className="w-4 h-4 text-blue-600" />}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setSortBy('name_asc')} className="flex items-center justify-between cursor-pointer">
                                        <span>Nomi (A-Z)</span>
                                        {sortBy === 'name_asc' && <Check className="w-4 h-4 text-blue-600" />}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setSortBy('name_desc')} className="flex items-center justify-between cursor-pointer">
                                        <span>Nomi (Z-A)</span>
                                        {sortBy === 'name_desc' && <Check className="w-4 h-4 text-blue-600" />}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        <Card className="border-none shadow-xl shadow-gray-200/50 dark:shadow-black/20 overflow-hidden bg-white dark:bg-zinc-900">
                            <div className="p-0">
                                {isLoading ? (
                                    <div className="py-20 flex flex-col items-center justify-center text-zinc-400 animate-pulse">
                                        <Store className="w-12 h-12 mb-4 opacity-20" />
                                        <span>Yuklanmoqda...</span>
                                    </div>
                                ) : filteredRestaurants.length === 0 ? (
                                    <div className="py-20 flex flex-col items-center justify-center text-zinc-400">
                                        <Search className="w-12 h-12 mb-4 opacity-20" />
                                        <span>Hech narsa topilmadi</span>
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader className="bg-zinc-50/80 dark:bg-zinc-900/80 backdrop-blur-sm">
                                            <TableRow className="hover:bg-transparent border-b border-zinc-200 dark:border-zinc-800">
                                                <TableHead className="font-semibold text-zinc-900 dark:text-white">Restoran</TableHead>
                                                <TableHead className="font-semibold text-zinc-900 dark:text-white">Admin / Email</TableHead>
                                                <TableHead className="font-semibold text-zinc-900 dark:text-white">Domen</TableHead>
                                                <TableHead className="font-semibold text-zinc-900 dark:text-white">Obuna / Muddati</TableHead>
                                                <TableHead className="font-semibold text-zinc-900 dark:text-white">Holat</TableHead>
                                                <TableHead className="text-right font-semibold text-zinc-900 dark:text-white">Amallar</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredRestaurants.map((restaurant, index) => (
                                                <TableRow
                                                    key={restaurant.id}
                                                    className="hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/30 dark:hover:from-zinc-800/50 dark:hover:to-zinc-700/30 transition-all duration-200 border-b border-zinc-100 dark:border-zinc-800 last:border-0 group animate-in fade-in slide-in-from-bottom-2"
                                                    style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' }}
                                                >
                                                    <TableCell className="font-medium text-zinc-900 dark:text-white py-5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg text-lg ring-4 ring-blue-500/10">
                                                                {restaurant.name.substring(0, 2).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-base flex items-center gap-1.5">
                                                                    {restaurant.name}
                                                                    {restaurant.showDeveloperCredit !== false && (
                                                                        <div title="Developer Credit Active" className="p-0.5 bg-blue-50 text-blue-600 rounded-md">
                                                                            <ShieldCheck className="w-3.5 h-3.5" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="text-xs text-zinc-400 font-normal">Yaratildi: {restaurant.createdAt?.toDate?.().toLocaleDateString() || "N/A"}</div>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="max-w-[180px]">
                                                        <div className="flex items-center gap-2 group/email">
                                                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600">
                                                                <User className="w-3.5 h-3.5" />
                                                            </div>
                                                            <div className="truncate">
                                                                <div className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                                                                    {restaurant.adminEmail || "Email yo'q"}
                                                                </div>
                                                                <div className="text-[10px] text-zinc-400 font-medium flex items-center gap-1">
                                                                    <Shield className="w-3 h-3" />
                                                                    {restaurant.adminPassword || "Parol yo'q"}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="max-w-[150px]">
                                                        {restaurant.customDomain ? (
                                                            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                                                                <ArrowUpRight className="w-3 h-3" />
                                                                <span className="text-xs font-bold font-mono truncate">{restaurant.customDomain}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-zinc-400">-</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="max-w-[150px]">
                                                        {restaurant.subscriptionEndDate ? (
                                                            <div className="space-y-1">
                                                                <div className="flex items-center gap-1.5">
                                                                    <Badge variant="outline" className={`text-[10px] font-bold uppercase ${restaurant.subscriptionPlan === 'yearly' ? 'border-amber-200 text-amber-700 bg-amber-50' :
                                                                            restaurant.subscriptionPlan === 'half_yearly' ? 'border-indigo-200 text-indigo-700 bg-indigo-50' :
                                                                                restaurant.subscriptionPlan === 'monthly' ? 'border-blue-200 text-blue-700 bg-blue-50' :
                                                                                    'border-gray-200 text-gray-700 bg-gray-50'
                                                                        }`}>
                                                                        {restaurant.subscriptionPlan === 'yearly' ? 'Yillik' :
                                                                            restaurant.subscriptionPlan === 'half_yearly' ? 'Yarim yillik' :
                                                                                restaurant.subscriptionPlan === 'monthly' ? 'Oylik' :
                                                                                    restaurant.subscriptionPlan === 'trial' ? 'Sinov' : 'Bepul'}
                                                                    </Badge>
                                                                    <span className="text-[10px] text-zinc-400 font-mono">
                                                                        {restaurant.subscriptionPrice?.toLocaleString()} UZS
                                                                    </span>
                                                                </div>
                                                                <div className={`text-[11px] font-bold flex items-center gap-1 ${new Date(restaurant.subscriptionEndDate) < new Date() ? 'text-red-500' : 'text-zinc-600'
                                                                    }`}>
                                                                    <Bell className="w-3 h-3" />
                                                                    {restaurant.subscriptionEndDate}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-zinc-400">Obuna yo'q</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant={restaurant.status === 'active' ? 'default' : restaurant.status === 'maintenance' ? 'secondary' : 'secondary'}
                                                            className={restaurant.status === 'active'
                                                                ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 border-none px-3 py-1 shadow-lg shadow-green-500/20"
                                                                : restaurant.status === 'maintenance'
                                                                ? "bg-amber-500 text-white border-none px-3 py-1 shadow-lg shadow-amber-500/20 animate-pulse"
                                                                : "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300 border-none px-3 py-1"
                                                            }
                                                        >
                                                            {restaurant.status === 'active' ? "✓ Faol" : restaurant.status === 'maintenance' ? "⚙ Yangilanish" : "⊗ Nofaol"}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Button
                                                                variant="default"
                                                                size="sm"
                                                                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white h-9 px-4 rounded-lg shadow-md shadow-blue-500/20 transition-all hover:scale-105"
                                                                onClick={() => handleManage(restaurant.id)}
                                                            >
                                                                <ShieldCheck className="w-4 h-4 mr-2" /> O'tish
                                                            </Button>
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="border-zinc-200 dark:border-zinc-700 h-9 w-9 p-0 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all hover:scale-105"
                                                                    >
                                                                        <MoreVertical className="w-4 h-4 text-zinc-500" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="w-48">
                                                                    <DropdownMenuItem onClick={() => handleEdit(restaurant)} className="cursor-pointer">
                                                                        <Edit className="w-4 h-4 mr-2 text-blue-600" />
                                                                        <span>Tahrirlash</span>
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => handleToggleMaintenance(restaurant)} className="cursor-pointer">
                                                                        <RefreshCw className={`w-4 h-4 mr-2 ${restaurant.status === 'maintenance' ? 'text-green-600' : 'text-amber-600'}`} />
                                                                        <span>{restaurant.status === 'maintenance' ? "Faollashtirish" : "Yangilanish rejimi"}</span>
                                                                    </DropdownMenuItem>
                                                                    {userRole !== "co_founder" && (
                                                                        <>
                                                                            <DropdownMenuSeparator />
                                                                            <DropdownMenuItem
                                                                                onClick={() => handleDeleteClick(restaurant)}
                                                                                className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20"
                                                                            >
                                                                                <Trash2 className="w-4 h-4 mr-2" />
                                                                                <span>O'chirish</span>
                                                                            </DropdownMenuItem>
                                                                        </>
                                                                    )}
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </div>
                        </Card>
                    </div>

                    {/* Delete Confirmation Dialog */}
                    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                        <AlertDialogContent className="max-w-md">
                            <AlertDialogHeader>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                                        <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-500" />
                                    </div>
                                    <AlertDialogTitle className="text-xl">Rostdan ham o'chirmoqchimisiz?</AlertDialogTitle>
                                </div>
                                <AlertDialogDescription asChild>
                                    <div className="text-base space-y-3">
                                        <p>
                                            Siz <span className="font-bold text-zinc-900 dark:text-white">"{restaurantToDelete?.name}"</span> restoranini butunlay o'chirmoqdasiz.
                                        </p>
                                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                            <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                                                ⚠️ Diqqat: Bu amal qaytarilmaydi! Barcha ma'lumotlar o'chiriladi.
                                            </p>
                                        </div>
                                    </div>
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="gap-2">
                                <AlertDialogCancel className="rounded-lg">Bekor qilish</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleDeleteConfirm}
                                    disabled={isDeleting}
                                    className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg shadow-lg shadow-red-500/20"
                                >
                                    {isDeleting ? (
                                        <>
                                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                            O'chirilmoqda...
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Ha, O'chirish
                                        </>
                                    )}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                </TabsContent>

                <TabsContent value="staff" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <SuperAdminStaff />
                </TabsContent>

                <TabsContent value="contacts" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <SuperAdminContacts />
                </TabsContent>
            </Tabs>

            {/* Dashboard Footer */}
            <footer className="mt-12 pb-8 text-center">
                <div className="flex flex-col items-center justify-center gap-2">
                    <div className="h-px w-24 bg-gradient-to-r from-transparent via-zinc-200 dark:via-zinc-800 to-transparent mb-4" />
                    <p className="text-[11px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-[0.2em] flex items-center gap-1.5">
                        <span>© 2025</span>
                        <a href="http://abdiaxatov.uz" className="text-blue-600 hover:underline font-black">Abdiaxatov</a>
                        <span>IT xizmatlari</span>
                    </p>
                </div>
            </footer>
        </div>
    )
}
