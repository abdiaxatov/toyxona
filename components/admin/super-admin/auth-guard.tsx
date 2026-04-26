"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/admin/admin-auth-provider"
import { Loader2 } from "lucide-react"

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
    const { user, userRole, isLoading } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (!isLoading) {
            if (!user) {
                router.push("/admin/login")
            } else if (userRole !== "super_admin" && userRole !== "co_founder") {
                router.push("/admin/menu") // Redirect regular admins away
            }
        }
    }, [user, userRole, isLoading, router])

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!user || (userRole !== "super_admin" && userRole !== "co_founder")) {
        return null // Don't render children while redirecting
    }

    return <>{children}</>
}
