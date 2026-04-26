"use client"

import { AlertTriangle, CreditCard, ArrowRight, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { auth } from "@/lib/firebase"
import { signOut } from "firebase/auth"

interface PaymentRequiredProps {
    isAdmin?: boolean
    restaurantName?: string
}

export function PaymentRequired({ isAdmin, restaurantName }: PaymentRequiredProps) {
    const handleSignOut = async () => {
        await signOut(auth)
        window.location.href = "/admin/login"
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-zinc-950 p-4 md:p-8 overflow-hidden relative">
            {/* Animated Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-600/20 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-600/20 rounded-full blur-[120px] animate-pulse delay-700" />
            </div>

            <div className="max-w-2xl w-full relative z-10">
                <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-[2.5rem] p-8 md:p-12 text-center shadow-2xl">
                    <div className="mb-8 flex justify-center">
                        <div className="relative">
                            <div className="absolute inset-0 bg-orange-600 rounded-full blur-2xl opacity-20 animate-ping" />
                            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white shadow-xl ring-8 ring-zinc-900/50">
                                <AlertTriangle className="w-12 h-12" />
                            </div>
                        </div>
                    </div>

                    <h1 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tighter">
                        TO'LOV MUDDATI KELDI
                    </h1>

                    <p className="text-zinc-400 text-lg md:text-xl font-medium mb-8 leading-relaxed max-w-lg mx-auto">
                        <span className="text-orange-500 font-bold">{restaurantName || "Restoran"}</span> tizimidan foydalanish vaqtincha to'xtatilgan. Xizmatlarni davom ettirish uchun hisobingizni to'ldiring.
                    </p>

                    <div className="space-y-4">
                        <Button
                            onClick={() => window.open('https://t.me/abdiaxatov', '_blank')}
                            className="w-full h-16 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white border-none rounded-2xl text-xl font-bold shadow-xl shadow-orange-900/20 transition-all hover:scale-[1.02] active:scale-95 group"
                        >
                            <CreditCard className="w-6 h-6 mr-3" />
                            TO'LOV QILING
                            <ArrowRight className="w-6 h-6 ml-2 transition-transform group-hover:translate-x-1" />
                        </Button>

                        {isAdmin && (
                            <Button
                                variant="ghost"
                                onClick={handleSignOut}
                                className="w-full h-14 text-zinc-500 hover:text-white hover:bg-zinc-800/50 rounded-2xl text-lg font-medium"
                            >
                                <LogOut className="w-5 h-5 mr-2" />
                                Chiqish (Log out)
                            </Button>
                        )}
                    </div>

                    <div className="mt-12 pt-8 border-t border-zinc-800 flex flex-col md:flex-row items-center justify-center gap-6">
                        <div className="flex -space-x-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="w-10 h-10 rounded-full border-2 border-zinc-900 bg-zinc-800" />
                            ))}
                        </div>
                        <p className="text-zinc-500 text-sm font-medium italic">
                            +100 dan ortiq restoranlar biz bilan muvaffaqiyatli ishlamoqda
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
