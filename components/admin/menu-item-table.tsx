"use client"

import { useState } from "react"
import { doc, deleteDoc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/components/ui/use-toast"
import { formatCurrency } from "@/lib/utils"
import { Edit, Trash2, CalendarDays } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { MenuItem, Category } from "@/types"
import { useLanguage } from "@/hooks/use-language"

interface MenuItemTableProps {
  items: MenuItem[]
  categories: Category[]
  onEdit: (item: MenuItem) => void
}

export function MenuItemTable({ items, categories, onEdit }: MenuItemTableProps) {
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()
  const { t, language } = useLanguage()

  if (items.length === 0) {
    return <div className="py-8 text-center text-muted-foreground">{t("admin.menu.table.noItems")}</div>
  }

  const getCategoryName = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId)
    return category ? category.name : t("admin.menu.table.categoryNotFound")
  }

  // ... (keeping existing functions)



  const handleDeleteItem = async () => {
    if (!deleteItemId) return

    setIsDeleting(true)
    try {
      await deleteDoc(doc(db, "menuItems", deleteItemId))
      toast({
        title: t("admin.menu.table.deleteSuccess"),
        description: t("admin.menu.table.deleteSuccessDesc"),
      })
    } catch (error) {
      console.error("Error deleting menu item:", error)
      toast({
        title: t("common.error"),
        description: t("admin.form.errors.saveError"),
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setDeleteItemId(null)
    }
  }

  const handleToggleAvailability = async (item: MenuItem) => {
    try {
      await updateDoc(doc(db, "menuItems", item.id), {
        isAvailable: !item.isAvailable,
      })

      toast({
        title: item.isAvailable ? t("admin.menu.table.hideSuccess") : t("admin.menu.table.showSuccess"),
        description: item.isAvailable ? t("admin.menu.table.hideDesc") : t("admin.menu.table.showDesc"),
      })
    } catch (error) {
      console.error("Error updating menu item availability:", error)
      toast({
        title: t("common.error"),
        description: t("admin.form.errors.saveError"),
        variant: "destructive",
      })
    }
  }

  // Group items by category
  const itemsByCategory = items.reduce(
    (acc, item) => {
      const categoryName = getCategoryName(item.categoryId)
      if (!acc[categoryName]) {
        acc[categoryName] = []
      }
      acc[categoryName].push(item)
      return acc
    },
    {} as Record<string, MenuItem[]>,
  )

  return (
    <div className="space-y-8">
      {Object.entries(itemsByCategory).map(([category, categoryItems]) => (
        <div key={category}>
          <h2 className="mb-4 text-xl font-semibold">{category}</h2>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("admin.menu.table.name")}</TableHead>
                  <TableHead>{t("admin.menu.table.price")}</TableHead>
                  <TableHead>{t("admin.form.scheduling.availableDays")}</TableHead>
                  <TableHead>{t("admin.menu.table.available")}</TableHead>
                  <TableHead className="w-[100px]">{t("admin.menu.item.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      <div>{item.name}</div>
                      {item.variants && item.variants.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {item.variants.map((v) => (
                            <Badge key={v.id} variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-slate-200 text-slate-500 font-normal">
                              {(() => {
                                const name = v.name_uz || v.name;
                                const unit = v.unit || (/^\d+$/.test(name) ? 'gr' : '');

                                let displayUnit = "";
                                if (unit === 'gr') displayUnit = language === 'uz' ? 'gr' : language === 'ru' ? 'гр' : 'g';
                                else if (unit === 'pc') displayUnit = language === 'uz' ? 'dona' : language === 'ru' ? 'шт' : 'pc';
                                else if (unit === 'kg') displayUnit = language === 'uz' ? 'kg' : language === 'ru' ? 'кг' : 'kg';
                                else if (unit === 'l') displayUnit = language === 'uz' ? 'l' : language === 'ru' ? 'л' : 'l';

                                return unit && /^\d+$/.test(name) ? `${name} ${displayUnit}` : name;
                              })()}: {v.price.toLocaleString()}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.variants && item.variants.length > 0 ? (
                        <div className="flex flex-col">
                          <span className="font-bold whitespace-nowrap">
                            {(() => {
                              const prices = item.variants.map(v => v.price);
                              const min = Math.min(...prices);
                              const max = Math.max(...prices);
                              if (min === max) return formatCurrency(min);
                              return `${formatCurrency(min)} - ${formatCurrency(max)}`;
                            })()}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-medium">Variantli</span>
                        </div>
                      ) : (
                        formatCurrency(item.price)
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {!item.availableDays || item.availableDays.length === 7 ? (
                          <span className="text-[10px] text-zinc-400 font-medium italic">
                            {language === 'uz' ? 'Har kuni' : language === 'ru' ? 'Ежедневно' : 'Daily'}
                          </span>
                        ) : (
                          [1, 2, 3, 4, 5, 6, 0]
                            .filter(d => item.availableDays?.includes(d))
                            .map(day => (
                              <Badge
                                key={day}
                                variant="secondary"
                                className="text-[9px] px-1.5 py-0 h-4 font-bold bg-blue-50 text-blue-600 border-blue-100"
                              >
                                {t(`admin.form.scheduling.days.${day}`).substring(0, 3)}
                              </Badge>
                            ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch checked={item.isAvailable} onCheckedChange={() => handleToggleAvailability(item)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => onEdit(item)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => setDeleteItemId(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}

      <AlertDialog open={!!deleteItemId} onOpenChange={(open) => !open && setDeleteItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.menu.table.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.menu.table.deleteDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t("admin.form.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteItem}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? t("admin.menu.table.deleting") : t("admin.menu.item.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
