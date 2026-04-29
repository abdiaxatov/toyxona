"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ShoppingCart } from "lucide-react"
import { useCart } from "@/components/cart-provider"
import { motion, AnimatePresence } from "framer-motion"

interface CartButtonProps {
  primaryColor?: string
  restaurantId?: string
  onCartClick?: () => void
  activeTab?: string
  isOrderingEnabled?: boolean
}

export function CartButton({ primaryColor, restaurantId, onCartClick, activeTab, isOrderingEnabled = true }: CartButtonProps) {
  const { items, getTotalPrice, getTotalItems } = useCart()
  const router = useRouter()
  const totalItems = getTotalItems()
  const [isAnimating, setIsAnimating] = useState(false)
  const [prevTotalItems, setPrevTotalItems] = useState(totalItems)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (totalItems > prevTotalItems) {
      setIsAnimating(true)
      const timer = setTimeout(() => setIsAnimating(false), 500)
      return () => clearTimeout(timer)
    }
    setPrevTotalItems(totalItems)
  }, [totalItems, prevTotalItems])

  if (!mounted || !isOrderingEnabled || totalItems === 0 || (activeTab && activeTab !== "menu")) {
    return null
  }

  const handleClick = () => {
    if (onCartClick) {
      onCartClick()
    } else {
      router.push(`/cart${restaurantId ? `?restaurantId=${restaurantId}` : ""}`)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0, opacity: 0, y: 50 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0, opacity: 0, y: 50 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-32 left-1 z-[100] md:bottom-10 md:left-10"
      >
        <Button 
          size="lg" 
          className="rounded-full shadow-2xl h-14 px-6 md:h-16 md:px-8 text-white border-2 border-white/20" 
          style={{ backgroundColor: primaryColor || '#0284c7' }}
          onClick={handleClick}
        >
          <motion.div animate={isAnimating ? { scale: [1, 1.3, 1] } : {}} transition={{ duration: 0.4 }}>
            <ShoppingCart className="mr-3 h-6 w-6" />
          </motion.div>
          <div className="flex flex-col items-start pr-2">
            <span className="text-xs font-semibold opacity-80 uppercase tracking-wider leading-none">Buyurtma berish</span>
            <span className="font-bold text-lg leading-none mt-1">{getTotalPrice().toLocaleString()} $</span>
          </div>
          <div 
            className="bg-white font-bold text-sm w-7 h-7 flex items-center justify-center rounded-full ml-2 shadow-inner"
            style={{ color: primaryColor || '#0284c7' }}
          >
            {totalItems}
          </div>
        </Button>
      </motion.div>
    </AnimatePresence>
  )
}
