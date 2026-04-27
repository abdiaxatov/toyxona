"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, doc, setDoc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRestaurant } from "@/components/admin/restaurant-provider";
import { useAuth } from "@/components/admin/admin-auth-provider";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Trash2, Info, CheckCircle2, XCircle, ShoppingBag, Package, Utensils, User, Phone, Search, ArrowRightLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { motion, AnimatePresence } from "framer-motion";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BusyDate {
  id: string;
  date: string;
  status: "busy" | "available";
  note?: string;
}

export function BookingsManagement() {
  const { restaurant } = useRestaurant();
  const { restaurantId } = useAuth();
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [busyDates, setBusyDates] = useState<Record<string, BusyDate>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [linkedOrder, setLinkedOrder] = useState<any>(null);
  const [isFetchingOrder, setIsFetchingOrder] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [dateToDelete, setDateToDelete] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [selectedMenuItems, setSelectedMenuItems] = useState<{id:string;name:string;price:number;qty:number}[]>([]);
  const [menuSearch, setMenuSearch] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [moveTargetDate, setMoveTargetDate] = useState("");

  useEffect(() => {
    const fetchLinkedOrder = async () => {
      if (!restaurant?.id || !selectedDate || !busyDates[selectedDate]?.status) {
        setLinkedOrder(null);
        return;
      }

      const orderId = (busyDates[selectedDate] as any).orderId;
      if (orderId) {
        setIsFetchingOrder(true);
        try {
          const orderDoc = await getDoc(doc(db, "restaurants", restaurant.id, "orders", orderId));
          if (orderDoc.exists()) {
            setLinkedOrder({ id: orderDoc.id, ...orderDoc.data() });
          } else {
            setLinkedOrder(null);
          }
        } catch (error) {
          console.error("Error fetching linked order:", error);
          setLinkedOrder(null);
        }
        setIsFetchingOrder(false);
      } else {
        setLinkedOrder(null);
      }
    };

    fetchLinkedOrder();
  }, [selectedDate, busyDates, restaurant?.id]);

  useEffect(() => {
    if (!restaurant?.id) return;
    const busyDatesRef = collection(db, "restaurants", restaurant.id, "busy_dates");
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
  }, [restaurant?.id]);

  useEffect(() => {
    if (!restaurantId) return;
    // No orderBy to avoid index requirement — sort client-side
    const unsub = onSnapshot(collection(db, "restaurants", restaurantId, "menuItems"), (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      items.sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
      setMenuItems(items);
    });
    return () => unsub();
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
  for (let i = 0; i < (startDay === 0 ? 6 : startDay - 1); i++) {
    days.push(null);
  }
  for (let i = 1; i <= totalDays; i++) {
    days.push(i);
  }

  const handleDateClick = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateStr);
    const d = busyDates[dateStr] as any;
    setNote(d?.note || "");
    setMenuSearch("");
    setSelectedMenuItems(d?.menuItems || []);
    setCustomerName(d?.customerName || "");
    setPhoneNumber(d?.phoneNumber || "");
    setGuestCount(d?.guestCount ? String(d.guestCount) : "");
  };

  const handleUpdateNote = async () => {
    if (!restaurant?.id || !selectedDate) return;
    setIsSaving(true);
    try {
      await setDoc(doc(db, "restaurants", restaurant.id, "busy_dates", selectedDate), {
        note,
        customerName,
        phoneNumber,
        guestCount: guestCount ? Number(guestCount) : null,
        updatedAt: new Date()
      }, { merge: true });
      toast({ title: "Muvaffaqiyatli", description: "Ma'lumotlar yangilandi" });
    } catch (error) {
      toast({ title: "Xatolik", description: "Yangilashda xatolik", variant: "destructive" });
    }
    setIsSaving(false);
  };

  const handlePrintMenu = () => {
    if (!linkedOrder) return;
    
    const printContent = `
      <html>
        <head>
          <title>Buyurtma #${linkedOrder.id.slice(-4).toUpperCase()}</title>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #333; }
            .header { border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
            .title { font-size: 28px; font-weight: 900; text-transform: uppercase; margin: 0; }
            .info { margin-bottom: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .info-label { font-size: 10px; font-weight: 900; text-transform: uppercase; color: #999; margin-bottom: 4px; }
            .info-value { font-size: 16px; font-weight: 700; color: #000; }
            .item { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #eee; }
            .item-name { font-weight: 700; font-size: 14px; }
            .item-qty { font-weight: 900; color: #666; margin-right: 10px; }
            .item-price { font-weight: 900; }
            .total { margin-top: 30px; padding-top: 20px; border-top: 2px solid #000; text-align: right; font-size: 20px; font-weight: 900; }
            .footer { margin-top: 60px; text-align: center; font-size: 10px; color: #999; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; }
            @media print {
              body { padding: 20px; }
              @page { margin: 2cm; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">To'y Taomnomasi</h1>
            <div style="font-weight: 700; margin-top: 5px; color: #666;">Sana: ${selectedDate}</div>
          </div>
          <div class="info">
            <div>
              <div class="info-label">Mijoz</div>
              <div class="info-value">${linkedOrder.customerName || "Mijoz"}</div>
            </div>
            <div>
              <div class="info-label">Telefon</div>
              <div class="info-value">${linkedOrder.phoneNumber || linkedOrder.customerPhone || "—"}</div>
            </div>
            <div>
              <div class="info-label">Mehmonlar soni</div>
              <div class="info-value">${linkedOrder.guestCount || "?"} kishi</div>
            </div>
            <div>
              <div class="info-label">Buyurtma ID</div>
              <div class="info-value">#${linkedOrder.id.slice(-4).toUpperCase()}</div>
            </div>
          </div>
          <div style="font-weight: 900; text-transform: uppercase; font-size: 12px; margin-bottom: 10px; border-bottom: 1px solid #000; padding-bottom: 5px;">Taomlar ro'yxati</div>
          ${linkedOrder.items?.map((item: any) => `
            <div class="item">
              <div>
                <span class="item-qty">${item.quantity} x</span>
                <span class="item-name">${item.name}</span>
                ${item.variantName ? `<div style="font-size: 11px; color: #666; margin-left: 30px;">${item.variantName}</div>` : ''}
              </div>
              <div class="item-price">${(item.price * item.quantity).toLocaleString()} so'm</div>
            </div>
          `).join('')}
          <div class="total">
            Jami summa: ${linkedOrder.total?.toLocaleString()} so'm
          </div>
          <div class="footer">
            ${restaurant?.name || "To'yxona boshqaruv tizimi"}
          </div>
        </body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(printContent);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 500);
    }
  };

  const confirmDelete = (dateStr: string) => {
    setDateToDelete(dateStr);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirmed = async () => {
    if (!restaurant?.id || !dateToDelete) return;
    setIsSaving(true);
    try {
      await deleteDoc(doc(db, "restaurants", restaurant.id, "busy_dates", dateToDelete));
      toast({ title: "Muvaffaqiyatli", description: "Sana bo'shatildi" });
      setNote("");
      setSelectedDate(null);
    } catch (error) {
      toast({ title: "Xatolik", description: "O'chirishda xatolik", variant: "destructive" });
    }
    setIsSaving(false);
    setIsDeleteDialogOpen(false);
    setDateToDelete(null);
  };

  const toggleBusyStatus = async (dateStr: string) => {
    if (!restaurant?.id) return;
    
    const isBusy = busyDates[dateStr]?.status === "busy";
    if (isBusy) {
      confirmDelete(dateStr);
      return;
    }

    setIsSaving(true);
    try {
      await setDoc(doc(db, "restaurants", restaurant.id, "busy_dates", dateStr), {
        date: dateStr,
        status: "busy",
        note,
        customerName,
        phoneNumber,
        guestCount: guestCount ? Number(guestCount) : null,
        menuItems: selectedMenuItems,
        updatedAt: new Date()
      });
      toast({ title: "Muvaffaqiyatli", description: "Sana band qilindi" });
      setSelectedDate(null);
      setSelectedMenuItems([]);
      setCustomerName("");
      setPhoneNumber("");
      setGuestCount("");
      setNote("");
    } catch (error) {
      toast({ title: "Xatolik", description: "Saqlashda xatolik yuz berdi", variant: "destructive" });
    }
    setIsSaving(false);
  };

  const saveMenuItems = async () => {
    if (!restaurant?.id || !selectedDate) return;
    setIsSaving(true);
    try {
      await setDoc(doc(db, "restaurants", restaurant.id, "busy_dates", selectedDate), {
        menuItems: selectedMenuItems,
        updatedAt: new Date()
      }, { merge: true });
      toast({ title: "Saqlandi", description: "Taomnoma yangilandi" });
    } catch {
      toast({ title: "Xatolik", description: "Saqlashda xatolik", variant: "destructive" });
    }
    setIsSaving(false);
  };

  const handleMoveBooking = async () => {
    if (!restaurant?.id || !selectedDate || !moveTargetDate) return;
    if (selectedDate === moveTargetDate) {
      toast({ title: "Xatolik", description: "Sana bir xil bo'lmasligi kerak", variant: "destructive" });
      return;
    }
    if (busyDates[moveTargetDate]) {
      toast({ title: "Xatolik", description: "Tanlangan sana allaqachon band", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const sourceData = busyDates[selectedDate];
      // Copy to new date
      await setDoc(doc(db, "restaurants", restaurant.id, "busy_dates", moveTargetDate), {
        ...sourceData,
        date: moveTargetDate,
        updatedAt: new Date()
      });
      // Delete old date
      await deleteDoc(doc(db, "restaurants", restaurant.id, "busy_dates", selectedDate));
      
      toast({ title: "Muvaffaqiyatli", description: `Toy ${moveTargetDate} sanaga ko'chirildi` });
      setSelectedDate(moveTargetDate);
      setIsMoveDialogOpen(false);
      setMoveTargetDate("");
    } catch (error) {
      toast({ title: "Xatolik", description: "Ko'chirishda xatolik yuz berdi", variant: "destructive" });
    }
    setIsSaving(false);
  };

  const toggleMenuItem = (item: any) => {
    setSelectedMenuItems(prev => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) return prev.filter(i => i.id !== item.id);
      return [...prev, { id: item.id, name: item.name || item.name_uz, price: item.price || 0, qty: 1 }];
    });
  };

  const updateItemQty = (id: string, qty: number) => {
    if (qty <= 0) { setSelectedMenuItems(prev => prev.filter(i => i.id !== id)); return; }
    setSelectedMenuItems(prev => prev.map(i => i.id === id ? { ...i, qty } : i));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Plus className="w-8 h-8 animate-spin text-primary opacity-20" />
      </div>
    );
  }

  const sortedUpcomingBusyDates = Object.values(busyDates)
    .filter(d => d.status === "busy" && new Date(d.date) >= new Date(new Date().setHours(0,0,0,0)))
    .sort((a, b) => a.date.localeCompare(b.date));

  const filteredMenu = menuItems.filter(m => (m.name || m.name_uz || "").toLowerCase().includes(menuSearch.toLowerCase()));

  return (
    <div className="space-y-4 md:space-y-6 w-full max-w-[1600px] mx-auto px-2 md:px-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-black tracking-tight text-zinc-900 dark:text-white">Bron Kalendari</h1>
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px] md:text-xs mt-1 md:mt-2 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            To'yxona band kunlarini boshqarish
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-8">
        <div className="lg:col-span-8 space-y-4 md:space-y-6">
          <Card className="border-2 border-zinc-100 dark:border-zinc-800 rounded-[24px] md:rounded-[28px] overflow-hidden shadow-xl shadow-zinc-200/30 dark:shadow-none">
            <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-4 md:p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="h-8 w-8 md:h-9 md:w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <CalendarIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base md:text-lg font-black uppercase tracking-tight">{monthNames[month]}</CardTitle>
                    <p className="text-[10px] md:text-xs font-bold text-zinc-400">{year}-yil</p>
                  </div>
                </div>
                <div className="flex gap-1 md:gap-1.5">
                  <Button variant="outline" size="icon" onClick={prevMonth} className="h-8 w-8 md:h-9 md:w-9 rounded-lg md:rounded-xl border-2 hover:bg-zinc-50 transition-all active:scale-95"><ChevronLeft className="w-3.5 h-3.5 md:w-4 md:h-4" /></Button>
                  <Button variant="outline" size="icon" onClick={nextMonth} className="h-8 w-8 md:h-9 md:w-9 rounded-lg md:rounded-xl border-2 hover:bg-zinc-50 transition-all active:scale-95"><ChevronRight className="w-3.5 h-3.5 md:w-4 md:h-4" /></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-2 md:p-4">
              <div className="grid grid-cols-7 gap-1.5">
                {["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"].map((d) => (
                  <div key={d} className="text-center text-[10px] font-black text-zinc-400 uppercase tracking-widest pb-2">
                    {d}
                  </div>
                ))}
                {days.map((day, idx) => {
                  if (day === null) return <div key={`empty-${idx}`} />;
                  
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const busy = busyDates[dateStr]?.status === "busy";
                  const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
                  const isSelected = selectedDate === dateStr;

                  return (
                    <motion.button
                      key={day}
                      whileHover={{ scale: 1.06 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => handleDateClick(day)}
                      className={cn(
                        "aspect-square rounded-xl md:rounded-[16px] flex flex-col items-center justify-center text-xs md:text-sm font-black transition-all border-2 relative group",
                        busy 
                          ? "bg-rose-50 border-rose-100 text-rose-600 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-400" 
                          : isToday
                            ? "bg-primary/5 border-primary/20 text-primary"
                            : "bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800/50 text-zinc-800 dark:text-zinc-200",
                        isSelected && "border-primary ring-2 ring-primary/10 shadow-md shadow-primary/10 z-10"
                      )}
                    >
                      {day}
                      {busy && (
                        <div className="absolute top-2 right-2">
                          <div className="h-2 w-2 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" />
                        </div>
                      )}
                      {isToday && !busy && (
                        <div className="absolute bottom-2 h-1 w-1 rounded-full bg-primary" />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-zinc-100 dark:border-zinc-800 rounded-[28px] overflow-hidden bg-white dark:bg-zinc-900/50 shadow-xl shadow-zinc-200/20">
            <CardHeader className="p-4 md:p-5 border-b border-zinc-50 dark:border-zinc-800">
              <CardTitle className="text-xs md:text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" />
                Yaqindagi band kunlar
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[280px] md:h-[400px]">
                <div className="divide-y divide-zinc-50 dark:divide-zinc-800">
                  {sortedUpcomingBusyDates.length === 0 ? (
                    <div className="p-10 text-center space-y-2">
                      <CalendarIcon className="w-8 h-8 text-zinc-200 mx-auto" />
                      <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Hozircha band kunlar yo'q</p>
                    </div>
                  ) : sortedUpcomingBusyDates.map((d) => (
                    <div key={d.id} className="p-3 md:p-4 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group cursor-pointer"
                      onClick={() => {
                        const dateObj = new Date(d.date);
                        setCurrentDate(dateObj);
                        setSelectedDate(d.date);
                        const bd = d as any;
                        setNote(bd.note || "");
                        setCustomerName(bd.customerName || "");
                        setPhoneNumber(bd.phoneNumber || "");
                        setGuestCount(bd.guestCount ? String(bd.guestCount) : "");
                        setSelectedMenuItems(bd.menuItems || []);
                        setMenuSearch("");
                      }}>
                      <div className="flex items-center gap-3 md:gap-4">
                        <div className="h-9 w-9 md:h-10 md:w-10 rounded-xl bg-rose-50 dark:bg-rose-950/30 flex flex-col items-center justify-center border border-rose-100 dark:border-rose-900/30 shrink-0">
                          <span className="text-[9px] font-black text-rose-400 leading-none mb-0.5">{new Date(d.date).toLocaleString('uz', { month: 'short' })}</span>
                          <span className="text-xs md:text-sm font-black text-rose-600 dark:text-rose-400 leading-none">{new Date(d.date).getDate()}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-zinc-900 dark:text-white truncate">
                            {(d as any).customerName || d.note || "Ismsiz bron"}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
                            {(d as any).phoneNumber && (
                              <span className="text-[9px] md:text-[10px] font-bold text-zinc-400 flex items-center gap-1">
                                <Phone className="w-2.5 h-2.5" />{(d as any).phoneNumber}
                              </span>
                            )}
                            {(d as any).guestCount && (
                              <span className="text-[9px] md:text-[10px] font-bold text-zinc-400 flex items-center gap-1">
                                <Package className="w-2.5 h-2.5" />{(d as any).guestCount} kishi
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-300 group-hover:text-primary transition-colors shrink-0" />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <Card className="border-2 border-zinc-100 dark:border-zinc-800 rounded-[32px] shadow-2xl shadow-zinc-200/50 dark:shadow-none sticky top-6">
            <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 p-8">
              <CardTitle className="text-lg font-black uppercase tracking-tight">Sana boshqaruvi</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-180px)] custom-scrollbar">
              <AnimatePresence mode="wait">
                {selectedDate ? (
                  <motion.div 
                    key={selectedDate}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="p-6 rounded-3xl bg-zinc-50 dark:bg-zinc-800/50 border-2 border-zinc-100 dark:border-zinc-800">
                      <div className="flex items-center gap-3 mb-2">
                        <CalendarIcon className="w-4 h-4 text-primary" />
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Sana</span>
                      </div>
                      <p className="text-2xl font-black text-zinc-900 dark:text-white">
                        {new Date(selectedDate).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    
                    {/* Customer Info */}
                    <div className="space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-1.5">
                        <User className="w-3 h-3" />
                        Mijoz ma'lumotlari
                      </p>
                      <div className="space-y-2">
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                          <Input
                            placeholder="Mijoz ismi (To'y egasi)..."
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            className="h-11 pl-10 rounded-xl border-2 focus-visible:ring-primary/20 bg-white dark:bg-zinc-900 text-sm"
                          />
                        </div>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                          <Input
                            placeholder="+998 90 123 45 67"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            type="tel"
                            className="h-11 pl-10 rounded-xl border-2 focus-visible:ring-primary/20 bg-white dark:bg-zinc-900 text-sm"
                          />
                        </div>
                        <div className="relative">
                          <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                          <Input
                            placeholder="Mehmonlar soni (kishi)..."
                            value={guestCount}
                            onChange={(e) => setGuestCount(e.target.value.replace(/\D/g, ""))}
                            type="number"
                            min="1"
                            className="h-11 pl-10 rounded-xl border-2 focus-visible:ring-primary/20 bg-white dark:bg-zinc-900 text-sm"
                          />
                        </div>
                        <Input
                          placeholder="Eslatma (ixtiyoriy)..."
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          className="h-11 rounded-xl border-2 focus-visible:ring-primary/20 bg-white dark:bg-zinc-900 text-sm"
                        />
                      </div>
                    </div>

                    {/* Menu Items Selector */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                          <Utensils className="w-3 h-3" />
                          Mahsulot va Xizmatlar
                          {selectedMenuItems.length > 0 && (
                            <span className="ml-1 h-4 min-w-4 px-1 rounded-full bg-primary text-white text-[10px] font-black flex items-center justify-center">
                              {selectedMenuItems.length}
                            </span>
                          )}
                        </Label>
                        {selectedMenuItems.length > 0 && busyDates[selectedDate]?.status === "busy" && (
                          <button onClick={saveMenuItems} disabled={isSaving} className="text-[10px] font-black text-primary uppercase tracking-widest hover:opacity-70 transition-opacity">Saqlash</button>
                        )}
                      </div>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                        <Input
                          placeholder="Mahsulot qidiring..."
                          value={menuSearch}
                          onChange={e => setMenuSearch(e.target.value)}
                          className="h-10 pl-9 rounded-xl text-sm border-2"
                        />
                      </div>
                      <div className="max-h-[220px] overflow-y-auto space-y-1 rounded-2xl border-2 border-zinc-100 dark:border-zinc-800 p-2">
                        {menuItems.length === 0 ? (
                          <div className="py-6 flex flex-col items-center gap-2 text-center">
                            <div className="h-10 w-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                              <Utensils className="w-5 h-5 text-zinc-300" />
                            </div>
                            <p className="text-xs font-bold text-zinc-400">Menyu bo'sh</p>
                            <p className="text-[10px] text-zinc-400 max-w-[160px]">Avval <a href="/admin/menu" className="text-primary font-black">Admin → Menyu</a> bo'limida mahsulot qo'shing</p>
                          </div>
                        ) : filteredMenu.length === 0 ? (
                          <p className="text-center text-xs text-zinc-400 py-4">"{menuSearch}" topilmadi</p>
                        ) : filteredMenu.map((item: any) => {
                          const sel = selectedMenuItems.find(i => i.id === item.id);
                          return (
                            <div key={item.id} className={cn("flex items-center gap-2 p-2.5 rounded-xl cursor-pointer transition-all select-none", sel ? "bg-primary/5 border border-primary/20" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50 border border-transparent")}
                              onClick={() => toggleMenuItem(item)}>
                              <div className={cn("h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all", sel ? "bg-primary border-primary" : "border-zinc-200 dark:border-zinc-700")}>
                                {sel && <CheckCircle2 className="w-3 h-3 text-white" />}
                              </div>
                              <span className="text-xs font-bold flex-1 line-clamp-1">{item.name || item.name_uz || item.name_ru}</span>
                              {sel ? (
                                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                  <button onClick={() => updateItemQty(item.id, (sel.qty||1)-1)} className="h-6 w-6 rounded-lg bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center text-sm font-black hover:bg-zinc-200 transition-colors">-</button>
                                  <span className="text-xs font-black w-5 text-center">{sel.qty}</span>
                                  <button onClick={() => updateItemQty(item.id, (sel.qty||1)+1)} className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-black text-primary hover:bg-primary/20 transition-colors">+</button>
                                </div>
                              ) : (
                                <span className="text-[10px] text-zinc-400 shrink-0">{(item.price||0).toLocaleString()} so'm</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-3 pt-2">
                      <Button
                        onClick={() => toggleBusyStatus(selectedDate)}
                        className={cn(
                          "w-full h-12 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all active:scale-[0.98]",
                          busyDates[selectedDate]?.status === "busy" 
                            ? "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20" 
                            : "bg-primary hover:bg-primary/90 text-white shadow-primary/20"
                        )}
                        disabled={isSaving}
                      >
                        {isSaving ? "Kutilmoqda..." : busyDates[selectedDate]?.status === "busy" ? "Bo'shatish" : "Band qilish"}
                      </Button>

                      {busyDates[selectedDate]?.status === "busy" && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              variant="outline"
                              onClick={handleUpdateNote}
                              className="h-12 rounded-2xl border-2 font-black uppercase tracking-widest active:scale-[0.98]"
                              disabled={isSaving}
                            >
                              Ma'lumotlarni saqlash
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setIsMoveDialogOpen(true)}
                              className="h-12 rounded-2xl border-2 font-black uppercase tracking-widest active:scale-[0.98] border-primary/20 text-primary hover:bg-primary/5"
                              disabled={isSaving}
                            >
                              <ArrowRightLeft className="w-4 h-4 mr-2" />
                              Ko'chirish
                            </Button>
                          </div>

                          {isFetchingOrder ? (
                            <div className="py-4 flex justify-center">
                              <Plus className="w-6 h-6 animate-spin text-primary opacity-50" />
                            </div>
                          ) : linkedOrder ? (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="bg-white dark:bg-zinc-900 rounded-[32px] border-2 border-zinc-100 dark:border-zinc-800 overflow-hidden shadow-lg"
                            >
                              <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-3">Buyurtma tafsilotlari</h4>
                                <div className="space-y-3">
                                  <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center text-sky-600">
                                      <User className="w-4 h-4" />
                                    </div>
                                    <p className="text-sm font-black">{linkedOrder.customerName || "Mijoz"}</p>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                                      <Phone className="w-4 h-4" />
                                    </div>
                                    <p className="text-sm font-black">{linkedOrder.phoneNumber || linkedOrder.customerPhone || "—"}</p>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center text-orange-600">
                                      <Package className="w-4 h-4" />
                                    </div>
                                    <p className="text-sm font-black">{linkedOrder.guestCount || "?"} kishi</p>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="p-5 max-h-[300px] overflow-y-auto custom-scrollbar">
                                <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-3">Taomnoma</h5>
                                <div className="space-y-2">
                                  {linkedOrder.items?.map((item: any, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between py-1">
                                      <div className="flex items-center gap-2">
                                        <div className="h-5 w-5 rounded bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-black">{item.quantity}</div>
                                        <p className="text-xs font-bold line-clamp-1">{item.name}</p>
                                      </div>
                                      <p className="text-[10px] font-black text-zinc-400">{(item.price * item.quantity).toLocaleString()} so'm</p>
                                    </div>
                                  ))}
                                </div>
                              </div>

                                <div className="flex gap-2 p-5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-800/20">
                                  <Button
                                    variant="ghost"
                                    className="flex-1 h-10 rounded-xl font-black text-[10px] uppercase tracking-widest text-primary hover:bg-primary/5 border border-primary/10"
                                    onClick={() => {
                                      window.location.href = `/admin/orders?search=${linkedOrder.id.slice(-4)}`;
                                    }}
                                  >
                                    <ShoppingBag className="w-3 h-3 mr-2" />
                                    Batafsil
                                  </Button>
                                  <Button
                                    variant="outline"
                                    className="h-10 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest border-2"
                                    onClick={handlePrintMenu}
                                  >
                                    Chop etish
                                  </Button>
                                </div>
                            </motion.div>
                          ) : (busyDates[selectedDate] as any).orderId ? (
                            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 text-xs font-bold text-center">
                              Buyurtma ma'lumotlarini yuklashda xatolik
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-20 text-center"
                  >
                    <div className="w-20 h-20 rounded-[28px] bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-center mb-6 border-2 border-zinc-100 dark:border-zinc-800">
                      <CalendarIcon className="w-10 h-10 text-zinc-300" />
                    </div>
                    <p className="text-base font-black text-zinc-900 dark:text-white uppercase tracking-tight">Sana tanlanmagan</p>
                    <p className="text-xs font-bold text-zinc-400 mt-2 max-w-[220px] leading-relaxed">
                      Kalendardan sana tanlang va uni boshqarishni boshlang.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-[32px] border-2">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black uppercase tracking-tight">Sanani bo'shatish?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium text-zinc-500">
              Ushbu sanani bo'shatmoqchimisiz? Agar ushbu sana buyurtma asosida band qilingan bo'lsa, 
              faqat kalendardagi bandlik o'chiriladi, buyurtmaning o'zi o'chmaydi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-2xl border-2 font-bold uppercase tracking-widest h-12">Bekor qilish</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirmed}
              className="rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-bold uppercase tracking-widest h-12 shadow-lg shadow-rose-500/20"
            >
              Ha, bo'shatish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Move Booking Dialog */}
      <Dialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
        <DialogContent className="max-w-md rounded-[32px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight">Toyni ko'chirish</DialogTitle>
            <DialogDescription className="text-xs font-bold text-zinc-400">
              Ushbu toyni boshqa bo'sh sanaga ko'chirishingiz mumkin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border-2 border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2 mb-1">
                <CalendarIcon className="w-3.5 h-3.5 text-zinc-400" />
                <span className="text-[10px] font-black text-zinc-400 uppercase">Hozirgi sana</span>
              </div>
              <p className="text-lg font-black text-zinc-900 dark:text-white">{selectedDate}</p>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Yangi sana tanlang</Label>
              <Input 
                type="date" 
                value={moveTargetDate}
                onChange={(e) => setMoveTargetDate(e.target.value)}
                className="h-12 rounded-2xl border-2 focus:ring-primary/20"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsMoveDialogOpen(false)} className="rounded-2xl h-11 font-black uppercase tracking-widest">Bekor qilish</Button>
            <Button 
              onClick={handleMoveBooking} 
              disabled={isSaving || !moveTargetDate}
              className="rounded-2xl h-11 font-black uppercase tracking-widest bg-primary hover:bg-primary/90"
            >
              {isSaving ? "Ko'chirilmoqda..." : "Ko'chirishni tasdiqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

