"use client"

import { useState, useEffect } from "react"
import { collection, getDocs, query, orderBy, doc, deleteDoc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { 
  MessageCircle, 
  Search, 
  Trash2, 
  User, 
  Building2, 
  Phone, 
  Calendar, 
  ChevronRight,
  Loader2,
  Inbox,
  CheckCircle,
  Clock
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
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
import { toast } from "sonner"

interface Lead {
  id: string
  name: string
  restaurantName: string
  phone: string
  description?: string
  status: "new" | "contacted" | "converted"
  createdAt: any
}

export function SuperAdminContacts() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const fetchLeads = async () => {
    setIsLoading(true)
    try {
      const q = query(collection(db, "landing_contacts"), orderBy("createdAt", "desc"))
      const querySnapshot = await getDocs(q)
      const data: Lead[] = []
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Lead)
      })
      setLeads(data)
    } catch (error) {
      console.error("Error fetching leads:", error)
      toast.error("Ma'lumotlarni yuklashda xatolik")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchLeads()
  }, [])

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteDoc(doc(db, "landing_contacts", deleteId))
      toast.success("Murojaat o'chirildi")
      setLeads(leads.filter(l => l.id !== deleteId))
    } catch (error) {
      toast.error("O'chirishda xatolik")
    } finally {
      setDeleteId(null)
    }
  }

  const updateStatus = async (id: string, newStatus: Lead["status"]) => {
    try {
      await updateDoc(doc(db, "landing_contacts", id), { status: newStatus })
      setLeads(leads.map(l => l.id === id ? { ...l, status: newStatus } : l))
      toast.success("Holat yangilandi")
    } catch (error) {
      toast.error("Yangilashda xatolik")
    }
  }

  const filteredLeads = leads.filter(l => 
    l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.restaurantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.phone.includes(searchQuery)
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tighter">Landing Page Murojaatlari</h2>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium">Foydalanuvchilardan kelgan yangi so'rovlar</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input 
              placeholder="Qidiruv..." 
              className="pl-10 w-full md:w-[300px] rounded-xl border-zinc-200"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon" onClick={fetchLeads} className="rounded-xl">
             <Clock className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <Card className="border-none shadow-lg bg-white dark:bg-zinc-900">
            <CardHeader className="pb-2">
               <CardTitle className="text-xs font-black uppercase tracking-widest text-zinc-500">Jami Leads</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="text-4xl font-black">{leads.length}</div>
            </CardContent>
         </Card>
         <Card className="border-none shadow-lg bg-orange-50 dark:bg-orange-950/20">
            <CardHeader className="pb-2">
               <CardTitle className="text-xs font-black uppercase tracking-widest text-orange-600">Yangi</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="text-4xl font-black text-orange-600">{leads.filter(l => l.status === 'new').length}</div>
            </CardContent>
         </Card>
         <Card className="border-none shadow-lg bg-green-50 dark:bg-green-950/20">
            <CardHeader className="pb-2">
               <CardTitle className="text-xs font-black uppercase tracking-widest text-green-600">Konvertatsiya</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="text-4xl font-black text-green-600">{leads.filter(l => l.status === 'converted').length}</div>
            </CardContent>
         </Card>
      </div>

      <Card className="border-none shadow-2xl overflow-hidden bg-white dark:bg-zinc-900">
        <Table>
          <TableHeader className="bg-zinc-50 dark:bg-zinc-800/50">
            <TableRow>
              <TableHead className="font-bold">Mijoz / Restoran</TableHead>
              <TableHead className="font-bold">Kontakt</TableHead>
              <TableHead className="font-bold">Tavsif</TableHead>
              <TableHead className="font-bold">Sana</TableHead>
              <TableHead className="font-bold">Holat</TableHead>
              <TableHead className="text-right font-bold">Amallar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
               <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center">
                     <Loader2 className="w-8 h-8 animate-spin mx-auto text-zinc-300" />
                  </TableCell>
               </TableRow>
            ) : filteredLeads.length === 0 ? (
               <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center text-zinc-400 italic">
                     <Inbox className="w-12 h-12 mx-auto mb-2 opacity-10" />
                     Murojaatlar topilmadi
                  </TableCell>
               </TableRow>
            ) : (
               filteredLeads.map((lead) => (
                  <TableRow key={lead.id} className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                     <TableCell>
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                              {lead.name.substring(0, 1).toUpperCase()}
                           </div>
                           <div>
                              <div className="font-bold text-zinc-900 dark:text-white capitalize">{lead.name}</div>
                              <div className="text-xs text-zinc-400 flex items-center gap-1 group-hover:text-indigo-500 transition-colors">
                                 <Building2 className="w-3 h-3" /> {lead.restaurantName}
                              </div>
                           </div>
                        </div>
                     </TableCell>
                     <TableCell>
                        <a href={`tel:${lead.phone}`} className="flex items-center gap-2 text-sm font-bold text-zinc-600 hover:text-blue-600 transition-colors">
                           <Phone className="w-3 h-3" /> {lead.phone}
                        </a>
                     </TableCell>
                     <TableCell className="max-w-[200px]">
                        <p className="text-xs text-zinc-500 line-clamp-2 italic">
                           {lead.description || "Tavsif yo'q"}
                        </p>
                     </TableCell>
                     <TableCell>
                        <div className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                           <Calendar className="w-3 h-3" />
                           {lead.createdAt?.toDate?.().toLocaleDateString() || "No date"}
                        </div>
                     </TableCell>
                     <TableCell>
                        <select 
                           value={lead.status}
                           onChange={(e) => updateStatus(lead.id, e.target.value as Lead["status"])}
                           className={`text-[10px] font-black uppercase tracking-wider py-1 px-3 rounded-full border-none outline-none appearance-none cursor-pointer ${
                              lead.status === 'new' ? 'bg-orange-100 text-orange-600' :
                              lead.status === 'contacted' ? 'bg-blue-100 text-blue-600' :
                              'bg-green-100 text-green-600'
                           }`}
                        >
                           <option value="new">Yangi</option>
                           <option value="contacted">Bog'lanildi</option>
                           <option value="converted">Sotildi</option>
                        </select>
                     </TableCell>
                     <TableCell className="text-right">
                        <Button 
                           variant="ghost" 
                           size="icon" 
                           onClick={() => setDeleteId(lead.id)}
                           className="text-zinc-400 hover:text-red-500 rounded-lg h-8 w-8"
                        >
                           <Trash2 className="w-4 h-4" />
                        </Button>
                     </TableCell>
                  </TableRow>
               ))
            )}
          </TableBody>
        </Table>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>O'chirishni tasdiqlaysizmi?</AlertDialogTitle>
            <AlertDialogDescription>
              Ushbu murojaat butunlay o'chiriladi. Bu amalni qaytarib bo'lmaydi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600">O'chirish</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
