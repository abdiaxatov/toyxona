"use client"

import { useState, useEffect } from "react"
import { collection, query, where, getDocs, doc, setDoc, orderBy } from "firebase/firestore"
import { db, auth } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2, UserPlus, Trash2, Edit, Search, UserCheck, Shield, ShieldCheck, Eye, EyeOff, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useAuth } from "../admin-auth-provider"

interface Staff {
    id: string
    uid: string
    name: string
    email: string
    role: string
    status?: string
}

export function SuperAdminStaff() {
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [role, setRole] = useState("co_founder")
    const [isLoading, setIsLoading] = useState(false)
    const [staffList, setStaffList] = useState<Staff[]>([])
    const [isLoadingStaff, setIsLoadingStaff] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [editingStaff, setEditingStaff] = useState<Staff | null>(null)
    const [showPassword, setShowPassword] = useState(false)

    const { user, userRole } = useAuth()

    useEffect(() => {
        fetchStaffList()
    }, [])

    const fetchStaffList = async () => {
        setIsLoadingStaff(true)
        try {
            const q = query(collection(db, "users"), where("role", "in", ["super_admin", "co_founder"]))
            const querySnapshot = await getDocs(q)
            const data = querySnapshot.docs.map(doc => ({
                id: doc.id,
                uid: doc.id,
                ...doc.data()
            })) as Staff[]
            setStaffList(data.filter(s => s.status !== "deleted"))
        } catch (error) {
            console.error("Error fetching staff:", error)
            toast.error("Xodimlarni yuklashda xatolik")
        } finally {
            setIsLoadingStaff(false)
        }
    }

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        if (userRole === "co_founder" && !editingStaff) {
            toast.error("Co-founder yangi admin qo'sha olmaydi")
            return
        }

        setIsLoading(true)
        try {
            if (editingStaff) {
                await setDoc(doc(db, "users", editingStaff.id), {
                    name,
                    role,
                    updatedAt: new Date()
                }, { merge: true })

                if (newPassword) {
                    const response = await fetch("/api/update-user-credentials", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            uid: editingStaff.uid,
                            password: newPassword,
                            adminUid: user.uid
                        })
                    })
                    if (!response.ok) throw new Error("Parolni yangilashda xatolik")
                }
                toast.success("Muvaffaqiyatli yangilandi")
            } else {
                const response = await fetch("/api/create-user", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name, email, password, role,
                        adminUid: user.uid
                    })
                })
                const result = await response.json()
                if (!response.ok) throw new Error(result.message || "Xatolik")
                toast.success("Yangi admin muvaffaqiyatli qo'shildi")
            }

            setName("")
            setEmail("")
            setPassword("")
            setNewPassword("")
            setEditingStaff(null)
            fetchStaffList()
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setIsLoading(false)
        }
    }

    const handleDelete = async (staff: Staff) => {
        if (userRole === "co_founder") {
            toast.error("Co-founderlarda o'chirish huquqi yo'q")
            return
        }
        if (staff.uid === user.uid) {
            toast.error("O'zingizni o'chira olmaysiz")
            return
        }

        if (!confirm(`${staff.name}ni o'chirmoqchimisiz?`)) return

        try {
            const response = await fetch("/api/delete-user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ uid: staff.uid, adminUid: user.uid })
            })
            if (!response.ok) throw new Error("O'chirishda xatolik")
            toast.success("O'chirildi")
            fetchStaffList()
        } catch (error: any) {
            toast.error(error.message)
        }
    }

    const filteredStaff = staffList.filter(s =>
        (s.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.email || "").toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="grid gap-6 md:grid-cols-3 animate-in fade-in duration-500">
            {userRole === "super_admin" && (
                <Card className="md:col-span-1 border-none shadow-xl bg-white dark:bg-zinc-900">
                    <CardHeader>
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                            {editingStaff ? <Edit className="w-5 h-5 text-blue-500" /> : <UserPlus className="w-5 h-5 text-blue-500" />}
                            {editingStaff ? "Tahrirlash" : "Yangi Co-Founder"}
                        </CardTitle>
                        <CardDescription>Tizim boshqaruvchilari ro'yxatini boshqaring</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleRegister} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Ism</Label>
                                <Input value={name || ""} onChange={e => setName(e.target.value)} required placeholder="Ism sharif" />
                            </div>
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input type="email" value={email || ""} onChange={e => setEmail(e.target.value)} required disabled={!!editingStaff} placeholder="email@example.com" />
                            </div>
                            {!editingStaff ? (
                                <div className="space-y-2">
                                    <Label>Parol</Label>
                                    <div className="relative">
                                        <Input type={showPassword ? "text" : "password"} value={password || ""} onChange={e => setPassword(e.target.value)} required minLength={6} />
                                        <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full" onClick={() => setShowPassword(!showPassword)}>
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Label>Yangi Parol (Ixtiyoriy)</Label>
                                    <Input type="password" value={newPassword || ""} onChange={e => setNewPassword(e.target.value)} minLength={6} />
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label>Rol</Label>
                                <Select value={role} onValueChange={setRole}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="super_admin">Super Admin</SelectItem>
                                        <SelectItem value="co_founder">Co-Founder</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <Button type="submit" className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600" disabled={isLoading}>
                                    {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    {editingStaff ? "Saqlash" : "Qo'shish"}
                                </Button>
                                {editingStaff && (
                                    <Button type="button" variant="outline" onClick={() => { setEditingStaff(null); setName(""); setEmail(""); setRole("co_founder"); }}>
                                        Bekor qilish
                                    </Button>
                                )}
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            <Card className={cn(
                "border-none shadow-xl bg-white dark:bg-zinc-900",
                userRole === "super_admin" ? "md:col-span-2" : "md:col-span-3"
            )}>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-green-500" /> Jamoa
                    </CardTitle>
                    <div className="relative w-48">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <Input className="pl-8 h-8 text-xs" placeholder="Qidirish..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {isLoadingStaff ? (
                            <div className="py-10 text-center text-zinc-400"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" /> Yuklanmoqda...</div>
                        ) : filteredStaff.map(staff => (
                            <div key={staff.id} className="flex items-center justify-between p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${staff.role === 'super_admin' ? 'bg-zinc-900 text-white' : 'bg-blue-100 text-blue-600'}`}>
                                        {(staff.name || "?").substring(0, 1).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="font-bold flex items-center gap-2">
                                            {staff.name || "Nomsiz"}
                                            <Badge variant={staff.role === 'super_admin' ? 'default' : 'secondary'} className="text-[10px] h-4 px-1.5">
                                                {staff.role === 'super_admin' ? 'S.Admin' : 'Co-Founder'}
                                            </Badge>
                                        </div>
                                        <div className="text-xs text-zinc-400">{staff.email}</div>
                                    </div>
                                </div>
                                {userRole === "super_admin" && (
                                    <div className="flex gap-2">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500" onClick={() => {
                                            setEditingStaff(staff)
                                            setName(staff.name)
                                            setEmail(staff.email)
                                            setRole(staff.role)
                                        }}>
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDelete(staff)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))}
                        {!isLoadingStaff && filteredStaff.length === 0 && (
                            <div className="py-10 text-center text-zinc-400 italic">Hech kim topilmadi</div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
