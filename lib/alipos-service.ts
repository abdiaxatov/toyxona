export interface AliPOSConfig {
  clientId: string
  clientSecret: string
  baseUrl: string
  restaurantId?: string
  token?: string
  tokenExpiry?: number
  platform?: string
}

export interface AliPOSRestaurant {
  id: string
  title: string
  address: string | null
}

export interface AliPOSCategory {
  id: string
  name: string
  sortOrder: number
}

export interface AliPOSModifier {
  id: string
  name: string
  price: number
  vat: number
  sortOrder: number
}

export interface AliPOSModifierGroup {
  id: string
  name: string
  sortOrder: number
  modifiers: AliPOSModifier[]
}

export interface AliPOSProduct {
  id: string
  categoryId: string
  name: string
  sortOrder: number
  description?: string
  price: number
  vat?: number
  measure?: number
  measureUnit?: string // 0-шт, 1-кг, 2-Л
  images?: string[]
  modifierGroups?: AliPOSModifierGroup[]
}

export class AliPOSService {
  private config: AliPOSConfig

  // Constants from documentation
  static PAYMENT_CASH = "59FFAC8D-ACE5-4758-8FB7-6C1F69713C37"
  static PAYMENT_CARD = "3C9889C8-1A85-4172-B3BA-0B0C91F05411"
  static PAYMENT_RAHMAT = "C4AAD2B3-8D99-4BD2-9647-8806136556CF"

  constructor(config: AliPOSConfig) {
    this.config = config
  }

  async getToken(): Promise<string> {
    const config = this.config

    if (config.token && config.tokenExpiry && config.tokenExpiry > Date.now()) {
      return config.token
    }

    const params = new URLSearchParams()
    params.append("client_id", config.clientId)
    params.append("client_secret", config.clientSecret)
    params.append("grant_type", "client_credentials")

    const response = await fetch(`${config.baseUrl}/security/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`AliPOS Auth Failed: ${error}`)
    }

    const data = await response.json()
    return data.access_token
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const token = await this.getToken()
    const url = endpoint.startsWith("http") ? endpoint : `${this.config.baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`AliPOS API Error (${endpoint}): ${error}`)
    }

    return response.json()
  }

  async getRestaurants(): Promise<AliPOSRestaurant[]> {
    const data = await this.request("/restaurants")
    return data.places || []
  }

  async getMenu(restaurantId?: string): Promise<{ categories: AliPOSCategory[], products: AliPOSProduct[] }> {
    const rid = restaurantId || this.config.restaurantId
    if (!rid) throw new Error("Restaurant ID is required for getMenu")

    const data = await this.request(`/api/Integration/v1/menu/${rid}/composition`)
    return {
      categories: data.categories || [],
      products: data.items || []
    }
  }

  async createOrder(order: any) {
    return this.request("/api/Integration/v1/order", {
      method: "POST",
      body: JSON.stringify(order)
    })
  }

  async cancelOrder(orderId: string) {
    return this.request(`/api/Integration/v1/order/${orderId}`, {
      method: "DELETE"
    })
  }

  async getPaymentMethods() {
    return this.request("/api/Integration/v1/paymentMethod/all")
  }
}
