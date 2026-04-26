"use client"

import type React from "react"

import { createContext, useContext, useState, useEffect, useMemo } from "react"
import { useParams } from "next/navigation"
import type { CartItem, MenuItem, MenuItemVariant } from "@/types"

interface CartContextType {
  items: CartItem[]
  addToCart: (item: MenuItem, variant?: MenuItemVariant) => void
  updateItemQuantity: (itemId: string, quantity: number, maxQuantity?: number) => void
  removeItem: (itemId: string) => void
  clearCart: () => void
  getItemQuantity: (itemId: string) => number
  getTotalPrice: () => number
  getTotalItems: () => number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const params = useParams()
  const slug = params?.slug as string
  
  const cartKey = useMemo(() => {
    if (typeof window === 'undefined') return "cart_ssr"
    // Path-based key (e.g., /safran)
    if (slug) return `cart_${slug}`
    // Domain-based key (custom domain)
    const host = window.location.host.replace(/\./g, '_')
    return `cart_host_${host}`
  }, [slug])

  // Load cart from localStorage when restaurant context (slug) changes
  useEffect(() => {
    const savedCart = localStorage.getItem(cartKey)
    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart))
      } catch (error) {
        console.error("Error parsing cart from localStorage:", error)
        localStorage.removeItem(cartKey)
        setItems([])
      }
    } else {
      setItems([])
    }
  }, [cartKey])

  // Save cart to localStorage whenever items or restaurant context changes
  useEffect(() => {
    if (cartKey) {
      localStorage.setItem(cartKey, JSON.stringify(items))
    }
  }, [items, cartKey])

  const addToCart = (item: MenuItem, variant?: MenuItemVariant) => {
    setItems((prevItems) => {
      // Determine unique ID based on item AND variant (use dash consistently)
      const cartItemId = variant ? `${item.id}-${variant.id}` : item.id

      // Maximum allowed by stock (remainingServings). null/undefined = unlimited.
      const maxAllowed = (item.remainingServings !== undefined && item.remainingServings !== null)
        ? Number(item.remainingServings)
        : Infinity

      const existingItemIndex = prevItems.findIndex((i) => i.id === cartItemId)

      if (existingItemIndex >= 0) {
        const updatedItems = [...prevItems]
        const currentQty = updatedItems[existingItemIndex].quantity
        const newQuantity = currentQty + 1

        // Do not exceed remainingServings
        if (newQuantity > maxAllowed) return prevItems

        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: newQuantity,
          maxQuantity: maxAllowed === Infinity ? undefined : maxAllowed,
        }
        return updatedItems
      } else {
        // New item — only add if stock allows
        if (maxAllowed <= 0) return prevItems

        const now = new Date();
        let currentPrice = variant ? variant.price : item.price;
        let originalPrice = currentPrice;

        if (variant) {
          if (variant.discountPrice && variant.discountPrice > 0 &&
              variant.discountEndsAt && new Date(variant.discountEndsAt) > now) {
            currentPrice = variant.discountPrice;
          }
        } else if (item.discountPrice && item.discountPrice > 0 &&
                   item.discountEndsAt && new Date(item.discountEndsAt) > now) {
          currentPrice = item.discountPrice;
        }

        return [
          ...prevItems,
          {
            id: cartItemId,
            productId: item.id,
            name: item.name_uz || item.name,
            price: currentPrice,
            originalPrice,
            quantity: 1,
            maxQuantity: maxAllowed === Infinity ? undefined : maxAllowed,
            imageUrl: item.imageUrls && item.imageUrls.length > 0 ? item.imageUrls[0] : item.imageUrl,
            variant,
            aliposId: variant?.aliposId || item.aliposId,
          },
        ]
      }
    })
  }

  const updateItemQuantity = (itemId: string, quantity: number, maxQuantity?: number) => {
    setItems((prevItems) => {
      if (quantity <= 0) {
        return prevItems.filter((item) => item.id !== itemId)
      }

      return prevItems.map((item) => {
        if (item.id !== itemId) return item
        // Respect either the passed maxQuantity or the stored one
        const max = maxQuantity ?? item.maxQuantity
        const clampedQty = max !== undefined ? Math.min(quantity, max) : quantity
        return { ...item, quantity: clampedQty }
      })
    })
  }

  const removeItem = (itemId: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== itemId))
  }

  const clearCart = () => {
    setItems([])
  }

  const getItemQuantity = (itemId: string) => {
    const item = items.find((item) => item.id === itemId)
    return item ? item.quantity : 0
  }

  const getTotalPrice = () => {
    return items.reduce((total, item) => total + item.price * item.quantity, 0)
  }

  const getTotalItems = () => {
    return items.reduce((total, item) => total + item.quantity, 0)
  }

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        updateItemQuantity,
        removeItem,
        clearCart,
        getItemQuantity,
        getTotalPrice,
        getTotalItems,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}
