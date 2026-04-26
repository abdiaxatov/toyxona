"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useCart } from "@/components/cart-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { CartItem } from "@/components/cart-item"
import { TableSelector } from "@/components/table-selector"
import { formatCurrency } from "@/lib/utils"
import { getDeviceId } from "@/lib/device-utils"
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  updateDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  limit,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { MessageCircle, ArrowLeft, Loader2, ShoppingCart, Trash2, AlertTriangle, Smartphone, Ban, Info, MapPin, Send, Banknote, CreditCard } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import type { MenuItem } from "@/types"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useLanguage } from "@/hooks/use-language"
import dynamic from "next/dynamic"

// Import LocationPicker dynamically to avoid SSR issues
const LocationPicker = dynamic(
  () => import("@/components/location-picker").then((mod) => mod.LocationPicker),
  { ssr: false, loading: () => (
    <div className="h-[400px] w-full bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded-2xl flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
    </div>
  )}
)


export function CartPage({ 
  restaurantId, 
  slug, 
  customDomain,
  onClose,
  onOrderPlaced,
  isOrderingEnabled = true,
  isTelegramWebApp,
  telegramUrl,
  primaryColor,
  enableManualTableSelection = true,
  isTableFromQR = false
}: { 
  restaurantId?: string, 
  slug?: string,
  customDomain?: string,
  onClose?: () => void,
  onOrderPlaced?: (orderId: string) => void,
  isOrderingEnabled?: boolean,
  isTelegramWebApp?: boolean,
  telegramUrl?: string,
  primaryColor?: string,
  enableManualTableSelection?: boolean,
  isTableFromQR?: boolean
}) {
  const cartRouter = useRouter()
  const { items, getTotalPrice, clearCart } = useCart()
  const [orderType, setOrderType] = useState<"table" | "delivery">("table")
  const [tableNumber, setTableNumber] = useState<number | null>(null)
  const [roomNumber, setRoomNumber] = useState<number | null>(null)
  const [orderIdToUpdate, setOrderIdToUpdate] = useState<string | null>(null)

  // Use a localized message if ordering is disabled
  const { t, language } = useLanguage()

    const isWebAndTgEnabled = !isTelegramWebApp && telegramUrl;
  
    if (!isOrderingEnabled) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] h-full p-8 text-center space-y-8 max-w-sm mx-auto">
          <div className="relative">
            <motion.div 
              animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute inset--4 bg-orange-400/20 rounded-full blur-2xl" 
            />
            <div className="w-28 h-28 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-zinc-800 dark:to-zinc-900 rounded-[36px] flex items-center justify-center text-orange-600 shadow-2xl relative ring-1 ring-orange-200/50 dark:ring-white/10">
              <ShoppingCart className="w-14 h-14" />
              <div className="absolute -top-2 -right-2 p-1.5 bg-white dark:bg-zinc-800 rounded-full shadow-lg border-2 border-orange-50">
                  <Ban className="w-7 h-7 text-red-500" />
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <h2 className="text-2xl font-black uppercase tracking-tight text-zinc-900 dark:text-white">
              {language === 'uz' ? "Buyurtmalar to'xtatilgan" : language === 'ru' ? "Заказы приостановлены" : "Ordering Disabled"}
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium leading-relaxed">
              {isWebAndTgEnabled 
                ? (language === 'uz' ? "Siz veb-sayt orqali buyurtma bera olmaysiz. Iltimos, bizning Telegram botimizdan foydalaning." 
                  : language === 'ru' ? "Вы не можете заказать через сайт. Пожалуйста, используйте наш Telegram бот."
                  : "Ordering is not available via the website. Please use our Telegram bot.")
                : (language === 'uz' ? "Hozirda buyurtma qabul qilinmayapti. Iltimos, birozdan so'ng urinib ko'ring." 
                  : language === 'ru' ? "В данный moment заказы не принимаются. Пожалуйста, попробуйте позже."
                  : "We are currently not accepting orders. Please try again later.")
              }
            </p>
          </div>
  
          <div className="flex flex-col gap-3 w-full">
            {isWebAndTgEnabled && (
              <Button 
                onClick={() => {
                  let url = telegramUrl;
                  if (url && !url.startsWith('http')) {
                    url = `https://t.me/${url.startsWith('@') ? url.substring(1) : url}`;
                  }
                  if (typeof window !== "undefined" && url) {
                     window.open(url, "_blank");
                  }
                }}
                className="w-full h-14 rounded-2xl text-white font-black text-lg active:scale-95 transition-all shadow-xl shadow-sky-500/10 gap-3"
                style={{ backgroundColor: primaryColor || '#0ea5e9' }}
              >
                <MessageCircle className="w-6 h-6 fill-white/20" />
                {language === 'uz' ? "Botda buyurtma berish" : language === 'ru' ? "Заказать в боте" : "Order in Bot"}
              </Button>
            )}
            
            <Button 
                onClick={onClose} 
                variant="outline"
                className="w-full h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border-none text-zinc-900 dark:text-white font-bold text-lg active:scale-95 transition-all"
            >
              {language === 'uz' ? "Yopish" : language === 'ru' ? "Закрыть" : "Close"}
            </Button>
          </div>
        </div>
      )
    }

  const handleGetLocation = async () => {
    setIsLocating(true)
    
    // Check if Telegram WebApp is available
    if (typeof window !== "undefined" && (window as any).Telegram?.WebApp) {
      const webApp = (window as any).Telegram.WebApp
      
      if (webApp.requestLocation) {
        webApp.requestLocation(async (res: any) => {
          if (res.location) {
            const { latitude, longitude } = res.location
            setLatitude(latitude)
            setLongitude(longitude)
            await reverseGeocode(latitude, longitude)
          } else {
            // Fallback to browser geolocation if TG permission denied
            browserGeolocation()
          }
          setIsLocating(false)
        })
        return
      }
    }
    
    // Browser fallback
    browserGeolocation()
  }

  const browserGeolocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Xatolik", description: "Geolokatsiya qurilmangizda mavjud emas", variant: "destructive" })
      setIsLocating(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        setLatitude(latitude)
        setLongitude(longitude)
        await reverseGeocode(latitude, longitude)
        setIsLocating(false)
      },
      (err) => {
        console.error("Geolocation error:", err)
        toast({ title: "Xatolik", description: "Joylashuvni aniqlash imkoni bo'lmadi", variant: "destructive" })
        setIsLocating(false)
      }
    )
  }

  const reverseGeocode = async (lat: number, lon: number) => {
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`)
      const data = await resp.json()
      if (data.display_name) {
        setAddress(data.display_name)
      }
    } catch (e) {
      console.error("Reverse geocoding error:", e)
    }
  }
  const [seatingType, setSeatingType] = useState<string | null>(null)
  const [phoneNumber, setPhoneNumber] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [address, setAddress] = useState("")
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [isLocating, setIsLocating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isMapOpen, setIsMapOpen] = useState(false)
  const [hasAvailableSeatingItems, setHasAvailableSeatingItems] = useState(true)
  const [isDeliveryAvailable, setIsDeliveryAvailable] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [deliveryFee, setDeliveryFee] = useState(15000)
  const [showDeliveryFee, setShowDeliveryFee] = useState(true)
  const [containerCost, setContainerCost] = useState(0)
  const [menuItems, setMenuItems] = useState<Record<string, MenuItem>>({})
  const [seatingTypes, setSeatingTypes] = useState<string[]>([])
  const { toast } = useToast()

  // Device ID and blocking states
  const [deviceId, setDeviceId] = useState<string>("")
  const [isPhoneBlocked, setIsPhoneBlocked] = useState(false)
  const [isDeviceBlocked, setIsDeviceBlocked] = useState(false)
  const [phoneBlockInfo, setPhoneBlockInfo] = useState<any>(null)
  const [deviceBlockInfo, setDeviceBlockInfo] = useState<any>(null)
  const [isCheckingBlocks, setIsCheckingBlocks] = useState(false)



  // Calculate home URL
  const homeUrl = useMemo(() => {
    if (typeof window === "undefined") return "/"
    const host = window.location.host.split(':')[0].toLowerCase()
    
    // If we are on the custom domain, home is root
    if (customDomain && host === customDomain.toLowerCase()) {
      return "/"
    }
    
    // If we have a slug, and we're on the main domain, home is /[slug]
    if (slug) {
      return `/${slug}`
    }
    
    return "/"
  }, [slug, customDomain])

  const [validationErrors, setValidationErrors] = useState<{
    tableOrRoom?: boolean
    phoneNumber?: boolean
    customerName?: boolean
    address?: boolean
  }>({})

  const [waiterId, setWaiterId] = useState<string | null>(null)
  const [waiterName, setWaiterName] = useState<string | null>(null)
  const [orderData, setOrderData] = useState<any>({})
  const [selectedTable, setSelectedTable] = useState<number | null>(null)
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null)
  const [selectedTableType, setSelectedTableType] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<string>("cash")
  const [notes, setNotes] = useState<string>("")
  const [isUserRecentlyUsed, setIsUserRecentlyUsed] = useState<boolean>(false)

  // Initialize device ID on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const currentDeviceId = getDeviceId()
      setDeviceId(currentDeviceId)
    }
  }, [])

  // Check Telegram WebApp user
  useEffect(() => {
    const checkTelegramUser = async () => {
      try {
        if (typeof window !== "undefined" && (window as any).Telegram?.WebApp) {
          const webApp = (window as any).Telegram.WebApp;
          if (webApp.initDataUnsafe?.user) {
            const user = webApp.initDataUnsafe.user;
            const q = query(
              collection(db, "telegram_users"),
              where("telegramId", "==", user.id)
            );
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
              const data = snapshot.docs[0].data();
              if (data.phone && !phoneNumber) setPhoneNumber(data.phone);
              if (data.firstName && !customerName) setCustomerName(data.firstName);
              if (data.username || user.username) {
                localStorage.setItem("telegramUsername", data.username || user.username || "");
              }
            } else if (user.first_name) {
              // If no DB record but we have TG info, use it
              if (!customerName) setCustomerName(user.first_name);
            }
          }
        }
      } catch (e) {
        console.error("Error fetching telegram user in cart", e);
      }
    };
    
    const timer = setTimeout(checkTelegramUser, 500);
    return () => clearTimeout(timer);
  }, []);

  // No longer checking for active orders — every new order is always fresh
  useEffect(() => {
    // placeholder — kept to satisfy linting of phoneNumber/deviceId deps if needed
  }, [phoneNumber, deviceId, restaurantId])

  // Check for blocks when phone number or device ID changes
  useEffect(() => {
    const checkBlocks = async () => {
      if (!deviceId) return

      setIsCheckingBlocks(true)
      try {
        // Check phone-based blocks
        if (phoneNumber && phoneNumber.length >= 9) {
          const phoneBlockQuery = query(
            collection(db, "blockedUsers"),
            where("customerPhone", "==", phoneNumber),
            where("unblocked", "==", false),
          )
          const phoneBlockSnapshot = await getDocs(phoneBlockQuery)

          if (!phoneBlockSnapshot.empty) {
            const blockData = phoneBlockSnapshot.docs[0].data()
            const autoUnblockAt = blockData.autoUnblockAt?.toDate()
            if (autoUnblockAt && new Date() > autoUnblockAt) {
              setIsPhoneBlocked(false)
              setPhoneBlockInfo(null)
            } else {
              setIsPhoneBlocked(true)
              setPhoneBlockInfo(blockData)
            }
          } else {
            setIsPhoneBlocked(false)
            setPhoneBlockInfo(null)
          }
        } else {
          setIsPhoneBlocked(false)
          setPhoneBlockInfo(null)
        }

        // Check device-based blocks
        const deviceBlockQuery = query(
          collection(db, "blockedDevices"),
          where("deviceId", "==", deviceId),
          where("unblocked", "==", false),
        )
        const deviceBlockSnapshot = await getDocs(deviceBlockQuery)

        if (!deviceBlockSnapshot.empty) {
          const deviceBlock = deviceBlockSnapshot.docs[0].data()
          const autoUnblockAt = deviceBlock.autoUnblockAt?.toDate()
          if (autoUnblockAt && new Date() > autoUnblockAt) {
            setIsDeviceBlocked(false)
            setDeviceBlockInfo(null)
          } else {
            setIsDeviceBlocked(true)
            setDeviceBlockInfo(deviceBlock)
          }
        } else {
          setIsDeviceBlocked(false)
          setDeviceBlockInfo(null)
        }
      } catch (error) {
        console.error("Error checking blocks:", error)
      } finally {
        setIsCheckingBlocks(false)
      }
    }

    const debounce = setTimeout(checkBlocks, 500)
    return () => clearTimeout(debounce)
  }, [phoneNumber, deviceId])

  // Check if there's a recent order and set the table/room automatically
  useEffect(() => {
    if (!deviceId) return

    try {
      const lastOrderInfoStr = localStorage.getItem("lastOrderInfo")
      if (lastOrderInfoStr) {
        const lastOrderInfo = JSON.parse(lastOrderInfoStr)

        // Check device ID match
        if (lastOrderInfo.deviceId && lastOrderInfo.deviceId !== deviceId) {
          // Different device, clear the stored info
          localStorage.removeItem("lastOrderInfo")
          return
        }

        const lastOrderTime = new Date(lastOrderInfo.timestamp)
        const currentTime = new Date()
        // Calculate the difference in minutes
        const diffInMinutes = (currentTime.getTime() - lastOrderTime.getTime()) / (1000 * 60)
        // If the last order was within 20 minutes, automatically select that table/room
        if (diffInMinutes <= 20) {
          if (lastOrderInfo.tableNumber) {
            setTableNumber(lastOrderInfo.tableNumber)
            setSeatingType(lastOrderInfo.seatingType || "Stol")
            // Also set the waiterId if it exists in the lastOrderInfo
            if (lastOrderInfo.waiterId) {
              setWaiterId(lastOrderInfo.waiterId)
              if (lastOrderInfo.waiterName) {
                setWaiterName(lastOrderInfo.waiterName)
              } else {
                // If we have waiterId but no waiterName, try to get it
                getDoc(doc(db, "users", lastOrderInfo.waiterId))
                  .then((waiterDoc) => {
                    if (waiterDoc.exists()) {
                      const waiterData = waiterDoc.data()
                      setWaiterName(waiterData.name)
                      // Update lastOrderInfo with the waiter name
                      lastOrderInfo.waiterName = waiterData.name
                      localStorage.setItem("lastOrderInfo", JSON.stringify(lastOrderInfo))
                    }
                  })
                  .catch((error) => {
                    console.error("Error getting waiter name:", error)
                  })
              }
            }
            toast({
              title: "Joy avtomatik tanlandi",
              description: `Oxirgi buyurtmangiz asosida ${lastOrderInfo.tableNumber}-${lastOrderInfo.seatingType || "Stol"} avtomatik tanlandi.`,
            })
          } else if (lastOrderInfo.roomNumber) {
            setRoomNumber(lastOrderInfo.roomNumber)
            setSeatingType("Xona")
            // Also set the waiterId if it exists in the lastOrderInfo
            if (lastOrderInfo.waiterId) {
              setWaiterId(lastOrderInfo.waiterId)
              if (lastOrderInfo.waiterName) {
                setWaiterName(lastOrderInfo.waiterName)
              } else {
                // If we have waiterId but no waiterName, try to get it
                getDoc(doc(db, "users", lastOrderInfo.waiterId))
                  .then((waiterDoc) => {
                    if (waiterDoc.exists()) {
                      const waiterData = waiterDoc.data()
                      setWaiterName(waiterData.name)
                      // Update lastOrderInfo with the waiter name
                      lastOrderInfo.waiterName = waiterData.name
                      localStorage.setItem("lastOrderInfo", JSON.stringify(lastOrderInfo))
                    }
                  })
                  .catch((error) => {
                    console.error("Error getting waiter name:", error)
                  })
              }
            }
            toast({
              title: "Xona avtomatik tanlandi",
              description: `Oxirgi buyurtmangiz asosida ${lastOrderInfo.roomNumber}-Xona avtomatik tanlandi.`,
            })
          }
        }
      }
    } catch (error) {
      console.error("Error checking last order info:", error)
    }
  }, [toast, deviceId])

  // Check if there are available seating items and if delivery is available
  useEffect(() => {
    setIsLoading(true)
    // Initialize empty unsubscribe functions
    let seatingItemsUnsubscribe = () => {}
    let settingsUnsubscribe = () => {}
    let menuItemsUnsubscribe = () => {}
    let seatingTypesUnsubscribe = () => {}

    try {
      // Fetch seating types
      const seatingTypesRef = restaurantId ? collection(db, "restaurants", restaurantId, "seatingTypes") : collection(db, "seatingTypes");
      seatingTypesUnsubscribe = onSnapshot(
        seatingTypesRef,
        (snapshot) => {
          const types: string[] = []
          snapshot.forEach((doc) => {
            const typeData = doc.data()
            if (typeData.name) {
              types.push(typeData.name)
            }
          })
          setSeatingTypes(types)
        },
        (error) => {
          console.error("Error fetching seating types:", error)
        },
      )

      // Check for available seating items
      const seatingItemsRef = restaurantId ? collection(db, "restaurants", restaurantId, "seatingItems") : collection(db, "seatingItems");
      seatingItemsUnsubscribe = onSnapshot(
        query(seatingItemsRef, where("status", "==", "available")),
        (snapshot) => {
          setHasAvailableSeatingItems(!snapshot.empty)
          // If no available seating items, default to delivery if it's available
          if (snapshot.empty && isDeliveryAvailable) {
            setOrderType("delivery")
          }
          setIsLoading(false)
        },
        (error) => {
          console.error("Error checking available seating items:", error)
          setHasAvailableSeatingItems(false)
          if (isDeliveryAvailable) {
            setOrderType("delivery")
          }
          setIsLoading(false)
        },
      )

      // Check if delivery is available from settings and get delivery fee
      const settingsRef = restaurantId
      ? doc(db, "restaurants", restaurantId)
      : doc(db, "settings", "orderSettings");
      settingsUnsubscribe = onSnapshot(
        settingsRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data()
            setIsDeliveryAvailable(data.deliveryAvailable !== false)
            setDeliveryFee(data.deliveryFee || 15000)
            setShowDeliveryFee(data.showDeliveryFeeInMessage !== false)
            // If delivery is not available and there are no available seating items, show warning
            if (data.deliveryAvailable === false && !hasAvailableSeatingItems) {
              toast({
                title: "Buyurtma berish imkoni yo'q",
                description: "Hozirda na joylar, na yetkazib berish xizmati mavjud emas.",
                variant: "destructive",
              })
            }
            // If delivery is not available and current order type is delivery, switch to table
            if (data.deliveryAvailable === false && orderType === "delivery" && hasAvailableSeatingItems) {
              setOrderType("table")
            }
          }
          setIsLoading(false)
        },
        (error) => {
          console.error("Error checking delivery availability:", error)
          setIsDeliveryAvailable(true)
          setIsLoading(false)
        },
      )

      // Get all menu items to access their container prices
      const menuItemsCollectionRef = restaurantId ? collection(db, "restaurants", restaurantId, "menuItems") : collection(db, "menuItems");
      menuItemsUnsubscribe = onSnapshot(
        menuItemsCollectionRef,
        (snapshot) => {
          const menuItemsData: Record<string, MenuItem> = {}
          snapshot.forEach((doc) => {
            menuItemsData[doc.id] = { id: doc.id, ...doc.data() } as MenuItem
          })
          setMenuItems(menuItemsData)
        },
        (error) => {
          console.error("Error fetching menu items:", error)
        },
      )
    } catch (error) {
      console.error("Error setting up listeners:", error)
      setIsLoading(false)
    }

    return () => {
      try {
        // Safely unsubscribe
        if (typeof seatingItemsUnsubscribe === "function") {
          seatingItemsUnsubscribe()
        }
        if (typeof settingsUnsubscribe === "function") {
          settingsUnsubscribe()
        }
        if (typeof menuItemsUnsubscribe === "function") {
          menuItemsUnsubscribe()
        }
        if (typeof seatingTypesUnsubscribe === "function") {
          seatingTypesUnsubscribe()
        }
      } catch (error) {
        console.error("Error unsubscribing:", error)
      }
    }
  }, [toast, orderType, hasAvailableSeatingItems, isDeliveryAvailable])

  // Calculate container costs based on items
  useEffect(() => {
    if (orderType === "delivery") {
      // Calculate container cost based on items that need containers
      let calculatedContainerCost = 0
      for (const item of items) {
        // Get the latest menu item data from Firestore
        const productId = item.productId || (item.id.includes("-") ? item.id.split("-")[0] : item.id)
        const menuItem = menuItems[productId]
        if (menuItem && menuItem.needsContainer) {
          calculatedContainerCost += item.quantity * (menuItem.containerPrice || 2000)
        }
      }
      setContainerCost(calculatedContainerCost)
    } else {
      setContainerCost(0)
    }
  }, [items, orderType, menuItems])

  // Handle table or room selection
  const handleSelectTableOrRoom = (
    table: number | null,
    room: number | null,
    type: string | null = null,
    waiterId: string | null = null,
    userRecentlyUsed = false,
    waiterName: string | null = null,
  ) => {
    setTableNumber(table)
    setRoomNumber(room)
    setSeatingType(type)
    setWaiterId(waiterId)
    setWaiterName(waiterName)
    setIsUserRecentlyUsed(userRecentlyUsed)
    // If we have a waiterId but no waiterName, try to get it
    if (waiterId && !waiterName) {
      getDoc(doc(db, "users", waiterId))
        .then((waiterDoc) => {
          if (waiterDoc.exists()) {
            const waiterData = waiterDoc.data()
            setWaiterName(waiterData.name)
            // Update lastOrderInfo with the waiter name if it exists
            const lastOrderInfoStr = localStorage.getItem("lastOrderInfo")
            if (lastOrderInfoStr) {
              const lastOrderInfo = JSON.parse(lastOrderInfoStr)
              if ((table && lastOrderInfo.tableNumber === table) || (room && lastOrderInfo.roomNumber === room)) {
                lastOrderInfo.waiterName = waiterData.name
                localStorage.setItem("lastOrderInfo", JSON.stringify(lastOrderInfo))
              }
            }
          }
        })
        .catch((error) => {
          console.error("Error getting waiter name:", error)
        })
    }
    console.log("Selected waiterId:", waiterId, "Waiter name:", waiterName, "User recently used:", userRecentlyUsed)
  }



  // Create new order
  const createNewOrder = async (preloadedAudio?: HTMLAudioElement) => {
    setIsSubmitting(true)
    try {
      // Check if items have enough servings
      for (const item of items) {
        try {
          const productId = item.productId || (item.id.includes("-") ? item.id.split("-")[0] : item.id)
          const menuItemRef = restaurantId 
            ? doc(db, "restaurants", restaurantId, "menuItems", productId) 
            : doc(db, "menuItems", productId)
          const menuItemSnap = await getDoc(menuItemRef)
          if (menuItemSnap.exists()) {
            const menuItemData = menuItemSnap.data() as MenuItem
            const remainingServings = menuItemData.remainingServings || menuItemData.servesCount
            if (remainingServings < item.quantity) {
              toast({
                title: "Yetarli porsiya yo'q",
                description: `Kechirasiz, ${item.name} taomidan faqat ${remainingServings} porsiya qolgan.`,
                variant: "destructive",
              })
              setIsSubmitting(false)
              return
            }
          }
        } catch (error) {
          console.error("Error checking servings:", error)
        }
      }

      // 🔹 JIT Waiter Lookup (Just-In-Time)
      let currentWaiterId = waiterId;
      let currentWaiterName = waiterName;

      if (orderType === "table" && (tableNumber || roomNumber)) {
        try {
          const seatingCollection = restaurantId ? collection(db, "restaurants", restaurantId, "seatingItems") : collection(db, "seatingItems");
          const q = query(
            seatingCollection,
            where(roomNumber ? "roomNumber" : "number", "==", Number(roomNumber || tableNumber))
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            const data = snap.docs[0].data();
            if (data.waiterId) {
              currentWaiterId = data.waiterId;
              if (data.waiterName) currentWaiterName = data.waiterName;
              
              setWaiterId(data.waiterId);
              if (data.waiterName) setWaiterName(data.waiterName);
            }
          }
        } catch (e) {
          console.error("JIT Waiter Lookup Error:", e);
        }
      }

      // If seating item is selected, mark it as occupied
      let success = true
      if (orderType === "table" && !isUserRecentlyUsed) {
        if (roomNumber) {
          success = await markSeatingItemAsOccupied(roomNumber, "Xona")
        } else if (tableNumber && seatingType) {
          success = await markSeatingItemAsOccupied(tableNumber, seatingType)
        }
        if (!success) {
          toast({
            title: "Xatolik",
            description: "Joy statusini yangilashda xatolik yuz berdi.",
            variant: "destructive",
          })
          setIsSubmitting(false)
          return
        }
      }

      // Prepare order data with updated container information
      const subtotal = getTotalPrice()
      const effectiveDeliveryFee = showDeliveryFee ? deliveryFee : 0
      const totalWithDelivery = orderType === "delivery" ? subtotal + effectiveDeliveryFee + containerCost : subtotal

      // Map items with their current container information from the database
      const orderItems = items.map((item) => {
        const productId = item.productId || (item.id.includes("-") ? item.id.split("-")[0] : item.id)
        const menuItem = menuItems[productId]
        return {
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          needsContainer: menuItem?.needsContainer || false,
          containerPrice: menuItem?.containerPrice || 0,
          category: menuItem?.category || "Kategoriyasiz",
          categoryId: menuItem?.categoryId || null,
          aliposId: item.aliposId || null,
        }
      })

      // Get user signature for tracking orders
      let userSignature = localStorage.getItem("userSignature")
      if (!userSignature) {
        userSignature = Math.random().toString(36).substring(2, 15)
        localStorage.setItem("userSignature", userSignature)
      }

      const tm_username = localStorage.getItem("telegramUsername")

      let tgId = null
      let tgChatId = null
      if (typeof window !== "undefined" && (window as any).Telegram?.WebApp) {
        const webApp = (window as any).Telegram.WebApp
        if (webApp.initDataUnsafe?.user) {
          tgId = webApp.initDataUnsafe.user.id
          tgChatId = webApp.initDataUnsafe.user.id 
        }
      }

      const orderData: any = {
        orderType,
        tableNumber: orderType === "table" && tableNumber ? tableNumber : null,
        roomNumber: orderType === "table" && roomNumber ? roomNumber : null,
        seatingType: orderType === "table" ? seatingType : null,
        phoneNumber: phoneNumber || null,
        customerName: customerName || null,
        address: orderType === "delivery" ? address : null,
        items: orderItems,
        subtotal: subtotal,
        paymentMethod: paymentMethod,
        deliveryFee: orderType === "delivery" ? (showDeliveryFee ? deliveryFee : 0) : 0,
        containerCost: orderType === "delivery" ? containerCost : 0,
        total: totalWithDelivery,
        status: "pending",
        createdAt: serverTimestamp(),
        userSignature: userSignature,
        deviceId: deviceId,
        telegramUsername: tm_username || null,
        telegramId: tgId,
        chatId: tgChatId,
        ...(latitude && longitude ? { latitude, longitude, location: { latitude, longitude } } : {}),
        ...(currentWaiterId ? { waiterId: currentWaiterId } : {}),
        ...(currentWaiterName ? { waiterName: currentWaiterName } : {}),
      }

      const ordersRef = restaurantId ? collection(db, "restaurants", restaurantId, "orders") : collection(db, "orders");
      
      const finalOrderData = {
        ...orderData,
        createdAt: serverTimestamp(),
      }
      
      if (restaurantId) {
        (finalOrderData as any).restaurantId = restaurantId
      }

      const docRef = await addDoc(ordersRef, finalOrderData)

      // Send telegram notification about new order
      try {
        fetch("/api/orders/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            orderId: docRef.id, 
            restaurantId, 
            waiterId: currentWaiterId, 
            waiterName: currentWaiterName 
          }),
        }).catch(err => console.error("Notification trigger error", err));
      } catch (err) {
        console.error("Failed to send order notification", err)
      }

      // Store last order info
      if (orderType === "table") {
        const lastOrderInfo = {
          tableNumber: tableNumber,
          roomNumber: roomNumber,
          seatingType: seatingType,
          waiterId: waiterId,
          waiterName: waiterName,
          deviceId: deviceId,
          timestamp: new Date().toISOString(),
        }
        localStorage.setItem("lastOrderInfo", JSON.stringify(lastOrderInfo))
      }

      // Update remaining servings for each item
      for (const item of items) {
        try {
          const productId = item.productId || (item.id.includes("-") ? item.id.split("-")[0] : item.id)
          const menuItemRef = restaurantId 
            ? doc(db, "restaurants", restaurantId, "menuItems", productId) 
            : doc(db, "menuItems", productId)
          const menuItemSnap = await getDoc(menuItemRef)
          if (menuItemSnap.exists()) {
            const menuItemData = menuItemSnap.data() as MenuItem
            const remainingServings = (menuItemData.remainingServings || menuItemData.servesCount) - item.quantity
            await updateDoc(menuItemRef, {
              remainingServings: remainingServings > 0 ? remainingServings : 0,
            })
          }
        } catch (error) {
          console.error(`Error updating item ${item.id}:`, error)
        }
      }

      if (preloadedAudio) {
        preloadedAudio.play().catch((e) => console.error("Error playing sound:", e))
      }

      toast({
        title: "Buyurtma qabul qilindi!",
        description: "Sizning buyurtmangiz muvaffaqiyatli qabul qilindi.",
      })

      clearCart()
      
      if (onOrderPlaced) {
        onOrderPlaced(docRef.id)
      } else {
        const redirectUrl = `/confirmation?orderId=${docRef.id}${restaurantId ? `&restaurantId=${restaurantId}` : ""}`
        cartRouter.push(redirectUrl)
        setTimeout(() => {
          if (typeof window !== 'undefined' && window.location.pathname !== '/confirmation' && !onOrderPlaced) {
             window.location.href = redirectUrl
          }
        }, 2000)
      }
    } catch (error: any) {
      console.error("Error creating order:", error)
      toast({
        title: "Xatolik",
        description: "Buyurtmani joylashtirishda xatolik yuz berdi.",
        variant: "destructive",
      })
      setIsSubmitting(false)
    }
  }

  // Main order handler
  const handlePlaceOrder = async () => {
    // Check if user is blocked
    if (isPhoneBlocked || isDeviceBlocked) {
      toast({
        title: "Buyurtma berish mumkin emas",
        description:
          isPhoneBlocked && isDeviceBlocked
            ? "Sizning telefon raqamingiz va qurilmangiz bloklangan."
            : isPhoneBlocked
              ? "Sizning telefon raqamingiz bloklangan."
              : "Sizning qurilmangiz bloklangan.",
        variant: "destructive",
      })
      return
    }

    // Reset validation errors
    setValidationErrors({})
    const newValidationErrors: {
      tableOrRoom?: boolean
      phoneNumber?: boolean
      customerName?: boolean
      address?: boolean
    } = {}
    let hasErrors = false

    if (items.length === 0) {
      toast({
        title: "Bo'sh savat",
        description: "Iltimos, buyurtma berish uchun savatingizga taomlar qo'shing.",
        variant: "destructive",
      })
      return
    }

    if (!customerName) {
      newValidationErrors.customerName = true
      hasErrors = true
    }

    if (!phoneNumber) {
      newValidationErrors.phoneNumber = true
      hasErrors = true
    }

    if (orderType === "table" && !tableNumber && !roomNumber) {
      newValidationErrors.tableOrRoom = true
      hasErrors = true
    }

    if (orderType === "delivery") {
      if (!address) {
        newValidationErrors.address = true
        hasErrors = true
      }
    }

    // Update validation errors state
    setValidationErrors(newValidationErrors)

    if (hasErrors) {
      toast({
        title: "To'ldirilmagan maydonlar",
        description: "Iltimos, barcha majburiy maydonlarni to'ldiring.",
        variant: "destructive",
      })
      return
    }

    // Always create a new order — never merge with existing ones
    // Preload audio in user gesture context so play() is allowed by the browser
    const preloadedAudio = new Audio("/success.mp3")
    setIsSubmitting(true)
    try {
      await createNewOrder(preloadedAudio)
    } catch (e) {
      console.error("Place order handler error:", e)
      setIsSubmitting(false)
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24,
      },
    },
  }

  // Function to mark a seating item as occupied
  const markSeatingItemAsOccupied = async (itemNumber: number, itemType: string): Promise<boolean> => {
    try {
      // Check if this is a recently used item by the user (within 30 minutes)
      const lastOrderInfoStr = localStorage.getItem("lastOrderInfo")
      if (lastOrderInfoStr) {
        const lastOrderInfo = JSON.parse(lastOrderInfoStr)

        // Check device ID match
        if (lastOrderInfo.deviceId !== deviceId) {
          // Different device, don't allow reuse
          return false
        }

        const lastOrderTime = new Date(lastOrderInfo.timestamp)
        const currentTime = new Date()
        const diffInMinutes = (currentTime.getTime() - lastOrderTime.getTime()) / (1000 * 60)

        // If this is the same table/room as the recent order and within 30 minutes
        if (
          diffInMinutes <= 30 &&
          ((itemType.toLowerCase() === "xona" && lastOrderInfo.roomNumber === itemNumber) ||
            (itemType.toLowerCase() !== "xona" && lastOrderInfo.tableNumber === itemNumber))
        ) {
          console.log("Using recently used item:", itemType, itemNumber)
          return true
        }
      }

      const seatingItemsRef = restaurantId ? collection(db, "restaurants", restaurantId, "seatingItems") : collection(db, "seatingItems");
      // First try to find the item with exact type match
      const seatingItemsQuery = query(seatingItemsRef, where("number", "==", itemNumber))
      const seatingItemsSnapshot = await getDocs(seatingItemsQuery)

      // Find the item with matching type (case-insensitive)
      const matchingDocs = seatingItemsSnapshot.docs.filter((doc) => {
        const data = doc.data()
        return data.type && data.type.toLowerCase() === itemType.toLowerCase()
      })

      if (matchingDocs.length > 0) {
        const itemRef = restaurantId 
          ? doc(db, "restaurants", restaurantId, "seatingItems", matchingDocs[0].id) 
          : doc(db, "seatingItems", matchingDocs[0].id)
        const itemData = matchingDocs[0].data()

        // Store the waiterId if available
        if (itemData.waiterId) {
          setWaiterId(itemData.waiterId)
          // Get waiter name
          try {
            const waiterDoc = await getDoc(doc(db, "users", itemData.waiterId))
            if (waiterDoc.exists()) {
              const waiterData = waiterDoc.data()
              setWaiterName(waiterData.name)
            }
          } catch (error) {
            console.error("Error getting waiter name:", error)
          }
        }

        await updateDoc(itemRef, {
          status: "occupied",
          updatedAt: new Date(),
        })
        return true
      }

      console.error(`${itemType} #${itemNumber} not found or not available`)
      toast({
        title: "Xatolik",
        description: `Tanlangan ${itemType.toLowerCase()} topilmadi yoki band`,
        variant: "destructive",
      })
      return false
    } catch (error: any) {
      console.error("Error updating seating item status:", error)
      return false
    }
  }

  // Check if any ordering option is available
  const isOrderingAvailable = hasAvailableSeatingItems || isDeliveryAvailable
  const isBlocked = isPhoneBlocked || isDeviceBlocked

  return (
    <div className="container mx-auto max-w-4xl p-4">
      {!onClose && (
        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.3 }}>
          <Button variant="ghost" size="sm" className="mb-4" onClick={() => cartRouter.push(homeUrl)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Menyuga qaytish
          </Button>
        </motion.div>
      )}

      {!onClose && (
        <motion.h1
          className="mb-6 text-2xl font-bold"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          Sizning savatingiz
        </motion.h1>
      )}

      {/* Device ID Display */}
      {deviceId && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-4"
        >
          <Alert variant="default" className="bg-blue-50 border-blue-200">
            <Smartphone className="h-4 w-4" />
            <AlertTitle>Qurilma ID</AlertTitle>
            <AlertDescription className="text-xs font-mono break-all">{deviceId}</AlertDescription>
          </Alert>
        </motion.div>
      )}



      {/* Phone Block Warning */}
      {isPhoneBlocked && phoneBlockInfo && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-4"
        >
          <Alert variant="destructive">
            <Ban className="h-4 w-4" />
            <AlertTitle>Telefon raqamingiz bloklangan!</AlertTitle>
            <AlertDescription>
              <div className="space-y-1">
                <p>Sabab: {phoneBlockInfo.reason || "Adminning qaroriga ko'ra"}</p>
                {phoneBlockInfo.autoUnblockAt && (
                  <p className="text-sm">
                    Avtomatik ochilish: {new Date(phoneBlockInfo.autoUnblockAt.toDate()).toLocaleDateString("uz-UZ")}
                  </p>
                )}
              </div>
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      {/* Device Block Warning */}
      {isDeviceBlocked && deviceBlockInfo && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-4"
        >
          <Alert variant="destructive">
            <Smartphone className="h-4 w-4" />
            <AlertTitle>Qurilmangiz bloklangan!</AlertTitle>
            <AlertDescription>
              <div className="space-y-1">
                <p>Sabab: {deviceBlockInfo.reason || "Adminning qaroriga ko'ra"}</p>
                {deviceBlockInfo.autoUnblockAt && (
                  <p className="text-sm">
                    Avtomatik ochilish: {new Date(deviceBlockInfo.autoUnblockAt.toDate()).toLocaleDateString("uz-UZ")}
                  </p>
                )}
              </div>
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      {!isOrderingAvailable && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Buyurtma berish imkoni yo'q</AlertTitle>
          <AlertDescription>
            Hozirda na joylar, na yetkazib berish xizmati mavjud emas. Iltimos, keyinroq qayta urinib ko'ring.
          </AlertDescription>
        </Alert>
      )}

      {items.length === 0 ? (
        <motion.div
          className="rounded-lg border border-dashed p-8 text-center"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <ShoppingCart className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="mb-4 text-muted-foreground">Sizning savatingiz bo'sh</p>
          <Button onClick={() => cartRouter.push(homeUrl)}>Menyuni ko'rish</Button>
        </motion.div>
      ) : (
        <div className="grid gap-6 md:grid-cols-5">
          <div className="md:col-span-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Buyurtma elementlari</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    // Play delete sound
                    const audio = new Audio("/click.mp3")
                    audio.play().catch((e) => console.error("Error playing sound:", e))
                    clearCart()
                  }}
                  disabled={isBlocked}
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  Tozalash
                </Button>
              </CardHeader>
              <CardContent>
                <AnimatePresence>
                  <motion.div className="space-y-3" variants={containerVariants} initial="hidden" animate="visible">
                    {items.map((item) => (
                      <motion.div key={item.id} variants={itemVariants}>
                        <CartItem item={item} />
                      </motion.div>
                    ))}
                  </motion.div>
                </AnimatePresence>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Buyurtma ma'lumotlari</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex h-40 items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <Tabs
                      defaultValue={hasAvailableSeatingItems ? "table" : "delivery"}
                      value={orderType}
                      onValueChange={(value) => setOrderType(value as "table" | "delivery")}
                    >
                      <TabsList className="mb-4 grid w-full grid-cols-2">
                        <TabsTrigger
                          value="table"
                          disabled={(!hasAvailableSeatingItems && !isUserRecentlyUsed) || isBlocked}
                        >
                          Joy buyurtmasi
                        </TabsTrigger>
                        <TabsTrigger value="delivery" disabled={!isDeliveryAvailable || isBlocked}>
                          Yetkazib berish
                        </TabsTrigger>
                      </TabsList>

                      {/* Table selection tab content */}
                      <TabsContent value="table" className="space-y-4">
                        {!hasAvailableSeatingItems && !(tableNumber || roomNumber) ? (
                          <Alert variant="destructive" className="mb-4">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Bo'sh joylar mavjud emas</AlertTitle>
                            <AlertDescription>
                              Hozirda bo'sh joylar mavjud emas. Iltimos, yetkazib berish xizmatidan foydalaning.
                            </AlertDescription>
                          </Alert>
                        ) : (
                          <>
                            <div>
                              <Label
                                htmlFor="table-number"
                                className={validationErrors.tableOrRoom ? "text-destructive" : ""}
                              >
                                Joy tanlash
                                {validationErrors.tableOrRoom && <span className="ml-1 text-destructive">*</span>}
                              </Label>
                              <div className="mt-1">
                                {(isTableFromQR || (!enableManualTableSelection && (tableNumber || roomNumber))) ? (
                                  <Alert className="bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/30">
                                    <MapPin className="h-4 w-4 text-emerald-600" />
                                    <AlertTitle className="text-emerald-800 dark:text-emerald-400 font-bold">
                                      Stol tasdiqlandi: #{tableNumber || roomNumber}
                                    </AlertTitle>
                                    <AlertDescription className="text-emerald-700/80 dark:text-emerald-500/80 text-xs">
                                      {isTableFromQR ? "QR-kod orqali aniqlandi." : "Stol tanlangan."} Stolni o'zgartirib bo'lmaydi.
                                    </AlertDescription>
                                  </Alert>
                                ) : enableManualTableSelection ? (
                                  <TableSelector
                                    selectedTable={tableNumber}
                                    selectedRoom={roomNumber}
                                    onSelectTable={handleSelectTableOrRoom}
                                    hasError={validationErrors.tableOrRoom}
                                  />
                                ) : (
                                  <Alert variant="destructive" className="bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/30">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Stol tanlash imkoniyati yo'q</AlertTitle>
                                    <AlertDescription className="text-xs">
                                      Iltimos, buyurtma berish uchun stolingizdagi QR-kodni skanerlang.
                                    </AlertDescription>
                                  </Alert>
                                )}
                              </div>
                              {validationErrors.tableOrRoom && !isTableFromQR && enableManualTableSelection && (
                                <p className="mt-1 text-xs text-destructive">Iltimos, joy tanlang</p>
                              )}
                            </div>
                            <div className="space-y-4">
                              <div>
                                <Label 
                                  htmlFor="customer-name"
                                  className={`required ${validationErrors.customerName ? "text-destructive" : ""}`}
                                >
                                  Ismingiz <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                  id="customer-name"
                                  placeholder="Ismingizni kiriting"
                                  value={customerName}
                                  onChange={(e) => setCustomerName(e.target.value)}
                                  className={`mt-1 ${validationErrors.customerName ? "border-destructive focus-visible:ring-destructive" : ""}`}
                                  disabled={isBlocked}
                                />
                                {validationErrors.customerName && (
                                  <p className="mt-1 text-xs text-destructive">Ism kiritilishi shart</p>
                                )}
                              </div>
                              <div>
                                <Label 
                                  htmlFor="phone-number"
                                  className={`required ${validationErrors.phoneNumber ? "text-destructive" : ""}`}
                                >
                                  Telefon raqami <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                  id="phone-number"
                                  type="tel"
                                  placeholder="+998 XX XXX XX XX"
                                  value={phoneNumber}
                                  onChange={(e) => setPhoneNumber(e.target.value)}
                                  className={`mt-1 ${validationErrors.phoneNumber ? "border-destructive focus-visible:ring-destructive" : ""}`}
                                  disabled={isBlocked}
                                />
                                {validationErrors.phoneNumber && (
                                  <p className="mt-1 text-xs text-destructive">Telefon raqami kiritilishi shart</p>
                                )}
                                {isCheckingBlocks && phoneNumber && (
                                  <p className="text-xs text-muted-foreground mt-1">Tekshirilmoqda...</p>
                                )}

                              </div>
                              
                              <div>
                                <Label className="mb-3 block text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                  To'lov turi
                                </Label>
                                <div className="grid grid-cols-2 gap-3">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setPaymentMethod("cash")}
                                    className={`flex flex-col items-center justify-center h-20 rounded-2xl border-2 transition-all active:scale-[0.98] ${
                                      paymentMethod === "cash" 
                                        ? "border-primary bg-primary/5 text-primary" 
                                        : "border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/50"
                                    }`}
                                  >
                                    <Banknote className={`mb-1 h-6 w-6 ${paymentMethod === "cash" ? "text-primary" : "text-emerald-500"}`} />
                                    <span className="font-black text-[10px] uppercase tracking-tight">Naqd</span>
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setPaymentMethod("card")}
                                    className={`flex flex-col items-center justify-center h-20 rounded-2xl border-2 transition-all active:scale-[0.98] ${
                                      paymentMethod === "card" 
                                        ? "border-primary bg-primary/5 text-primary" 
                                        : "border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/50"
                                    }`}
                                  >
                                    <CreditCard className={`mb-1 h-6 w-6 ${paymentMethod === "card" ? "text-primary" : "text-blue-500"}`} />
                                    <span className="font-black text-[10px] uppercase tracking-tight">Karta</span>
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </TabsContent>

                      {/* Delivery tab content */}
                      <TabsContent value="delivery" className="space-y-4">
                        {!isDeliveryAvailable ? (
                          <Alert variant="destructive" className="mb-4">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Yetkazib berish mavjud emas</AlertTitle>
                            <AlertDescription>
                              Hozirda yetkazib berish xizmati mavjud emas. Iltimos, joy buyurtmasidan foydalaning.
                            </AlertDescription>
                          </Alert>
                        ) : (
                          <div className="space-y-4">
                            <div>
                                <Label 
                                  htmlFor="delivery-name"
                                  className={`required ${validationErrors.customerName ? "text-destructive" : ""}`}
                                >
                                  Ismingiz <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                  id="delivery-name"
                                  placeholder="Ismingizni kiriting"
                                  value={customerName}
                                  onChange={(e) => setCustomerName(e.target.value)}
                                  className={`mt-1 ${validationErrors.customerName ? "border-destructive focus-visible:ring-destructive" : ""}`}
                                  disabled={isBlocked}
                                />
                                {validationErrors.customerName && (
                                  <p className="mt-1 text-xs text-destructive">Ism kiritilishi shart</p>
                                )}
                            </div>
                            <div>
                              <Label
                                htmlFor="delivery-phone"
                                className={`required ${validationErrors.phoneNumber ? "text-destructive" : ""}`}
                              >
                                Telefon raqami
                                <span className="ml-1 text-destructive">*</span>
                              </Label>
                              <Input
                                id="delivery-phone"
                                type="tel"
                                placeholder="+998 XX XXX XX XX"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                className={`mt-1 ${validationErrors.phoneNumber ? "border-destructive focus-visible:ring-destructive" : ""}`}
                                required
                                disabled={isBlocked}
                              />
                              {validationErrors.phoneNumber && (
                                <p className="mt-1 text-xs text-destructive">Telefon raqami kiritilishi shart</p>
                              )}
                              {isCheckingBlocks && phoneNumber && (
                                <p className="text-xs text-muted-foreground mt-1">Tekshirilmoqda...</p>
                              )}
                            </div>

                            <div>
                               <Label className="mb-3 block text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                 To'lov turi
                               </Label>
                               <div className="grid grid-cols-2 gap-3">
                                 <Button
                                   type="button"
                                   variant="outline"
                                   onClick={() => setPaymentMethod("cash")}
                                   className={`flex flex-col items-center justify-center h-20 rounded-2xl border-2 transition-all active:scale-[0.98] ${
                                     paymentMethod === "cash" 
                                       ? "border-primary bg-primary/5 text-primary" 
                                       : "border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/50"
                                   }`}
                                 >
                                   <Banknote className={`mb-1 h-6 w-6 ${paymentMethod === "cash" ? "text-primary" : "text-emerald-500"}`} />
                                   <span className="font-black text-[10px] uppercase tracking-tight">Naqd</span>
                                 </Button>
                                 <Button
                                   type="button"
                                   variant="outline"
                                   onClick={() => setPaymentMethod("card")}
                                   className={`flex flex-col items-center justify-center h-20 rounded-2xl border-2 transition-all active:scale-[0.98] ${
                                     paymentMethod === "card" 
                                       ? "border-primary bg-primary/5 text-primary" 
                                       : "border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/50"
                                   }`}
                                 >
                                   <CreditCard className={`mb-1 h-6 w-6 ${paymentMethod === "card" ? "text-primary" : "text-blue-500"}`} />
                                   <span className="font-black text-[10px] uppercase tracking-tight">Karta</span>
                                 </Button>
                               </div>
                             </div>
                            <div>
                              <Label
                                htmlFor="delivery-address"
                                className={`required ${validationErrors.address ? "text-destructive" : ""}`}
                              >
                                Yetkazib berish manzili
                                <span className="ml-1 text-destructive">*</span>
                              </Label>
                              
                              <div className="mt-2 space-y-3">
                                <div 
                                  onClick={() => !isBlocked && setIsMapOpen(true)}
                                  className={`relative group cursor-pointer overflow-hidden rounded-2xl border-2 transition-all hover:shadow-lg active:scale-[0.98] ${
                                    validationErrors.address 
                                      ? "border-destructive/30 bg-destructive/5" 
                                      : "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 hover:border-primary/30"
                                  }`}
                                >
                                  {/* Map Preview Background (Simplified) */}
                                  <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.07] pointer-events-none mix-blend-overlay"
                                    style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")" }} 
                                  />
                                  
                                  <div className="p-4 flex gap-4 items-start relative z-10">
                                    <div className="shrink-0">
                                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                                        <MapPin className="w-6 h-6" />
                                      </div>
                                    </div>
                                    <div className="flex-1 min-w-0 pr-8">
                                      <p className="text-[10px] uppercase tracking-[0.1em] font-black text-primary/60 mb-1">Manzil:</p>
                                      <p className={`text-sm font-bold leading-tight line-clamp-2 ${address ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 font-normal italic"}`}>
                                        {address || "Xaritadan tanlang..."}
                                      </p>
                                    </div>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 group-hover:text-primary transition-colors">
                                      <ArrowLeft className="w-5 h-5 rotate-180" />
                                    </div>
                                  </div>
                                </div>

                                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium px-1 leading-relaxed">
                                  <b>Eslatma:</b> To'g'ri manzil va lokatsiya tanlash kuryerga sizni tezroq topishi uchun juda muhimdir.
                                </p>
                              </div>

                              <Dialog open={isMapOpen} onOpenChange={setIsMapOpen}>
                                <DialogContent className="p-0 sm:max-w-2xl border-none bg-transparent shadow-none top-[50%] -translate-y-1/2 overflow-visible">
                                  <DialogHeader className="sr-only">
                                     <DialogTitle>Manzilni tanlang</DialogTitle>
                                  </DialogHeader>
                                  <LocationPicker
                                    initialLat={latitude}
                                    initialLon={longitude}
                                    onConfirm={(lat, lon, addr) => {
                                      setLatitude(lat)
                                      setLongitude(lon)
                                      setAddress(addr)
                                      setIsMapOpen(false)
                                    }}
                                    onCancel={() => setIsMapOpen(false)}
                                  />
                                </DialogContent>
                              </Dialog>

                              {validationErrors.address && (
                                <p className="mt-1 text-xs text-destructive">Manzil tanlanishi shart</p>
                              )}
                            </div>
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  )}
                </CardContent>
                <CardFooter className="flex flex-col">
                  <div className="mb-4 w-full rounded-lg bg-muted p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span>Jami elementlar:</span>
                      <span>{items.reduce((sum, item) => sum + item.quantity, 0)} ta</span>
                    </div>
                    <Separator className="my-2" />
                    {orderType === "delivery" && (
                      <>
                        <div className="flex items-center justify-between text-sm">
                          <span>Taomlar narxi:</span>
                          <span>{formatCurrency(getTotalPrice())}</span>
                        </div>
                        {containerCost > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span>Idishlar narxi:</span>
                            <span>{formatCurrency(containerCost)}</span>
                          </div>
                        )}
                        {showDeliveryFee && (
                          <div className="flex items-center justify-between text-sm">
                            <span>Yetkazib berish narxi:</span>
                            <span>{formatCurrency(deliveryFee)}</span>
                          </div>
                        )}
                        <Separator className="my-2" />
                      </>
                    )}
                    <div className="flex items-center justify-between font-medium">
                      <span>Jami summa:</span>
                      <span className="text-lg text-primary">
                        {formatCurrency(
                          orderType === "delivery" ? getTotalPrice() + (showDeliveryFee ? deliveryFee : 0) + containerCost : getTotalPrice(),
                        )}
                      </span>
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    size="lg"
                    disabled={
                      isSubmitting ||
                      items.length === 0 ||
                      isBlocked ||
                      (orderType === "table" && !hasAvailableSeatingItems && !isUserRecentlyUsed) ||
                      (orderType === "delivery" && !isDeliveryAvailable) ||
                      (!isOrderingAvailable && !isUserRecentlyUsed)
                    }
                    onClick={handlePlaceOrder}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Buyurtma joylashtirilmoqda...
                      </>
                    ) : (
                      "Buyurtma berish"
                    )}
                  </Button>

                  {isBlocked && (
                    <p className="text-center text-sm text-red-600 mt-2">
                      {isPhoneBlocked && isDeviceBlocked
                        ? "Telefon raqamingiz va qurilmangiz bloklangan"
                        : isPhoneBlocked
                          ? "Telefon raqamingiz bloklangan"
                          : "Qurilmangiz bloklangan"}
                    </p>
                  )}
                </CardFooter>
              </Card>
            </motion.div>
          </div>
        </div>
      )}
    </div>
  )
}
