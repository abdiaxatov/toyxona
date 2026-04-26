"use client"

import { AlertTriangle, CreditCard, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function PaymentBanner() {
    return (
        <div className="mx-2 mt-4 md:mx-6 md:mt-0 mb-4 animate-in slide-in-from-top duration-500">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-[1px] shadow-xl shadow-orange-500/20">
                <div className="relative px-6 py-4 bg-white dark:bg-zinc-950 rounded-[15px] flex flex-col md:flex-row items-center justify-between gap-4">
                    {/* Decorative Background Element */}
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

                    <div className="flex items-center gap-4 relative z-10">
                        <div className="hidden sm:flex w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-950/30 items-center justify-center text-orange-600 ring-4 ring-orange-500/5">
                            <AlertTriangle className="w-6 h-6 animate-pulse" />
                        </div>
                        <div className="text-center md:text-left">
                            <h4 className="font-black text-zinc-900 dark:text-white flex items-center gap-2 justify-center md:justify-start">
                                <span className="sm:hidden text-orange-600"><AlertTriangle className="w-4 h-4" /></span>
                                TO'LOV MUDDATI KELDI
                            </h4>
                            <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">
                                Xizmatlardan to'liq va uzilishlarsiz foydalanish uchun hisobingizni to'ldiring.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 relative z-10 w-full md:w-auto">
                        <Button
                            variant="outline"
                            className="hidden lg:flex border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-xl px-6"
                        >
                            Keyinroq
                        </Button>
                        <Button
                            onClick={() => window.open('https://t.me/abdiaxatov', '_blank')}
                            className="flex-1 md:flex-none bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white border-none shadow-lg shadow-orange-500/30 rounded-xl px-8 h-11 font-bold group"
                        >
                            <CreditCard className="w-4 h-4 mr-2" />
                            TO'LOV QILING
                            <ChevronRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
