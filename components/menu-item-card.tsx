"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Minus, Box } from "lucide-react"
import { useCart } from "@/components/cart-provider"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Suspense } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { MenuItem } from "@/types"

// Dynamically import the 3D viewer to avoid SSR issues
const ModelViewer = dynamic(() => import("@/components/3d-model-viewer"), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-64">Loading 3D Model...</div>,
})



interface MenuItemCardProps {
  item: MenuItem
}

export function MenuItemCard({ item }: MenuItemCardProps) {
  const { addItem, items, updateQuantity } = useCart()
  const [show3DModal, setShow3DModal] = useState(false)

  const cartItem = items.find((cartItem) => cartItem.id === item.id)
  const quantity = cartItem?.quantity || 0

  const handleAddToCart = () => {
    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
    })
  }

  const handleUpdateQuantity = (newQuantity: number) => {
    if (newQuantity <= 0) {
      updateQuantity(item.id, 0)
    } else {
      updateQuantity(item.id, newQuantity)
    }
  }

  return (
    <>
      <Card
        className={`overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 rounded-[20px] bg-white ${!item.available ? "opacity-60" : ""}`}
      >
        <div className="relative">
          <img
            src={(() => {
              const rawImg: any = item.imageUrl || item.image;
              if (!rawImg) return "/placeholder.svg?height=200&width=300";
              const urlStr = typeof rawImg === 'string' ? rawImg : (rawImg.url || rawImg.imageUrl || rawImg.image);
              return (urlStr && typeof urlStr === 'string' && urlStr.trim() !== '') ? urlStr : "/placeholder.svg?height=200&width=300";
            })()}
            alt={item.name}
            className="w-full h-48 object-cover"
            onError={(e) => {
              e.currentTarget.src = "/placeholder.svg?height=200&width=300"
            }}
          />

          {/* 3D Model Button */}
          {item.modelUrl && (
            <Button
              asChild
              size="sm"
              variant="secondary"
              className="absolute top-3 right-3 bg-white/90 hover:bg-white text-gray-800 shadow-md rounded-xl backdrop-blur-sm z-10"
            >
              <Link href={`/3d-view/${item.id}`}>
                <Box className="h-4 w-4 mr-1" />
                3D
              </Link>
            </Button>
          )}

          {!item.available && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Badge variant="destructive" className="text-sm">
                Mavjud emas
              </Badge>
            </div>
          )}
        </div>

        <CardContent className="p-4">
          <div className="space-y-2">
            <h3 className="font-semibold text-lg line-clamp-1">{item.name}</h3>
            <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>
            <div className="flex items-center justify-between min-h-[40px]">
              {item.price && item.price > 0 ? (
                <>
                  <span className="text-lg font-bold text-primary">
                    {item.price.toLocaleString()} {item.price > 1000 ? "so'm" : "$"}
                  </span>

                  {item.available && (
                    <div className="flex items-center gap-2">
                      {quantity > 0 ? (
                        <div className="flex items-center gap-2 bg-secondary/10 p-1 rounded-xl">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleUpdateQuantity(quantity - 1)}
                            className="h-8 w-8 p-0 rounded-lg hover:bg-white shadow-sm transition-all"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="font-bold min-w-[20px] text-center">{quantity}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleUpdateQuantity(quantity + 1)}
                            className="h-8 w-8 p-0 rounded-lg hover:bg-white shadow-sm transition-all"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={handleAddToCart}
                          className="rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all active:scale-95"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Qo'shish
                        </Button>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full text-zinc-400 text-xs italic font-medium">
                   Narxi kelishilgan holda
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>


    </>
  )
}
