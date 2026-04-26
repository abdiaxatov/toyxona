"use client"

import { Button } from "@/components/ui/button"
import { ClipboardList, ShoppingBag } from "lucide-react"
import { motion } from "framer-motion"
import { useLanguage } from "@/hooks/use-language"

interface ViewMyOrdersButtonProps {
  onClick?: () => void;
}

export function ViewMyOrdersButton({ onClick }: ViewMyOrdersButtonProps) {
  const { t } = useLanguage();

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="w-full"
    >
      <Button
        onClick={onClick}
        className="w-full h-14 rounded-2xl bg-black dark:bg-zinc-900 border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.3)] flex items-center justify-between px-6 group relative overflow-hidden"
      >
        {/* Shine Animation */}
        <div className="absolute inset-x-[-100%] top-0 bottom-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[45deg] animate-[shine_3s_infinite]" />

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center transition-transform group-hover:scale-110">
            <ShoppingBag className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-black uppercase tracking-widest text-sm">
            Buyurtmalarim
          </span>
        </div>

        <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full border border-white/5">
          <ClipboardList className="w-4 h-4 text-white/70" />
          <span className="text-[10px] text-white font-bold uppercase tracking-widest">Ko'rish</span>
        </div>
      </Button>
    </motion.div>
  )
}
