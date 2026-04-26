"use client";

import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, limit } from "firebase/firestore";
import { useLanguage } from "@/hooks/use-language";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, CheckCircle2, Clock, MapPin, User, Check, LogOut, Volume2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { uz, ru, enUS } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/admin/admin-auth-provider";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface WaiterCall {
  id: string;
  tableNumber: number;
  waiterName: string;
  status: "pending" | "completed";
  timestamp: any;
}

export default function WaiterCallsPage() {
  const { t, language } = useLanguage();
  const { signOut } = useAuth();
  const router = useRouter();
  const [pendingCalls, setPendingCalls] = useState<WaiterCall[]>([]);
  const [completedCalls, setCompletedCalls] = useState<WaiterCall[]>([]);
  const [activeTab, setActiveTab] = useState("pending");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isSoundEnabled, setIsSoundEnabled] = useState(false);
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});

  const { user, userId, userRole, restaurantId } = useAuth(); // Get userId, role, and restaurantId

  useEffect(() => {
    if (!restaurantId) return;

    // Fetch users from the current restaurant subcollection
    const usersRef = collection(db, "restaurants", restaurantId, "users");
    const unsubscribeUsers = onSnapshot(usersRef, (snapshot) => {
      const map: Record<string, string> = {};
      snapshot.forEach(doc => {
        const data = doc.data();
        map[doc.id] = data.name || "Unknown";
      });
      setUsersMap(map);
    });
    return () => unsubscribeUsers();
  }, [restaurantId]);

  // Format date relative to now
  const formatDate = (timestamp: any) => {
    if (!timestamp) return "";
    try {
      const date = timestamp.toDate();
      const locale = language === "uz" ? uz : language === "ru" ? ru : enUS;
      return formatDistanceToNow(date, { addSuffix: true, locale });
    } catch (e) {
      return "";
    }
  };

  useEffect(() => {
    // Initialize audio
    audioRef.current = new Audio("/notification.mp3");
    audioRef.current.load(); // Preload

    // Try to enable sound on first user interaction
    const enableSound = () => {
      if (audioRef.current) {
        audioRef.current.play().then(() => {
          audioRef.current?.pause();
          audioRef.current!.currentTime = 0;
          setIsSoundEnabled(true);
        }).catch(() => {
          // Autoplay prevented
        });
      }
      window.removeEventListener('click', enableSound);
    };
    window.addEventListener('click', enableSound);

    return () => window.removeEventListener('click', enableSound);
  }, []);

  const testSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().then(() => {
        setIsSoundEnabled(true);
        toast.success("Ovoz ishlamoqda 🔔");
      }).catch((e) => {
        toast.error("Ovozni yoqishda xatolik. Brauzer sozlamalarini tekshiring.");
      });
    }
  };

  const playNotificationSound = () => {
    try {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.log("Audio autoplay blocked:", error);
          });
        }
      }
    } catch (e) {
      console.error("Audio play failed", e);
    }
  };

  // ... (audio setup)

  useEffect(() => {
    if (!userId || !restaurantId) return;

    let pendingQuery;
    let completedQuery;

    // Correct Path: restaurants/{id}/waiter_calls
    const callsCollection = collection(db, "restaurants", restaurantId, "waiter_calls");

    // Admin and Owner see ALL calls
    if (userRole === "admin" || userRole === "owner" || userRole === "manager") {
      pendingQuery = query(
        callsCollection,
        where("status", "==", "pending")
      );
      completedQuery = query(
        callsCollection,
        where("status", "==", "completed"),
        limit(50)
      );
    } else {
      // Regular waiters see only their own assigned calls OR unassigned calls
      pendingQuery = query(
        callsCollection,
        where("status", "==", "pending"),
        where("waiterId", "in", [userId, null])
      );
      completedQuery = query(
        callsCollection,
        where("status", "==", "completed"),
        where("waiterId", "in", [userId, null]),
        limit(50)
      );
    }

    const unsubscribePending = onSnapshot(pendingQuery, (snapshot) => {
      const calls = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as WaiterCall[];

      // Sort client-side
      calls.sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));

      // Check for new calls to play sound
      if (calls.length > pendingCalls.length && calls.length > 0) {
        // Only play if the new call appeared recently
        const latestCall = calls[calls.length - 1];
        const now = new Date().getTime();
        const callTime = latestCall.timestamp?.toMillis() || 0;

        // If call is recent (less than 30s ago)
        if (now - callTime < 30000) {
          playNotificationSound();
        }
      }

      setPendingCalls(calls);
    });

    const unsubscribeCompleted = onSnapshot(completedQuery, (snapshot) => {
      const calls = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as WaiterCall[];

      // Sort client-side
      calls.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

      setCompletedCalls(calls.slice(0, 20)); // Keep only last 20 after sort
    });

    return () => {
      unsubscribePending();
      unsubscribeCompleted();
    };
  }, [userId, userRole]); // Re-run when userId or role changes

  const handleCompleteCall = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering tabs or other clicks
    if (!restaurantId) return;
    try {
      const callRef = doc(db, "restaurants", restaurantId, "waiter_calls", id);
      await updateDoc(callRef, {
        status: "completed",
        completedAt: new Date(),
      });
      toast.success("Chaqiruv bajarildi ✅");
    } catch (error) {
      console.error("Error completing call:", error);
      toast.error("Xatolik yuz berdi");
    }
  };



  const handleLogout = async () => {
    try {
      await signOut();
      router.push("/admin/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10 px-4 py-3 pb-4 md:px-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Bell className="h-6 w-6 md:h-8 md:w-8 text-primary" />
            {t("waiterCall.title")}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={testSound}
            className={`rounded-full shadow-sm border-2 ${isSoundEnabled ? 'border-green-100 bg-green-50 text-green-600' : 'border-slate-100 text-slate-400'}`}
            title="Ovozni tekshirish"
          >
            <Volume2 className={`h-5 w-5 ${isSoundEnabled ? 'animate-pulse' : ''}`} />
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={handleLogout}
            className="rounded-full px-4 font-semibold shadow-red-100 shadow-lg"
          >
            <LogOut className="h-4 w-4 mr-1" />
            Chiqish
          </Button>
        </div>
      </div>

      <div className="w-full p-3 md:p-6 space-y-4 md:space-y-6">
        <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-lg mx-auto grid-cols-2 bg-white shadow-sm p-1 rounded-xl h-12">
            <TabsTrigger value="pending" className="relative data-[state=active]:bg-red-50 data-[state=active]:text-red-600 h-10 rounded-lg text-base font-medium transition-all">
              {t("waiterCall.pendingCalls")}
              {pendingCalls.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs text-white font-bold animate-bounce shadow-sm border-2 border-white">
                  {pendingCalls.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed" className="data-[state=active]:bg-green-50 data-[state=active]:text-green-600 h-10 rounded-lg text-base font-medium transition-all">
              {t("waiterCall.completedCalls")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4 md:mt-6">
            <AnimatePresence mode="popLayout">
              {pendingCalls.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex flex-col items-center justify-center py-10 md:py-20 text-center text-muted-foreground"
                >
                  <div className="bg-white p-6 rounded-full shadow-sm mb-4">
                    <Bell className="h-12 w-12 text-slate-200" />
                  </div>
                  <p className="text-xl font-medium text-slate-600">Hozircha chaqiruvlar yo'q</p>
                  <p className="text-sm text-slate-400">Yangi chaqiruvlar shu yerda paydo bo'ladi</p>
                </motion.div>
              ) : (
                <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                  {pendingCalls.map((call) => (
                    <motion.div
                      key={call.id}
                      layout
                      initial={{ opacity: 0, y: 50, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
                    >
                      <Card className="overflow-hidden border-0 shadow-lg relative bg-white ring-1 ring-slate-100">
                        {/* Status Indicator */}
                        <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-b from-red-500 to-red-600" />

                        <CardContent className="p-0">
                          <div className="p-4 pl-7">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                  {t("menu.table")}
                                </span>
                                <span className="text-6xl font-black text-slate-800 leading-none tracking-tight -ml-1">
                                  {call.tableNumber}
                                </span>
                              </div>
                              <Badge variant="secondary" className="bg-red-50 text-red-600 border-red-100 flex items-center gap-1 px-2 py-1 text-xs font-semibold animate-pulse">
                                <Clock className="h-3 w-3" />
                                {formatDate(call.timestamp)}
                              </Badge>
                            </div>

                            <div className="flex items-center gap-2 mb-4 p-2 bg-slate-50 rounded-md border border-slate-100">
                              <User className="h-3.5 w-3.5 text-slate-400" />
                              <span className="text-sm font-medium text-slate-600 truncate">
                                {(call.waiterId && usersMap[call.waiterId]) || call.waiterName || t("waiterCall.noWaiterAssigned")}
                              </span>
                            </div>

                            <Button
                              className="w-full bg-green-500 hover:bg-green-600 active:bg-green-700 text-white gap-2 h-14 text-xl font-bold shadow-green-200 shadow-xl rounded-xl transition-all active:scale-95 ring-2 ring-green-500/20"
                              onClick={(e) => handleCompleteCall(call.id, e)}
                            >
                              <CheckCircle2 className="h-7 w-7" />
                              {t("waiterCall.complete")}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </TabsContent>

          <TabsContent value="completed" className="mt-4 md:mt-6">
            <Card className="shadow-sm border-0 overflow-hidden">
              <div className="divide-y divide-slate-100">
                {completedCalls.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">
                    Tarix bo'm-bo'sh
                  </div>
                ) : (
                  completedCalls.map((call) => (
                    <div key={call.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className="bg-green-100 p-2.5 rounded-full group-hover:bg-green-200 transition-colors">
                          <Check className="h-5 w-5 text-green-700" />
                        </div>
                        <div>
                          <p className="text-lg font-bold text-slate-800">
                            {t("menu.table")} {call.tableNumber}
                          </p>
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <User className="h-3 w-3" /> {(call.waiterId && usersMap[call.waiterId]) || call.waiterName}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="mb-1 text-green-700 border-green-200 bg-green-50 text-[10px] px-1.5">
                          {t("waiterCall.complete")}
                        </Badge>
                        <p className="text-[10px] text-slate-400 flex items-center gap-1 justify-end">
                          <Clock className="h-3 w-3" />
                          {formatDate(call.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
