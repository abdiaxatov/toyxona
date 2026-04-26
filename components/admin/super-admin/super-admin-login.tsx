"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { signInWithEmailAndPassword } from "firebase/auth"
import { doc, getDoc, getDocs, query, collection, where } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2, Shield, Lock } from "lucide-react"

export function SuperAdminLogin() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                const userDoc = await getDocs(query(collection(db, "users"), where("__name__", "==", user.uid))) // fetching by ID safely or just getDoc
                // We need to use getDoc for ID lookup, but here I'll stick to simple auth check or re-fetch role if needed.
                // Best is to use getDoc.
                const snap = await getDoc(doc(db, "users", user.uid))
                if (snap.exists() && snap.data().role === "super_admin") {
                    router.push("/admin/super-admin")
                }
            }
        })
        return () => unsubscribe()
    }, [router])

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password)
            const user = userCredential.user

            // Check role in Firestore
            const userDoc = await getDoc(doc(db, "users", user.uid))
            if (userDoc.exists()) {
                const userData = userDoc.data()
                if (userData.role === "super_admin") {
                    toast.success("Xush kelibsiz, Super Admin!")
                    router.push("/admin/super-admin")
                } else {
                    toast.error("Kirish taqiqlangan", {
                        description: "Siz Super Admin emassiz."
                    })
                    await auth.signOut()
                }
            } else {
                toast.error("Foydalanuvchi topilmadi")
                await auth.signOut()
            }
        } catch (error: any) {
            console.error("Login error:", error)
            toast.error("Kirishda xatolik", {
                description: "Email yoki parol noto'g'ri bo'lishi mumkin"
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
            {/* Background Effect */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-[30%] -left-[10%] w-[70%] h-[70%] rounded-full bg-purple-900/20 blur-3xl" />
                <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] rounded-full bg-blue-900/20 blur-3xl" />
            </div>

            <Card className="w-full max-w-md relative z-10 border-gray-800 bg-gray-950/50 backdrop-blur-xl shadow-2xl">
                <CardHeader className="space-y-1 text-center">
                    <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-gradient-to-tr from-purple-500 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                        <Shield className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-white tracking-wide">
                        Super Admin
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                        Tizimni boshqarish uchun maxsus kirish
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-gray-300">Email</Label>
                            <div className="relative">
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="admin@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="bg-gray-900/50 border-gray-800 text-white placeholder:text-gray-600 focus:border-purple-500 focus:ring-purple-500/20 pl-10"
                                    required
                                />
                                <Shield className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-gray-300">Parol</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="bg-gray-900/50 border-gray-800 text-white placeholder:text-gray-600 focus:border-purple-500 focus:ring-purple-500/20 pl-10"
                                    required
                                />
                                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                            </div>
                        </div>
                        <Button
                            type="submit"
                            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg shadow-purple-900/20 border-0"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Tekshirilmoqda...
                                </>
                            ) : (
                                "Kirish"
                            )}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <p className="text-xs text-gray-600">
                        Himoyalangan tizim. IP manzil qayd etiladi.
                    </p>
                </CardFooter>
            </Card>
        </div>
    )
}
