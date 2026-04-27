"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Info, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

interface BronTabProps {
  restaurantId: string;
  primaryColor?: string;
}

interface BusyDate {
  id: string;
  date: string; // YYYY-MM-DD
  status: "busy" | "available";
  note?: string;
}

export function BronTab({ restaurantId, primaryColor = "#f43f5e" }: BronTabProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [busyDates, setBusyDates] = useState<Record<string, BusyDate>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!restaurantId) return;

    const busyDatesRef = collection(db, "restaurants", restaurantId, "busy_dates");
    const unsubscribe = onSnapshot(busyDatesRef, (snapshot) => {
      const dates: Record<string, BusyDate> = {};
      snapshot.docs.forEach((doc) => {
        const data = doc.data() as BusyDate;
        dates[data.date] = { ...data, id: doc.id };
      });
      setBusyDates(dates);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [restaurantId]);

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const monthNames = [
    "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
    "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"
  ];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const totalDays = daysInMonth(year, month);
  const startDay = firstDayOfMonth(year, month);

  const days = [];
  // Adjust for Monday start (0 is Sunday in JS, but we want 1-Monday to 0-Sunday or 1-Monday to 7-Sunday)
  // Let's stick to standard 0-Sunday but display it nicely.
  
  // Fill empty slots
  for (let i = 0; i < (startDay === 0 ? 6 : startDay - 1); i++) {
    days.push(null);
  }

  for (let i = 1; i <= totalDays; i++) {
    days.push(i);
  }

  const isDateBusy = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return busyDates[dateStr]?.status === "busy";
  };

  const getNote = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return busyDates[dateStr]?.note;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white/10 dark:bg-black/40 backdrop-blur-3xl rounded-[32px] border border-white/20 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary/20 ring-1 ring-primary/30">
              <CalendarIcon className="w-6 h-6 text-primary" style={{ color: primaryColor }} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight">{monthNames[month]}</h2>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{year}-yil</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={prevMonth}
              className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all active:scale-90"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextMonth}
              className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all active:scale-90"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-4">
          {["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"].map((d) => (
            <div key={d} className="text-center text-[10px] font-black text-zinc-400 uppercase tracking-widest py-2">
              {d}
            </div>
          ))}
          {days.map((day, idx) => {
            if (day === null) return <div key={`empty-${idx}`} />;
            
            const busy = isDateBusy(day);
            const today = new Date();
            const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;

            return (
              <motion.div
                key={day}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "relative aspect-square flex flex-col items-center justify-center rounded-2xl text-sm font-black transition-all border",
                  busy 
                    ? "bg-red-500/10 border-red-500/20 text-red-500" 
                    : "bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-100 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200",
                  isToday && !busy && "ring-2 ring-primary ring-offset-2 ring-offset-transparent",
                  isToday && busy && "ring-2 ring-red-500 ring-offset-2 ring-offset-transparent"
                )}
              >
                {day}
                {busy && (
                  <div className="absolute bottom-1.5 w-1 h-1 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                )}
              </motion.div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-4 pt-4 border-t border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Band (To'yxona bant)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Bo'sh</span>
          </div>
        </div>
      </div>

      <div className="p-5 rounded-[28px] bg-amber-50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-900/30 flex gap-4">
        <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center shrink-0">
          <Info className="w-5 h-5 text-amber-600" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-black text-amber-900 dark:text-amber-100 uppercase tracking-tight">Eslatma</h4>
          <p className="text-xs font-medium text-amber-800/80 dark:text-amber-200/60 leading-relaxed">
            Agar siz to'yxonani bron qilmoqchi bo'lsangiz, avval taomlarni tanlang va buyurtma berish jarayonida o'zingizga kerakli sanani tanlang. Bizning adminlarimiz siz bilan bog'lanishadi.
          </p>
        </div>
      </div>
    </div>
  );
}
