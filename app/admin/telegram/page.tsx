"use client"

import { useState, useEffect } from "react"
import { doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useRestaurant } from "@/components/admin/restaurant-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Loader2, Send, Globe, MessageSquare, Info, ExternalLink, ShieldCheck, Zap, Settings, Command, Bell } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react"

export default function TelegramSettingsPage() {
    const { restaurant, isLoading: restaurantLoading } = useRestaurant()
    const [isSaving, setIsSaving] = useState(false)
    const [isSettingUp, setIsSettingUp] = useState(false)
    
    const [token, setToken] = useState("")
    const [botUsername, setBotUsername] = useState("")
    const [webAppUrl, setWebAppUrl] = useState("")
    const [adminChatIds, setAdminChatIds] = useState<string[]>([])
    const [newChatId, setNewChatId] = useState("")
    const [welcomeText, setWelcomeText] = useState("Xush kelibsiz! Marhamat, menyuni ko'rish uchun telefon raqamingizni yuboring.")
    const [successText, setSuccessText] = useState("Muvaffaqiyatli ro'yxatdan o'tdingiz! \n\nQuyidagi tugma orqali menyuni ko'rishingiz mumkin:")

    const [diagnostics, setDiagnostics] = useState<any>(null)
    const [isLoadingDiagnostics, setIsLoadingDiagnostics] = useState(true)

    useEffect(() => {
        const fetchDiagnostics = async () => {
            try {
                const res = await fetch("/api/bot/status")
                const data = await res.json()
                setDiagnostics(data)
            } catch (error) {
                console.error("Failed to fetch diagnostics:", error)
            } finally {
                setIsLoadingDiagnostics(false)
            }
        }
        fetchDiagnostics()
    }, [])

    useEffect(() => {
        if (restaurant) {
            setToken(restaurant.telegramBotToken || "")
            setBotUsername(restaurant.telegramBotUsername || "")
            setWebAppUrl(restaurant.telegramWebAppUrl || "")
            // Load multi-admin IDs: prefer array, fallback to legacy single field
            if (Array.isArray(restaurant.adminTelegramIds) && restaurant.adminTelegramIds.length > 0) {
                setAdminChatIds(restaurant.adminTelegramIds.map(String))
            } else if (restaurant.telegramAdminChatId) {
                // legacy: parse comma/space separated
                const ids = restaurant.telegramAdminChatId.toString().split(/[\s,]+/).filter(Boolean)
                setAdminChatIds(ids)
            }
            setWelcomeText(restaurant.telegramWelcomeText || "Xush kelibsiz! Marhamat, menyuni ko'rish uchun telefon raqamingizni yuboring.")
            setSuccessText(restaurant.telegramSuccessText || "Muvaffaqiyatli ro'yxatdan o'tdingiz! \n\nQuyidagi tugma orqali menyuni ko'rishingiz mumkin:")
        }
    }, [restaurant])


    const handleSave = async () => {
        if (!restaurant?.id) return
        
        setIsSaving(true)
        try {
            await updateDoc(doc(db, "restaurants", restaurant.id), {
                telegramBotToken: token,
                telegramBotUsername: botUsername,
                telegramWebAppUrl: webAppUrl,
                // Save both: new array field + legacy single field (first entry)
                adminTelegramIds: adminChatIds,
                telegramAdminChatId: adminChatIds[0] || "",
                telegramWelcomeText: welcomeText,
                telegramSuccessText: successText,
                updatedAt: new Date()
            })
            toast.success("Sozlamalar saqlandi")
        } catch (error) {
            console.error("Error saving telegram settings:", error)
            toast.error("Saqlashda xatolik yuz berdi")
        } finally {
            setIsSaving(false)
        }
    }

    const addChatId = () => {
        const trimmed = newChatId.trim()
        if (!trimmed) return
        // support comma/space separated paste
        const parts = trimmed.split(/[\s,]+/).filter(Boolean)
        setAdminChatIds(prev => {
            const merged = [...prev]
            parts.forEach(p => { if (!merged.includes(p)) merged.push(p) })
            return merged
        })
        setNewChatId("")
    }

    const removeChatId = (id: string) => {
        setAdminChatIds(prev => prev.filter(x => x !== id))
    }


    const handleSetupBot = async () => {
        if (!token) {
            toast.error("Bot tokenini kiriting")
            return
        }

        setIsSettingUp(true)
        try {
            const response = await fetch("/api/bot/setup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    token,
                    restaurantId: restaurant.id,
                    webAppUrl: webAppUrl
                })
            })

            const data = await response.json()
            if (data.success) {
                toast.success("Bot muvaffaqiyatli sozlandi!")
            } else {
                toast.error(data.error || "Sozlashda xatolik")
            }
        } catch (error) {
            console.error("Error setting up bot:", error)
            toast.error("Botni sozlashda xatolik yuz berdi")
        } finally {
            setIsSettingUp(false)
        }
    }

    if (restaurantLoading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-8 p-4 md:p-8 bg-gradient-to-br from-gray-50/80 via-white to-blue-50/30 dark:from-zinc-950/90 dark:via-zinc-950 dark:to-zinc-900/50 min-h-screen animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-900 dark:from-white dark:via-gray-300 dark:to-white bg-clip-text text-transparent">
                        Telegram Bot
                    </h1>
                    <p className="text-zinc-500 dark:text-zinc-400 font-medium">
                        Bot sozlamalari va webhook boshqaruvi
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Settings Card */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="border-none shadow-xl shadow-gray-200/50 dark:shadow-black/20 bg-white dark:bg-zinc-900 overflow-hidden">
                        <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-sky-100 text-sky-600 rounded-2xl dark:bg-sky-900/30">
                                    <Settings className="h-5 w-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-xl font-bold">Bot Konfiguratsiyasi</CardTitle>
                                    <CardDescription>BotFather'dan olingan ma'lumotlarni shu yerda tahrirlang</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="grid gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="token" className="text-sm font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                                        <ShieldCheck className="w-4 h-4 text-sky-500" />
                                        Bot API Token
                                    </Label>
                                    <Input
                                        id="token"
                                        type="password"
                                        placeholder="123456789:ABCDefGhIJKlmNoPQRstuVWxYz"
                                        value={token}
                                        onChange={(e) => setToken(e.target.value)}
                                        className="h-12 bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 focus:ring-sky-500 rounded-xl transition-all font-mono"
                                    />
                                    <p className="text-xs text-zinc-400">Hech qachon tokeningizni begonalarga bermang</p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="botUsername" className="text-sm font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                                        <MessageSquare className="w-4 h-4 text-sky-500" />
                                        Bot Username
                                    </Label>
                                    <div className="flex items-center">
                                        <span className="h-12 flex items-center px-4 bg-zinc-100 dark:bg-zinc-800 border border-r-0 border-zinc-200 dark:border-zinc-700 rounded-l-xl text-zinc-400 font-bold">@</span>
                                        <Input
                                            id="botUsername"
                                            placeholder="7daysBurgerBot"
                                            value={botUsername}
                                            onChange={(e) => setBotUsername(e.target.value)}
                                            className="h-12 bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 focus:ring-sky-500 rounded-l-none rounded-r-xl transition-all font-bold"
                                        />
                                    </div>
                                    <p className="text-xs text-zinc-400">Botingizning @username'i (masalan: 7daysBurgerBot)</p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="url" className="text-sm font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                                        <Globe className="w-4 h-4 text-sky-500" />
                                        Web App URL (Menyu)
                                    </Label>
                                    <Input
                                        id="url"
                                        placeholder={`https://${restaurant?.slug || 'res'}.abdiaxatov.uz/demo`}
                                        value={webAppUrl}
                                        onChange={(e) => setWebAppUrl(e.target.value)}
                                        className="h-12 bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 focus:ring-sky-500 rounded-xl transition-all"
                                    />
                                    <p className="text-xs text-zinc-400">Bot ichida ochiladigan asosiy menyu manzili</p>
                                </div>

                                <div className="space-y-3">
                                    <Label className="text-sm font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                                        <Bell className="w-4 h-4 text-sky-500" />
                                        Buyurtma Xabarlari — Admin Chat ID'lar
                                    </Label>

                                    {/* Existing admin IDs list */}
                                    {adminChatIds.length > 0 && (
                                        <div className="flex flex-wrap gap-2 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700 min-h-[48px]">
                                            {adminChatIds.map((id) => (
                                                <div key={id} className="flex items-center gap-1.5 bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300 px-3 py-1.5 rounded-full text-xs font-mono font-bold group">
                                                    <span>{id}</span>
                                                    <button
                                                        onClick={() => removeChatId(id)}
                                                        className="w-4 h-4 rounded-full bg-sky-200 dark:bg-sky-800 flex items-center justify-center hover:bg-red-200 hover:text-red-700 dark:hover:bg-red-900/50 dark:hover:text-red-400 transition-colors ml-0.5"
                                                        title="O'chirish"
                                                    >
                                                        <XCircle className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Add new Chat ID */}
                                    <div className="flex gap-2">
                                        <Input
                                            id="adminChat"
                                            placeholder="Chat ID kiritng: 123456789"
                                            value={newChatId}
                                            onChange={(e) => setNewChatId(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && addChatId()}
                                            className="h-11 bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 focus:ring-sky-500 rounded-xl transition-all font-mono flex-1"
                                        />
                                        <Button
                                            type="button"
                                            onClick={addChatId}
                                            disabled={!newChatId.trim()}
                                            className="h-11 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold shrink-0"
                                        >
                                            + Qo'shish
                                        </Button>
                                    </div>

                                    <p className="text-xs text-zinc-400">
                                        Bir nechta admin, guruh yoki kanal ID'larini qo'shishingiz mumkin. Har bir buyurtma barchaga yuboriladi.
                                        <br />
                                        <span className="font-medium text-sky-500">Chat ID topish:</span> @userinfobot ga /start yuboring.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="welcome" className="text-sm font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                                        <MessageSquare className="w-4 h-4 text-sky-500" />
                                        Xush kelibsiz matni
                                    </Label>
                                    <Textarea
                                        id="welcome"
                                        placeholder="Bot ishga tushganda chiqadigan matn..."
                                        value={welcomeText}
                                        onChange={(e) => setWelcomeText(e.target.value)}
                                        className="bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 focus:ring-sky-500 rounded-xl transition-all min-h-[100px] p-4 text-sm"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="success" className="text-sm font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                                        Muvaffaqiyatli ro'yxatdan o'tish matni
                                    </Label>
                                    <Textarea
                                        id="success"
                                        placeholder="Kontakt yuborilgandan keyin chiqadigan matn..."
                                        value={successText}
                                        onChange={(e) => setSuccessText(e.target.value)}
                                        className="bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 focus:ring-sky-500 rounded-xl transition-all min-h-[100px] p-4 text-sm"
                                    />
                                    <p className="text-xs text-zinc-400">Bu matndan keyin "Menyuni ochish" tugmasi chiqadi</p>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                <Button 
                                    onClick={handleSave} 
                                    disabled={isSaving}
                                    className="h-12 px-8 rounded-xl bg-gradient-to-r from-zinc-900 to-zinc-800 dark:from-white dark:to-gray-200 text-white dark:text-black shadow-xl transition-all hover:scale-105 active:scale-95 font-bold flex-1"
                                >
                                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sozlamalarni Saqlash"}
                                </Button>
                                
                                <Button 
                                    onClick={handleSetupBot} 
                                    disabled={isSettingUp || !token}
                                    className="h-12 px-8 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white shadow-xl shadow-sky-500/20 transition-all hover:scale-105 active:scale-95 font-bold flex-1"
                                >
                                    {isSettingUp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (
                                        <>
                                            <Zap className="mr-2 h-4 w-4 fill-current" />
                                            Webhookni Faollashtirish
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Status Alert */}
                    {token && (
                        <Card className="border-none shadow-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 dark:from-green-500/5 dark:to-emerald-500/5 border border-green-100 dark:border-green-900/30">
                            <CardContent className="p-6 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-2xl bg-green-100 dark:bg-green-900/40 text-green-600 flex items-center justify-center">
                                        <Zap className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-green-900 dark:text-green-400">Bot Test Rejimi</h4>
                                        <p className="text-sm text-green-700 dark:text-green-500 opacity-80">Webhook ulangan, botingiz hozirda faol ishlamoqda.</p>
                                    </div>
                                </div>
                                <Button 
                                    variant="outline" 
                                    className="rounded-xl border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 bg-white dark:bg-zinc-950 hover:bg-green-50 dark:hover:bg-green-900/20"
                                    onClick={() => window.open(`https://t.me/BotFather`, "_blank")}
                                >
                                    Test Qilish
                                    <ExternalLink className="ml-2 h-4 w-4" />
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    <Card className="border-none shadow-xl bg-zinc-900 text-white overflow-hidden relative group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl" />
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-sky-400">
                                <Command className="h-5 w-5" />
                                Qo'llanma
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm text-zinc-300">
                            <div className="flex gap-3">
                                <div className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center shrink-0 font-bold text-xs">1</div>
                                <p><a href="https://t.me/BotFather" target="_blank" className="text-sky-400 font-bold hover:underline">@BotFather</a> orqali yangi bot yarating.</p>
                            </div>
                            <div className="flex gap-3">
                                <div className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center shrink-0 font-bold text-xs">2</div>
                                <p>API Tokenni nusxalab, tepadagi maydonga kiriting.</p>
                            </div>
                            <div className="flex gap-3">
                                <div className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center shrink-0 font-bold text-xs">3</div>
                                <p>Menyu manzilingizni tekshiring va soqlang.</p>
                            </div>
                            <div className="flex gap-3">
                                <div className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center shrink-0 font-bold text-xs">4</div>
                                <p className="font-bold text-sky-400 font-bold">"Webhookni Faollashtirish"</p>
                                <p className="ml-[-8px]">tugmasini bosing.</p>
                            </div>
                            
                            <Alert className="mt-8 bg-white/5 border-white/10">
                                <Info className="h-4 w-4 text-sky-400" />
                                <AlertDescription className="text-xs text-zinc-400">
                                    Eslatma: Token o'zgarganda webhookni qaytadan faollashtirishni unutmang.
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4" />
                                Tizim Holati (Vercel)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4">
                            {isLoadingDiagnostics ? (
                                <div className="flex justify-center py-4">
                                    <Loader2 className="h-5 w-5 animate-spin text-zinc-300" />
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-zinc-500">Project ID</span>
                                        {diagnostics?.env.firebaseProjectId ? (
                                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                                        ) : (
                                            <XCircle className="w-4 h-4 text-red-500" />
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-zinc-500">Client Email</span>
                                        {diagnostics?.env.firebaseClientEmail ? (
                                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                                        ) : (
                                            <XCircle className="w-4 h-4 text-red-500" />
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-zinc-500">Private Key</span>
                                        {diagnostics?.env.firebasePrivateKey ? (
                                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                                        ) : (
                                            <XCircle className="w-4 h-4 text-red-500" />
                                        )}
                                    </div>
                                    
                                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 mt-2">
                                        <div className="text-[10px] text-zinc-400 font-bold uppercase mb-1">Aniqlangan URL:</div>
                                        <div className="text-[10px] font-mono bg-zinc-50 dark:bg-zinc-800 p-2 rounded break-all text-zinc-600 dark:text-zinc-400">
                                            {diagnostics?.detectedUrl}
                                        </div>
                                    </div>

                                    {!diagnostics?.env.firebasePrivateKey && (
                                        <Alert variant="destructive" className="mt-4 p-3 bg-red-50 border-red-100 py-2">
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertDescription className="text-[10px]">
                                                Vercel Environment Variables sozlanmagan!
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                    {diagnostics?.detectedUrl.includes("localhost") && (
                                        <Alert className="mt-2 p-3 bg-amber-50 border-amber-100 py-2">
                                            <Info className="h-4 w-4 text-amber-600" />
                                            <AlertDescription className="text-[10px] text-amber-700">
                                                Siz hozir localhostdasiz. Botni Vercel orqali sozlang.
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-bold uppercase tracking-widest text-zinc-400">Statistika</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-end">
                                <span className="text-zinc-500 text-sm">Bot Holati</span>
                                <Badge className={token ? "bg-green-500" : "bg-red-500"}>
                                    {token ? "Onlayn" : "Oflayn"}
                                </Badge>
                            </div>
                            <div className="flex justify-between items-end">
                                <span className="text-zinc-500 text-sm">Oxirgi yangilanish</span>
                                <span className="text-xs font-mono">{new Date().toLocaleDateString()}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
