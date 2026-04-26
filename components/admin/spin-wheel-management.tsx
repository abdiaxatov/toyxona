"use client"

import { useState, useEffect } from "react"
import { doc, getDoc, updateDoc, onSnapshot, query } from "firebase/firestore"
import { db, rtdb } from "@/lib/firebase"
import { ref, onValue, set as rtdbSet } from "firebase/database"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import {
    Loader2, Save, Gift, RotateCcw, Plus, Trash2, Eye,
    Settings2, Trophy, Activity, TrendingUp, Users, MousePointer2,
    Utensils, Percent, Palette, Type, PlusCircle
} from "lucide-react"
import { useAuth } from "@/components/admin/admin-auth-provider"
import { motion, AnimatePresence } from "framer-motion"
import { cn, formatCurrency } from "@/lib/utils"
import Image from "next/image"

import { getLocalizedName } from "@/lib/localization"
import { Select, SelectContent, SelectItem as SelectTriggerItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { type MenuItem } from "@/types"
import { SpinWheel } from "@/components/spin-wheel"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AdminLayoutClient } from "@/components/admin/admin-layout"
import { getRestaurantCollection } from "@/lib/firebase-utils"

interface Prize {
    id: string
    text: string
    color: string
    value: any
    type: 'discount' | 'none' | 'item'
}

