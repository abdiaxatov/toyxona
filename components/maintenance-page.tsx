"use client";

import React from "react";
import { motion } from "framer-motion";
import { Hammer, Clock, ArrowLeft, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MaintenancePageProps {
  restaurantName?: string;
  logoUrl?: string;
}

export function MaintenancePage({ restaurantName = "Restoran", logoUrl }: MaintenancePageProps) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-[#0f172a] text-white relative overflow-hidden font-sans">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
      
      {/* Content Container */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="max-w-md w-full text-center relative z-10 space-y-8"
      >
        {/* Logo/Icon Section */}
        <div className="relative inline-block">
          <motion.div
            animate={{ 
              rotate: [0, 10, -10, 0],
              y: [0, -5, 0]
            }}
            transition={{ 
              duration: 4, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="w-24 h-24 md:w-32 md:h-32 mx-auto rounded-[2rem] bg-gradient-to-br from-blue-500 to-indigo-700 p-0.5 shadow-2xl shadow-blue-500/30"
          >
            <div className="w-full h-full rounded-[1.9rem] bg-slate-900 flex items-center justify-center overflow-hidden">
              {logoUrl ? (
                <img src={logoUrl} alt={restaurantName} className="w-full h-full object-cover" />
              ) : (
                <Hammer className="w-12 h-12 md:w-16 md:h-16 text-blue-400" />
              )}
            </div>
          </motion.div>
          
          <motion.div 
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -top-2 -right-2 bg-amber-500 text-slate-900 p-2 rounded-full shadow-lg"
          >
            <RefreshCw className="w-4 h-4 animate-spin-slow" />
          </motion.div>
        </div>

        {/* Text Content */}
        <div className="space-y-4">
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-3xl md:text-4xl font-black tracking-tight"
          >
            {restaurantName}
          </motion.h1>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-bold uppercase tracking-wider"
          >
            <Clock className="w-4 h-4" />
            Vaqtincha yangilanish ketyapdi
          </motion.div>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-slate-400 text-lg leading-relaxed"
          >
            Tizimda profilaktika ishlari olib borilmoqda. Tez orada biz yana ishga tushamiz. Sabringiz uchun rahmat!
          </motion.p>
        </div>

        {/* Progress Decoration */}
        <motion.div 
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 1, duration: 1.5 }}
          className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden"
        >
          <motion.div 
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="h-full w-1/3 bg-gradient-to-r from-transparent via-blue-500 to-transparent"
          />
        </motion.div>

        {/* Contact/Back Section */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="pt-4 flex flex-col gap-4"
        >
          <Button 
            onClick={() => window.location.reload()}
            className="h-12 bg-white text-slate-900 hover:bg-slate-200 font-bold rounded-2xl transition-all active:scale-95 group"
          >
            <RefreshCw className="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-500" />
            Sahifani yangilash
          </Button>
          
          <div className="flex items-center justify-center gap-2 text-slate-500 text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-500/50" />
          </div>
        </motion.div>
      </motion.div>

      {/* Footer Credit */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 text-slate-600 text-[10px] uppercase tracking-[0.3em] font-bold"
      >
        Powered by <span className="text-blue-500/50">Abdiaxatov IT</span>
      </motion.div>

      <style jsx global>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
}
