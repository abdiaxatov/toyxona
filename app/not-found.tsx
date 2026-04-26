"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { UtensilsCrossed, Home, ArrowLeft } from "lucide-react"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4 text-center relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -z-10" />

      <div className="max-w-md space-y-8 relative z-10">
        <div className="relative mx-auto w-32 h-32 flex items-center justify-center mb-8">
          <div className="absolute inset-0 bg-primary/10 rounded-full animate-pulse" />
          <div className="absolute inset-4 bg-primary/20 rounded-full" />
          <UtensilsCrossed className="w-16 h-16 text-primary relative z-10" />
        </div>

        <div className="space-y-4">
          <h1 className="text-8xl font-black text-primary/20 tracking-tighter select-none">404</h1>
          <h2 className="text-4xl font-bold tracking-tight">Sahifa Yangilanish ishlari ketmoqda</h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Kechirasiz, ushbu sahifa yangilanishda.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
          <Button variant="outline" size="lg" className="gap-2" onClick={() => window.history.back()}>
            <ArrowLeft className="w-5 h-5" />
            Ortga qaytish
          </Button>
          <Button asChild size="lg" className="gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
            <Link href="/">
              <Home className="w-5 h-5" />
              Bosh sahifa
            </Link>
          </Button>
        </div>

        <div className="pt-12 text-sm text-muted-foreground/60">
          Menu&copy; {new Date().getFullYear()}
        </div>
      </div>
    </div>
  )
}
