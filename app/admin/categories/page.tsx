"use client"

import { CategoryManagement } from "@/components/admin/category-management"
import { AdminLayoutClient } from "@/components/admin/admin-layout-client"

export default function CategoriesPage() {
  return (
    <AdminLayoutClient>
      <div className="p-4 md:p-8">
        <CategoryManagement />
      </div>
    </AdminLayoutClient>
  )
}
