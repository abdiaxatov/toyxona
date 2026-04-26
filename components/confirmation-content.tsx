"use client"

import { useEffect, useState, useMemo } from "react"
import { doc, getDoc, collection, query, where, getDocs, limit } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Loader2, CheckCircle2, ArrowLeft, User, Phone, MapPin, Calendar, ShoppingBag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { motion } from "framer-motion"
import type { Order } from "@/types"
import { getWaiterNameById } from "@/lib/table-service"

interface ConfirmationContentProps {
  orderId: string
  restaurantId?: string
  onClose?: () => void
  showHomeButton?: boolean
}

export function ConfirmationContent({ 
  orderId, 
  restaurantId: initialRestaurantId, 
  onClose,
  showHomeButton = true
}: ConfirmationContentProps) {
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [waiterName, setWaiterName] = useState<string | null>(null)
  const [restaurantSlug, setRestaurantSlug] = useState<string | null>(null)

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) {
        setError("Buyurtma ID topilmadi")
        setLoading(false)
        return
      }

      try {
        let restaurantId = initialRestaurantId
        
        // If we have restaurantId but not slug, fetch restaurant details
        if (restaurantId && !restaurantSlug) {
          try {
            const resDoc = await getDoc(doc(db, "restaurants", restaurantId))
            if (resDoc.exists()) {
              const resData = resDoc.data()
              setRestaurantSlug(resData.slug)
            }
          } catch (e) {
            console.error("Error fetching restaurant details:", e)
          }
        }

        let orderDoc;
        
        // Try restaurant sub-collection first if ID is known
        if (restaurantId) {
          orderDoc = await getDoc(doc(db, "restaurants", restaurantId, "orders", orderId))
        }
        
        // If not found or no restaurantId, try root collection
        if (!orderDoc || !orderDoc.exists()) {
          orderDoc = await getDoc(doc(db, "orders", orderId))
        }

        if (orderDoc.exists()) {
          const orderData = { id: orderDoc.id, ...orderDoc.data() } as Order
          setOrder(orderData)

          // Fetch waiter name if waiterId exists
          if (orderData.waiterId) {
            const name = await getWaiterNameById(orderData.waiterId)
            setWaiterName(name)
          }
        } else {
          setError("Buyurtma topilmadi")
        }
      } catch (error) {
        console.error("Error fetching order:", error)
        setError("Buyurtmani yuklashda xatolik yuz berdi")
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [orderId, initialRestaurantId])

  const getSeatingDisplay = (order: Order) => {
    if (order.orderType === "delivery") return "Yetkazib berish"
    const type = order.seatingType || order.tableType || (order.roomNumber ? "Xona" : "Stol")
    const number = order.roomNumber || order.tableNumber
    return `${type} ${number || ""}`
  }

  if (loading) {
    return (
      <div className="flex h-[40vh] items-center justify-center p-8">
        <div className="text-center space-y-4">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary opacity-50" />
          <p className="text-muted-foreground animate-pulse font-medium">Yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="p-8 text-center space-y-6">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
          <ArrowLeft className="w-10 h-10 text-red-400" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-red-600">Xatolik</h3>
          <p className="text-muted-foreground">{error || "Buyurtma topilmadi"}</p>
        </div>
        {onClose && <Button onClick={onClose} variant="secondary" className="w-full rounded-2xl">Yopish</Button>}
      </div>
    )
  }

  return (
    <div className="p-4 space-y-6">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="space-y-6"
      >
        {/* Success Header */}
        <div className="text-center space-y-3 py-4">
          <div className="relative inline-block">
             <motion.div
               initial={{ scale: 0 }}
               animate={{ scale: 1 }}
               transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
               className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center text-white mx-auto shadow-xl shadow-green-200"
             >
               <CheckCircle2 className="w-12 h-12" />
             </motion.div>
             <div className="absolute inset-0 bg-green-400 rounded-full blur-2xl opacity-20 -z-10 animate-pulse" />
          </div>
          <div className="space-y-1">
             <h2 className="text-2xl font-black tracking-tight">Buyurtma qabul qilindi!</h2>
             <p className="text-muted-foreground font-medium">Buyurtma: <span className="text-zinc-900 font-bold">#{order.id?.substring(0, 6).toUpperCase()}</span></p>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3">
          <InfoCard icon={<ShoppingBag className="w-4 h-4" />} label="Turi" value={getSeatingDisplay(order)} />
          {waiterName ? (
            <InfoCard icon={<User className="w-4 h-4" />} label="Ofitsiant" value={waiterName} />
          ) : (
            <InfoCard icon={<Calendar className="w-4 h-4" />} label="Sana" value={order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Hozir"} />
          )}
          {order.orderType === "delivery" && (
            <>
              <div className="col-span-2">
                <InfoCard icon={<Phone className="w-4 h-4" />} label="Telefon" value={order.phoneNumber || "—"} />
              </div>
              <div className="col-span-2">
                <InfoCard icon={<MapPin className="w-4 h-4" />} label="Manzil" value={order.address || "—"} />
              </div>
            </>
          )}
        </div>

        {/* Order Items */}
        <div className="space-y-3">
          <h4 className="text-[11px] font-black tracking-widest text-muted-foreground uppercase px-2">Buyurtma mazmuni</h4>
          <div className="bg-zinc-50 dark:bg-zinc-900 rounded-[30px] p-5 space-y-4 border border-zinc-100 dark:border-zinc-800">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start group">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-lg bg-white dark:bg-zinc-800 flex items-center justify-center text-[11px] font-black border border-zinc-100 dark:border-zinc-700">{item.quantity}</div>
                  <span className="text-sm font-bold text-zinc-800 dark:text-white leading-tight">{item.name}</span>
                </div>
                <span className="text-sm font-black whitespace-nowrap">{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
            <div className="h-px bg-zinc-200/50 dark:bg-zinc-800 my-2" />
            <div className="space-y-1 px-1">
              <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                <span>Taomlar summasi</span>
                <span>{formatCurrency(order.subtotal || order.items.reduce((s, i) => s + (i.price * i.quantity), 0))}</span>
              </div>
              {order.containerCost > 0 && (
                <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  <span>Idish puli</span>
                  <span>{formatCurrency(order.containerCost)}</span>
                </div>
              )}
              {order.orderType === "delivery" && order.deliveryFee > 0 && (
                <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  <span>Yetkazib berish</span>
                  <span>{formatCurrency(order.deliveryFee)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 mt-1 border-t border-zinc-100 dark:border-zinc-800">
                <span className="font-bold text-zinc-900 dark:text-white uppercase text-xs tracking-widest">Jami summa</span>
                <span className="text-xl font-black text-primary">{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-2">
          {onClose && (
            <Button onClick={onClose} size="lg" className="rounded-2xl h-14 font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20">
              Menyuga qaytish
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  )
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-3.5 rounded-2xl space-y-1 shadow-sm">
      <div className="flex items-center gap-2 text-zinc-400">
        {icon}
        <span className="text-[10px] font-black uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-sm font-bold truncate text-zinc-900 dark:text-white">{value}</p>
    </div>
  )
}
