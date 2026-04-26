import { SuperAdminLogin } from "@/components/admin/super-admin/super-admin-login"
import type { Metadata } from "next"

export const metadata: Metadata = {
    title: "Super Admin Login | Menu",
    description: "Secure login for Super Administrators",
}

export default function SuperAdminLoginPage() {
    return (
        <div className="w-full">
            <SuperAdminLogin />
        </div>
    )
}
