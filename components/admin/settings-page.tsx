"use client"

import { useState, useEffect } from "react"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { AdminLayoutClient } from "@/components/admin/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/components/admin/admin-auth-provider"
import { ref, onValue, set } from "firebase/database"
import { rtdb } from "@/lib/firebase"
import Link from "next/link"
import { Loader2, Save, Bell, Wifi, Gift, Send, Instagram, MapPin, MessageCircle, ShoppingCart, Monitor, Info, Globe } from "lucide-react"

export function SettingsPage() {
  const { restaurantId } = useAuth()
  const [settings, setSettings] = useState({
    deliveryAvailable: true,
    deliveryFee: 15000,
    enableWaiterCall: true,
    enableWifi: true,
    wifiSSID: "Guest",
    wifiPassword: "20252025",
    menuGridColumns: 2, // Default: 2 columns per row
    telegramUrl: "",
    isOrderingEnabledOnWeb: true,
    isOrderingEnabledOnTelegram: true,
    enableManualTableSelection: true,
    instagramUrl: "",
    locationUrl: "",
    supportUrl: "",
    enableLanguageSwitcher: true,
    showDeliveryFeeInMessage: true,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const fetchSettings = async () => {
      if (!restaurantId) {
        setIsLoading(false)
        return
      }

      try {
        const restaurantDoc = await getDoc(doc(db, "restaurants", restaurantId))
        if (restaurantDoc.exists()) {
          const data = restaurantDoc.data()
          setSettings({
            deliveryAvailable: data.deliveryAvailable !== false,
            deliveryFee: data.deliveryFee || 15000,
            enableWaiterCall: data.enableWaiterCall !== false,
            enableWifi: data.enableWifi !== false,
            wifiSSID: data.wifiSSID || "Guest",
            wifiPassword: data.wifiPassword || "20252025",
            menuGridColumns: data.menuGridColumns || 2,
            isOrderingEnabledOnWeb: data.isOrderingEnabledOnWeb !== false,
            isOrderingEnabledOnTelegram: data.isOrderingEnabledOnTelegram !== false,
            enableManualTableSelection: data.enableManualTableSelection !== false,
            enableSpinWheel: data.enableSpinWheel || false,
            spinWheelLimit: data.spinWheelLimit || 3,
            telegramUrl: data.telegramUrl || "",
            instagramUrl: data.instagramUrl || "",
            locationUrl: data.locationUrl || "",
            supportUrl: data.supportUrl || "",
            enableLanguageSwitcher: data.enableLanguageSwitcher !== false,
            showDeliveryFeeInMessage: data.showDeliveryFeeInMessage !== false,
            spinWheelPrizes: data.spinWheelPrizes || [
              { id: "1", text: "10% Chegirma", color: "#FF6B6B", value: 10, type: 'discount' },
              { id: "2", text: "Omad kelsin!", color: "#4D96FF", value: 0, type: 'none' },
              { id: "3", text: "20% Chegirma", color: "#FFD93D", value: 20, type: 'discount' },
              { id: "4", text: "Keyingi safar!", color: "#6BCB77", value: 0, type: 'none' },
              { id: "5", text: "30% Chegirma", color: "#FF1493", value: 30, type: 'discount' },
              { id: "6", text: "Omad kelsin!", color: "#1E90FF", value: 0, type: 'none' },
            ],
          })
        }
        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching settings:", error)
        toast({
          title: "Xatolik",
          description: "Sozlamalarni yuklashda xatolik yuz berdi",
          variant: "destructive",
        })
        setIsLoading(false)
      }
    }

    fetchSettings()
  }, [restaurantId, toast])

  const handleSaveSettings = async () => {
    if (!restaurantId) {
      toast({
        title: "Xatolik",
        description: "Restoran topilmadi",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      await updateDoc(doc(db, "restaurants", restaurantId), settings)
      toast({
        title: "Sozlamalar saqlandi",
        description: "Sozlamalar muvaffaqiyatli saqlandi",
      })
    } catch (error) {
      console.error("Error saving settings:", error)
      toast({
        title: "Xatolik",
        description: "Sozlamalarni saqlashda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <AdminLayoutClient>
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayoutClient>
    )
  }

  return (
    <AdminLayoutClient>
      <div className="p-6">
        <h1 className="mb-6 text-2xl font-bold">Sozlamalar</h1>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Delivery Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Yetkazib berish sozlamalari</CardTitle>
              <CardDescription>Yetkazib berish xizmatini sozlash</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="delivery-available">Yetkazib berish xizmati</Label>
                  <p className="text-sm text-muted-foreground">Yetkazib berish xizmatini yoqish yoki o'chirish</p>
                </div>
                <Switch
                  id="delivery-available"
                  checked={settings.deliveryAvailable}
                  onCheckedChange={(checked) => setSettings({ ...settings, deliveryAvailable: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="delivery-fee">Yetkazib berish narxi ($)</Label>
                <Input
                  id="delivery-fee"
                  type="number"
                  value={settings.deliveryFee}
                  onChange={(e) => setSettings({ ...settings, deliveryFee: Number(e.target.value) })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="show-delivery-fee">Bot xabarida narxni ko'rsatish</Label>
                  <p className="text-sm text-muted-foreground">Telegram xabarnomada yetkazib berish narxini chiqarish</p>
                </div>
                <Switch
                  id="show-delivery-fee"
                  checked={settings.showDeliveryFeeInMessage}
                  onCheckedChange={(checked) => setSettings({ ...settings, showDeliveryFeeInMessage: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Order Controls Settings */}
          <Card className="border-indigo-200 bg-indigo-50/5 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-indigo-700">
                <ShoppingCart className="h-5 w-5" />
                Buyurtma berish boshqaruvi
              </CardTitle>
              <CardDescription>Qaysi platformada buyurtma berish mumkinligini sozlang</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 shadow-sm transition-all hover:shadow-md">
                <div className="space-y-0.5">
                  <Label htmlFor="order-web" className="text-base font-bold flex items-center gap-2 cursor-pointer">
                    <Monitor className="h-4 w-4 text-slate-500" />
                    Veb-saytda buyurtma (Browser)
                  </Label>
                  <p className="text-xs text-muted-foreground">Oddiy brauzer orqali buyurtmalarni qabul qilish</p>
                </div>
                <Switch
                  id="order-web"
                  checked={settings.isOrderingEnabledOnWeb}
                  onCheckedChange={(checked) => setSettings({ ...settings, isOrderingEnabledOnWeb: checked })}
                  className="data-[state=checked]:bg-indigo-600"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 shadow-sm transition-all hover:shadow-md">
                <div className="space-y-0.5">
                  <Label htmlFor="order-telegram" className="text-base font-bold flex items-center gap-2 cursor-pointer">
                    <Send className="h-4 w-4 text-sky-500" />
                    Telegram Botda buyurtma (Web App)
                  </Label>
                  <p className="text-xs text-muted-foreground">Telegram Bot ichida buyurtmalarni qabul qilish</p>
                </div>
                <Switch
                  id="order-telegram"
                  checked={settings.isOrderingEnabledOnTelegram}
                  onCheckedChange={(checked) => setSettings({ ...settings, isOrderingEnabledOnTelegram: checked })}
                  className="data-[state=checked]:bg-sky-500"
                />
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl">
                 <p className="text-xs text-amber-800 dark:text-amber-400 font-medium leading-relaxed flex gap-2">
                   <Info className="h-4 w-4 shrink-0 mt-0.5" />
                   <span>
                     <b>Maslahat:</b> Agar veb-saytda buyurtmani o'chirib, Telegramda yoqib qo'ysangiz, mijozlar saytda menyuni ko'rishadi, lekin buyurtma berish uchun botga yo'naltiriladi.
                   </span>
                 </p>
              </div>

              <div className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 shadow-sm transition-all hover:shadow-md">
                <div className="space-y-0.5">
                  <Label htmlFor="manual-table" className="text-base font-bold flex items-center gap-2 cursor-pointer">
                    <MapPin className="h-4 w-4 text-emerald-500" />
                    Stolni qo'lda tanlash
                  </Label>
                  <p className="text-xs text-muted-foreground">Mijozlar savatchada o'zlari stol tanlay olishlari (QR-kod bo'lmasa)</p>
                </div>
                <Switch
                  id="manual-table"
                  checked={settings.enableManualTableSelection}
                  onCheckedChange={(checked) => setSettings({ ...settings, enableManualTableSelection: checked })}
                  className="data-[state=checked]:bg-emerald-500"
                />
              </div>
            </CardContent>
          </Card>

          {/* Waiter Call Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Ofitsiant chaqirish
              </CardTitle>
              <CardDescription>Menyu sahifasida ofitsiant chaqirish tugmasini boshqarish</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enable-waiter-call">Ofitsiant chaqirish</Label>
                  <p className="text-sm text-muted-foreground">Tugmani yoqish yoki o'chirish</p>
                </div>
                <Switch
                  id="enable-waiter-call"
                  checked={settings.enableWaiterCall}
                  onCheckedChange={(checked) => setSettings({ ...settings, enableWaiterCall: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Wi-Fi Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="h-5 w-5" />
                Wi-Fi sozlamalari
              </CardTitle>
              <CardDescription>Menyu sahifasida Wi-Fi tugmasi va ma'lumotlarini boshqarish</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enable-wifi">Wi-Fi tugmasi</Label>
                  <p className="text-sm text-muted-foreground">Tugmani yoqish yoki o'chirish</p>
                </div>
                <Switch
                  id="enable-wifi"
                  checked={settings.enableWifi}
                  onCheckedChange={(checked) => setSettings({ ...settings, enableWifi: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="wifi-ssid">Wi-Fi nomi (SSID)</Label>
                <Input
                  id="wifi-ssid"
                  type="text"
                  value={settings.wifiSSID}
                  onChange={(e) => setSettings({ ...settings, wifiSSID: e.target.value })}
                  placeholder="7days-burger_Guest"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="wifi-password">Wi-Fi paroli</Label>
                <Input
                  id="wifi-password"
                  type="text"
                  value={settings.wifiPassword}
                  onChange={(e) => setSettings({ ...settings, wifiPassword: e.target.value })}
                  placeholder="20252025"
                />
              </div>
            </CardContent>
          </Card>

          {/* Menu Display Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-layout-grid">
                  <rect width="7" height="7" x="3" y="3" rx="1" />
                  <rect width="7" height="7" x="14" y="3" rx="1" />
                  <rect width="7" height="7" x="14" y="14" rx="1" />
                  <rect width="7" height="7" x="3" y="14" rx="1" />
                </svg>
                Menyu ko'rinishi
              </CardTitle>
              <CardDescription>Menyu kartalarining qatordagi sonini sozlash</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="menu-grid-columns">Qatorda nechta card</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="menu-grid-columns"
                    type="number"
                    min="1"
                    max="6"
                    value={settings.menuGridColumns}
                    onChange={(e) => {
                      const value = Number(e.target.value)
                      if (value >= 1 && value <= 6) {
                        setSettings({ ...settings, menuGridColumns: value })
                      }
                    }}
                    className="w-24"
                  />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">
                      Mobilda: {settings.menuGridColumns}, Planshetda: {Math.min(settings.menuGridColumns + 1, 6)}, Desktopda: {Math.min(settings.menuGridColumns + 2, 6)}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  💡 Tavsiya: 2-3 ta card eng yaxshi ko'rinadi
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Language Switcher Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Tilni o'zgartirish
              </CardTitle>
              <CardDescription>Menyu sahifasida tilni o'zgartirish tugmasini boshqarish</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enable-language-switcher">Tilni o'zgartirish tugmasi</Label>
                  <p className="text-sm text-muted-foreground">Tugmani yoqish yoki o'chirish</p>
                </div>
                <Switch
                  id="enable-language-switcher"
                  checked={settings.enableLanguageSwitcher}
                  onCheckedChange={(checked) => setSettings({ ...settings, enableLanguageSwitcher: checked })}
                />
              </div>
            </CardContent>
          </Card>


          {/* Social Links Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Ijtimoiy tarmoqlar va Manzil
              </CardTitle>
              <CardDescription>Mijozlar uchun ijtimoiy tarmoqlar va manzil linklarini sozlash</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="telegram-url" className="flex items-center gap-2">
                  <Send className="h-4 w-4 text-blue-500" />
                  Telegram Link
                </Label>
                <Input
                  id="telegram-url"
                  value={settings.telegramUrl}
                  onChange={(e) => setSettings({ ...settings, telegramUrl: e.target.value })}
                  placeholder="https://t.me/restoran_nomi"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram-url" className="flex items-center gap-2">
                  <Instagram className="h-4 w-4 text-pink-500" />
                  Instagram Link
                </Label>
                <Input
                  id="instagram-url"
                  value={settings.instagramUrl}
                  onChange={(e) => setSettings({ ...settings, instagramUrl: e.target.value })}
                  placeholder="https://instagram.com/restoran_nomi"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location-url" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-green-500" />
                  Google Maps (Manzil) Link
                </Label>
                <Input
                  id="location-url"
                  value={settings.locationUrl}
                  onChange={(e) => setSettings({ ...settings, locationUrl: e.target.value })}
                  placeholder="https://maps.google.com/..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="support-url" className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-emerald-500" />
                  Support (Qo'llab-quvvatlash) Link
                </Label>
                <Input
                  id="support-url"
                  value={settings.supportUrl}
                  onChange={(e) => setSettings({ ...settings, supportUrl: e.target.value })}
                  placeholder="https://t.me/admin_username"
                />
              </div>
            </CardContent>
          </Card>

          {/* Baraban (Spin Wheel) Link Card */}
          <Card className="border-purple-200 shadow-sm overflow-hidden bg-gradient-to-br from-purple-50 to-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-700">
                <Gift className="h-5 w-5" />
                Baraban (Aksiya)
              </CardTitle>
              <CardDescription>Mijozlar uchun yutuqli o'yin va sovg'alarni boshqarish</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-purple-100/50 rounded-2xl border border-purple-200">
                <div className="text-sm text-purple-800">
                  <p className="font-bold">Alohida boshqaruv paneli</p>
                  <p className="opacity-70">Sovg'alarni tahrirlash va jonli statistikani ko'rish uchun o'ting.</p>
                </div>
                <Button
                  asChild
                  className="bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-200 shrink-0"
                >
                  <Link href="/admin/baraban">
                    Boshqaruvga o'tish
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Save Button */}
        <div className="mt-6">
          <Button onClick={handleSaveSettings} disabled={isSaving} size="lg">
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saqlanmoqda...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Barcha sozlamalarni saqlash
              </>
            )}
          </Button>
        </div>
      </div>
    </AdminLayoutClient>
  )
}
