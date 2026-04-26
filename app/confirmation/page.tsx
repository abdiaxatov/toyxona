"use client"

import { useSearchParams } from "next/navigation"
import { ConfirmationContent } from "@/components/confirmation-content"

export default function ConfirmationPage() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get("orderId")
  const restaurantId = searchParams.get("restaurantId")

  if (!orderId) {
    return (
      <div className="container mx-auto max-w-md p-8 text-center">
        <h1 className="text-xl font-bold text-red-500">Xatolik</h1>
        <p>Buyurtma ID topilmadi</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-md min-h-screen bg-background">
      <ConfirmationContent 
        orderId={orderId} 
        restaurantId={restaurantId || undefined} 
      />
    </div>
  )
}
