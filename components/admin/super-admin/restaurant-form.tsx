import { useState, useEffect } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Image as ImageIcon, Upload, Store, User, Shield, Palette, LayoutTemplate, Settings, Bell, Wifi, ArrowRight, AlertTriangle, CheckCircle2, UserCog, BookOpen, LayoutGrid, Trash2, Camera, Plus, MapPin, Instagram, Send, Phone, Activity, ShieldCheck, Truck, ShoppingCart, RefreshCw } from "lucide-react"
import { collection, addDoc, doc, setDoc, serverTimestamp, query, where, getDocs, limit, updateDoc } from "firebase/firestore"
import { createUserWithEmailAndPassword, getAuth } from "firebase/auth"
import { initializeApp, deleteApp } from "firebase/app"
import { db, firebaseConfig, auth } from "@/lib/firebase"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import {
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { uploadToGitHub } from "@/lib/github-upload"
import { Switch } from "@/components/ui/switch"

const formSchema = z.object({
    name: z.string().min(2, "Restoran nomi kamida 2 ta harfdan iborat bo'lishi kerak"),
    slug: z.string().min(2, "Slug kamida 2 ta harfdan iborat bo'lishi kerak").regex(/^[a-z0-9-]+$/, "Slug faqat kichik harflar va chiziqchalardan iborat bo'lishi kerak"),
    address: z.string().optional(),
    phone: z.string().optional(),
    slogan: z.string().optional(),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
    managerName: z.string().optional(),
    managerPhone: z.string().optional(),
    customDomain: z.string().optional(),

    // Legacy single fields (kept for compatibility in form, but we prioritize arrays)
    telegramUrl: z.string().optional(),
    instagramUrl: z.string().optional(),
    locationUrl: z.string().optional(),
    supportUrl: z.string().optional(),

    // New Arrays
    locations: z.array(z.object({
        name: z.string().min(1, "Nomi kiritilishi shart"),
        url: z.string().url("To'g'ri URL kiriting"),
    })).optional(),
    instagrams: z.array(z.object({
        name: z.string().min(1, "Nomi kiritilishi shart"),
        url: z.string().url("To'g'ri URL kiriting"),
    })).optional(),
    telegrams: z.array(z.object({
        name: z.string().min(1, "Nomi kiritilishi shart"),
        url: z.string().url("To'g'ri URL kiriting"),
    })).optional(),
    phones: z.array(z.object({
        name: z.string().min(1, "Ism kiritilishi shart"),
        phone: z.string().min(1, "Telefon raqam kiritilishi shart"),
    })).optional(),

    adminEmail: z.string().optional(),
    adminPassword: z.string().optional(),
    status: z.enum(["active", "inactive", "maintenance"]).optional(),
    logoUrl: z.string().optional(),
    bannerUrl: z.string().optional(),
    primaryColor: z.string().optional(),
    secondaryColor: z.string().optional(),
    enableWaiterCall: z.boolean().optional(),
    enableWifi: z.boolean().optional(),
    wifiSSID: z.string().optional(),
    wifiPassword: z.string().optional(),
    menuStyle: z.enum(["classic", "book", "scan"]).optional(),
    scanMenuUrls: z.array(z.string()).optional(),
    menuGridColumns: z.number().min(1).max(6).optional(),
    enableSpinWheel: z.boolean().optional(),
    spinWheelLimit: z.number().min(1).max(50).optional(),
    spinWheelPrizes: z.array(z.object({
        id: z.string(),
        text: z.string(),
        color: z.string(),
        value: z.any(),
        type: z.string()
    })).optional(),
    showDeveloperCredit: z.boolean().optional(),
    subscriptionStartDate: z.string().optional(),
    subscriptionEndDate: z.string().optional(),
    subscriptionPrice: z.number().optional(),
    subscriptionPlan: z.enum(["monthly", "half_yearly", "yearly", "free", "trial"]).optional(),
    enableTelegramIntegration: z.boolean().optional(),
    deliveryAvailable: z.boolean().optional(),
    deliveryFee: z.number().min(0).optional(),
    fontFamily: z.string().optional(),
    enableAnimations: z.boolean().optional(),
    enableAnimatedBg: z.boolean().optional(),
    animatedBgOpacity: z.number().min(0).max(1).optional(),
    isOrderingEnabled: z.boolean().optional(),
    isTelegramOrderOnly: z.boolean().optional(),
    orderingTelegramBot: z.string().optional(),
    showDeliveryFeeInMessage: z.boolean().optional(),
})

interface RestaurantFormProps {
    initialData?: any
    onSuccess: () => void
    onCancel: () => void
}

export function RestaurantForm({ initialData, onSuccess, onCancel }: RestaurantFormProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [logoUploading, setLogoUploading] = useState(false)
    const [bannerUploading, setBannerUploading] = useState(false)
    const [scanUploading, setScanUploading] = useState(false)
    const [activeTab, setActiveTab] = useState("general")

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: initialData?.name || "",
            slug: initialData?.slug || "",
            address: initialData?.address || "",
            phone: initialData?.phone || "",
            slogan: initialData?.slogan || "",
            seoTitle: initialData?.seoTitle || "",
            seoDescription: initialData?.seoDescription || "",
            managerName: initialData?.managerName || "",
            managerPhone: initialData?.managerPhone || "",
            customDomain: initialData?.customDomain || "",
            telegramUrl: initialData?.telegramUrl || "",
            instagramUrl: initialData?.instagramUrl || "",
            locationUrl: initialData?.locationUrl || "",
            supportUrl: initialData?.supportUrl || "",

            // Arrays (with fallback to existing data)
            phones: initialData?.phones || (initialData?.managerPhone ? [{ name: initialData.managerName || "Manager", phone: initialData.managerPhone }] : []),
            locations: initialData?.locations || (initialData?.locationUrl ? [{ name: "Asosiy Filial", url: initialData.locationUrl }] : []),
            instagrams: initialData?.instagrams || (initialData?.instagramUrl ? [{ name: "Instagram", url: initialData.instagramUrl }] : []),
            telegrams: initialData?.telegrams || (initialData?.telegramUrl ? [{ name: "Telegram Bot", url: initialData.telegramUrl }] : []),

            adminEmail: initialData?.adminEmail || "",
            adminPassword: "",
            status: initialData?.status || "active",
            logoUrl: initialData?.logoUrl || "",
            bannerUrl: initialData?.bannerUrl || "",
            primaryColor: initialData?.primaryColor || "#000000",
            secondaryColor: initialData?.secondaryColor || "#ffffff",
            enableWaiterCall: initialData?.enableWaiterCall !== false,
            enableWifi: initialData?.enableWifi !== false,
            wifiSSID: initialData?.wifiSSID || "7days-burger_Guest",
            wifiPassword: initialData?.wifiPassword || "20252025",
            menuStyle: initialData?.menuStyle || "classic",
            scanMenuUrls: initialData?.scanMenuUrls || [],
            menuGridColumns: initialData?.menuGridColumns || 2,
            enableSpinWheel: initialData?.enableSpinWheel || false,
            spinWheelLimit: initialData?.spinWheelLimit || 3,
            spinWheelPrizes: initialData?.spinWheelPrizes || [
                { id: "1", text: "10% Chegirma", color: "#FF6B6B", value: 10, type: 'discount' },
                { id: "2", text: "Omad kelsin!", color: "#4D96FF", value: 0, type: 'none' },
                { id: "3", text: "20% Chegirma", color: "#FFD93D", value: 20, type: 'discount' },
                { id: "4", text: "Keyingi safar!", color: "#6BCB77", value: 0, type: 'none' },
                { id: "5", text: "30% Chegirma", color: "#FF1493", value: 30, type: 'discount' },
                { id: "6", text: "Omad kelsin!", color: "#1E90FF", value: 0, type: 'none' },
                { id: "7", text: "Maxsus Sovg'a", color: "#9370DB", value: "gift", type: 'discount' },
                { id: "8", text: "Omad!", color: "#20B2AA", value: 0, type: 'none' },
            ],
            showDeveloperCredit: initialData?.showDeveloperCredit !== false,
            subscriptionStartDate: initialData?.subscriptionStartDate || new Date().toISOString().split('T')[0],
            subscriptionEndDate: initialData?.subscriptionEndDate || "",
            subscriptionPrice: initialData?.subscriptionPrice || 0,
            subscriptionPlan: initialData?.subscriptionPlan || "trial",
            enableTelegramIntegration: initialData?.enableTelegramIntegration || false,
            deliveryAvailable: initialData?.deliveryAvailable !== false,
            deliveryFee: initialData?.deliveryFee || 15000,
            fontFamily: initialData?.fontFamily || "Inter",
            enableAnimations: initialData?.enableAnimations !== false,
            enableAnimatedBg: initialData?.enableAnimatedBg || false,
            animatedBgOpacity: initialData?.animatedBgOpacity || 0.1,
            isOrderingEnabled: initialData?.isOrderingEnabled !== false,
            isTelegramOrderOnly: initialData?.isTelegramOrderOnly || false,
            orderingTelegramBot: initialData?.orderingTelegramBot || "",
            showDeliveryFeeInMessage: initialData?.showDeliveryFeeInMessage !== false,
        },
    })

    const { fields: phoneFields, append: appendPhone, remove: removePhone } = useFieldArray({ control: form.control, name: "phones" });
    const { fields: locationFields, append: appendLocation, remove: removeLocation } = useFieldArray({ control: form.control, name: "locations" });
    const { fields: instagramFields, append: appendInstagram, remove: removeInstagram } = useFieldArray({ control: form.control, name: "instagrams" });
    const { fields: telegramFields, append: appendTelegram, remove: removeTelegram } = useFieldArray({ control: form.control, name: "telegrams" });

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!initialData) {
            const slug = e.target.value
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)+/g, '');
            form.setValue("slug", slug);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: "logoUrl" | "bannerUrl") => {
        const file = e.target.files?.[0]
        if (!file) return

        const setUploading = fieldName === "logoUrl" ? setLogoUploading : setBannerUploading
        setUploading(true)

        try {
            const result = await uploadToGitHub(file, `${Date.now()}-${file.name}`, "restaurants")
            if (result.success && result.url) {
                form.setValue(fieldName, result.url)
                toast.success("Rasm yuklandi")
            } else {
                toast.error("Rasm yuklashda xatolik: " + result.error)
            }
        } catch (error) {
            console.error("Upload error:", error)
            toast.error("Rasm yuklashda xatolik yuz berdi")
        } finally {
            setUploading(false)
        }
    }

    const handleScanUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return

        setScanUploading(true)
        const currentUrls = form.getValues("scanMenuUrls") || []

        try {
            const uploadPromises = Array.from(files).map(async (file) => {
                const result = await uploadToGitHub(file, `${Date.now()}-${file.name}`, "scans")
                return result.success ? result.url : null
            })

            const urls = await Promise.all(uploadPromises)
            const successfulUrls = urls.filter((url): url is string => url !== null)

            form.setValue("scanMenuUrls", [...currentUrls, ...successfulUrls])
            toast.success(`${successfulUrls.length} ta rasm yuklandi`)
        } catch (error) {
            console.error("Scan upload error:", error)
            toast.error("Rasmlarni yuklashda xatolik!")
        } finally {
            setScanUploading(false)
        }
    }

    const removeScanImage = (index: number) => {
        const currentUrls = form.getValues("scanMenuUrls") || []
        const newUrls = [...currentUrls]
        newUrls.splice(index, 1)
        form.setValue("scanMenuUrls", newUrls)
    }

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true)
        try {
            // 1. Check if email exists (only if provided and changed)
            if (values.adminEmail && (!initialData || values.adminEmail !== initialData.adminEmail)) {
                // Check via API if email exists in Auth
                const checkRes = await fetch("/api/check-user-email", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: values.adminEmail }),
                })
                const checkData = await checkRes.json()

                // If email exists, we need to know if it belongs to THIS restaurant's admin or someone else
                if (checkData.exists) {
                    // If we are editing, check if the UID matches the current admin
                    let isSameUser = false
                    if (initialData) {
                        const usersRef = collection(db, "users")
                        const q = query(usersRef, where("restaurantId", "==", initialData.id), where("role", "==", "admin"), limit(1))
                        const snapshot = await getDocs(q)
                        if (!snapshot.empty && snapshot.docs[0].id === checkData.uid) {
                            isSameUser = true
                        }
                    }

                    if (!isSameUser) {
                        toast.error("Bu email manzili allaqachon boshqa foydalanuvchi tomonidan band qilingan!")
                        setIsLoading(false)
                        return
                    }
                }
            }

            const cleanDomain = values.customDomain
                ? values.customDomain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '').trim()
                : "";

            let restaurantData: any = {
                name: values.name,
                slug: values.slug,
                menuStyle: values.menuStyle || "classic",
                scanMenuUrls: values.scanMenuUrls || [],
                status: values.status || "active",
                adminPassword: values.adminPassword || "",
                customDomain: cleanDomain,
                subscriptionStartDate: values.subscriptionStartDate || "",
                subscriptionEndDate: values.subscriptionEndDate || "",
                subscriptionPrice: Number(values.subscriptionPrice) || 0,
                subscriptionPlan: values.subscriptionPlan || "trial",
                enableTelegramIntegration: values.enableTelegramIntegration || false,
                enableAnimatedBg: values.enableAnimatedBg || false,
                animatedBgOpacity: values.animatedBgOpacity || 0.1,
                isOrderingEnabled: values.isOrderingEnabled !== false,
                isTelegramOrderOnly: values.isTelegramOrderOnly || false,
                orderingTelegramBot: values.orderingTelegramBot || "",
                showDeliveryFeeInMessage: values.showDeliveryFeeInMessage !== false,
                isMaintenance: values.status === "maintenance",
            }

            // Only add extra fields for classic menu style
            if (values.menuStyle === 'classic') {
                restaurantData = {
                    ...restaurantData,
                    address: values.address || "",
                    phone: values.phone || "",
                    slogan: values.slogan || "",
                    seoTitle: values.seoTitle || "",
                    seoDescription: values.seoDescription || "",

                    // Arrays
                    phones: values.phones || [],
                    locations: values.locations || [],
                    instagrams: values.instagrams || [],
                    telegrams: values.telegrams || [],

                    // Legacy sync (First item as primary)
                    managerName: (values.phones && values.phones.length > 0) ? values.phones[0].name : "",
                    managerPhone: (values.phones && values.phones.length > 0) ? values.phones[0].phone : "",
                    telegramUrl: (values.telegrams && values.telegrams.length > 0) ? values.telegrams[0].url : "",
                    instagramUrl: (values.instagrams && values.instagrams.length > 0) ? values.instagrams[0].url : "",
                    locationUrl: (values.locations && values.locations.length > 0) ? values.locations[0].url : "",
                    supportUrl: values.supportUrl || "",

                    logoUrl: values.logoUrl || "",
                    bannerUrl: values.bannerUrl || "",
                    primaryColor: values.primaryColor || "#000000",
                    secondaryColor: values.secondaryColor || "#ffffff",
                    enableWaiterCall: values.enableWaiterCall !== false,
                    enableWifi: values.enableWifi !== false,
                    wifiSSID: values.wifiSSID || "7days-burger_Guest",
                    wifiPassword: values.wifiPassword || "20252025",
                    menuGridColumns: values.menuGridColumns || 2,
                    enableSpinWheel: values.enableSpinWheel || false,
                    spinWheelLimit: values.spinWheelLimit || 3,
                    spinWheelPrizes: values.spinWheelPrizes || [],
                    status: values.status || "active",
                    adminEmail: values.adminEmail || "",
                    adminPassword: values.adminPassword || "",
                    customDomain: cleanDomain,
                    showDeveloperCredit: values.showDeveloperCredit !== false,
                    subscriptionStartDate: values.subscriptionStartDate || "",
                    subscriptionEndDate: values.subscriptionEndDate || "",
                    subscriptionPrice: Number(values.subscriptionPrice) || 0,
                    subscriptionPlan: values.subscriptionPlan || "trial",
                    enableTelegramIntegration: values.enableTelegramIntegration || false,
                    supportUrl: values.supportUrl || "",
                    deliveryAvailable: values.deliveryAvailable !== false,
                    deliveryFee: Number(values.deliveryFee) || 0,
                    fontFamily: values.fontFamily || "Inter",
                    enableAnimations: values.enableAnimations !== false,
                    enableAnimatedBg: values.enableAnimatedBg || false,
                    animatedBgOpacity: values.animatedBgOpacity || 0.2,
                    isOrderingEnabled: values.isOrderingEnabled !== false,
                    isTelegramOrderOnly: values.isTelegramOrderOnly || false,
                    orderingTelegramBot: values.orderingTelegramBot || "",
                    showDeliveryFeeInMessage: values.showDeliveryFeeInMessage !== false,
                    isMaintenance: values.status === "maintenance",
                }
            } else {
                restaurantData.status = values.status || "active"
                restaurantData.isMaintenance = values.status === "maintenance"
                restaurantData.adminEmail = values.adminEmail || ""
                restaurantData.adminPassword = values.adminPassword || ""
                restaurantData.showDeveloperCredit = values.showDeveloperCredit !== false
            }

            if (initialData) {
                // UPDATE RESTAURANT
                await updateDoc(doc(db, "restaurants", initialData.id), restaurantData)

                // UPDATE ADMIN (if credentials provided)
                if (values.adminEmail || values.adminPassword) {
                    // Find existing admin
                    const usersRef = collection(db, "users")
                    const q = query(usersRef, where("restaurantId", "==", initialData.id), where("role", "==", "admin"), limit(1))
                    const snapshot = await getDocs(q)

                    if (!snapshot.empty) {
                        // Update existing admin
                        const adminDoc = snapshot.docs[0]
                        const updateRes = await fetch("/api/update-user-credentials", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                uid: adminDoc.id,
                                email: values.adminEmail,
                                password: values.adminPassword,
                                adminUid: auth.currentUser?.uid // Super Admin UID
                            }),
                        })

                        if (!updateRes.ok) {
                            const err = await updateRes.json()
                            throw new Error(err.message)
                        }
                        toast.success("Restoran va Admin ma'lumotlari yangilandi")
                    } else if (values.adminEmail && values.adminPassword) {
                        // Create NEW admin for existing restaurant (if none existed)
                        const createRes = await fetch("/api/create-user", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                name: `Admin - ${values.name}`,
                                email: values.adminEmail,
                                password: values.adminPassword,
                                role: "admin",
                                restaurantId: initialData.id,
                                adminUid: auth.currentUser?.uid
                            }),
                        })
                        if (!createRes.ok) {
                            const err = await createRes.json()
                            throw new Error(err.message)
                        }
                        toast.success("Restoran yangilandi va yangi Admin yaratildi")
                    } else {
                        toast.success("Restoran yangilandi (Admin o'zgarishsiz)")
                    }
                } else {
                    toast.success("Restoran yangilandi")
                }
            } else {
                // CREATE NEW RESTAURANT
                const restaurantRef = await addDoc(collection(db, "restaurants"), {
                    ...restaurantData,
                    createdAt: serverTimestamp(),
                })
                const restaurantId = restaurantRef.id

                // Create Admin logic
                if (values.adminEmail && values.adminPassword) {
                    const createRes = await fetch("/api/create-user", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            name: `Admin - ${values.name}`,
                            email: values.adminEmail,
                            password: values.adminPassword,
                            role: "admin",
                            restaurantId: restaurantId,
                            adminUid: auth.currentUser?.uid
                        }),
                    })

                    if (createRes.ok) {
                        toast.success("Restoran va Admin yaratildi")
                    } else {
                        toast.error("Restoran yaratildi, lekin Admin yaratishda xatolik!")
                    }
                } else {
                    toast.success("Restoran yaratildi (Adminsiz)")
                }
            }
            onSuccess()
        } catch (error: any) {
            console.error("Error saving restaurant:", error)
            toast.error(error.message)
        } finally {
            setIsLoading(false)
        }
    }

    // Live Preview Data
    const previewName = form.watch("name") || "Restoran Nomi"
    const previewSlogan = form.watch("slogan") || "Mazali taomlar maskani"
    const previewLogo = form.watch("logoUrl") || "https://placehold.co/100?text=Logo"
    const previewBanner = form.watch("bannerUrl") || "https://placehold.co/600x200?text=Banner"
    const previewPrimary = form.watch("primaryColor") || "#000000"
    const previewSecondary = form.watch("secondaryColor") || "#ffffff"

    return (
        <div className="flex flex-col h-full bg-gray-50/50 dark:bg-gray-900/50 p-1">
            <DialogHeader className="px-1 mb-4">
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    {initialData ? <Store className="w-5 h-5 text-blue-500" /> : <PlusBadge />}
                    {initialData ? "Restoranni Tahrirlash" : "Yangi Restoran Yaratish"}
                </DialogTitle>
                <DialogDescription>
                    Tizimga yangi "fishka" qo'shish uchun quyidagi ma'lumotlarni to'ldiring.
                </DialogDescription>
            </DialogHeader>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-hidden flex flex-col">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                        <TabsList className="flex w-full mb-4 bg-muted/50 p-1 rounded-xl overflow-x-auto">
                            <TabsTrigger value="general" className="flex-1 min-w-[100px] rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all text-xs sm:text-sm"><LayoutTemplate className="w-4 h-4 mr-2 shrink-0" /> Asosiy</TabsTrigger>
                            <TabsTrigger value="branding" className="flex-1 min-w-[100px] rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all text-xs sm:text-sm"><Palette className="w-4 h-4 mr-2 shrink-0" /> Dizayn</TabsTrigger>
                            <TabsTrigger value="paged-menu" className="flex-1 min-w-[120px] rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all text-xs sm:text-sm"><BookOpen className="w-4 h-4 mr-2 shrink-0" /> Sahifali Menyu</TabsTrigger>
                            <TabsTrigger value="manager" className="flex-1 min-w-[100px] rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all text-xs sm:text-sm"><User className="w-4 h-4 mr-2 shrink-0" /> Aloqa</TabsTrigger>
                            <TabsTrigger value="settings" className="flex-1 min-w-[100px] rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all text-xs sm:text-sm"><Settings className="w-4 h-4 mr-2 shrink-0" /> Sozlamalar</TabsTrigger>
                            <TabsTrigger value="admin" className="flex-1 min-w-[100px] rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all text-xs sm:text-sm"><Shield className="w-4 h-4 mr-2 shrink-0" /> Admin</TabsTrigger>
                            <TabsTrigger value="subscription" className="flex-1 min-w-[100px] rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all text-xs sm:text-sm"><Bell className="w-4 h-4 mr-2 shrink-0" /> Obuna</TabsTrigger>
                        </TabsList>

                        <div className="flex-1 overflow-y-auto px-1 pb-4 min-h-0 custom-scrollbar">
                            <TabsContent value="general" className="space-y-4 m-0">
                                <Card className="border-none shadow-sm bg-white dark:bg-card">
                                    <CardContent className="p-6 space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="name"
                                                render={({ field }) => (
                                                    <FormItem className="sm:col-span-2">
                                                        <FormLabel>Restoran Nomi</FormLabel>
                                                        <FormControl><Input placeholder="Masalan: Rayhon Milliy Taomlar" {...field} onChange={(e) => { field.onChange(e); handleNameChange(e); }} className="bg-muted/30" /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="slug"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Link (Slug)</FormLabel>
                                                        <FormControl><Input placeholder="rayhon-mt" {...field} className="bg-muted/30 font-mono text-sm" /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="customDomain"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Domenlar (Custom Domains)</FormLabel>
                                                        <FormControl><Input placeholder="masalan: rayhon.uz" {...field} className="bg-muted/30 font-mono text-sm" /></FormControl>
                                                        <FormDescription>Restoran uchun alohida domen (ixtiyoriy)</FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <FormField
                                            control={form.control}
                                            name="slogan"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Slogan (Qisqa tarif)</FormLabel>
                                                    <FormControl><Input placeholder="Mazali taomlar bizda..." {...field} className="bg-muted/30" /></FormControl>
                                                    <FormDescription>Mijozlar menyu sarlavhasida ko'radigan matn</FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="branding" className="space-y-6 m-0">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <FormField
                                            control={form.control}
                                            name="logoUrl"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Logo Yuklash</FormLabel>
                                                    <FormControl>
                                                        <div className="flex items-center gap-2 group cursor-pointer border-2 border-dashed border-muted-foreground/25 rounded-xl p-4 hover:border-primary/50 transition-colors bg-muted/5">
                                                            <div className="relative flex-1">
                                                                <Input type="file" accept="image/*" className="opacity-0 absolute inset-0 cursor-pointer" onChange={(e) => handleImageUpload(e, "logoUrl")} disabled={logoUploading} />
                                                                <div className="flex flex-col items-center justify-center gap-2 text-center">
                                                                    <div className="p-2 bg-blue-50 text-blue-500 rounded-full"><ImageIcon className="w-5 h-5" /></div>
                                                                    <span className="text-sm font-medium text-muted-foreground">Logotipni tanlang</span>
                                                                </div>
                                                            </div>
                                                            {logoUploading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                                                        </div>
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="bannerUrl"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Banner Yuklash</FormLabel>
                                                    <FormControl>
                                                        <div className="flex items-center gap-2 group cursor-pointer border-2 border-dashed border-muted-foreground/25 rounded-xl p-4 hover:border-primary/50 transition-colors bg-muted/5">
                                                            <div className="relative flex-1">
                                                                <Input type="file" accept="image/*" className="opacity-0 absolute inset-0 cursor-pointer" onChange={(e) => handleImageUpload(e, "bannerUrl")} disabled={bannerUploading} />
                                                                <div className="flex flex-col items-center justify-center gap-2 text-center">
                                                                    <div className="p-2 bg-purple-50 text-purple-500 rounded-full"><Upload className="w-5 h-5" /></div>
                                                                    <span className="text-sm font-medium text-muted-foreground">Bannerni tanlang</span>
                                                                </div>
                                                            </div>
                                                            {bannerUploading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                                                        </div>
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="primaryColor"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Asosiy Rang</FormLabel>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-10 h-10 rounded-lg border shadow-sm overflow-hidden relative">
                                                                <Input type="color" className="absolute -top-2 -left-2 w-16 h-16 p-0 border-0 cursor-pointer" {...field} />
                                                            </div>
                                                            <Input {...field} className="font-mono" />
                                                        </div>
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="secondaryColor"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Ikkinchi Rang</FormLabel>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-10 h-10 rounded-lg border shadow-sm overflow-hidden relative">
                                                                <Input type="color" className="absolute -top-2 -left-2 w-16 h-16 p-0 border-0 cursor-pointer" {...field} />
                                                            </div>
                                                            <Input {...field} className="font-mono" />
                                                        </div>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        {/* ✨ Font Family Picker */}
                                        <div className="space-y-4 pt-4 border-t">
                                            <FormField
                                                control={form.control}
                                                name="fontFamily"
                                                render={({ field }) => {
                                                    const FONTS = [
                                                        { name: "Inter", label: "Inter", category: "Sans-serif" },
                                                        { name: "Roboto", label: "Roboto", category: "Sans-serif" },
                                                        { name: "Open Sans", label: "Open Sans", category: "Sans-serif" },
                                                        { name: "Lato", label: "Lato", category: "Sans-serif" },
                                                        { name: "Montserrat", label: "Montserrat", category: "Sans-serif" },
                                                        { name: "Poppins", label: "Poppins", category: "Sans-serif" },
                                                        { name: "Nunito", label: "Nunito", category: "Sans-serif" },
                                                        { name: "Raleway", label: "Raleway", category: "Sans-serif" },
                                                        { name: "Oswald", label: "Oswald", category: "Display" },
                                                        { name: "Source Sans 3", label: "Source Sans", category: "Sans-serif" },
                                                        { name: "Playfair Display", label: "Playfair Display", category: "Serif" },
                                                        { name: "Merriweather", label: "Merriweather", category: "Serif" },
                                                        { name: "Lora", label: "Lora", category: "Serif" },
                                                        { name: "PT Serif", label: "PT Serif", category: "Serif" },
                                                        { name: "Libre Baskerville", label: "Libre Baskerville", category: "Serif" },
                                                        { name: "Dancing Script", label: "Dancing Script", category: "Handwriting" },
                                                        { name: "Pacifico", label: "Pacifico", category: "Handwriting" },
                                                        { name: "Caveat", label: "Caveat", category: "Handwriting" },
                                                        { name: "Sacramento", label: "Sacramento", category: "Handwriting" },
                                                        { name: "Great Vibes", label: "Great Vibes", category: "Handwriting" },
                                                        { name: "Bebas Neue", label: "Bebas Neue", category: "Display" },
                                                        { name: "Righteous", label: "Righteous", category: "Display" },
                                                        { name: "Comfortaa", label: "Comfortaa", category: "Display" },
                                                        { name: "Quicksand", label: "Quicksand", category: "Sans-serif" },
                                                        { name: "DM Sans", label: "DM Sans", category: "Sans-serif" },
                                                        { name: "Outfit", label: "Outfit", category: "Sans-serif" },
                                                        { name: "Plus Jakarta Sans", label: "Jakarta Sans", category: "Sans-serif" },
                                                        { name: "Space Grotesk", label: "Space Grotesk", category: "Sans-serif" },
                                                        { name: "Urbanist", label: "Urbanist", category: "Sans-serif" },
                                                        { name: "Geologica", label: "Geologica", category: "Sans-serif" },
                                                    ]
                                                    // Inject all font links once
                                                    if (typeof document !== 'undefined') {
                                                        const allFontNames = FONTS.map(f => f.name.replace(/ /g, '+'))
                                                        const linkId = 'restaurant-form-fonts'
                                                        if (!document.getElementById(linkId)) {
                                                            const link = document.createElement('link')
                                                            link.id = linkId
                                                            link.rel = 'stylesheet'
                                                            link.href = `https://fonts.googleapis.com/css2?${allFontNames.map(f => `family=${f}:wght@400;600;700`).join('&')}&display=swap`
                                                            document.head.appendChild(link)
                                                        }
                                                    }
                                                    return (
                                                        <FormItem>
                                                            <FormLabel className="text-base font-semibold flex items-center gap-2">
                                                                <span className="p-1.5 bg-violet-100 text-violet-600 rounded-lg text-sm">Aa</span>
                                                                Shrift (Font) Tanlash
                                                            </FormLabel>
                                                            <FormDescription>Menyuda ishlatiladigan asosiy shrift. Hozir tanlangan: <strong style={{ fontFamily: `'${field.value}', sans-serif` }}>{field.value}</strong></FormDescription>
                                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
                                                                {FONTS.map((font) => (
                                                                    <div
                                                                        key={font.name}
                                                                        onClick={() => field.onChange(font.name)}
                                                                        className={`cursor-pointer group relative rounded-xl border-2 p-3 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
                                                                            field.value === font.name
                                                                                ? 'border-violet-500 bg-violet-50 ring-2 ring-violet-200 shadow-md'
                                                                                : 'border-gray-200 bg-white hover:border-violet-300'
                                                                        }`}
                                                                    >
                                                                        {field.value === font.name && (
                                                                            <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center">
                                                                                <CheckCircle2 className="w-3 h-3 text-white" />
                                                                            </div>
                                                                        )}
                                                                        <div
                                                                            className="text-xl font-semibold text-gray-800 leading-tight truncate"
                                                                            style={{ fontFamily: `'${font.name}', sans-serif` }}
                                                                        >
                                                                            Salom!
                                                                        </div>
                                                                        <div className="text-[10px] text-gray-400 mt-1 font-sans font-medium uppercase tracking-wider truncate">{font.label}</div>
                                                                        <div className="text-[9px] text-gray-300 font-sans">{font.category}</div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        <FormMessage />
                                                    </FormItem>
                                                )
                                            }}
                                        />
                                    </div>

                                    {/* ✨ Animations Toggle */}
                                    <div className="space-y-4 pt-4 border-t">
                                        <FormField
                                            control={form.control}
                                            name="enableAnimations"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100">
                                                        <div className="space-y-0.5">
                                                            <FormLabel className="text-base font-semibold flex items-center gap-2 cursor-pointer">
                                                                <span className="text-lg">✨</span>
                                                                Interaktiv Animatsiyalar
                                                            </FormLabel>
                                                            <FormDescription className="text-xs">
                                                                Menyuda kirish va bosish animatsiyalarini yoqish
                                                            </FormDescription>
                                                        </div>
                                                        <FormControl>
                                                            <Switch
                                                                checked={field.value ?? true}
                                                                onCheckedChange={field.onChange}
                                                                className="data-[state=checked]:bg-amber-500"
                                                            />
                                                        </FormControl>
                                                    </div>
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="enableAnimatedBg"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100">
                                                        <div className="space-y-0.5">
                                                            <FormLabel className="text-base font-semibold flex items-center gap-2 cursor-pointer">
                                                                <span className="text-lg">🌌</span>
                                                                Animatsion Fon (Background)
                                                            </FormLabel>
                                                            <FormDescription className="text-xs">
                                                                Menyu orqa fonida harakatlanuvchi effektlar
                                                            </FormDescription>
                                                        </div>
                                                        <FormControl>
                                                            <Switch
                                                                checked={field.value ?? false}
                                                                onCheckedChange={field.onChange}
                                                                className="data-[state=checked]:bg-indigo-500"
                                                            />
                                                        </FormControl>
                                                    </div>
                                                </FormItem>
                                            )}
                                        />

                                        {form.watch("enableAnimatedBg") && (
                                            <FormField
                                                control={form.control}
                                                name="animatedBgOpacity"
                                                render={({ field }) => (
                                                    <FormItem className="px-4">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <FormLabel className="text-xs font-medium text-gray-500 uppercase tracking-tighter">Fon To'liqligi (Opacity)</FormLabel>
                                                            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{Math.round((field.value || 0.1) * 100)}%</span>
                                                        </div>
                                                        <FormControl>
                                                            <Input 
                                                                type="range" 
                                                                min="0.01" 
                                                                max="0.5" 
                                                                step="0.01" 
                                                                value={field.value} 
                                                                onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                                                className="h-2 bg-indigo-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        )}
                                    </div>

                                    <div className="space-y-4 pt-4 border-t">
                                        <FormLabel className="text-base font-semibold">Menyu Dizayni</FormLabel>
                                        <FormField
                                            control={form.control}
                                            name="menuStyle"
                                                render={({ field }) => (
                                                    <FormItem className="space-y-3">
                                                        <FormControl>
                                                            <div className="grid grid-cols-3 gap-4">
                                                                <div
                                                                    onClick={() => field.onChange("classic")}
                                                                    className={`cursor-pointer relative flex flex-col items-center gap-3 rounded-xl border-2 p-4 transition-all hover:bg-gray-50 ${field.value === 'classic' ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-gray-200'}`}
                                                                >
                                                                    <div className={`p-3 rounded-full ${field.value === 'classic' ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400'}`}>
                                                                        <LayoutGrid className="w-6 h-6" />
                                                                    </div>
                                                                    <div className="text-center">
                                                                        <div className="font-bold text-[10px] md:text-sm">Klassik</div>
                                                                    </div>
                                                                    {field.value === 'classic' && (
                                                                        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center text-white">
                                                                            <CheckCircle2 className="w-3 h-3" />
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <div
                                                                    onClick={() => field.onChange("book")}
                                                                    className={`cursor-pointer relative flex flex-col items-center gap-3 rounded-xl border-2 p-4 transition-all hover:bg-gray-50 ${field.value === 'book' ? 'border-amber-600 bg-amber-50 ring-2 ring-amber-200' : 'border-gray-200'}`}
                                                                >
                                                                    <div className={`p-3 rounded-full ${field.value === 'book' ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400'}`}>
                                                                        <BookOpen className="w-6 h-6" />
                                                                    </div>
                                                                    <div className="text-center">
                                                                        <div className="font-bold text-[10px] md:text-sm">Kitob</div>
                                                                    </div>
                                                                    {field.value === 'book' && (
                                                                        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-amber-600 flex items-center justify-center text-white">
                                                                            <CheckCircle2 className="w-3 h-3" />
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <div
                                                                    onClick={() => field.onChange("scan")}
                                                                    className={`cursor-pointer relative flex flex-col items-center gap-3 rounded-xl border-2 p-4 transition-all hover:bg-gray-50 ${field.value === 'scan' ? 'border-purple-600 bg-purple-50 ring-2 ring-purple-200' : 'border-gray-200'}`}
                                                                >
                                                                    <div className={`p-3 rounded-full ${field.value === 'scan' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-400'}`}>
                                                                        <Camera className="w-6 h-6" />
                                                                    </div>
                                                                    <div className="text-center">
                                                                        <div className="font-bold text-[10px] md:text-sm">Odiy (Scroll)</div>
                                                                    </div>
                                                                    {field.value === 'scan' && (
                                                                        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-purple-600 flex items-center justify-center text-white">
                                                                            <CheckCircle2 className="w-3 h-3" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </div>

                                    {form.watch("menuStyle") !== 'scan' && (
                                        <div className="space-y-2">
                                            <FormLabel className="text-muted-foreground uppercase text-xs tracking-wider">Menyu Ko'rinishi (Live Preview)</FormLabel>
                                            <div className="border rounded-xl overflow-hidden shadow-lg bg-white relative aspect-[9/16] md:aspect-auto md:h-[400px]">
                                                {form.watch("menuStyle") === 'book' ? (
                                                    <div className="absolute inset-0 flex flex-col pointer-events-none bg-[#eaddcf] font-serif">
                                                        <div className="h-32 bg-[#3e2723] relative flex items-center justify-center border-b-4 border-[#25150e]">
                                                            <div className="absolute inset-0 bg-black/20" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/leather.png')" }}></div>
                                                            <div className="relative z-10 text-center text-[#d4af37]">
                                                                <div className="w-12 h-12 mx-auto mb-2 rounded-full border-2 border-[#d4af37] bg-white overflow-hidden shadow-lg">
                                                                    <img src={previewLogo} className="w-full h-full object-cover" />
                                                                </div>
                                                                <h3 className="font-bold text-lg uppercase tracking-widest leading-none drop-shadow-md">{previewName}</h3>
                                                            </div>
                                                        </div>
                                                        <div className="flex-1 p-4 bg-[#fffbf0] relative overflow-hidden flex flex-col">
                                                            <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-black/20 to-transparent z-10"></div>
                                                            <div className="flex items-center justify-between border-b-2 border-double border-[#d7ccc8] pb-2 mb-3 px-2">
                                                                <span className="font-bold text-[#3e2723] italic text-lg">Taomlar</span>
                                                                <span className="text-xl text-[#d7ccc8]">❦</span>
                                                            </div>
                                                            <div className="space-y-3 opacity-60">
                                                                <div className="flex gap-3 items-start p-2 border-b border-[#ece0d1] border-dashed">
                                                                    <div className="w-12 h-12 bg-gray-200 shadow-sm border-2 border-white rotate-1"></div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex justify-between items-end border-b border-dotted border-[#d7ccc8] relative">
                                                                            <div className="h-3 w-20 bg-[#3e2723] opacity-20 rounded"></div>
                                                                            <div className="h-3 w-10 bg-[#d4af37] opacity-40 rounded"></div>
                                                                        </div>
                                                                        <div className="h-2 w-32 bg-[#795548] opacity-20 rounded mt-1.5"></div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex gap-3 items-start p-2 border-b border-[#ece0d1] border-dashed">
                                                                    <div className="w-12 h-12 bg-gray-200 shadow-sm border-2 border-white -rotate-1"></div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex justify-between items-end border-b border-dotted border-[#d7ccc8] relative">
                                                                            <div className="h-3 w-16 bg-[#3e2723] opacity-20 rounded"></div>
                                                                            <div className="h-3 w-10 bg-[#d4af37] opacity-40 rounded"></div>
                                                                        </div>
                                                                        <div className="h-2 w-24 bg-[#795548] opacity-20 rounded mt-1.5"></div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="absolute inset-0 flex flex-col pointer-events-none bg-gray-50">
                                                        <div className="h-48 bg-gray-900 bg-cover bg-center relative" style={{ backgroundImage: `url(${previewBanner})` }}>
                                                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                                                            <div className="absolute top-4 left-4 w-14 h-14 bg-white rounded-full p-0.5 shadow-lg ring-2 ring-white/30">
                                                                <img src={previewLogo} className="w-full h-full object-cover rounded-full" />
                                                            </div>
                                                            <div className="absolute bottom-4 left-4 right-16 text-white">
                                                                <h3 className="font-black text-xl leading-none uppercase drop-shadow-md mb-1">{previewName}</h3>
                                                                <p className="text-xs opacity-90 font-medium tracking-wide drop-shadow-md">{previewSlogan}</p>
                                                            </div>
                                                            <div className="absolute bottom-4 right-4 flex gap-2">
                                                                {form.watch("telegramUrl") && (
                                                                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white shadow-lg animate-in zoom-in duration-300">
                                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                                                                    </div>
                                                                )}
                                                                {form.watch("instagramUrl") && (
                                                                    <div className="w-8 h-8 rounded-full bg-pink-600 flex items-center justify-center text-white shadow-lg animate-in zoom-in duration-300 delay-75">
                                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex-1 p-4 space-y-3 opacity-50 overflow-hidden">
                                                            <div className="h-24 bg-white rounded-xl flex gap-3 p-3 shadow-sm border border-gray-100">
                                                                <div className="w-20 h-20 bg-gray-200 rounded-lg shrink-0"></div>
                                                                <div className="space-y-2 flex-1 pt-1">
                                                                    <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
                                                                    <div className="h-3 w-1/2 bg-gray-100 rounded"></div>
                                                                    <div className="mt-2 h-5 w-16 bg-gray-200 rounded"></div>
                                                                </div>
                                                            </div>
                                                            <div className="h-24 bg-white rounded-xl flex gap-3 p-3 shadow-sm border border-gray-100">
                                                                <div className="w-20 h-20 bg-gray-200 rounded-lg shrink-0"></div>
                                                                <div className="space-y-2 flex-1 pt-1">
                                                                    <div className="h-4 w-2/3 bg-gray-200 rounded"></div>
                                                                    <div className="h-3 w-1/2 bg-gray-100 rounded"></div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </TabsContent>

                            <TabsContent value="paged-menu" className="space-y-6 m-0">
                                <div className="space-y-6 pt-2">
                                    <div className="flex items-center justify-between px-1">
                                        <div className="space-y-1">
                                            <h3 className="text-lg font-bold text-gray-900">Sahifali Menyu Tizimi</h3>
                                            <p className="text-sm text-gray-500">Tayyor menyu rasmlarini yuklang va rejimni tanlang.</p>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => {
                                                form.setValue("menuStyle", "classic");
                                                setActiveTab("branding");
                                            }}
                                            className="rounded-xl border-dashed border-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                                        >
                                            <LayoutGrid className="w-4 h-4 mr-2" /> Klassik Menyuga Qaytish
                                        </Button>
                                    </div>

                                    <Card className="border-2 border-dashed border-amber-200 shadow-none bg-amber-50/30 rounded-[2rem] overflow-hidden">
                                        <CardContent className="p-8 space-y-8">
                                            <div className="flex flex-col items-center justify-center text-center space-y-4">
                                                <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center shadow-inner">
                                                    <BookOpen className="w-10 h-10" />
                                                </div>
                                                <div className="space-y-4">
                                                    <h3 className="text-xl font-bold text-amber-900">Sahifa Ko'rinishi (Display Mode)</h3>
                                                    <div className="flex bg-amber-100/50 p-1 rounded-xl w-fit mx-auto border border-amber-200">
                                                        <button
                                                            type="button"
                                                            onClick={() => form.setValue("menuStyle", "book")}
                                                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${form.watch("menuStyle") === 'book' ? 'bg-amber-600 text-white shadow-md' : 'text-amber-800 hover:bg-amber-100'}`}
                                                        >
                                                            Kitob Rejimi (3D)
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => form.setValue("menuStyle", "scan")}
                                                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${form.watch("menuStyle") === 'scan' ? 'bg-purple-600 text-white shadow-md' : 'text-purple-800 hover:bg-purple-100'}`}
                                                        >
                                                            Odiy Rejim (Scroll)
                                                        </button>
                                                    </div>
                                                    <p className="text-sm text-amber-700/60 max-w-[350px] mx-auto">
                                                        {form.watch("menuStyle") === 'book'
                                                            ? "Mijozlar menyu sahifalarini xuddi haqiqiy kitobni varaqlagandek, 3D effekt bilan ko'rishadi."
                                                            : "Mijozlar menyu sahifalarini rasmlar galereyasi ko'rinishida, tepadan pastga scroll qilib ko'rishadi."
                                                        }
                                                    </p>
                                                </div>
                                                <div className="relative pt-4">
                                                    <Input
                                                        type="file"
                                                        multiple
                                                        accept="image/*"
                                                        onChange={handleScanUpload}
                                                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                        disabled={scanUploading}
                                                    />
                                                    <Button
                                                        type="button"
                                                        className={`${form.watch("menuStyle") === 'book' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-purple-600 hover:bg-purple-700'} text-white gap-3 px-10 h-14 rounded-2xl shadow-xl font-bold text-lg transition-all hover:scale-105 active:scale-95`}
                                                        disabled={scanUploading}
                                                    >
                                                        {scanUploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                                                        Sahifalarni Yuklash / Almashtirish
                                                    </Button>
                                                </div>
                                            </div>

                                            {form.watch("scanMenuUrls") && form.watch("scanMenuUrls").length > 0 && (
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="text-sm font-bold uppercase tracking-widest text-amber-800/40 px-2">Yuklangan Sahifalar ({form.watch("scanMenuUrls").length})</h4>
                                                        <div className="h-px flex-1 bg-amber-100 mx-4" />
                                                    </div>
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                                        {form.watch("scanMenuUrls").map((url, index) => (
                                                            <div key={index} className="group relative aspect-[3/4] rounded-2xl overflow-hidden border-4 border-white shadow-lg transition-all hover:scale-[1.02]">
                                                                <img src={url} className="w-full h-full object-cover" />
                                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                    <Button
                                                                        type="button"
                                                                        variant="destructive"
                                                                        size="icon"
                                                                        className="h-10 w-10 rounded-full"
                                                                        onClick={() => removeScanImage(index)}
                                                                    >
                                                                        <Trash2 className="w-5 h-5" />
                                                                    </Button>
                                                                </div>
                                                                <div className="absolute top-2 left-2 px-3 py-1 bg-black/60 backdrop-blur-md rounded-lg text-white text-[10px] font-bold">
                                                                    {index + 1}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            </TabsContent>

                            <TabsContent value="manager" className="space-y-4 m-0">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full overflow-y-auto pr-2">
                                    {/* Left Column: Phones & Locations */}
                                    <div className="space-y-4">
                                        {/* Phones Section */}
                                        <Card className="border-none shadow-sm bg-white dark:bg-card">
                                            <CardContent className="p-6 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                                                            <Phone className="w-5 h-5" />
                                                        </div>
                                                        <h4 className="font-bold text-gray-900">Telefon Raqamlar</h4>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => appendPhone({ name: "", phone: "" })}
                                                        className="h-8 gap-1 text-xs"
                                                    >
                                                        <Plus className="w-3 h-3" /> Qo'shish
                                                    </Button>
                                                </div>

                                                <div className="space-y-3">
                                                    {phoneFields.map((field, index) => (
                                                        <div key={field.id} className="flex gap-2 items-start animate-in slide-in-from-left-2 duration-300">
                                                            <div className="grid grid-cols-2 gap-2 flex-1">
                                                                <FormField
                                                                    control={form.control}
                                                                    name={`phones.${index}.name`}
                                                                    render={({ field }) => (
                                                                        <FormItem>
                                                                            <FormControl>
                                                                                <Input placeholder="Nomi (Menejer)" {...field} className="h-9 text-sm" />
                                                                            </FormControl>
                                                                            <FormMessage />
                                                                        </FormItem>
                                                                    )}
                                                                />
                                                                <FormField
                                                                    control={form.control}
                                                                    name={`phones.${index}.phone`}
                                                                    render={({ field }) => (
                                                                        <FormItem>
                                                                            <FormControl>
                                                                                <Input placeholder="+998 90..." {...field} className="h-9 text-sm" />
                                                                            </FormControl>
                                                                            <FormMessage />
                                                                        </FormItem>
                                                                    )}
                                                                />
                                                            </div>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => removePhone(index)}
                                                                className="h-9 w-9 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                    {phoneFields.length === 0 && (
                                                        <div className="text-center py-4 border-2 border-dashed border-gray-100 rounded-xl">
                                                            <p className="text-xs text-muted-foreground">Raqamlar yo'q</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>

                                        {/* Locations Section */}
                                        <Card className="border-none shadow-sm bg-white dark:bg-card">
                                            <CardContent className="p-6 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                                            <MapPin className="w-5 h-5" />
                                                        </div>
                                                        <h4 className="font-bold text-gray-900">Filiallar (Xarita)</h4>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => appendLocation({ name: "", url: "" })}
                                                        className="h-8 gap-1 text-xs"
                                                    >
                                                        <Plus className="w-3 h-3" /> Qo'shish
                                                    </Button>
                                                </div>

                                                <div className="space-y-3">
                                                    {locationFields.map((field, index) => (
                                                        <div key={field.id} className="flex gap-2 items-start animate-in slide-in-from-left-2 duration-300">
                                                            <div className="grid grid-cols-2 gap-2 flex-1">
                                                                <FormField
                                                                    control={form.control}
                                                                    name={`locations.${index}.name`}
                                                                    render={({ field }) => (
                                                                        <FormItem>
                                                                            <FormControl>
                                                                                <Input placeholder="Filial Nomi" {...field} className="h-9 text-sm" />
                                                                            </FormControl>
                                                                            <FormMessage />
                                                                        </FormItem>
                                                                    )}
                                                                />
                                                                <FormField
                                                                    control={form.control}
                                                                    name={`locations.${index}.url`}
                                                                    render={({ field }) => (
                                                                        <FormItem>
                                                                            <FormControl>
                                                                                <Input placeholder="Google Maps Link" {...field} className="h-9 text-sm" />
                                                                            </FormControl>
                                                                            <FormMessage />
                                                                        </FormItem>
                                                                    )}
                                                                />
                                                            </div>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => removeLocation(index)}
                                                                className="h-9 w-9 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                    {locationFields.length === 0 && (
                                                        <div className="text-center py-4 border-2 border-dashed border-gray-100 rounded-xl">
                                                            <p className="text-xs text-muted-foreground">Filiallar yo'q</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    {/* Right Column: Social Media */}
                                    <div className="space-y-4">
                                        {/* Telegram Section */}
                                        <Card className="border-none shadow-sm bg-white dark:bg-card">
                                            <CardContent className="p-6 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-2 bg-sky-100 text-sky-600 rounded-lg">
                                                            <Send className="w-5 h-5" />
                                                        </div>
                                                        <h4 className="font-bold text-gray-900">Telegram Kanallar/Botlar</h4>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => appendTelegram({ name: "", url: "" })}
                                                        className="h-8 gap-1 text-xs"
                                                    >
                                                        <Plus className="w-3 h-3" /> Qo'shish
                                                    </Button>
                                                </div>

                                                <div className="space-y-3">
                                                    {telegramFields.map((field, index) => (
                                                        <div key={field.id} className="flex gap-2 items-start animate-in slide-in-from-left-2 duration-300">
                                                            <div className="grid grid-cols-2 gap-2 flex-1">
                                                                <FormField
                                                                    control={form.control}
                                                                    name={`telegrams.${index}.name`}
                                                                    render={({ field }) => (
                                                                        <FormItem>
                                                                            <FormControl>
                                                                                <Input placeholder="Nomi (Asosiy)" {...field} className="h-9 text-sm" />
                                                                            </FormControl>
                                                                            <FormMessage />
                                                                        </FormItem>
                                                                    )}
                                                                />
                                                                <FormField
                                                                    control={form.control}
                                                                    name={`telegrams.${index}.url`}
                                                                    render={({ field }) => (
                                                                        <FormItem>
                                                                            <FormControl>
                                                                                <Input placeholder="t.me/..." {...field} className="h-9 text-sm" />
                                                                            </FormControl>
                                                                            <FormMessage />
                                                                        </FormItem>
                                                                    )}
                                                                />
                                                            </div>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => removeTelegram(index)}
                                                                className="h-9 w-9 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                    {telegramFields.length === 0 && (
                                                        <div className="text-center py-4 border-2 border-dashed border-gray-100 rounded-xl">
                                                            <p className="text-xs text-muted-foreground">Linklar yo'q</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>

                                        {/* Instagram Section */}
                                        <Card className="border-none shadow-sm bg-white dark:bg-card">
                                            <CardContent className="p-6 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-2 bg-pink-100 text-pink-600 rounded-lg">
                                                            <Instagram className="w-5 h-5" />
                                                        </div>
                                                        <h4 className="font-bold text-gray-900">Instagram Sahifalar</h4>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => appendInstagram({ name: "", url: "" })}
                                                        className="h-8 gap-1 text-xs"
                                                    >
                                                        <Plus className="w-3 h-3" /> Qo'shish
                                                    </Button>
                                                </div>

                                                <div className="space-y-3">
                                                    {instagramFields.map((field, index) => (
                                                        <div key={field.id} className="flex gap-2 items-start animate-in slide-in-from-left-2 duration-300">
                                                            <div className="grid grid-cols-2 gap-2 flex-1">
                                                                <FormField
                                                                    control={form.control}
                                                                    name={`instagrams.${index}.name`}
                                                                    render={({ field }) => (
                                                                        <FormItem>
                                                                            <FormControl>
                                                                                <Input placeholder="Nomi" {...field} className="h-9 text-sm" />
                                                                            </FormControl>
                                                                            <FormMessage />
                                                                        </FormItem>
                                                                    )}
                                                                />
                                                                <FormField
                                                                    control={form.control}
                                                                    name={`instagrams.${index}.url`}
                                                                    render={({ field }) => (
                                                                        <FormItem>
                                                                            <FormControl>
                                                                                <Input placeholder="instagram.com/..." {...field} className="h-9 text-sm" />
                                                                            </FormControl>
                                                                            <FormMessage />
                                                                        </FormItem>
                                                                    )}
                                                                />
                                                            </div>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => removeInstagram(index)}
                                                                className="h-9 w-9 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                    {instagramFields.length === 0 && (
                                                        <div className="text-center py-4 border-2 border-dashed border-gray-100 rounded-xl">
                                                            <p className="text-xs text-muted-foreground">Linklar yo'q</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>

                                        {/* Support Link */}
                                        <Card className="border-none shadow-sm bg-white dark:bg-card">
                                            <CardContent className="p-6 space-y-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                                                        <Send className="w-5 h-5 rotate-45" />
                                                    </div>
                                                    <h4 className="font-bold text-gray-900">Support (Admin) Link</h4>
                                                </div>
                                                <FormField
                                                    control={form.control}
                                                    name="supportUrl"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormControl>
                                                                <Input placeholder="t.me/admin_username" {...field} className="h-9 text-sm" />
                                                            </FormControl>
                                                            <FormDescription>Support kartasi bosilganda ochiladigan link</FormDescription>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="settings" className="space-y-4 m-0">
                                <Card className="border-none shadow-sm bg-white dark:bg-card">
                                    <CardContent className="p-6 space-y-6">
                                        <div className="flex items-start gap-4 mb-4">
                                            <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
                                                <Settings className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-lg">Menyu Sozlamalari</h4>
                                                <p className="text-sm text-muted-foreground">Menyu sahifasida qaysi tugmalar ko'rinishi va Wi-Fi ma'lumotlarini boshqarish</p>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            {/* Enable Ordering */}
                                            <FormField
                                                control={form.control}
                                                name="isOrderingEnabled"
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-orange-50/30 border-orange-100 shadow-sm transition-all hover:shadow-md">
                                                        <div className="space-y-0.5">
                                                            <div className="flex items-center gap-2">
                                                                <ShoppingCart className="w-5 h-5 text-orange-600" />
                                                                <FormLabel className="text-base font-bold text-gray-900">Buyurtma berish xizmati</FormLabel>
                                                            </div>
                                                            <FormDescription className="text-xs text-orange-900/60 font-medium leading-relaxed max-w-[280px]">
                                                                Menyuda "Buyurtma berish" tugmalarini va savatni butunlay o'chirish yoki yoqish (Global toggle)
                                                            </FormDescription>
                                                        </div>
                                                        <FormControl>
                                                            <input
                                                                type="checkbox"
                                                                className="h-6 w-12 cursor-pointer appearance-none rounded-full bg-gray-300 transition-all checked:bg-orange-500 relative inline-block before:content-[''] before:absolute before:top-1 before:left-1 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition-transform checked:before:translate-x-6 shadow-inner ring-2 ring-transparent checked:ring-orange-200"
                                                                checked={field.value}
                                                                onChange={field.onChange}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />

                                            {/* Telegram Only Ordering */}
                                             <FormField
                                                control={form.control}
                                                name="isTelegramOrderOnly"
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-sky-50/30 border-sky-100 shadow-sm transition-all hover:shadow-md">
                                                        <div className="space-y-0.5">
                                                            <div className="flex items-center gap-2">
                                                                <Send className="w-5 h-5 text-sky-600" />
                                                                <FormLabel className="text-base font-bold text-gray-900">Telegram orqali buyurtma (Faqat)</FormLabel>
                                                            </div>
                                                            <FormDescription className="text-xs text-sky-900/60 font-medium leading-relaxed max-w-[280px]">
                                                                Yoqilganda, "+ 1 -" o'rniga mijozlarni Telegram botga yo'naltiruvchi oyna chiqadi
                                                            </FormDescription>
                                                        </div>
                                                        <FormControl>
                                                            <input
                                                                type="checkbox"
                                                                className="h-6 w-12 cursor-pointer appearance-none rounded-full bg-gray-300 transition-all checked:bg-sky-500 relative inline-block before:content-[''] before:absolute before:top-1 before:left-1 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition-transform checked:before:translate-x-6 shadow-inner ring-2 ring-transparent checked:ring-sky-200"
                                                                checked={field.value}
                                                                onChange={field.onChange}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />

                                            {form.watch("isTelegramOrderOnly") && (
                                                <FormField
                                                    control={form.control}
                                                    name="orderingTelegramBot"
                                                    render={({ field }) => (
                                                        <FormItem className="space-y-2 p-4 rounded-lg border bg-zinc-50 border-zinc-200 shadow-inner">
                                                            <FormLabel className="text-sm font-bold text-gray-700">Telegram Bot (Buyurtma uchun)</FormLabel>
                                                            <FormControl>
                                                                <div className="relative">
                                                                    <Send className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-500" />
                                                                    <Input 
                                                                        {...field} 
                                                                        placeholder="@my_restaurant_bot yoki https://t.me/..." 
                                                                        className="pl-10 h-11 bg-white border-zinc-300 focus:border-sky-500 focus:ring-sky-500 rounded-xl"
                                                                    />
                                                                </div>
                                                            </FormControl>
                                                            <FormDescription className="text-[10px] text-zinc-500 font-medium italic">
                                                                Mijozlar buyurtma berish tugmasini bosganda aynan shu botga yo'naltiriladi
                                                            </FormDescription>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            )}

                                            {/* Maintenance Mode Toggle */}
                                            <FormField
                                                control={form.control}
                                                name="status"
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-amber-50/30 border-amber-100 shadow-sm transition-all hover:shadow-md">
                                                        <div className="space-y-0.5">
                                                            <div className="flex items-center gap-2">
                                                                <RefreshCw className="w-5 h-5 text-amber-600" />
                                                                <FormLabel className="text-base font-bold text-gray-900">Yangilanish rejimi (Maintenance)</FormLabel>
                                                            </div>
                                                            <FormDescription className="text-xs text-amber-900/60 font-medium leading-relaxed max-w-[280px]">
                                                                Yoqilganda, mijozlarga "Yangilanish ketyapdi" sahifasi ko'rsatiladi
                                                            </FormDescription>
                                                        </div>
                                                        <FormControl>
                                                            <input
                                                                type="checkbox"
                                                                className="h-6 w-12 cursor-pointer appearance-none rounded-full bg-gray-300 transition-all checked:bg-amber-500 relative inline-block before:content-[''] before:absolute before:top-1 before:left-1 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition-transform checked:before:translate-x-6 shadow-inner ring-2 ring-transparent checked:ring-amber-200"
                                                                checked={field.value === 'maintenance'}
                                                                onChange={(e) => field.onChange(e.target.checked ? 'maintenance' : 'active')}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />

                                            {/* Enable Waiter Call */}
                                            <FormField
                                                control={form.control}
                                                name="enableWaiterCall"
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/30">
                                                        <div className="space-y-0.5">
                                                            <div className="flex items-center gap-2">
                                                                <Bell className="w-4 h-4 text-orange-600" />
                                                                <FormLabel className="text-base font-semibold">Ofitsiant Chaqirish</FormLabel>
                                                            </div>
                                                            <FormDescription>
                                                                Menyu sahifasida "Ofitsiant chaqirish" tugmasini yoqish/o'chirish. Bu o'chirilsa, admin panelda Buyurtmalar va Stollar ham yopiladi.
                                                            </FormDescription>
                                                        </div>
                                                        <FormControl>
                                                            <input
                                                                type="checkbox"
                                                                className="h-5 w-10 cursor-pointer appearance-none rounded-full bg-gray-300 transition-colors checked:bg-green-500 relative inline-block before:content-[''] before:absolute before:top-0.5 before:left-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition-transform checked:before:translate-x-5"
                                                                checked={field.value}
                                                                onChange={field.onChange}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />

                                            {/* Enable Wi-Fi */}
                                            <FormField
                                                control={form.control}
                                                name="enableWifi"
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/30">
                                                        <div className="space-y-0.5">
                                                            <div className="flex items-center gap-2">
                                                                <Wifi className="w-4 h-4 text-blue-600" />
                                                                <FormLabel className="text-base font-semibold">Wi-Fi Tugmasi</FormLabel>
                                                            </div>
                                                            <FormDescription>
                                                                Menyu sahifasida "Wi-Fi" tugmasini yoqish/o'chirish
                                                            </FormDescription>
                                                        </div>
                                                        <FormControl>
                                                            <input
                                                                type="checkbox"
                                                                className="h-5 w-10 cursor-pointer appearance-none rounded-full bg-gray-300 transition-colors checked:bg-green-500 relative inline-block before:content-[''] before:absolute before:top-0.5 before:left-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition-transform checked:before:translate-x-5"
                                                                checked={field.value}
                                                                onChange={field.onChange}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />

                                            {/* Developer Credit Toggle */}
                                            <FormField
                                                control={form.control}
                                                name="showDeveloperCredit"
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-blue-50/50">
                                                        <div className="space-y-0.5">
                                                            <div className="flex items-center gap-2">
                                                                <ShieldCheck className="w-4 h-4 text-blue-600" />
                                                                <FormLabel className="text-base font-semibold">Developer Credit (Abdiaxatov)</FormLabel>
                                                            </div>
                                                            <FormDescription>
                                                                Menyu footer qismida "© 2025 Abdiaxatov IT xizmatlari" yozuvini ko'rsatish
                                                            </FormDescription>
                                                        </div>
                                                        <FormControl>
                                                            <input
                                                                type="checkbox"
                                                                className="h-5 w-10 cursor-pointer appearance-none rounded-full bg-gray-300 transition-colors checked:bg-blue-600 relative inline-block before:content-[''] before:absolute before:top-0.5 before:left-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition-transform checked:before:translate-x-5"
                                                                checked={field.value}
                                                                onChange={field.onChange}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />

                                            {/* Wi-Fi SSID and Password */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <FormField
                                                    control={form.control}
                                                    name="wifiSSID"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Wi-Fi Nomi (SSID)</FormLabel>
                                                            <FormControl><Input placeholder="Noziya_Guest" {...field} className="bg-white" /></FormControl>
                                                            <FormDescription>Mijozlarga ko'rinadigan Wi-Fi nomi</FormDescription>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name="wifiPassword"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Wi-Fi Paroli</FormLabel>
                                                            <FormControl><Input placeholder="20252025" {...field} className="bg-white" /></FormControl>
                                                            <FormDescription>Wi-Fi ulanish paroli</FormDescription>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>

                                            <FormField
                                                control={form.control}
                                                name="menuGridColumns"
                                                render={({ field }) => (
                                                    <FormItem className="space-y-3 pt-4 border-t">
                                                        <div className="flex items-center gap-2">
                                                            <LayoutGrid className="w-4 h-4 text-blue-600" />
                                                            <FormLabel className="text-base font-semibold text-gray-900">Qatorda nechta card (Classic Menyu)</FormLabel>
                                                        </div>
                                                        <FormControl>
                                                            <div className="flex items-center gap-4">
                                                                <Input
                                                                    type="number"
                                                                    min={1}
                                                                    max={6}
                                                                    {...field}
                                                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                                                    className="w-24 bg-white shadow-sm"
                                                                />
                                                                <div className="flex flex-col text-[10px] sm:text-xs text-muted-foreground font-medium">
                                                                    <span className="flex items-center gap-1">📱 Mobil: <span className="text-blue-600">{field.value}</span> ta</span>
                                                                    <span className="flex items-center gap-1">💻 Desktop: <span className="text-blue-600">{Math.min(Number(field.value) + 2, 6)}</span> ta</span>
                                                                </div>
                                                            </div>
                                                        </FormControl>
                                                        <FormDescription className="text-xs">
                                                            Klassik menyu rejimida bir qatorda nechta taom kartasi ko'rinishini belgilang. (Tavsiya: 2 ta)
                                                        </FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            {/* Delivery Service Settings */}
                                            <div className="space-y-4 pt-4 border-t">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                                                        <Truck className="w-5 h-5" />
                                                    </div>
                                                    <h4 className="font-bold text-gray-900">Yetkazib berish xizmati</h4>
                                                </div>

                                                <FormField
                                                    control={form.control}
                                                    name="deliveryAvailable"
                                                    render={({ field }) => (
                                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-green-50/30">
                                                            <div className="space-y-0.5">
                                                                <FormLabel className="text-base font-semibold">Yetkazib berish xizmati mavjudligi</FormLabel>
                                                                <FormDescription>
                                                                    Mijozlar uchun yetkazib berish xizmati orqali buyurtma berish imkoniyatini yoqish/o'chirish
                                                                </FormDescription>
                                                            </div>
                                                            <FormControl>
                                                                <input
                                                                    type="checkbox"
                                                                    className="h-5 w-10 cursor-pointer appearance-none rounded-full bg-gray-300 transition-colors checked:bg-green-500 relative inline-block before:content-[''] before:absolute before:top-0.5 before:left-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition-transform checked:before:translate-x-5"
                                                                    checked={field.value}
                                                                    onChange={field.onChange}
                                                                />
                                                            </FormControl>
                                                        </FormItem>
                                                    )}
                                                />

                                                {form.watch("deliveryAvailable") && (
                                                    <div className="space-y-4">
                                                        <FormField
                                                            control={form.control}
                                                            name="deliveryFee"
                                                            render={({ field }) => (
                                                                <FormItem className="space-y-2">
                                                                    <FormLabel>Yetkazib berish narxi (so'm)</FormLabel>
                                                                    <FormControl>
                                                                        <div className="flex items-center gap-4">
                                                                            <Input
                                                                                type="number"
                                                                                min={0}
                                                                                {...field}
                                                                                onChange={(e) => field.onChange(Number(e.target.value))}
                                                                                className="w-full bg-white shadow-sm"
                                                                                placeholder="15000"
                                                                            />
                                                                            <span className="text-sm font-bold text-gray-400 whitespace-nowrap">so'm</span>
                                                                        </div>
                                                                    </FormControl>
                                                                    <FormDescription>Har bir buyurtma uchun yetkazib berish narxi</FormDescription>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />

                                                        <FormField
                                                            control={form.control}
                                                            name="showDeliveryFeeInMessage"
                                                            render={({ field }) => (
                                                                <FormItem className="flex flex-row items-center justify-between rounded-xl border p-4 bg-white shadow-sm border-gray-100">
                                                                    <div className="space-y-0.5">
                                                                        <FormLabel className="text-base font-semibold">Bot xabarida narxni ko'rsatish</FormLabel>
                                                                        <FormDescription className="text-xs">
                                                                            Telegram xabarnomada yetkazib berish narxini chiqarish
                                                                        </FormDescription>
                                                                    </div>
                                                                    <FormControl>
                                                                        <Switch
                                                                            checked={field.value}
                                                                            onCheckedChange={field.onChange}
                                                                        />
                                                                    </FormControl>
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Baraban (Spin Wheel) Settings */}
                                            <div className="space-y-4 pt-4 border-t">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-target"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>
                                                    </div>
                                                    <h4 className="font-bold text-gray-900">Baraban (Yutuqli O'yin)</h4>
                                                </div>

                                                <FormField
                                                    control={form.control}
                                                    name="enableSpinWheel"
                                                    render={({ field }) => (
                                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-purple-50/30">
                                                            <div className="space-y-0.5">
                                                                <FormLabel className="text-base font-semibold">Baraban funksiyasini yoqish</FormLabel>
                                                                <FormDescription>
                                                                    Menyu sahifasida mijozlar uchun "Baraban" o'yinini ko'rsatish
                                                                </FormDescription>
                                                            </div>
                                                            <FormControl>
                                                                <input
                                                                    type="checkbox"
                                                                    className="h-5 w-10 cursor-pointer appearance-none rounded-full bg-gray-300 transition-colors checked:bg-purple-500 relative inline-block before:content-[''] before:absolute before:top-0.5 before:left-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition-transform checked:before:translate-x-5"
                                                                    checked={field.value}
                                                                    onChange={field.onChange}
                                                                />
                                                            </FormControl>
                                                        </FormItem>
                                                    )}
                                                />

                                                {form.watch("enableSpinWheel") && (
                                                    <FormField
                                                        control={form.control}
                                                        name="spinWheelLimit"
                                                        render={({ field }) => (
                                                            <FormItem className="space-y-2">
                                                                <FormLabel>Kunlik yutuqlar soni</FormLabel>
                                                                <FormControl>
                                                                    <div className="flex items-center gap-4">
                                                                        <Input
                                                                            type="number"
                                                                            min={1}
                                                                            max={10}
                                                                            {...field}
                                                                            onChange={(e) => field.onChange(Number(e.target.value))}
                                                                            className="w-24 bg-white"
                                                                        />
                                                                        <span className="text-sm text-muted-foreground">Bir kunda maksimal nechta odam yutuq yutib olishi mumkin (Tavsiya: 3 ta)</span>
                                                                    </div>
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                )}
                                            </div>

                                            {/* Telegram Integration Toggle */}
                                            <div className="space-y-4 pt-4 border-t">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-2 bg-sky-100 text-sky-600 rounded-lg">
                                                        <Send className="w-5 h-5" />
                                                    </div>
                                                    <h4 className="font-bold text-gray-900">Telegram Integratsiya</h4>
                                                </div>

                                                <FormField
                                                    control={form.control}
                                                    name="enableTelegramIntegration"
                                                    render={({ field }) => (
                                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-sky-50/30">
                                                            <div className="space-y-0.5">
                                                                <FormLabel className="text-base font-semibold">Telegram Bot funksiyasini yoqish</FormLabel>
                                                                <FormDescription>
                                                                    Restoran admini uchun Telegram sozlamalari va foydalanuvchilar sahifasini ochish
                                                                </FormDescription>
                                                            </div>
                                                            <FormControl>
                                                                <input
                                                                    type="checkbox"
                                                                    className="h-5 w-10 cursor-pointer appearance-none rounded-full bg-gray-300 transition-colors checked:bg-sky-500 relative inline-block before:content-[''] before:absolute before:top-0.5 before:left-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition-transform checked:before:translate-x-5"
                                                                    checked={field.value}
                                                                    onChange={field.onChange}
                                                                />
                                                            </FormControl>
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="admin" className="space-y-4 m-0">
                                <Card className="border-none shadow-sm bg-orange-50/50 dark:bg-orange-900/10 border-orange-100">
                                    <CardContent className="p-6 space-y-4">
                                        <div className="flex items-start gap-4 mb-6">
                                            <div className="p-3 bg-gradient-to-br from-orange-100 to-amber-100 text-orange-600 rounded-xl shadow-sm ring-1 ring-orange-200">
                                                <Shield className="w-8 h-8" />
                                            </div>
                                            <div className="space-y-1">
                                                <h4 className="font-bold text-xl text-gray-900 dark:text-gray-100">Admin Akkounti</h4>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                                                    Bu restoran uchun mas'ul admin yaratish. <br />
                                                    Ushbu ma'lumotlar bilan admin o'zining shaxsiy kabinetiga kira oladi.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <FormField
                                                control={form.control}
                                                name="adminEmail"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="flex items-center gap-2">
                                                            Login (Email)
                                                            {initialData && <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Hozirgi: {initialData.adminEmail}</span>}
                                                            {!initialData && <span className="text-xs font-normal text-muted-foreground">(Yangi)</span>}
                                                        </FormLabel>
                                                        <FormControl>
                                                            <div className="relative group">
                                                                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                                                <Input
                                                                    type="email"
                                                                    placeholder="admin@restaurant.com"
                                                                    {...field}
                                                                    className="bg-white pl-10 h-11 transition-all focus:ring-2 focus:ring-blue-100 focus:border-blue-400 font-medium"
                                                                    autoComplete="off"
                                                                    data-1p-ignore
                                                                />
                                                            </div>
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="adminPassword"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="flex items-center gap-2">
                                                            Parol
                                                            <span className="text-xs font-normal text-muted-foreground">(Yangi)</span>
                                                        </FormLabel>
                                                        <FormControl>
                                                            <div className="relative group">
                                                                <Shield className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                                                <Input
                                                                    type="password"
                                                                    placeholder="Minimum 6 belgi"
                                                                    {...field}
                                                                    className="bg-white pl-10 h-11 transition-all focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                                                                    autoComplete="new-password"
                                                                    data-1p-ignore
                                                                />
                                                            </div>
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        {/* Status Toggle */}
                                        <div className="pt-6 border-t mt-6">
                                            <FormField
                                                control={form.control}
                                                name="status"
                                                render={({ field }) => (
                                                    <FormItem className="flex flex-row items-center justify-between rounded-2xl border-2 border-dashed p-6 bg-white dark:bg-zinc-900 transition-all hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <Activity className={`w-5 h-5 ${field.value === 'active' ? 'text-green-500' : 'text-red-500'}`} />
                                                                <FormLabel className="text-lg font-bold">Restoran Holati</FormLabel>
                                                            </div>
                                                            <FormDescription className="text-sm font-medium">
                                                                {field.value === 'active'
                                                                    ? "Filial hozirda faol va mijozlar saytga kira olishadi."
                                                                    : "Filial hozirda nofaol. Mijozlarga 404 xatoligi ko'rsatiladi."}
                                                            </FormDescription>
                                                        </div>
                                                        <FormControl>
                                                            <div className="flex items-center gap-3 bg-gray-100 dark:bg-zinc-800 p-1.5 rounded-2xl">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => field.onChange("active")}
                                                                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${field.value === 'active' ? 'bg-green-500 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-200'}`}
                                                                >
                                                                    Faol
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => field.onChange("inactive")}
                                                                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${field.value === 'inactive' ? 'bg-red-500 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-200'}`}
                                                                >
                                                                    Nofaol
                                                                </button>
                                                            </div>
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        {!initialData && (
                                            <div className="flex items-center gap-2 p-3 bg-blue-50 text-blue-700 text-sm rounded-lg mt-2 border border-blue-100">
                                                <div className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center shrink-0">i</div>
                                                <p>Agar maydonlarni bo'sh qoldirsangiz, restoran adminsiz yaratiladi.</p>
                                            </div>
                                        )}
                                        {initialData && (
                                            <div className="flex items-center gap-2 p-3 bg-indigo-50 text-indigo-700 text-sm rounded-lg mt-2 border border-indigo-100">
                                                <div className="w-5 h-5 rounded-full bg-indigo-200 flex items-center justify-center shrink-0">
                                                    <UserCog className="w-3 h-3" />
                                                </div>
                                                <p>Admin ma'lumotlarini o'zgartirish uchun yangi email yoki parolni kiriting. Agar o'zgartirish kerak bo'lmasa, bo'sh qoldiring.</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="subscription" className="space-y-4 m-0">
                                <Card className="border-none shadow-sm bg-blue-50/50 dark:bg-blue-900/10 border-blue-100">
                                    <CardContent className="p-6 space-y-6">
                                        <div className="flex items-center gap-4 p-4 bg-blue-600 text-white rounded-2xl shadow-xl">
                                            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md">
                                                <Bell className="w-8 h-8 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold">Obuna Va To'lov</h3>
                                                <p className="text-sm opacity-90">Restoranning foydalanish muddati va narxini boshqaring</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <FormField
                                                control={form.control}
                                                name="subscriptionPlan"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Obuna Turi</FormLabel>
                                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger className="h-11 bg-white focus:ring-2 focus:ring-blue-100">
                                                                    <SelectValue placeholder="Tanlang" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="trial">Sinov Muddati (Trial)</SelectItem>
                                                                <SelectItem value="monthly">Oylik Obuna</SelectItem>
                                                                <SelectItem value="half_yearly">Yarim yillik Obuna</SelectItem>
                                                                <SelectItem value="yearly">Yillik Obuna</SelectItem>
                                                                <SelectItem value="free">Bepul (Cheksiz)</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="subscriptionPrice"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Sotilgan Narxi (UZS)</FormLabel>
                                                        <FormControl>
                                                            <div className="relative group">
                                                                <div className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-400 group-focus-within:text-blue-500 transition-colors">UZS</div>
                                                                <Input
                                                                    type="number"
                                                                    placeholder="Masalan: 300000"
                                                                    {...field}
                                                                    onChange={e => field.onChange(Number(e.target.value))}
                                                                    className="pl-14 h-11 bg-white focus:ring-2 focus:ring-blue-100"
                                                                />
                                                            </div>
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <FormField
                                                control={form.control}
                                                name="subscriptionStartDate"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Boshlanish Sana</FormLabel>
                                                        <FormControl>
                                                            <Input type="date" {...field} className="h-11 bg-white focus:ring-2 focus:ring-blue-100" />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="subscriptionEndDate"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Tugash Sana</FormLabel>
                                                        <FormControl>
                                                            <Input type="date" {...field} className="h-11 bg-white focus:ring-2 focus:ring-blue-100 border-orange-200" />
                                                        </FormControl>
                                                        <FormDescription className="text-orange-600 font-medium">Bu sanadan so'ng restoran xizmat ko'rsatishdan to'xtatiladi.</FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </div>

                        {form.watch("menuStyle") !== "scan" && (
                            <DialogFooter className="mt-4 border-t pt-4">
                                <Button type="button" variant="outline" onClick={onCancel}>
                                    Bekor qilish
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isLoading || logoUploading || bannerUploading}
                                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg shadow-blue-500/20 transition-all"
                                >
                                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Store className="mr-2 h-4 w-4" />}
                                    {initialData ? "Saqlash" : "Restoranni Yaratish"}
                                </Button>
                            </DialogFooter>
                        )}
                        {(form.watch("menuStyle") === "scan" || form.watch("menuStyle") === "book") && (
                            <div className="mt-6 pt-6 border-t flex flex-col gap-4">
                                <div className="flex items-center gap-2 p-3 bg-blue-50 text-blue-700 text-xs rounded-xl border border-blue-100">
                                    <div className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center shrink-0">i</div>
                                    <p>
                                        Ushbu rejimda restoran minimal sozlamalar bilan yaratiladi. Qolgan barcha ma'lumotlarni keyinchalik admin panelda
                                        to'ldirish mumkin.
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <Button type="button" variant="ghost" onClick={onCancel} className="flex-1 rounded-xl h-12">
                                        Bekor qilish
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={isLoading || scanUploading}
                                        className={`flex-[2] ${form.watch("menuStyle") === 'book' ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20' : 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/20'} text-white shadow-xl rounded-xl h-12 font-bold text-lg`}
                                    >
                                        {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
                                        Bitirish va Yaratish
                                    </Button>
                                </div>
                            </div>
                        )}
                    </Tabs>
                </form>
            </Form>
        </div>
    )
}

function PlusBadge() {
    return <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center"><PlusIcon className="w-3 h-3" /></div>
}
function PlusIcon({ className }: { className?: string }) {
    return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14" /><path d="M12 5v14" /></svg>
}
