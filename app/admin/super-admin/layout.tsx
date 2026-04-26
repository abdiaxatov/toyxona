import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { AdminAuthGuard } from "@/components/admin/super-admin/auth-guard"

export default function SuperAdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <AdminAuthGuard>
            {children}
        </AdminAuthGuard>
    )
}
