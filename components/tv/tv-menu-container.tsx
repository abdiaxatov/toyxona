"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { onSnapshot, query, orderBy } from "firebase/firestore";
import { getRestaurantCollection, getRestaurantDoc } from "@/lib/firebase-utils";
import { AnimatePresence, motion } from "framer-motion";
import { TvCategorySlide } from "./tv-category-slide";
import { Clock, QrCode, MonitorOff } from "lucide-react";
import type { MenuItem, Category, TvSettings } from "@/types";

interface TvMenuContainerProps {
  restaurantId: string;
  restaurantData: any;
  screenId?: string;  // e.g. 'main', 'screen2', 'screen3'
}

type TvSlide = 
  | { type: "category"; data: Category }
  | { type: "promo"; url: string };

const UI_404 = () => (
  <div className="fixed inset-0 bg-black flex flex-col items-center justify-center text-white p-10 text-center animate-in fade-in duration-700">
    <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mb-6 border border-red-500/50">
      <MonitorOff className="w-12 h-12 text-red-500" />
    </div>
    <h1 className="text-4xl font-black mb-4">404 — Ekran Topilmadi</h1>
    <p className="text-gray-400 max-w-md text-lg leading-relaxed">
      Ushbu TV ekran admin panel tomonidan o'chirilgan yoki hali sozlanmagan. 
      Iltimos, admin panel orqali ekranni qayta qo'shing.
    </p>
    <div className="mt-8 px-6 py-2 bg-gray-900 rounded-full text-xs font-mono text-gray-500 border border-gray-800">
      Error: SCREEN_NOT_CONFIGURED
    </div>
  </div>
);

const UI_Loading = ({ data }: { data: any }) => (
  <div className="fixed inset-0 bg-[#f9fafb] flex flex-col items-center justify-center text-gray-900 overflow-hidden">
    {/* Soft Animated Background Blobs */}
    <div className="absolute inset-0 opacity-40 pointer-events-none">
      <motion.div 
        animate={{ 
          x: [0, 100, 0], 
          y: [0, 50, 0],
          scale: [1, 1.2, 1] 
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px]" 
      />
      <motion.div 
        animate={{ 
          x: [0, -100, 0], 
          y: [0, -50, 0],
          scale: [1, 1.3, 1] 
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-orange-500/10 blur-[120px]" 
      />
    </div>

    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="relative z-10 flex flex-col items-center text-center px-6"
    >
      <div className="relative mb-12">
        {/* Subtle Glow */}
        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-110 animate-pulse" />
        
        <div className="relative w-40 h-40 rounded-[2.5rem] bg-white border border-gray-100 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.05)] flex items-center justify-center overflow-hidden">
          {data?.logoUrl ? (
            <motion.img 
              src={data.logoUrl} 
              alt={data?.name}
              className="w-full h-full object-contain"
              animate={{ 
                scale: [1, 1.05, 1],
                filter: ["grayscale(0%)", "grayscale(10%)", "grayscale(0%)"]
              }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary text-white rounded-3xl font-black text-5xl">
              {data?.name?.[0]}
            </div>
          )}
        </div>

        {/* Professional Loading Ring */}
        <div className="absolute -inset-4 border-[3px] border-gray-100 rounded-full" />
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="absolute -inset-4 border-[3px] border-transparent border-t-primary rounded-full shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]" 
        />
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <h2 className="text-4xl font-black tracking-tight mb-3 text-gray-900">
          {data?.name || 'Restoran'}
        </h2>
        
        <div className="flex items-center justify-center gap-3">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                className="w-1.5 h-1.5 rounded-full bg-primary"
              />
            ))}
          </div>
          <span className="text-gray-400 text-xs font-bold uppercase tracking-[0.3em] ml-1">
            Menyu Yuklanmoqda
          </span>
        </div>
      </motion.div>
    </motion.div>

    {/* Elegant Branding Footer */}
    <div className="absolute bottom-12 left-0 right-0 text-center">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ delay: 1 }}
        className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.4em] text-gray-500"
      >
        Developed by <span className="text-gray-900 border-b border-gray-900">MEGA-PRO TV</span>
      </motion.div>
    </div>
  </div>
);

