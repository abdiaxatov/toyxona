"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, doc, setDoc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRestaurant } from "@/components/admin/restaurant-provider";
import { useAuth } from "@/components/admin/admin-auth-provider";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Trash2, Info, CheckCircle2, XCircle, ShoppingBag, Package, Utensils, User, Phone, Search, ArrowRightLeft, Music, Heart, Gift, Sparkles, Star, Clock, Wallet, DollarSign, Percent, Gem, Trash, ListChecks, Loader2, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  eventType?: string;
  session?: string;
  advancePayment?: number;
  hallPrice?: number;
  customerName?: string;
  phoneNumber?: string;
  guestCount?: number;
  pricePerPerson?: number;
  menuItems?: any[];
}

const eventTypeConfig: Record<string, { label: string, icon: any, color: string, bgColor: string, borderColor: string, darkBgColor: string, darkBorderColor: string, darkColor: string }> = {
  wedding: { 
    label: "Nikoh to'yi", 
    icon: Heart, 
    color: "text-rose-600", 
    bgColor: "bg-rose-50", 
    borderColor: "border-rose-100",
    darkBgColor: "dark:bg-rose-950/20",
    darkBorderColor: "dark:border-rose-900/30",
    darkColor: "dark:text-rose-400"
  },
  morning_pilaf: { 
    label: "Nahorgi osh", 
    icon: Clock, 
    color: "text-amber-600", 
    bgColor: "bg-amber-50", 
    borderColor: "border-amber-100",
    darkBgColor: "dark:bg-amber-950/20",
    darkBorderColor: "dark:border-amber-900/30",
    darkColor: "dark:text-amber-400"
  },
  birthday: { 
    label: "Tug'ilgan kun", 
    icon: Gift, 
    color: "text-blue-600", 
    bgColor: "bg-blue-50", 
    borderColor: "border-blue-100",
    darkBgColor: "dark:bg-blue-950/20",
    darkBorderColor: "dark:border-blue-900/30",
    darkColor: "dark:text-blue-400"
  },
  sunnat: { 
    label: "Sunnat to'yi", 
    icon: Sparkles, 
    color: "text-emerald-600", 
    bgColor: "bg-emerald-50", 
    borderColor: "border-emerald-100",
    darkBgColor: "dark:bg-emerald-950/20",
    darkBorderColor: "dark:border-emerald-900/30",
    darkColor: "dark:text-emerald-400"
  },
  other: { 
    label: "Boshqa", 
    icon: Info, 
    color: "text-zinc-600", 
    bgColor: "bg-zinc-50", 
    borderColor: "border-zinc-100",
    darkBgColor: "dark:bg-zinc-900/20",
    darkBorderColor: "dark:border-zinc-800/30",
    darkColor: "dark:text-zinc-400"
  },
};

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
  
  // New wedding-specific states
  const [eventType, setEventType] = useState("wedding");
  const [session, setSession] = useState("evening");
  const [advancePayment, setAdvancePayment] = useState("");
  const [hallPrice, setHallPrice] = useState("");
  const [pricePerPerson, setPricePerPerson] = useState("200000");
  const [isMenuDialogOpen, setIsMenuDialogOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");

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
    setEventType(d?.eventType || "wedding");
    setSession(d?.session || "evening");
    setAdvancePayment(d?.advancePayment ? String(d.advancePayment) : "");
    setHallPrice(d?.hallPrice ? String(d.hallPrice) : "");
    setPricePerPerson(d?.pricePerPerson ? String(d.pricePerPerson) : "200000");
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
        eventType,
        session,
        advancePayment: advancePayment ? Number(advancePayment) : 0,
        hallPrice: hallPrice ? Number(hallPrice) : 0,
        pricePerPerson: pricePerPerson ? Number(pricePerPerson) : 0,
        updatedAt: new Date()
      }, { merge: true });
      toast({ title: "Muvaffaqiyatli", description: "Ma'lumotlar yangilandi" });
    } catch (error) {
      toast({ title: "Xatolik", description: "Yangilashda xatolik", variant: "destructive" });
    }
    setIsSaving(false);
  };

  const handlePrintMenu = () => {
    const menuItemsList = selectedMenuItems.filter(i => !i.isService);
    const serviceItemsList = selectedMenuItems.filter(i => i.isService);

    const data = linkedOrder || {
      customerName,
      phoneNumber,
      guestCount,
      pricePerPerson,
      menuTotal,
      perPersonTotal,
      total: finalTotal,
      advancePayment,
      remainingAmount,
      hallPrice,
      eventType,
      session,
      id: selectedDate?.replace(/-/g, '') || "NEW"
    };

    if (selectedMenuItems.length === 0) {
      toast({ title: "Xatolik", description: "Chop etish uchun mahsulotlar yo'q", variant: "destructive" });
      return;
    }
    
    const eventLabel = eventTypeConfig[eventType || 'wedding']?.label || "Tadbir";
    const sessionLabel = session === 'morning' ? 'Ertalabki' : session === 'evening' ? 'Kechki' : 'Kunlik';

    const printContent = `
      <html>
        <head>
          <title>Buyurtma - ${data.customerName || 'Mijoz'}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #111; line-height: 1.5; }
            .header { border-bottom: 3px solid #000; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
            .title { font-size: 32px; font-weight: 900; text-transform: uppercase; margin: 0; letter-spacing: -0.02em; }
            .event-badge { background: #000; color: #fff; padding: 4px 12px; font-size: 12px; font-weight: 900; text-transform: uppercase; margin-top: 8px; display: inline-block; }
            .info { margin-bottom: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
            .info-item { border-left: 2px solid #eee; padding-left: 15px; }
            .info-label { font-size: 10px; font-weight: 900; text-transform: uppercase; color: #888; margin-bottom: 4px; letter-spacing: 0.1em; }
            .info-value { font-size: 16px; font-weight: 700; color: #000; }
            .section-title { font-size: 12px; font-weight: 900; text-transform: uppercase; color: #000; border-bottom: 2px solid #eee; padding-bottom: 5px; margin: 20px 0 10px; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .items-table th { text-align: left; font-size: 10px; font-weight: 900; text-transform: uppercase; color: #888; border-bottom: 1px solid #eee; padding: 10px 0; }
            .items-table td { padding: 10px 0; border-bottom: 1px solid #f5f5f5; font-size: 13px; }
            .item-name { font-weight: 700; }
            .item-qty { font-weight: 900; color: #888; width: 60px; }
            .item-price { font-weight: 700; text-align: right; }
            .financials { margin-left: auto; width: 320px; margin-top: 30px; padding: 20px; background: #f9f9f9; border-radius: 15px; }
            .fin-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; font-weight: 700; }
            .fin-row.total { border-top: 2px solid #000; margin-top: 10px; padding-top: 15px; font-size: 18px; font-weight: 900; }
            .footer { margin-top: 80px; text-align: center; font-size: 10px; color: #aaa; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; border-top: 1px solid #eee; padding-top: 20px; }
            @media print {
              body { padding: 0; }
              @page { margin: 1.5cm; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="title">Taomnoma</h1>
              <div class="event-badge">${eventLabel} (${sessionLabel})</div>
            </div>
            <div style="text-align: right; font-weight: 900; font-size: 14px;">
              SANA: ${selectedDate}<br>
              ID: #${data.id.toString().slice(-6).toUpperCase()}
            </div>
          </div>

          <div class="info">
            <div class="info-item">
              <div class="info-label">Mijoz</div>
              <div class="info-value">${data.customerName || "—"}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Telefon</div>
              <div class="info-value">${data.phoneNumber || "—"}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Mehmonlar soni</div>
              <div class="info-value">${data.guestCount || "0"} kishi</div>
            </div>
            <div class="info-item">
              <div class="info-label">Tadbir vaqti</div>
              <div class="info-value">${sessionLabel} seans</div>
            </div>
          </div>

          ${menuItemsList.length > 0 ? `
            <div class="section-title">Dasturxon va Taomlar</div>
            <table class="items-table">
              <thead>
                <tr>
                  <th style="width: 50px;">Soni</th>
                  <th>Nomi</th>
                  <th style="text-align: right;">Izoh</th>
                </tr>
              </thead>
              <tbody>
                ${menuItemsList.map(item => `
                  <tr>
                    <td class="item-qty">${item.qty} x</td>
                    <td class="item-name">${item.name}</td>
                    <td style="text-align: right; font-size: 10px; color: #888;">Menyuga kiritilgan</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}

          ${serviceItemsList.length > 0 ? `
            <div class="section-title">Qo'shimcha xizmatlar</div>
            <table class="items-table">
              <thead>
                <tr>
                  <th style="width: 50px;">Soni</th>
                  <th>Xizmat nomi</th>
                  <th style="text-align: right;">Narxi</th>
                </tr>
              </thead>
              <tbody>
                ${serviceItemsList.map(item => `
                  <tr>
                    <td class="item-qty">${item.qty} x</td>
                    <td class="item-name">${item.name}</td>
                    <td class="item-price">${(item.price * item.qty).toLocaleString()} $</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}
 
          <div class="financials">
            <div class="fin-row">
              <span>Dasturxon (${data.guestCount} kishi x ${Number(data.pricePerPerson).toLocaleString()}):</span>
              <span>${perPersonTotal.toLocaleString()} $</span>
            </div>
            <div class="fin-row">
              <span>Xizmatlar summasi:</span>
              <span>${menuTotal.toLocaleString()} $</span>
            </div>
            <div class="fin-row">
              <span>Zal ijara haqi:</span>
              <span>${(Number(data.hallPrice) || 0).toLocaleString()} $</span>
            </div>
            <div class="fin-row total">
              <span>JAMI SUMMA:</span>
              <span>${finalTotal.toLocaleString()} $</span>
            </div>
            <div class="fin-row" style="color: #059669; margin-top: 10px;">
              <span>To'langan (Zaklad):</span>
              <span>${(Number(data.advancePayment) || 0).toLocaleString()} $</span>
            </div>
            <div class="fin-row" style="color: #dc2626; font-size: 16px; font-weight: 900; border-top: 1px dashed #ccc; margin-top: 5px; padding-top: 10px;">
              <span>QOLGAN SUMMA:</span>
              <span>${remainingAmount.toLocaleString()} $</span>
            </div>
          </div>

          <div class="footer">
            ${restaurant?.name || "TO'YXONA BOSHQARUV TIZIMI"} &copy; ${new Date().getFullYear()}
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
        eventType,
        session,
        advancePayment: advancePayment ? Number(advancePayment) : 0,
        hallPrice: hallPrice ? Number(hallPrice) : 0,
        pricePerPerson: pricePerPerson ? Number(pricePerPerson) : 0,
        updatedAt: new Date()
      });
      toast({ title: "Muvaffaqiyatli", description: "Sana band qilindi" });
      setSelectedDate(null);
      setSelectedMenuItems([]);
      setCustomerName("");
      setPhoneNumber("");
      setGuestCount("");
      setNote("");
      setEventType("wedding");
      setSession("evening");
      setAdvancePayment("");
      setHallPrice("");
      setPricePerPerson("200000");
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

  const menuTotal = selectedMenuItems.reduce((acc, item) => {
    // If it's a service, add its price * qty
    if (item.isService) return acc + (item.price * (item.qty || 1));
    // If it's food/table, individual price is ignored as it's included in pricePerPerson
    return acc;
  }, 0);

  const perPersonTotal = (Number(guestCount) || 0) * (Number(pricePerPerson) || 0);
  const finalTotal = perPersonTotal + menuTotal + (hallPrice ? Number(hallPrice) : 0);
  const remainingAmount = finalTotal - (advancePayment ? Number(advancePayment) : 0);

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
                  const eType = (busyDates[dateStr] as any)?.eventType || "wedding";
                  const config = eventTypeConfig[eType] || eventTypeConfig.other;

                  return (
                    <motion.button
                      key={day}
                      whileHover={{ scale: 1.06 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => handleDateClick(day)}
                      className={cn(
                        "aspect-square rounded-xl md:rounded-[16px] flex flex-col items-center justify-center text-xs md:text-sm font-black transition-all border-2 relative group",
                        busy 
                          ? `${config.bgColor} ${config.borderColor} ${config.color} ${config.darkBgColor} ${config.darkBorderColor} ${config.darkColor}` 
                          : isToday
                            ? "bg-primary/5 border-primary/20 text-primary"
                            : "bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800/50 text-zinc-800 dark:text-zinc-200",
                        isSelected && "border-primary ring-2 ring-primary/10 shadow-md shadow-primary/10 z-10"
                      )}
                    >
                      {day}
                      {busy && (
                        <div className="absolute top-1.5 right-1.5 md:top-2 md:right-2">
                          <config.icon className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 opacity-40" />
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
                        setEventType(bd.eventType || "wedding");
                        setSession(bd.session || "evening");
                        setAdvancePayment(bd.advancePayment ? String(bd.advancePayment) : "");
                        setHallPrice(bd.hallPrice ? String(bd.hallPrice) : "");
                        setSelectedMenuItems(bd.menuItems || []);
                        setMenuSearch("");
                      }}>
                      <div className="flex items-center gap-3 md:gap-4">
                        <div className={cn(
                          "h-10 w-10 md:h-12 md:w-12 rounded-xl flex flex-col items-center justify-center border shrink-0",
                          (eventTypeConfig[d.eventType || "wedding"] || eventTypeConfig.other).bgColor,
                          (eventTypeConfig[d.eventType || "wedding"] || eventTypeConfig.other).borderColor,
                          (eventTypeConfig[d.eventType || "wedding"] || eventTypeConfig.other).color,
                        )}>
                          <span className="text-[9px] font-black opacity-60 leading-none mb-0.5">{new Date(d.date).toLocaleString('uz', { month: 'short' })}</span>
                          <span className="text-sm md:text-base font-black leading-none">{new Date(d.date).getDate()}</span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-black text-zinc-900 dark:text-white truncate">
                              {(d as any).customerName || d.note || "Ismsiz bron"}
                            </p>
                            <Badge variant="outline" className={cn("text-[9px] px-1 h-4 uppercase font-black", (eventTypeConfig[d.eventType || "wedding"] || eventTypeConfig.other).color)}>
                              {(eventTypeConfig[d.eventType || "wedding"] || eventTypeConfig.other).label}
                            </Badge>
                          </div>
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

        <div className="lg:col-span-4 sticky top-4 h-[calc(100vh-2rem)]">
          <Card className="h-full border-none rounded-[40px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] dark:shadow-none bg-white dark:bg-zinc-950 overflow-hidden flex flex-col border border-zinc-100 dark:border-zinc-800">
            <div className="p-8 pb-6 shrink-0 flex items-center justify-between border-b border-zinc-50 dark:border-zinc-900">
              <div>
                <h2 className="text-xl font-black tracking-tight text-zinc-900 dark:text-white uppercase">Sana Boshqaruvi</h2>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Tadbirni sozlash va nazorat</p>
              </div>
              <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <Settings2 className="w-5 h-5" />
              </div>
            </div>

            <div 
              className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 space-y-8"
              data-lenis-prevent
            >
              <AnimatePresence mode="wait">
                  {selectedDate ? (
                    <motion.div
                      key={selectedDate}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="space-y-8 pb-10"
                    >
                      {/* 1. Date & Session Header */}
                      <div className="relative p-6 rounded-[32px] bg-gradient-to-br from-primary to-primary/80 text-white overflow-hidden shadow-xl shadow-primary/20">
                        <div className="relative z-10 space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-black uppercase tracking-widest">
                              {new Date(selectedDate).getFullYear()}-yil
                            </span>
                            <div className="flex gap-1">
                              {['morning', 'evening', 'full'].map((s) => (
                                <div key={s} className={cn(
                                  "w-2 h-2 rounded-full transition-all",
                                  session === s ? "bg-white scale-125" : "bg-white/30"
                                )} />
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-3xl font-black leading-none">
                              {new Date(selectedDate).getDate()}
                            </p>
                            <p className="text-sm font-bold opacity-90 mt-1 uppercase tracking-wider">
                              {new Date(selectedDate).toLocaleDateString('uz', { month: 'long', weekday: 'long' })}
                            </p>
                          </div>
                        </div>
                        <CalendarIcon className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10 rotate-12" />
                      </div>

                      {/* 2. Event Configuration */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 px-1">
                          <Sparkles className="w-4 h-4 text-primary" />
                          <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Tadbir va Vaqt</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          <Select value={eventType} onValueChange={setEventType}>
                            <SelectTrigger className="h-14 rounded-2xl border-2 bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-100 dark:border-zinc-800 focus:ring-primary/20 transition-all font-bold">
                              <SelectValue placeholder="Tadbir turini tanlang" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-2 shadow-2xl">
                              {Object.entries(eventTypeConfig).map(([key, value]) => (
                                <SelectItem key={key} value={key} className="rounded-xl py-3">
                                  <div className="flex items-center gap-3">
                                    <div className={cn("p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800", value.color)}>
                                      <value.icon className="w-4 h-4" />
                                    </div>
                                    <span className="font-black text-sm">{value.label}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Tabs value={session} onValueChange={setSession} className="w-full">
                            <TabsList className="grid grid-cols-3 h-14 p-1.5 bg-zinc-100/50 dark:bg-zinc-900/50 rounded-2xl border-2 border-zinc-100/50 dark:border-zinc-800/50">
                              <TabsTrigger value="morning" className="rounded-xl text-[10px] font-black uppercase data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg dark:data-[state=active]:bg-zinc-800">Ertalab</TabsTrigger>
                              <TabsTrigger value="evening" className="rounded-xl text-[10px] font-black uppercase data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg dark:data-[state=active]:bg-zinc-800">Kechki</TabsTrigger>
                              <TabsTrigger value="full" className="rounded-xl text-[10px] font-black uppercase data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg dark:data-[state=active]:bg-zinc-800">Kunlik</TabsTrigger>
                            </TabsList>
                          </Tabs>
                        </div>
                      </div>

                      {/* 3. Customer Information */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 px-1">
                          <User className="w-4 h-4 text-primary" />
                          <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Mijoz ma'lumotlari</h3>
                        </div>
                        <div className="space-y-3">
                          <div className="relative group">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300 group-focus-within:text-primary transition-colors" />
                            <Input
                              placeholder="Mijoz ismi..."
                              value={customerName}
                              onChange={(e) => setCustomerName(e.target.value)}
                              className="h-14 pl-12 rounded-2xl border-2 bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 focus:border-primary/50 transition-all font-bold"
                            />
                          </div>
                          <div className="relative group">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300 group-focus-within:text-primary transition-colors" />
                            <Input
                              placeholder="+998 90 123 45 67"
                              value={phoneNumber}
                              onChange={(e) => setPhoneNumber(e.target.value)}
                              className="h-14 pl-12 rounded-2xl border-2 bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 focus:border-primary/50 transition-all font-bold"
                            />
                          </div>
                        </div>
                      </div>

                      {/* 4. Quantities & Pricing */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 px-1">
                          <Package className="w-4 h-4 text-primary" />
                          <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Hajm va Narx</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-[9px] font-black uppercase text-zinc-400 ml-1">Mehmonlar</Label>
                            <Input
                              value={guestCount}
                              onChange={(e) => setGuestCount(e.target.value.replace(/\D/g, ""))}
                              className="h-14 rounded-2xl border-2 font-black text-center text-lg"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[9px] font-black uppercase text-zinc-400 ml-1">Kishi boshi (so'm)</Label>
                            <Input
                              value={pricePerPerson}
                              onChange={(e) => setPricePerPerson(e.target.value.replace(/\D/g, ""))}
                              className="h-14 rounded-2xl border-2 font-black text-center text-emerald-600 bg-emerald-50/10"
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[9px] font-black uppercase text-zinc-400 ml-1">Zal ijarasi (so'm)</Label>
                          <Input
                            value={hallPrice}
                            onChange={(e) => setHallPrice(e.target.value.replace(/\D/g, ""))}
                            className="h-14 rounded-2xl border-2 font-black px-6"
                          />
                        </div>
                      </div>

                      {/* 5. Items Summary */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                          <div className="flex items-center gap-2">
                            <Utensils className="w-4 h-4 text-primary" />
                            <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Mahsulotlar</h3>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setIsMenuDialogOpen(true)}
                            className="h-8 rounded-xl border-2 font-black text-[9px] uppercase tracking-widest"
                          >
                            <Plus className="w-3 h-3 mr-1" /> O'zgartirish
                          </Button>
                        </div>
                        
                        <div className="space-y-2">
                          {selectedMenuItems.length > 0 ? (
                            selectedMenuItems.map((item) => (
                              <div key={item.id} className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                                <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center shrink-0", item.isService ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600")}>
                                  {item.isService ? <Gem className="w-4 h-4" /> : <Utensils className="w-4 h-4" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-black truncate">{item.name}</p>
                                  <p className="text-[10px] font-bold text-zinc-400">{item.qty} x {item.isService ? `${item.price.toLocaleString()} so'm` : "Menyu ichida"}</p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="py-6 rounded-[24px] border-2 border-dashed border-zinc-100 flex flex-col items-center justify-center text-zinc-300">
                              <Utensils className="w-6 h-6 mb-2 opacity-20" />
                              <p className="text-[10px] font-black uppercase tracking-widest">Hali tanlanmagan</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 6. Financial Overview */}
                      <div className="p-6 rounded-[32px] bg-zinc-900 text-white space-y-4 shadow-2xl shadow-zinc-900/20">
                        <div className="flex items-center gap-2 opacity-40">
                          <Wallet className="w-4 h-4" />
                          <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Moliyaviy Hisobot</h3>
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-[11px] font-bold text-zinc-400">Jami xizmatlar</span>
                            <span className="text-sm font-black">{finalTotal.toLocaleString()} so'm</span>
                          </div>
                          <div className="relative pt-2">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 font-black text-xs">Beh:</div>
                            <Input
                              value={advancePayment}
                              onChange={(e) => setAdvancePayment(e.target.value.replace(/\D/g, ""))}
                              className="h-12 pl-14 rounded-xl bg-white/5 border-white/10 text-emerald-400 font-black"
                              placeholder="Zaklad..."
                            />
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-white/5">
                            <span className="text-[11px] font-black uppercase tracking-widest text-primary">Qolgan summa</span>
                            <span className={cn("text-lg font-black", remainingAmount > 0 ? "text-rose-400" : "text-emerald-400")}>
                              {remainingAmount.toLocaleString()} so'm
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 7. Action Buttons */}
                      <div className="grid grid-cols-1 gap-3">
                        <Button
                          onClick={() => toggleBusyStatus(selectedDate)}
                          className={cn(
                            "h-16 rounded-[24px] font-black uppercase tracking-[0.15em] text-sm shadow-xl transition-all active:scale-[0.98]",
                            busyDates[selectedDate]?.status === "busy" 
                              ? "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20" 
                              : "bg-primary hover:bg-primary/90 text-white shadow-primary/20"
                          )}
                          disabled={isSaving}
                        >
                          {isSaving ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                          ) : busyDates[selectedDate]?.status === "busy" ? (
                            "Bandlikni bekor qilish"
                          ) : (
                            "Sanani Band Qilish"
                          )}
                        </Button>

                        {busyDates[selectedDate]?.status === "busy" && (
                          <div className="grid grid-cols-2 gap-3">
                            <Button
                              onClick={handleUpdateNote}
                              variant="outline"
                              className="h-14 rounded-[20px] border-2 font-black uppercase text-[10px] tracking-widest"
                            >
                              Saqlash
                            </Button>
                            <Button
                              onClick={() => setIsMoveDialogOpen(true)}
                              variant="outline"
                              className="h-14 rounded-[20px] border-2 font-black uppercase text-[10px] tracking-widest border-primary/20 text-primary hover:bg-primary/5"
                            >
                              Ko'chirish
                            </Button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="h-[60vh] flex flex-col items-center justify-center text-center space-y-6"
                    >
                      <div className="relative">
                        <div className="absolute inset-0 bg-primary/10 blur-[80px] rounded-full animate-pulse" />
                        <div className="relative w-32 h-32 rounded-[48px] bg-white dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 flex items-center justify-center shadow-2xl">
                          <CalendarIcon className="w-14 h-14 text-zinc-200" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">Sana Tanlanmagan</h3>
                        <p className="text-sm font-medium text-zinc-400 max-w-[240px] leading-relaxed mx-auto">
                          Boshqarishni boshlash uchun kalendardan kerakli sanani tanlang
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
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
      {/* Product Selection Modal */}
      <Dialog open={isMenuDialogOpen} onOpenChange={setIsMenuDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden rounded-[32px] gap-0">
          <DialogHeader className="p-6 pb-0">
            <div className="flex items-center justify-between mb-4">
              <div>
                <DialogTitle className="text-2xl font-black uppercase tracking-tight">Mahsulot va Xizmatlar</DialogTitle>
                <DialogDescription className="text-xs font-bold text-zinc-400">
                  Tadbir uchun taomlar va qo'shimcha xizmatlarni tanlang
                </DialogDescription>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-zinc-400 uppercase">Tanlangan</p>
                <p className="text-xl font-black text-primary">{selectedMenuItems.length}</p>
              </div>
            </div>
            
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <Input 
                placeholder="Mahsulot yoki xizmat nomini yozing..." 
                value={menuSearch}
                onChange={(e) => setMenuSearch(e.target.value)}
                className="h-12 pl-12 rounded-2xl border-2 bg-zinc-50/50 dark:bg-zinc-800/50 focus:bg-white transition-all text-sm font-bold"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-4 custom-scrollbar">
              <Button
                variant={activeCategory === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveCategory('all')}
                className={cn(
                  "rounded-xl h-9 px-6 text-[10px] font-black uppercase tracking-widest transition-all",
                  activeCategory === 'all' ? "bg-primary shadow-lg shadow-primary/20" : "bg-white dark:bg-zinc-800 border-2"
                )}
              >
                Barchasi
              </Button>
              {Array.from(new Set(menuItems.map(m => m.category || 'Boshqa'))).map(cat => (
                <Button
                  key={cat}
                  variant={activeCategory === cat ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "rounded-xl h-9 px-6 text-[10px] font-black uppercase tracking-widest transition-all",
                    activeCategory === cat ? "bg-primary shadow-lg shadow-primary/20" : "bg-white dark:bg-zinc-800 border-2"
                  )}
                >
                  {cat}
                </Button>
              ))}
            </div>
          </DialogHeader>

          <ScrollArea className="h-[50vh] p-6 border-y border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {menuItems
                .filter(m => activeCategory === 'all' || m.category === activeCategory)
                .filter(m => (m.name || m.name_uz || "").toLowerCase().includes(menuSearch.toLowerCase()))
                .map((item: any) => {
                  const sel = selectedMenuItems.find(i => i.id === item.id);
                  return (
                    <motion.div
                      key={item.id}
                      whileHover={{ y: -2 }}
                      className={cn(
                        "p-4 rounded-[24px] border-2 transition-all flex items-center gap-4 cursor-pointer",
                        sel 
                          ? "bg-white dark:bg-zinc-900 border-primary shadow-lg shadow-primary/5" 
                          : "bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700"
                      )}
                      onClick={() => toggleMenuItem(item)}
                    >
                      <div className={cn(
                        "h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 transition-all",
                        sel ? "bg-primary text-white scale-110" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                      )}>
                        {sel ? <CheckCircle2 className="w-6 h-6" /> : <Utensils className="w-6 h-6" />}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-zinc-900 dark:text-white truncate">{item.name || item.name_uz || item.name_ru}</p>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase">{(item.price || 0).toLocaleString()} so'm</p>
                        
                        {sel && (
                          <div className="flex items-center gap-2 mt-2" onClick={e => e.stopPropagation()}>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedMenuItems(prev => prev.map(i => i.id === item.id ? { ...i, isService: !i.isService } : i));
                              }}
                              className={cn(
                                "text-[9px] font-black px-2 py-1 rounded-lg border-2 transition-all uppercase tracking-tighter",
                                sel.isService 
                                  ? "bg-amber-50 border-amber-200 text-amber-600" 
                                  : "bg-blue-50 border-blue-200 text-blue-600"
                              )}
                            >
                              {sel.isService ? "Alohida Xizmat" : "Menyu ichida"}
                            </button>
                          </div>
                        )}
                      </div>
                      {sel && (
                        <div className="h-6 px-2 rounded-full bg-primary/10 text-primary text-[10px] font-black flex items-center justify-center">
                          Tanlandi
                        </div>
                      )}
                    </motion.div>
                  );
                })}
            </div>
          </ScrollArea>

          <DialogFooter className="p-6 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center justify-between w-full">
              <div className="hidden sm:block">
                <p className="text-[10px] font-black text-zinc-400 uppercase">Tanlangan xizmatlar summasi</p>
                <p className="text-lg font-black text-zinc-900 dark:text-white">{menuTotal.toLocaleString()} so'm</p>
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <Button variant="outline" onClick={() => setIsMenuDialogOpen(false)} className="flex-1 sm:flex-none h-12 px-8 rounded-2xl font-black uppercase tracking-widest border-2">
                  Yopish
                </Button>
                <Button 
                  onClick={() => {
                    if (busyDates[selectedDate]?.status === "busy") saveMenuItems();
                    setIsMenuDialogOpen(false);
                  }} 
                  className="flex-1 sm:flex-none h-12 px-8 rounded-2xl font-black uppercase tracking-widest bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
                >
                  Tayyor
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