export function SpinWheelManagement() {
    const { restaurantId } = useAuth()
    const { toast } = useToast()

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [winsToday, setWinsToday] = useState(0)
    const [totalSpins, setTotalSpins] = useState(0)
    const [menuItems, setMenuItems] = useState<MenuItem[]>([])

    const [settings, setSettings] = useState({
        enableSpinWheel: false,
        spinWheelLimit: 3,
        spinWheelMaxAttempts: 3,
        spinWheelWinEveryX: 10,
        spinWheelPrizes: [] as Prize[]
    })

    useEffect(() => {
        if (!restaurantId) return

        const today = new Date().toISOString().split('T')[0]
        const winsRef = ref(rtdb, `restaurants/${restaurantId}/spin_stats/${today}`)
        const totalSpinsRef = ref(rtdb, `restaurants/${restaurantId}/spin_stats/total_spins`)

        const unsubWins = onValue(winsRef, (snapshot) => {
            setWinsToday(snapshot.val() || 0)
        })

        const unsubTotal = onValue(totalSpinsRef, (snapshot) => {
            setTotalSpins(snapshot.val() || 0)
        })

        const fetchSettings = async () => {
            try {
                const docRef = doc(db, "restaurants", restaurantId)
                const docSnap = await getDoc(docRef)
                if (docSnap.exists()) {
                    const data = docSnap.data()
                    setSettings({
                        enableSpinWheel: data.enableSpinWheel || false,
                        spinWheelLimit: data.spinWheelLimit || 3,
                        spinWheelMaxAttempts: data.spinWheelMaxAttempts || 3,
                        spinWheelWinEveryX: data.spinWheelWinEveryX || 10,
                        spinWheelPrizes: data.spinWheelPrizes || []
                    })
                }

                const itemsRef = getRestaurantCollection(restaurantId, "menuItems")
                const unsubItems = onSnapshot(query(itemsRef), (snapshot) => {
                    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem))
                    setMenuItems(items)
                })
                return unsubItems
            } catch (error) {
                console.error("Error fetching settings:", error)
            } finally {
                setLoading(false)
            }
        }

        const unsubItemsPromise = fetchSettings()
        return () => {
            unsubWins()
            unsubTotal()
            unsubItemsPromise.then(unsub => unsub?.())
        }
    }, [restaurantId])

    const handleSave = async () => {
        if (!restaurantId) return
        setSaving(true)
        try {
            await updateDoc(doc(db, "restaurants", restaurantId), {
                enableSpinWheel: settings.enableSpinWheel,
                spinWheelLimit: settings.spinWheelLimit,
                spinWheelMaxAttempts: settings.spinWheelMaxAttempts,
                spinWheelWinEveryX: settings.spinWheelWinEveryX,
                spinWheelPrizes: settings.spinWheelPrizes
            })
            toast({ title: "Saqlandi", description: "Baraban sozlamalari muvaffaqiyatli yangilandi" })
        } catch (error) {
            toast({ title: "Xatolik", description: "Saqlashda xatolik yuz berdi", variant: "destructive" })
        } finally {
            setSaving(false)
        }
    }

    const handleResetWins = async () => {
        if (!restaurantId || !confirm("Bugungi yutuqlar sonini nolga tushirmoqchimisiz?")) return
        try {
            const today = new Date().toISOString().split('T')[0]
            await rtdbSet(ref(rtdb, `restaurants/${restaurantId}/spin_stats/${today}`), 0)
            toast({ title: "Tozalandi", description: "Bugungi yutuqlar nolga tushirildi" })
        } catch (e) { toast({ title: "Xatolik", variant: "destructive" }) }
    }

    const addPrize = () => {
        if (settings.spinWheelPrizes.length >= 8) {
            toast({ title: "Limit", description: "Maksimal 8 ta sovg'a qo'shish mumkin" })
            return
        }
        const colors = ["#8B5CF6", "#3B82F6", "#F59E0B", "#10B981", "#EC4899", "#6366F1", "#06B6D4", "#EF4444"]
        const nextColor = colors[settings.spinWheelPrizes.length % colors.length]
        setSettings({
            ...settings,
            spinWheelPrizes: [
                ...settings.spinWheelPrizes,
                { id: Math.random().toString(36).substring(7), text: "Yangi sovg'a", color: nextColor, value: 10, type: 'discount' }
            ]
        })
    }

    const removePrize = (index: number) => {
        if (settings.spinWheelPrizes.length <= 4) {
            toast({ title: "Xatolik", description: "Kamida 4 ta sovg'a bo'lishi shart" })
            return
        }
        setSettings({ ...settings, spinWheelPrizes: settings.spinWheelPrizes.filter((_, i) => i !== index) })
    }

    const updatePrize = (index: number, updates: Partial<Prize>) => {
        const newPrizes = [...settings.spinWheelPrizes]
        newPrizes[index] = { ...newPrizes[index], ...updates }
        setSettings({ ...settings, spinWheelPrizes: newPrizes })
    }

    const winRate = totalSpins > 0 ? ((winsToday / totalSpins) * 100).toFixed(1) : "0"

    interface StatCardProps {
        title: string
        value: string | number
        suffix?: string
        icon: any
        color: string
    }

    const StatCard = ({ title, value, suffix, icon: Icon, color }: StatCardProps) => (
        <Card className="border-none shadow-sm bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden">
            <CardContent className="p-5 flex items-center gap-4">
                <div className={cn("p-3 rounded-2xl", color)}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="space-y-0.5">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{title}</p>
                    <h3 className="text-2xl font-black">
                        {value}
                        {suffix && <span className="text-sm ml-1 font-bold opacity-30">{suffix}</span>}
                    </h3>
                </div>
            </CardContent>
        </Card>
    )

    if (loading) return (
        <AdminLayoutClient>
            <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary w-10 h-10" /></div>
        </AdminLayoutClient>
    )

    return (
        <AdminLayoutClient>
            <div className="w-full space-y-6 animate-in fade-in duration-500 pb-20 max-w-7xl mx-auto">
                {/* 🏷️ Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-primary/10 rounded-2xl">
                            <Gift className="text-primary w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white uppercase">Baxt Barabani</h1>
                            <p className="text-muted-foreground text-[11px] font-bold uppercase tracking-widest mt-0.5">Sozlamalar va boshqaruv</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="h-11 px-6 rounded-xl border-gray-200 dark:border-zinc-800 font-bold flex items-center gap-2">
                                    <Eye className="w-4 h-4" /> <span>Ko'rish</span>
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-[440px] p-0 bg-transparent border-none">
                                <SpinWheel
                                    restaurantId={restaurantId || "default"}
                                    prizes={settings.spinWheelPrizes}
                                    limit={settings.spinWheelLimit}
                                    maxAttempts={settings.spinWheelMaxAttempts}
                                    winEveryX={settings.spinWheelWinEveryX}
                                    logoUrl={restaurantId ? `/api/restaurant-logo?id=${restaurantId}` : undefined}
                                />
                            </DialogContent>
                        </Dialog>

                        <Button onClick={handleSave} disabled={saving} className="h-11 px-8 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold flex items-center gap-2 shadow-lg shadow-primary/20">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Saqlash
                        </Button>
                    </div>
                </div>

                {/* 📊 Analytics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard title="Bugun" value={winsToday} suffix={`/ ${settings.spinWheelLimit}`} icon={Trophy} color="bg-amber-500" />
                    <StatCard title="Aylantirishlar" value={totalSpins} icon={Activity} color="bg-primary" />
                    <StatCard title="Ehtimollik" value={winRate} suffix="%" icon={TrendingUp} color="bg-emerald-500" />
                    <StatCard title="Reach" value={Math.round(totalSpins * 0.7)} icon={Users} color="bg-blue-500" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* ⚙️ Configuration Sidebar */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* Status Monitor */}
                        <Card className="border-none shadow-sm bg-zinc-900 text-white rounded-3xl overflow-hidden hover:shadow-md transition-shadow">
                            <CardContent className="p-6 space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-[10px] font-black uppercase tracking-wider text-white/40">Real-vaqtda holat</span>
                                    </div>
                                    <Button onClick={handleResetWins} variant="ghost" size="sm" className="h-8 text-[10px] font-black uppercase text-white/50 hover:text-white hover:bg-white/10 px-2 rounded-lg">
                                        Tozalash
                                    </Button>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-black">{winsToday}</span>
                                        <span className="text-white/30 font-bold uppercase text-xs">Yutuq berildi</span>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${Math.min(100, (winsToday / (settings.spinWheelLimit || 1)) * 100)}%` }}
                                                className="h-full bg-primary"
                                            />
                                        </div>
                                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-white/30">
                                            <span>Progress</span>
                                            <span>{Math.round((winsToday / (settings.spinWheelLimit || 1)) * 100)}%</span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Settings Card */}
                        <Card className="border-none shadow-sm bg-white dark:bg-zinc-900 rounded-3xl p-1">
                            <CardHeader className="pb-4">
                                <CardTitle className="flex items-center gap-2 text-lg font-black uppercase tracking-tight">
                                    <Settings2 className="w-5 h-5 text-primary" /> Asosiy Parmetrlar
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6 px-6 pb-6">
                                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-2xl border border-gray-100 dark:border-zinc-800">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm font-bold">Faol holat</Label>
                                        <p className="text-[10px] text-muted-foreground font-medium">Saytda ko'rinishi</p>
                                    </div>
                                    <Switch checked={settings.enableSpinWheel} onCheckedChange={(val) => setSettings({ ...settings, enableSpinWheel: val })} />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-[11px] font-bold text-muted-foreground ml-1">Kunlik limit</Label>
                                        <Input type="number" value={settings.spinWheelLimit} onChange={(e) => setSettings({ ...settings, spinWheelLimit: Number(e.target.value) })} className="rounded-xl h-12 font-bold px-4" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[11px] font-bold text-muted-foreground ml-1">Urinishlar</Label>
                                        <Input type="number" value={settings.spinWheelMaxAttempts} onChange={(e) => setSettings({ ...settings, spinWheelMaxAttempts: Number(e.target.value) })} className="rounded-xl h-12 font-bold px-4" />
                                    </div>
                                </div>

                                <div className="space-y-3 p-4 bg-primary/5 dark:bg-primary/10 rounded-2xl border border-primary/10">
                                    <div className="flex justify-between items-center">
                                        <Label className="text-[11px] font-bold text-primary italic">Yutuq chiqish tezligi</Label>
                                        <span className="font-black text-primary text-sm">{settings.spinWheelWinEveryX} ta</span>
                                    </div>
                                    <Input type="number" value={settings.spinWheelWinEveryX} onChange={(e) => setSettings({ ...settings, spinWheelWinEveryX: Number(e.target.value) })} className="h-11 font-bold border-primary/20 rounded-xl px-4" />
                                    <p className="text-[10px] text-muted-foreground font-medium leading-relaxed italic">Har {settings.spinWheelWinEveryX} ta aylantirishdan bittasi yutiladi.</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* 🎁 Prizes Grid Area */}
                    <div className="lg:col-span-8 space-y-6">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-2">
                                <PlusCircle className="w-5 h-5 text-primary" />
                                <h2 className="text-xl font-black uppercase tracking-tight">Sovrinlar Pool</h2>
                                <Badge variant="secondary" className="bg-primary/10 text-primary border-none font-black ml-2">{settings.spinWheelPrizes.length}/8</Badge>
                            </div>
                            <Button onClick={addPrize} disabled={settings.spinWheelPrizes.length >= 8} variant="outline" className="h-10 rounded-xl border-primary bg-primary/5 text-primary hover:bg-primary hover:text-white font-bold transition-all px-4">
                                <Plus className="mr-1.5 w-4 h-4" /> Yangi sovg'a
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <AnimatePresence mode="popLayout">
                                {settings.spinWheelPrizes.map((prize, idx) => (
                                    <motion.div
                                        key={prize.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="group bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 p-5 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 relative"
                                    >
                                        <div className="flex gap-4">
                                            <div className="relative flex-shrink-0">
                                                <input
                                                    type="color"
                                                    value={prize.color}
                                                    onChange={(e) => updatePrize(idx, { color: e.target.value })}
                                                    className="w-14 h-14 rounded-2xl border-4 border-white dark:border-zinc-800 p-0 cursor-pointer shadow-md hover:scale-105 transition-transform"
                                                />
                                                <div className="absolute -top-2 -right-2 bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-[10px] font-black border-2 border-white dark:border-zinc-800">{idx + 1}</div>
                                            </div>

                                            <div className="flex-1 space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <Select value={prize.type} onValueChange={(val: any) => {
                                                        const firstItem = menuItems[0]
                                                        updatePrize(idx, {
                                                            type: val,
                                                            value: val === 'none' ? 0 : val === 'item' ? (firstItem?.id || "") : 10,
                                                            text: val === 'none' ? "Omad kelsin!" : val === 'item' ? (getLocalizedName(firstItem, 'uz') || "Taom nomi") : prize.text
                                                        })
                                                    }}>
                                                        <SelectTrigger className="w-fit h-7 text-[10px] font-black bg-gray-50 dark:bg-zinc-800 text-muted-foreground border-none rounded-lg px-2 shadow-sm">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-xl border-none shadow-2xl">
                                                            <SelectTriggerItem value="discount" className="text-xs font-bold">🎁 CHEGIRMA</SelectTriggerItem>
                                                            <SelectTriggerItem value="item" className="text-xs font-bold">🍲 TAOM</SelectTriggerItem>
                                                            <SelectTriggerItem value="none" className="text-xs font-bold">🍀 OMAD</SelectTriggerItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <Button variant="ghost" size="icon" onClick={() => removePrize(idx)} className="h-8 w-8 text-gray-300 hover:text-red-500 rounded-full transition-colors">
                                                        <Trash2 size={16} />
                                                    </Button>
                                                </div>
                                                <div className="relative">
                                                    <Input
                                                        value={prize.text}
                                                        onChange={(e) => updatePrize(idx, { text: e.target.value })}
                                                        className="h-10 font-bold border-none bg-gray-50 dark:bg-zinc-800/70 rounded-xl px-3 text-sm focus-visible:ring-1 focus-visible:ring-primary/20"
                                                        placeholder="Sovg'a nomi"
                                                    />
                                                    <Type size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/30" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Dynamic Conditional Panels */}
                                        <div className="mt-4">
                                            {prize.type === 'discount' && (
                                                <div className="flex items-center gap-3 bg-primary/5 dark:bg-primary/10 p-3 rounded-2xl border border-primary/5">
                                                    <Percent className="w-4 h-4 text-primary" />
                                                    <div className="flex items-center gap-2 flex-1">
                                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Qiymati:</span>
                                                        <Input
                                                            type="number"
                                                            value={prize.value}
                                                            onChange={(e) => updatePrize(idx, { value: Number(e.target.value) })}
                                                            className="w-16 h-8 text-xs font-black text-center bg-white dark:bg-zinc-900 border-none rounded-lg shadow-sm"
                                                        />
                                                        <span className="text-xs font-black text-primary">%</span>
                                                    </div>
                                                </div>
                                            )}

                                            {prize.type === 'item' && (
                                                <div className="space-y-2 bg-gray-50/50 dark:bg-zinc-800/50 p-3 rounded-2xl border border-gray-100 dark:border-zinc-800">
                                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground pl-1">
                                                        <Utensils className="w-3 h-3 text-primary" />
                                                        Birlashtirilgan Taom
                                                    </div>
                                                    <Select
                                                        value={prize.value}
                                                        onValueChange={(itemId) => {
                                                            const item = menuItems.find(i => i.id === itemId)
                                                            if (item) updatePrize(idx, { value: itemId, text: getLocalizedName(item, 'uz') || prize.text })
                                                        }}
                                                    >
                                                        <SelectTrigger className="w-full h-12 bg-white dark:bg-zinc-900 border-none rounded-xl px-3 shadow-sm text-xs font-bold ring-offset-white">
                                                            <SelectValue placeholder="Taomni tanlang..." />
                                                        </SelectTrigger>
                                                        <SelectContent className="z-[600] max-h-72 rounded-2xl p-2 border-none shadow-2xl">
                                                            {menuItems.map(item => (
                                                                <SelectTriggerItem key={item.id} value={item.id} className="py-2.5 px-2 rounded-xl mb-1">
                                                                    <div className="flex items-center gap-3 w-full">
                                                                        <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-50 border border-gray-100 flex-shrink-0">
                                                                            <Image
                                                                                src={item.imageUrl || (item.imageUrls && item.imageUrls[0]) || "/placeholder.png"}
                                                                                fill
                                                                                alt=""
                                                                                className="object-cover"
                                                                            />
                                                                        </div>
                                                                        <div className="flex flex-col min-w-0">
                                                                            <span className="text-xs font-bold truncate">{getLocalizedName(item, 'uz')}</span>
                                                                            <span className="text-[10px] font-black text-primary/70">{formatCurrency(item.price)}</span>
                                                                        </div>
                                                                    </div>
                                                                </SelectTriggerItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayoutClient>
    )
}