const AnimatedBackground = ({ settings }: { settings: TvSettings | null }) => {
  const type = settings?.bgType || 'color';
  const speed = settings?.bgAnimationSpeed || 5;

  if (type === 'mesh') {
    const colors = settings?.meshColors || ["#f87171", "#60a5fa", "#4ade80", "#fbbf24"];
    return (
      <div className="absolute inset-0 overflow-hidden bg-black pointer-events-none">
        {colors.map((color, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full blur-[120px] opacity-40 mix-blend-screen"
            animate={{
              x: [
                i % 2 === 0 ? '-10%' : '60%',
                i % 2 === 0 ? '60%' : '-10%',
                i % 2 === 0 ? '10%' : '40%',
                i % 2 === 0 ? '-10%' : '60%',
              ],
              y: [
                i < 2 ? '-10%' : '60%',
                i < 2 ? '60%' : '-10%',
                i < 2 ? '40%' : '10%',
                i < 2 ? '-10%' : '60%',
              ],
              scale: [1, 1.5, 1.2, 1],
            }}
            transition={{
              duration: speed * 3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.5,
            }}
            style={{
              backgroundColor: color,
              width: '60vw',
              height: '60vw',
              left: i % 2 === 0 ? '0' : 'auto',
              right: i % 2 !== 0 ? '0' : 'auto',
              top: i < 2 ? '0' : 'auto',
              bottom: i >= 2 ? '0' : 'auto',
            }}
          />
        ))}
      </div>
    );
  }

  if (type === 'gradient') {
    const colors = settings?.gradientColors || ["#3b82f6", "#8b5cf6"];
    return (
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{
          background: [
            `linear-gradient(0deg, ${colors[0]}, ${colors[1]})`,
            `linear-gradient(90deg, ${colors[0]}, ${colors[1]})`,
            `linear-gradient(180deg, ${colors[0]}, ${colors[1]})`,
            `linear-gradient(270deg, ${colors[0]}, ${colors[1]})`,
            `linear-gradient(360deg, ${colors[0]}, ${colors[1]})`,
          ],
        }}
        transition={{
          duration: speed * 4,
          repeat: Infinity,
          ease: "linear",
        }}
      />
    );
  }

  return null;
};

