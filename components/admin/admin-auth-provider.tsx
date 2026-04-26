"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { useRouter, usePathname } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { auth, db } from "@/lib/firebase"
import { AdminLogin } from "./admin-login"

interface AuthContextType {
  user: any
  userId: string | null
  userName: string | null
  userRole: string | null
  userPath: string | null // NEW: Store the Firestore path
  restaurantId: string | null
  isAuthenticated: boolean
  isLoading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userId: null,
  userName: null,
  userRole: null,
  userPath: null,
  restaurantId: null,
  isAuthenticated: false,
  isLoading: true,
  signOut: async () => { },
})

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userPath, setUserPath] = useState<string | null>(null)
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  // 1. Auth Subscription Management
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log("[Auth] State changed:", currentUser?.uid);

      if (!currentUser) {
        setUser(null)
        setUserId(null)
        setUserName(null)
        setUserRole(null)
        setUserPath(null)
        setRestaurantId(null)
        setIsLoading(false)
        return
      }

      setUser(currentUser)
      setUserId(currentUser.uid)

      try {
        // Optimize: Check cache
        const cachedPath = localStorage.getItem(`userPath_${currentUser.uid}`)
        let userData = null
        let currentPath = null

        if (cachedPath) {
          try {
            const docSnap = await getDoc(doc(db, cachedPath))
            if (docSnap.exists()) {
              userData = docSnap.data()
              currentPath = cachedPath
            }
          } catch (e) {
            console.warn("[Auth] Cache lookup failed:", e)
          }
        }

        // Search root collection
        if (!userData) {
          const rootSnap = await getDoc(doc(db, "users", currentUser.uid))
          if (rootSnap.exists()) {
            userData = rootSnap.data()
            currentPath = rootSnap.ref.path
          }
        }

        // Search subcollections (Legacy/Special cases)
        if (!userData) {
          const { collectionGroup, query, where, getDocs } = await import("firebase/firestore")
          const usersQuery = query(collectionGroup(db, "users"), where("uid", "==", currentUser.uid))
          const querySnapshot = await getDocs(usersQuery)

          if (!querySnapshot.empty) {
            const docSnap = querySnapshot.docs[0]
            userData = docSnap.data()
            currentPath = docSnap.ref.path

            const pathSegments = currentPath.split("/")
            if (pathSegments[0] === "restaurants" && pathSegments[2] === "users") {
              userData.restaurantId = userData.restaurantId || pathSegments[1]
            }
          }
        }

        if (userData) {
          if (userData.status === "deleted") {
            toast.error("Foydalanuvchi tizimdan o'chirilgan")
            await signOut()
            return
          }

          setUserName(userData.name || "")
          setUserRole(userData.role || "")
          setUserPath(currentPath)
          setRestaurantId(userData.restaurantId || null)

          if (currentPath) {
            localStorage.setItem(`userPath_${currentUser.uid}`, currentPath)
          }
        } else {
          console.error("[Auth] No Firestore profile found for UID:", currentUser.uid)
          await firebaseSignOut(auth)
          router.push("/admin/login")
        }
      } catch (error) {
        console.error("[Auth] Error fetching profile:", error)
      } finally {
        setIsLoading(false)
      }
    })

    return () => unsubscribe()
  }, []) // Empty dependency array: runs only on mount

  // 2. Redirection and Protection Logic
  useEffect(() => {
    if (isLoading) return

    const isLoginPage = pathname === "/admin/login" || pathname === "/super-admin/login"
    const isAdminPath = pathname.startsWith("/admin")

    if (!user && isAdminPath && !isLoginPage) {
      router.push("/admin/login")
      return
    }

    if (user && userRole && isLoginPage) {
      switch (userRole) {
        case "super_admin":
        case "co_founder":
          router.push("/admin/super-admin");
          break
        case "waiter": router.push("/admin/waiter-calls"); break
        case "chef": router.push("/admin/category-orders"); break
        case "accountant": router.push("/admin/warehouse"); break
        default: router.push("/admin/menu")
      }
      return
    }

    // Role-based Path Protection
    if (userRole === "waiter" && isAdminPath && !pathname.startsWith("/admin/waiter-calls") && !pathname.startsWith("/admin/orders/new")) {
      router.replace("/admin/waiter-calls")
    }
  }, [user, userRole, pathname, isLoading, router])

  const signOut = async () => {
    try {
      setIsLoading(true)
      localStorage.clear()
      sessionStorage.clear()
      await firebaseSignOut(auth)
      setUser(null)
      setUserId(null)
      setUserName(null)
      setUserRole(null)
      setUserPath(null)
      setRestaurantId(null)
      router.push("/admin/login")
      toast.success("Tizimdan chiqildi")
    } catch (error) {
      console.error("Sign out error:", error)
      toast.error("Chiqishda xatolik yuz berdi")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-zinc-500 font-medium animate-pulse">Yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  // Fallback for non-authenticated protected access
  if (!user && pathname.startsWith("/admin") && pathname !== "/admin/login") {
    return <AdminLogin />
  }

  return (
    <AuthContext.Provider
      value={{ user, userId, userName, userRole, userPath, restaurantId, isAuthenticated: !!user, isLoading, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AdminAuthProvider")
  }
  return context
}
