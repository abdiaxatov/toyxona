"use server"

import { AliPOSService, AliPOSConfig, AliPOSRestaurant, AliPOSCategory, AliPOSProduct } from "./alipos-service"

export async function getAliPOSRestaurantsAction(config: AliPOSConfig) {
  try {
    const service = new AliPOSService(config)
    const restaurants = await service.getRestaurants()
    return { success: true, data: restaurants }
  } catch (error: any) {
    console.error("AliPOS getRestaurants error:", error)
    return { 
        success: false, 
        error: error.message || "Filiallarni yuklashda xatolik yuz berdi",
        code: error.code || "UNKNOWN",
        details: error.stack
    }
  }
}

export async function getAliPOSMenuAction(config: AliPOSConfig) {
  try {
    const service = new AliPOSService(config)
    const menu = await service.getMenu()
    return { success: true, data: menu }
  } catch (error: any) {
    console.error("AliPOS getMenu error:", error)
    return { 
        success: false, 
        error: error.message || "Menyuni yuklashda xatolik yuz berdi",
        code: error.code || "UNKNOWN",
        details: error.stack
    }
  }
}