export function TvMenuContainer({ restaurantId, restaurantData, screenId = "main" }: TvMenuContainerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tvSettings, setTvSettings] = useState<TvSettings | null>(null);
  const [screenList, setScreenList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const q = query(getRestaurantCollection(restaurantId, "categories"), orderBy("order", "asc"));
    return onSnapshot(q, (snapshot) => {
      const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Category[];
      setCategories(cats.filter(c => c.active !== false));
    });
  }, [restaurantId]);

  useEffect(() => {
    const q = query(getRestaurantCollection(restaurantId, "menuItems"));
    return onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as MenuItem[];
      setMenuItems(items);
    });
  }, [restaurantId]);

  useEffect(() => {
    // Load screen list validation
    const listRef = getRestaurantDoc(restaurantId, "settings", "tv-screens");
    const unsubList = onSnapshot(listRef, (snap) => {
      if (snap.exists()) {
        setScreenList(snap.data().screens || []);
      } else {
        setScreenList([]);
      }
    });

    // Load actual settings
    const settingsDocId = (!screenId || screenId === "main") ? "tv" : `tv-${screenId}`;
    const docRef = getRestaurantDoc(restaurantId, "settings", settingsDocId);
    const unsubSettings = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setTvSettings(docSnap.data() as TvSettings);
      } else {
        setTvSettings(null);
      }
      setLoading(false);
    });

    return () => { unsubList(); unsubSettings(); };
  }, [restaurantId, screenId]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isAllItemsMode = tvSettings?.activeItemIds === null || tvSettings?.activeItemIds === undefined;

  const filteredCategories = useMemo(() => {
    if (!categories.length) return [];
    let visibleCategories = categories;

    if (tvSettings?.activeCategoryIds?.length) {
      visibleCategories = categories.filter(c => tvSettings.activeCategoryIds.includes(c.id));
    }

    const hour = currentTime.getHours();
    const timeBased = tvSettings?.timeBasedMenu;
    if (timeBased) {
      if (hour >= 6 && hour < 11 && timeBased.breakfast?.categoryIds?.length) {
        visibleCategories = categories.filter(c => timeBased.breakfast?.categoryIds.includes(c.id));
      } else if (hour >= 11 && hour < 17 && timeBased.lunch?.categoryIds?.length) {
        visibleCategories = categories.filter(c => timeBased.lunch?.categoryIds.includes(c.id));
      } else if (hour >= 17 && hour < 23 && timeBased.dinner?.categoryIds?.length) {
        visibleCategories = categories.filter(c => timeBased.dinner?.categoryIds.includes(c.id));
      }
    }

    // 🔹 Only show categories that actually have visible menu items
    visibleCategories = visibleCategories.filter(cat =>
      menuItems.some(item => {
        if (item.categoryId !== cat.id) return false;
        if (isAllItemsMode) return true;
        return tvSettings!.activeItemIds!.includes(item.id);
      })
    );

    return visibleCategories;
  }, [categories, menuItems, tvSettings, currentTime, isAllItemsMode]);

  const slides = useMemo<TvSlide[]>(() => {
    const cats: TvSlide[] = filteredCategories.map(c => ({ type: "category", data: c }));
    const promos: TvSlide[] = (tvSettings?.promoImages || []).map(url => ({ type: "promo", url }));
    
    const mode = tvSettings?.displayMode || "menu";
    
    if (mode === "promo" && promos.length > 0) return promos;
    if (mode === "mixed") {
      if (promos.length === 0) return cats;
      if (cats.length === 0) return promos;
      
      const mixed: TvSlide[] = [];
      const interval = tvSettings?.promoInterval || 1;
      let promoIdx = 0;

      for (let i = 0; i < cats.length; i++) {
        mixed.push(cats[i]);
        // Insert a promo slide after every `interval` categories
        if ((i + 1) % interval === 0) {
          mixed.push(promos[promoIdx % promos.length]);
          promoIdx++;
        }
      }
      
      // If we finished going through cats but it didn't end on a promo, 
      // there shouldn't be an issue, it loops around to the start (which is Cat 1).
      return mixed;
    }
    
    return cats;
  }, [filteredCategories, tvSettings?.displayMode, tvSettings?.promoImages, tvSettings?.promoInterval]);

  // Adjust current slide if index goes out of bounds when settings change
  useEffect(() => {
    if (slides.length > 0 && currentSlideIndex >= slides.length) {
      setCurrentSlideIndex(0);
    }
  }, [slides.length, currentSlideIndex]);

  const handleNextSlide = useCallback(() => {
    setCurrentSlideIndex((prev) => {
      if (slides.length <= 1) return prev;
      return (prev + 1) % slides.length;
    });
  }, [slides.length]);

  const currentSlide = slides[currentSlideIndex] || slides[0];
  const currentCategory = currentSlide?.type === "category" ? currentSlide.data : null;
  const currentItems = currentCategory 
    ? menuItems
        .filter(item => item.categoryId === currentCategory.id)
        .filter(item => isAllItemsMode ? true : tvSettings!.activeItemIds!.includes(item.id))
    : [];

  const currentSlideType = currentSlide?.type;

  useEffect(() => {
    if (currentSlideType === "promo") {
      const ms = (tvSettings?.promoSlideDuration || 10) * 1000;
      const t = setTimeout(() => handleNextSlide(), ms);
      return () => clearTimeout(t);
    }
  }, [currentSlideType, currentSlideIndex, tvSettings?.promoSlideDuration, handleNextSlide]);

  const bgColor = tvSettings?.bgColor || "#ffffff";
  const textColor = tvSettings?.textColor || "#111827";

  if (loading) {
    return <UI_Loading data={restaurantData} />;
  }

  // 404 Logic: If screenId is not main, it MUST be in the screenList
  const isRegistered = screenId === "main" || (screenList && screenList.some(s => s.id === screenId));
  
  if (!isRegistered || !tvSettings) {
    return <UI_404 />;
  }

  if (categories.length === 0 || slides.length === 0) {
    return (
      <div 
        className="flex flex-col h-screen items-center justify-center absolute inset-0 select-none"
        style={{ backgroundColor: bgColor, color: textColor }}
      >
        <div className="text-center space-y-6 max-w-xl px-4 flex flex-col items-center">
          {restaurantData?.logoUrl ? (
            <img src={restaurantData.logoUrl} alt="Logo" className="h-32 w-32 object-contain bg-white rounded-3xl p-4 shadow-xl mx-auto border border-black/5" />
          ) : (
            <div className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-inner mx-auto" style={{ backgroundColor: tvSettings?.cardColor || '#f8f9fb' }}>
              <span className="text-4xl opacity-50">📺</span>
            </div>
          )}
          <motion.p
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ repeat: Infinity, duration: 2.5 }}
            className="text-2xl font-bold tracking-widest uppercase mt-8"
            style={{ color: textColor }}
          >
            Ma'lumotlar Kutilmoqda...
          </motion.p>
          <p className="text-sm font-medium mt-4 opacity-60">
            TV ekran uchun admin paneldan turkumlar yaki reklama bannerlarini tanlang.
          </p>
        </div>
      </div>
    );
  }

  const transitionStyle = tvSettings?.transitionStyle || "fade";
  const bgImg = tvSettings?.bgImageUrl ? `url(${tvSettings.bgImageUrl})` : "none";
  const videoUrl = tvSettings?.videoUrl || "";
  const isVideoBg = /\.(mp4|webm|ogg)$/i.test(videoUrl);

  // QR code via Google Charts API (no npm lib needed)
  const qrTarget = tvSettings?.qrCodeUrl || "";
  const qrSrc = qrTarget
    ? `https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${encodeURIComponent(qrTarget)}&choe=UTF-8`
    : "";
  const qrPos: Record<string, string> = {
    "bottom-right": "bottom-6 right-6",
    "bottom-left": "bottom-6 left-6",
    "top-right": "top-6 right-6",
    "top-left": "top-6 left-6",
  };
  const qrPosClass = qrPos[tvSettings?.qrCodePosition || "bottom-right"];

  const slideAnim = {
    fade: { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } },
    slide: { initial: { opacity: 0, x: 100 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -100 } },
    zoom: { initial: { opacity: 0, scale: 0.95 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 1.05 } },
  }[transitionStyle];

  return (
    <div className="relative w-full h-screen overflow-hidden text-white font-sans" style={{ fontFamily: tvSettings?.fontFamily || "Inter, sans-serif" }}>
      {/* ── BACKGROUND LAYER ── */}
      <div 
        className="absolute inset-0 z-0 transition-colors duration-1000"
        style={{ 
          backgroundColor: (tvSettings?.bgType === "color" || !tvSettings?.bgType) ? bgColor : "black"
        }}
      >
        {/* Static Image Background */}
        {tvSettings?.bgType === "image" && tvSettings.bgImageUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${tvSettings.bgImageUrl})` }}
          />
        )}

        {/* Video Background */}
        {tvSettings?.bgType === "video" && tvSettings.videoUrl && (
          <video
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source src={tvSettings.videoUrl} type="video/mp4" />
          </video>
        )}

        {/* Animated Backgrounds (Mesh / Gradient) */}
        <AnimatedBackground settings={tvSettings} />

        {/* Global Dark Overlay */}
        <div 
          className="absolute inset-0 bg-black transition-opacity duration-1000 z-[1]"
          style={{ opacity: (tvSettings?.backgroundOverlay || 0) / 100 }} 
        />
      </div>

      <div className="relative z-10 w-full h-full flex flex-col" style={{ color: textColor, '--tv-bg': bgColor, '--tv-card': tvSettings?.cardColor || "#ffffff", '--tv-text': textColor } as React.CSSProperties}>
      {/* ── TOP HEADER BAR ── */}
      {tvSettings?.showTopBar !== false && (
        <header className="flex-none flex items-center justify-between px-16 py-6 border-b border-black/5 shadow-sm bg-transparent">
        {/* Logo + Name */}
        <div className="flex items-center gap-5">
          {restaurantData?.logoUrl && (
            <img
              src={restaurantData.logoUrl}
              alt="Logo"
              className="h-16 w-16 object-contain rounded-xl border border-gray-100 shadow-sm"
            />
          )}
          <div>
            <h1 className="text-3xl font-black tracking-tight leading-none" style={{ color: textColor }}>
              {restaurantData?.name}
            </h1>
            <p className="text-sm font-bold mt-0.5 uppercase tracking-widest opacity-40" style={{ color: textColor }}>
              Raqamli Menyu
            </p>
          </div>
        </div>

        {/* Category breadcrumb pills */}
        {tvSettings?.showCategoryNav !== false && tvSettings?.displayMode !== 'promo' ? (
          <div className="flex items-center gap-2">
            {filteredCategories.map((cat) => {
              const isActive = currentSlide?.type === 'category' && currentSlide.data.id === cat.id;
              // Calculate items for this category
              const itemCount = menuItems.filter(i => i.categoryId === cat.id && (isAllItemsMode ? true : tvSettings!.activeItemIds!.includes(i.id))).length;

              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    const idx = slides.findIndex(s => s.type === 'category' && s.data.id === cat.id);
                    if (idx !== -1) setCurrentSlideIndex(idx);
                  }}
                  className={`px-4 py-2 rounded-2xl text-sm font-bold transition-all duration-300 shadow-sm border border-black/5 flex items-center gap-2 ${
                    isActive ? "scale-105" : "opacity-40"
                  }`}
                  style={{
                    backgroundColor: isActive 
                      ? (tvSettings?.catNavActiveColor || textColor) 
                      : (tvSettings?.catNavInactiveColor || (tvSettings?.cardColor || "#f8f9fb")),
                    color: isActive ? bgColor : textColor,
                  }}
                >
                  {cat.name_uz || cat.name}
                  {itemCount > 0 && (
                    <span 
                      className="text-[10px] px-2 py-0.5 rounded-lg font-black"
                      style={{ 
                        backgroundColor: isActive ? 'rgba(0,0,0,0.1)' : (tvSettings?.catNavActiveColor || textColor),
                        color: isActive ? 'inherit' : bgColor
                      }}
                    >
                      {itemCount} taom
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex-1" /> /* Spacer if category nav hidden */
        )}

        {/* Clock */}
        {(tvSettings?.showClock !== false) && (
          <div 
            className="flex items-center gap-3 border border-black/5 rounded-2xl px-6 py-3 shadow-sm"
            style={{ backgroundColor: tvSettings?.cardColor || "#ffffff" }}
          >
            <Clock className="w-5 h-5 opacity-50" style={{ color: textColor }} />
            <span className="text-3xl font-mono font-bold tracking-tight" style={{ color: textColor }}>
              {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        )}
      </header>
      )}

      {/* ── MAIN SLIDE CONTENT ── */}
      <main className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {currentSlide?.type === "category" && currentCategory && (
            <motion.div
              key={`cat-${currentCategory.id}`}
              initial={slideAnim.initial}
              animate={slideAnim.animate}
              exit={slideAnim.exit}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              className="absolute inset-0 h-full"
            >
              <TvCategorySlide
                category={currentCategory}
                items={currentItems}
                settings={tvSettings}
                onNextCategory={handleNextSlide}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ── BOTTOM BAR ── */}
      {tvSettings?.showBottomBar !== false && (
        <footer 
          className="flex-none border-t border-black/5 px-16 py-4 flex items-center justify-between transition-colors duration-500"
          style={{ backgroundColor: tvSettings?.marqueeBgColor || "transparent" }}
        >
          {/* Marquee or static text */}
          {tvSettings?.showMarquee ? (
            <div className="flex-1 overflow-hidden mr-16">
              <motion.span
                animate={{ x: ["100%", "-100%"] }}
                transition={{ duration: tvSettings.marqueeSpeed || 25, repeat: Infinity, ease: "linear" }}
                className="whitespace-nowrap inline-block text-sm font-black uppercase tracking-[0.2em]"
                style={{ color: tvSettings?.marqueeTextColor || textColor }}
              >
                {tvSettings.marqueeText || "Barcha taomlarimiz yangi mahsulotlardan tayyorlanadi • Bon Appétit • Yoqimli ishtaha!"}
              </motion.span>
            </div>
          ) : (
            <div className="flex-1" />
          )}

          {/* Progress dots */}
          {tvSettings?.showProgressDots !== false && (
            <div className="flex items-center gap-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlideIndex(i)}
                  className={`rounded-full transition-all duration-500 ${
                    i === currentSlideIndex ? "w-8 h-2 opacity-100" : "w-2 h-2 opacity-30"
                  }`}
                  style={{ backgroundColor: tvSettings?.catNavActiveColor || textColor }}
                />
              ))}
            </div>
          )}
        </footer>
      )}

      </div> {/* End absolute z-10 wrapper */}

      {/* ── QR CODE OVERLAY ── */}
      {tvSettings?.showQrCode && qrSrc && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 1 }}
          className={`absolute ${qrPosClass} z-[50] flex flex-col items-center gap-2`}
        >
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-3 shadow-2xl border border-white/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrSrc} alt="QR Code" className="w-28 h-28" />
          </div>
          {tvSettings.qrCodeText && (
            <div
              className="text-center text-xs font-bold px-3 py-1.5 rounded-xl backdrop-blur-sm max-w-32"
              style={{ backgroundColor: `${textColor}20`, color: textColor }}
            >
              {tvSettings.qrCodeText}
            </div>
          )}
        </motion.div>
      )}

      {/* ── FULL SCREEN PROMO OVERLAY ── */}
      <AnimatePresence>
        {currentSlide?.type === "promo" && (
          <motion.div
            key={`promo-${currentSlide.url}-${currentSlideIndex}`}
            initial={slideAnim.initial}
            animate={slideAnim.animate}
            exit={slideAnim.exit}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="absolute inset-0 z-[99] bg-black flex items-center justify-center"
          >
            {/\.(mp4|webm|ogg)$/i.test(currentSlide.url) ? (
              <video
                key={currentSlide.url}
                src={currentSlide.url}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
                onEnded={() => handleNextSlide()}
              />
            ) : (
              <img 
                src={currentSlide.url} 
                alt="Promo Banner" 
                className="w-full h-full object-cover"
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
