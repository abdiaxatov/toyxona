"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { cn, hexToHSL, getOptimizedImageUrl } from "@/lib/utils";

// ─── YouTube embed helper ───────────────────────────────────────────────────
function getYoutubeVideoId(url: string): string | null {
  const patterns = [
    /[?&]v=([-\w]{11})/,
    /youtu\.be\/([-\w]{11})/,
    /youtube\.com\/embed\/([-\w]{11})/,
    /youtube\.com\/shorts\/([-\w]{11})/,
    /youtube\.com\/v\/([-\w]{11})/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}
function getYoutubeEmbedUrl(url: string): string {
  const id = getYoutubeVideoId(url)
  if (!id) return url
  return `https://www.youtube.com/embed/${id}?rel=0`
}
// ────────────────────────────────────────────────────────────────────────────
import { collection, getDocs, onSnapshot, query, orderBy, addDoc, Timestamp, where, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/components/ui/use-toast";
import { SearchBar } from "@/components/search-bar";
import { CategoryFilter } from "@/components/category-filter";
import { MenuGrid } from "@/components/menu-grid";
import { BannerCarousel } from "@/components/banner-carousel";
import { BookMenu } from "@/components/book-menu";
import { ScanMenu } from "@/components/scan-menu";
import { SpinWheel } from "@/components/spin-wheel";
import { ViewMyOrdersButton } from "@/components/view-my-orders-button";
import { CartButton } from "@/components/cart-button";
import { TelegramUserAccount } from "@/components/telegram-user-account";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { OrderHistory } from "@/components/order-history";
import { Button } from "@/components/ui/button";
import { Search, Info, X, Phone, Utensils, History, Send, Instagram, MapPin, Bell, Wifi, Gift, ExternalLink, Images, Play, UserCircle, LayoutGrid } from "lucide-react"
import dynamic from "next/dynamic"
import { useLenis } from "lenis/react";
import { CartPage } from "@/components/cart-page";
import { ConfirmationContent } from "@/components/confirmation-content";
import { MaintenancePage } from "@/components/maintenance-page";

// Lazy load heavy components
const AnalyticsTracker = dynamic(() => import("@/components/analytics-tracker"), { ssr: false });
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { LogoLoader } from "@/components/ui/logo-loader";
import { AnimatePresence, motion } from "framer-motion";
import { useLanguage } from "@/hooks/use-language";
import { getLocalizedName, getLocalizedDescription } from "@/lib/localization";
import { useSearchParams, useRouter } from "next/navigation";

import type { MenuItem, Category, Banner } from "@/types";

import { getRestaurantCollection } from "@/lib/firebase-utils";

interface MenuPageProps {
  restaurantId?: string;
  restaurantData?: any;
}

export function MenuPage({ restaurantId, restaurantData: initialRestaurantData }: MenuPageProps) {
  useEffect(() => {
    console.log("DEBUG: MenuPage restaurantId:", typeof restaurantId, restaurantId);
    if (typeof restaurantId === 'object') {
       console.error("CRITICAL: restaurantId is an object! Full value:", JSON.stringify(restaurantId));
    }
  }, [restaurantId]);

  const [restaurantData, setRestaurantData] = useState(initialRestaurantData);
  const { t, language } = useLanguage();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"menu" | "orders" | "prizes" | "gallery" | "account">("menu");
  
  // 🔹 Sync restaurantData state with props on navigation
  useEffect(() => {
    if (initialRestaurantData) {
       setRestaurantData(initialRestaurantData);
       // Also reset tab if switching restaurants? Optional, but safer to start at menu.
       // setActiveTab("menu"); 
    }
  }, [initialRestaurantData]);
  const [telegramUser, setTelegramUser] = useState<any | null>(null);
  const [isTelegramWebApp, setIsTelegramWebApp] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [selectedGalleryImage, setSelectedGalleryImage] = useState<string | null>(null);
  const [phoneDrawerOpen, setPhoneDrawerOpen] = useState(false);
  const [locationDrawerOpen, setLocationDrawerOpen] = useState(false);
  const [telegramDrawerOpen, setTelegramDrawerOpen] = useState(false);
  const [telegramOrderDrawerOpen, setTelegramOrderDrawerOpen] = useState(false);
  const [instagramDrawerOpen, setInstagramDrawerOpen] = useState(false);
  const [banners, setBanners] = useState<Banner[]>([]);

  const extractInstagramUsername = (url: string) => {
    if (!url) return "";
    // Remove protocol and domain
    let username = url.replace(/^(https?:\/\/)?(www\.)?instagram\.com\//i, "");
    // Remove trailing slash and any query parameters
    username = username.split(/[?#\/]/)[0];
    return username ? `@${username}` : "Instagram";
  };

  const extractTelegramUsername = (url: string) => {
    if (!url) return "";
    let username = url.replace(/^(https?:\/\/)?(www\.)?(t\.me|telegram\.me)\//i, "");
    username = username.split(/[?#\/]/)[0];
    return username ? `@${username}` : "Telegram";
  };



  // 🔹 Group banners by displayAfterCategoryId for positioning
  const bannersBySection = useMemo(() => {
    const grouped: Record<string, Banner[]> = {
      general: []
    };
    banners.forEach((banner) => {
      if (banner.active) {
        const key = banner.displayAfterCategoryId || "general";
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(banner);
      }
    });
    return grouped;
  }, [banners]);

  // Waiter Call State
  const [waiterCallOpen, setWaiterCallOpen] = useState(false);
  const [manualTableNumber, setManualTableNumber] = useState("");
  const [isCallingWaiter, setIsCallingWaiter] = useState(false);

  // Wi-Fi Modal State
  const [wifiModalOpen, setWifiModalOpen] = useState(false);

  // Spin Wheel State
  const [spinWheelOpen, setSpinWheelOpen] = useState(false);

  // Cart Drawer State
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);

  // Confirmation Drawer State
  const [confirmationOrderId, setConfirmationOrderId] = useState<string | null>(null);
  
  const effectiveIsTelegramWebApp = useMemo(() => {
    const isFromUrl = searchParams.get('platform') === 'tg' || searchParams.get('tgWebAppStartParam') !== null;
    const hasTgInUserAgent = typeof window !== 'undefined' && /Telegram/i.test(navigator.userAgent);
    return isTelegramWebApp || isFromUrl || hasTgInUserAgent;
  }, [isTelegramWebApp, searchParams]);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 🔹 Combine all overlay states to lock scroll
  const isOverlayOpen = phoneDrawerOpen || locationDrawerOpen || telegramDrawerOpen || instagramDrawerOpen || waiterCallOpen || wifiModalOpen || spinWheelOpen || cartDrawerOpen || !!confirmationOrderId;

  // 🔹 ScrollSpy logic
  const isManualScrolling = useRef(false);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (activeTab !== "menu" || isLoading) return;

    const handleScroll = () => {
      if (isManualScrolling.current) return;

      // Handle "All" (top of page)
      if (window.scrollY < 100) {
        if (selectedCategory !== null) setSelectedCategory(null);
        return;
      }

      const categoryElements = document.querySelectorAll('[id^="category-"]');
      let currentCategory = selectedCategory;

      // Find the category that is currently most visible at the top
      categoryElements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        // If the top of the category section is near the top of the viewport
        if (rect.top <= 160 && rect.bottom > 160) {
          const id = el.id.replace("category-", "");
          currentCategory = id === "new" ? "new" : id;
        }
      });

      if (currentCategory !== selectedCategory) {
        setSelectedCategory(currentCategory);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [selectedCategory, activeTab, isLoading]);

  const lenis = useLenis();

  // 🔹 Unified Category Scroll Handler
  const handleCategoryScroll = (catId: string | null) => {
    setSelectedCategory(catId);
    isManualScrolling.current = true;
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);

    if (catId) {
      const targetId = catId === 'new' ? 'category-new' : `category-${catId}`;
      const el = document.getElementById(targetId);

      if (el) {
        if (lenis) {
          lenis.scrollTo(el, {
            offset: -100,
            duration: 1.5,
          });
        } else {
          const offset = 100;
          const bodyRect = document.body.getBoundingClientRect().top;
          const elementRect = el.getBoundingClientRect().top;
          const elementPosition = elementRect - bodyRect;
          const offsetPosition = elementPosition - offset;

          window.scrollTo({
            top: offsetPosition,
            behavior: "smooth"
          });
        }
      }
    } else {
      if (lenis) lenis.scrollTo(0);
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Reset manual scroll flag after animation completes
    scrollTimeout.current = setTimeout(() => {
      isManualScrolling.current = false;
    }, 1600);
  };

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (isOverlayOpen) {
      document.body.style.overflow = "hidden";
      document.documentElement.classList.add("lenis-stopped");
    } else {
      document.body.style.overflow = "";
      document.documentElement.classList.remove("lenis-stopped");
    }
    return () => {
      document.body.style.overflow = "";
      document.documentElement.classList.remove("lenis-stopped");
    }
  }, [isOverlayOpen]);

  // 🔹 Force Favicon Update on Client (Fix for reverting issue)
  useEffect(() => {
    if (restaurantData?.logoUrl) {
      const link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (link) {
        link.href = restaurantData.logoUrl;
      } else {
        const newLink = document.createElement("link");
        newLink.rel = "icon";
        newLink.href = restaurantData.logoUrl;
        document.head.appendChild(newLink);
      }
    }
  }, [restaurantData?.logoUrl]);

  const [bannerSrc, setBannerSrc] = useState(restaurantData?.bannerUrl || "/Banner.png");

  // Update bannerSrc if restaurantData.bannerUrl changes in real-time
  useEffect(() => {
    // Sync bannerSrc with restaurantData.bannerUrl, falling back to default if removed
    const newBanner = restaurantData?.bannerUrl || "/Banner.png";
    setBannerSrc(newBanner);
  }, [restaurantData?.bannerUrl]);

  // 🔹 Dynamic Google Font Loader
  useEffect(() => {
    const fontFamily = restaurantData?.fontFamily;
    if (!fontFamily || fontFamily === "Inter") return; // Inter is default, already loaded

    const fontSlug = fontFamily.replace(/ /g, "+");
    const linkId = `menu-dynamic-font-${fontSlug}`;

    if (!document.getElementById(linkId)) {
      const link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${fontSlug}:wght@300;400;500;600;700;800;900&display=swap`;
      document.head.appendChild(link);
    }

    // Apply font to the entire page
    document.body.style.fontFamily = `'${fontFamily}', sans-serif`;

    return () => {
      // Reset font when leaving the page
      document.body.style.fontFamily = "";
    };
  }, [restaurantData?.fontFamily]);

  // 🔹 Animation Toggle
  useEffect(() => {
    const enabled = restaurantData?.enableAnimations !== false;
    if (enabled) {
      document.body.classList.add("menu-animations");
    } else {
      document.body.classList.remove("menu-animations");
    }
    return () => {
      document.body.classList.remove("menu-animations");
    };
  }, [restaurantData?.enableAnimations]);

  const logoSrc = restaurantData?.logoUrl || "/Logo.png";
  const restaurantName = restaurantData?.name || "Menu";
  const slogan = restaurantData?.slogan || t("menu.title"); // Use slogan or default translation "restoran"
  const primaryColor = restaurantData?.primaryColor;
  const managerName = restaurantData?.managerName || "";
  const managerPhone = restaurantData?.managerPhone || "";
  const telegramUrl = restaurantData?.telegramUrl;
  const instagramUrl = restaurantData?.instagramUrl;
  const isOrderingEnabled = useMemo(() => {
    // Platform-specific checks
    if (effectiveIsTelegramWebApp) {
      return restaurantData?.isOrderingEnabledOnTelegram !== false;
    }
    
    // Website (Browser) check
    return restaurantData?.isOrderingEnabledOnWeb !== false;
  }, [restaurantData?.isOrderingEnabledOnTelegram, restaurantData?.isOrderingEnabledOnWeb, effectiveIsTelegramWebApp]);

  // 🔹 Helper to convert regular map links to embeddable ones
  const getEmbedUrl = (url: string) => {
    if (!url) return "";
    try {
      if (url.includes("yandex.uz/maps") || url.includes("yandex.com/maps")) {
        return url.replace("/maps/", "/map-widget/v1/");
      }
      if (url.includes("google.com/maps/search") || url.includes("google.uz/maps/search")) {
        const query = new URL(url).searchParams.get("query");
        if (query) return `https://maps.google.com/maps?q=${query}&hl=uz&z=15&output=embed`;
      }
      if (url.includes("google.com/maps") || url.includes("google.uz/maps")) {
        const query = new URL(url).searchParams.get("query");
        if (query) return `https://maps.google.com/maps?q=${query}&hl=uz&z=15&output=embed`;
        const match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (match) return `https://maps.google.com/maps?q=${match[1]},${match[2]}&hl=uz&z=15&output=embed`;
      }
    } catch (e) { }
    return url;
  };

  // 🔹 Derived Locations
  const locations = useMemo(() => {
    const arr = Array.isArray(restaurantData?.locations) 
      ? restaurantData.locations.filter((l: any) => l && l.url && l.url.trim() !== "") 
      : [];
    if (arr.length > 0) return arr;
    if (arr.length > 0) return arr;
    if (restaurantData?.locationUrl && restaurantData.locationUrl.trim() !== "") {
      return [{ id: 'main', name: 'Asosiy Filial (Xarita)', url: restaurantData.locationUrl }];
    }
    return [];
  }, [restaurantData]);

  // 🔹 Derived Primary Embed URL
  const primaryEmbedUrl = useMemo(() => {
    if (restaurantData?.locationUrl) return getEmbedUrl(restaurantData.locationUrl);
    if (locations.length > 0) {
      const yandex = locations.find((l: any) => l.url?.includes("yandex"));
      if (yandex) return getEmbedUrl(yandex.url);
      return getEmbedUrl(locations[0].url);
    }
    return "";
  }, [restaurantData, locations]);

  // 🔹 Derived Primary Original URL (for Link)
  const primaryOriginalUrl = useMemo(() => {
    if (restaurantData?.locationUrl) return restaurantData.locationUrl;
    if (locations.length > 0) {
      const yandex = locations.find((l: any) => l.url?.includes("yandex"));
      if (yandex) return yandex.url;
      return locations[0].url;
    }
    return "";
  }, [restaurantData, locations]);

  // 🔹 Derived Phones
  const phones = useMemo(() => {
    const arr = Array.isArray(restaurantData?.phones) 
      ? restaurantData.phones.filter((p: any) => p && p.phone && p.phone.trim() !== "") 
      : [];
    if (arr.length > 0) return arr;

    if (managerPhone && managerPhone.trim() !== "") {
      return [{ id: 'main', name: managerName || 'Manager', phone: managerPhone }];
    }
    return [];
  }, [restaurantData, managerName, managerPhone]);

  // 🔹 Derived Telegrams
  const telegrams = useMemo(() => {
    const arr = Array.isArray(restaurantData?.telegrams) 
      ? restaurantData.telegrams.filter((t: any) => t && t.url && t.url.trim() !== "") 
      : [];
    if (arr.length > 0) return arr;

    if (restaurantData?.telegramUrl && restaurantData.telegramUrl.trim() !== "") {
      return [{ id: 'main', name: 'Telegram Bot', url: restaurantData.telegramUrl }];
    }
    return [];
  }, [restaurantData]);

  // 🔹 Derived Instagrams
  const instagrams = useMemo(() => {
    const arr = Array.isArray(restaurantData?.instagrams) 
      ? restaurantData.instagrams.filter((i: any) => i && i.url && i.url.trim() !== "") 
      : [];
    if (arr.length > 0) return arr;

    if (restaurantData?.instagramUrl && restaurantData.instagramUrl.trim() !== "") {
      return [{ id: 'main', name: 'Instagram', url: restaurantData.instagramUrl }];
    }
    return [];
  }, [restaurantData]);

  const [tableInfo, setTableInfo] = useState<{ number: number | string; type: string } | null>(null);

  useEffect(() => {
    const lastOrderInfoStr = localStorage.getItem("lastOrderInfo");
    if (lastOrderInfoStr) {
      try {
        const info = JSON.parse(lastOrderInfoStr);
        if (info.tableNumber) {
          setTableInfo({ number: info.tableNumber, type: t("menu.table") });
        } else if (info.roomNumber) {
          setTableInfo({ number: info.roomNumber, type: t("menu.room") });
        }
      } catch (e) {
        console.error("Error parsing lastOrderInfo", e);
      }
    }
  }, []);

  // 🔹 Telegram WebApp Detection
  useEffect(() => {
    const checkTelegram = () => {
      if (typeof window !== "undefined") {
        // Method 1: Check Telegram WebApp API
        const webApp = (window as any).Telegram?.WebApp;
        const isFromUrl = searchParams.get('platform') === 'tg' || searchParams.get('tgWebAppStartParam') !== null;
        const hasTgInUserAgent = /Telegram/i.test(navigator.userAgent);

        if (webApp?.initData || webApp?.initDataUnsafe?.user || isFromUrl || (webApp && hasTgInUserAgent)) {
          if (webApp?.initDataUnsafe?.user) {
            setTelegramUser(webApp.initDataUnsafe.user);
          }
          setIsTelegramWebApp(true);
          
          if (webApp) {
            try {
              webApp.ready();
              webApp.expand();
            } catch (e) {}
          }
          return true;
        }
      }
      return false;
    };

    // Check immediately
    if (!checkTelegram()) {
      // If not found, poll for 2 seconds
      const interval = setInterval(() => {
        if (checkTelegram()) {
          clearInterval(interval);
        }
      }, 500);

      const timeout = setTimeout(() => {
        clearInterval(interval);
      }, 5000); // 5 seconds max polling

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, []);

  // 🔹 QR Code detection: Check URL for ?table=XX
  useEffect(() => {
    const tableParam = searchParams.get("table");
    if (tableParam) {
      // If we have a table param, save it and update state
      const tableNum = Number(tableParam);
      if (!isNaN(tableNum) && tableNum > 0) {
        const newInfo = { tableNumber: tableNum };
        localStorage.setItem("lastOrderInfo", JSON.stringify(newInfo));
        setTableInfo({ number: tableNum, type: t("menu.table") });
      }
    }

    const tabParam = searchParams.get("tab");
    if (tabParam === "orders") {
      setActiveTab("orders");
    } else if (tabParam === "account") {
      setActiveTab("account");
    } else if (tabParam === "menu") {
      setActiveTab("menu");
    }
  }, [searchParams, t]);



  const { toast } = useToast();

  useEffect(() => {
    // 🔹 Clear previous data when switching restaurants to prevent leakage/stale views
    if (restaurantId) {
       setMenuItems([]);
       setCategories([]);
       setBanners([]);
       setIsLoading(true);
    }
  }, [restaurantId]);

  useEffect(() => {
    // 🔹 1. Cache First (Load from memory/storage immediately)
    const loadFromCache = () => {
      if (!restaurantId) return false;
      try {
        const cachedMenu = localStorage.getItem(`menuItems_${restaurantId}`);
        const cachedCategories = localStorage.getItem(`categories_${restaurantId}`);
        const cachedBanners = localStorage.getItem(`banners_${restaurantId}`);

        if (cachedMenu && cachedCategories) {
          setMenuItems(JSON.parse(cachedMenu));
          setCategories(JSON.parse(cachedCategories));
          if (cachedBanners) setBanners(JSON.parse(cachedBanners));
          setIsLoading(false);
          return true; // Cache found
        }
      } catch (e) {
        console.error("Cache parse error", e);
      }
      return false; // No cache
    };

    if (!loadFromCache()) {
      setIsLoading(true);
    }

    // 🔹 2. Real-time Listeners (Update cache on change)
    const categoriesRef = restaurantId ? getRestaurantCollection(restaurantId, "categories") : collection(db, "categories");
    const unsubscribeCategories = onSnapshot(
      categoriesRef,
      (snapshot) => {
        const categoriesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Category[];
        categoriesData.sort((a, b) => (a.order || 0) - (b.order || 0));
        setCategories(categoriesData);
        if (restaurantId) {
          localStorage.setItem(`categories_${restaurantId}`, JSON.stringify(categoriesData));
        }
      },
      (error) => console.error("Error fetching categories:", error)
    );

    const menuRef = restaurantId ? getRestaurantCollection(restaurantId, "menuItems") : collection(db, "menuItems");
    const unsubscribeMenu = onSnapshot(
      menuRef,
      (snapshot) => {
        const menuData = snapshot.docs
          .map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.name || "",
              name_uz: data.name_uz || "",
              name_ru: data.name_ru || "",
              name_en: data.name_en || "",
              description: data.description || "",
              description_uz: data.description_uz || "",
              description_ru: data.description_ru || "",
              description_en: data.description_en || "",
              price: data.price || 0,
              discountPrice: data.discountPrice || null,
              discountEndsAt: data.discountEndsAt?.toDate?.() ? data.discountEndsAt.toDate() : (data.discountEndsAt || null),
              category: data.category || "",
              categoryId: data.categoryId || "",
              imageUrl: data.imageUrl || data.image,
              available: data.isAvailable !== false && data.available !== false,
              isAvailable: data.isAvailable !== false && data.available !== false,
              remainingServings: data.remainingServings,
              servesCount: data.servesCount,
              modelUrl: data.modelUrl,
              availableDays: data.availableDays || [0, 1, 2, 3, 4, 5, 6],
              imageUrls: data.imageUrls || (data.imageUrl ? [data.imageUrl] : []),
              variants: data.variants || [],
              order: data.order,
              isNew: data.isNew || false,
            } as MenuItem;
          })
          .filter((item) => item.available && item.isAvailable);

        setMenuItems(menuData);
        if (restaurantId) {
          localStorage.setItem(`menuItems_${restaurantId}`, JSON.stringify(menuData));
        }
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching menu:", error);
        setIsLoading(false);
      }
    );

    const bannersRef = restaurantId ? getRestaurantCollection(restaurantId, "banners") : collection(db, "banners");
    const unsubscribeBanners = onSnapshot(
      query(bannersRef, orderBy("createdAt", "desc")),
      (snapshot) => {
        const bannersData = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() } as Banner))
          .filter((b) => b.active);
        setBanners(bannersData);
        if (restaurantId) {
          localStorage.setItem(`banners_${restaurantId}`, JSON.stringify(bannersData));
        }
      },
      (error) => console.error("Error fetching banners:", error)
    );

    // 🔹 3. Real-time Restaurant Data Listener
    let unsubscribeRestaurant = () => { };
    if (restaurantId) {
      const restaurantRef = doc(db, "restaurants", restaurantId);
      unsubscribeRestaurant = onSnapshot(restaurantRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setRestaurantData({
            id: snapshot.id,
            ...data,
            createdAt: data.createdAt?.toMillis?.() || data.createdAt?.seconds * 1000 || null
          });
        }
      });
    }

    return () => {
      unsubscribeCategories();
      unsubscribeMenu();
      unsubscribeBanners();
      unsubscribeRestaurant();
    };
  }, [toast, restaurantId]);

  // 🔹 Filter
  const filteredItems = useMemo(() => {
    const currentDay = new Date().getDay();
    let filtered = menuItems.filter(item =>
      !item.availableDays || item.availableDays.length === 0 || item.availableDays.includes(currentDay)
    );
    if (searchQuery) {
      filtered = filtered.filter(
        (item) =>
          getLocalizedName(item, language).toLowerCase().includes(searchQuery.toLowerCase()) ||
          getLocalizedDescription(item, language).toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    // Selected category is no longer used for filtering to allow scrolling entirely.
    return filtered.sort((a, b) => {
      // 1. Group by category order first (to keep items together in "All" view)
      const catA = categories.find(c => c.id === a.categoryId);
      const catB = categories.find(c => c.id === b.categoryId);
      const catOrderA = catA?.order ?? 1000000;
      const catOrderB = catB?.order ?? 1000000;

      if (catOrderA !== catOrderB) {
        return catOrderA - catOrderB;
      }

      // 2. Then sort by item order within category
      const orderA = a.order ?? 1000000;
      const orderB = b.order ?? 1000000;
      return orderA - orderB;
    });
  }, [searchQuery, selectedCategory, menuItems, categories, language]);

  // 🔹 Check for active discounts
  const hasActiveDiscounts = useMemo(() => {
    return menuItems.some((item) => {
      const hasDiscountPrice = item.discountPrice !== null && item.discountPrice !== undefined;
      if (!hasDiscountPrice) return false;
      if (!item.discountEndsAt) return true;
      try {
        const endDate = new Date(item.discountEndsAt);
        return !isNaN(endDate.getTime()) && endDate > new Date();
      } catch (e) {
        return true;
      }
    });
  }, [menuItems]);

  // 🔹 Background Image Preloader (Barcha rasmlarni oldindan yuklash)
  useEffect(() => {
    if (menuItems.length === 0) return;

    // Preload ALL menu item images in background
    menuItems.forEach((item) => {
      if (item.imageUrl) {
        const img = new window.Image();
        img.src = item.imageUrl;
      }
    });

    // Preload banner images
    banners.forEach((banner) => {
      if (banner.imageUrl) {
        const img = new window.Image();
        img.src = banner.imageUrl;
      }
    });
  }, [menuItems, banners]);

  const openLink = (url: string) => {
    if (!url) return;
    if (typeof window !== "undefined" && (window as any).Telegram?.WebApp) {
      const webApp = (window as any).Telegram.WebApp;
      if (url.startsWith("https://t.me/") || url.startsWith("tg://")) {
        webApp.openTelegramLink(url);
      } else {
        webApp.openLink(url);
      }
    } else {
      window.open(url, "_blank");
    }
  };

  const handleExternalLink = (url: string) => openLink(url);
  const handleCall = () => (window.location.href = `tel:${managerPhone.replace(/\s+/g, "")}`);

  const onOrderTelegram = () => {
    setTelegramOrderDrawerOpen(true);
  };

  const handleWaiterCall = async () => {
    const tableNum = tableInfo?.number || manualTableNumber;
    if (!tableNum) {
      toast({
        title: t("common.error"),
        description: t("waiterCall.tableNotFound"),
        variant: "destructive"
      });
      return;
    }

    try {
      setIsCallingWaiter(true);

      // Find the table to get assigned waiter
      let assignedWaiterId = null;
      let assignedWaiterName = "Unassigned";

      const seatingCollection = restaurantId ? getRestaurantCollection(restaurantId, "seatingItems") : collection(db, "seatingItems");
      const itemsQuery = query(
        seatingCollection,
        where("number", "==", Number(tableNum))
      );

      const itemSnapshot = await getDocs(itemsQuery);
      if (!itemSnapshot.empty) {
        const itemData = itemSnapshot.docs[0].data();
        if (itemData.waiterId) {
          assignedWaiterId = itemData.waiterId;
          // Optionally fetch waiter name if needed or rely on ID filtering
          // Try to find waiter name from users collection if possible, or just leave as Unassigned/Generic for now
          // The main goal is routing, so ID is crucial.
        }
      }

      // If we have an assigned waiter ID, we might want to fetch their name for display
      if (assignedWaiterId) {
        try {
          // We can queries users collection by doc id
          // Ideally we just store ID and let the admin side resolve name, but current UI expects name
          // For now, let's keep name as "Assigned Waiter" or try to fetch if we have users loaded
          // Since we don't have users loaded here easily, we will prioritize ID for routing.
          // We can fetch the user doc 
          const userDoc = await getDocs(query(collection(db, "users"), where("__name__", "==", assignedWaiterId)));
          if (!userDoc.empty) {
            assignedWaiterName = userDoc.docs[0].data().name || "Waiter";
          }
        } catch (e) {
          console.log("Error fetching waiter name", e);
        }
      }

      const callData = {
        tableNumber: Number(tableNum),
        waiterName: assignedWaiterName,
        waiterId: assignedWaiterId, // Add this field for routing
        status: "pending",
        timestamp: Timestamp.now()
      };
      
      const waiterCallsCollection = restaurantId ? getRestaurantCollection(restaurantId, "waiter_calls") : collection(db, "waiter_calls");
      await addDoc(waiterCallsCollection, callData);

      // 🔔 Call Notification API
      try {
        await fetch("/api/waiter-call/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            restaurantId,
            tableNumber: Number(tableNum),
            waiterId: assignedWaiterId,
            waiterName: assignedWaiterName
          })
        });
      } catch (notifyErr) {
        console.error("Notification API failed:", notifyErr);
      }

      // Save to local storage if manual
      if (manualTableNumber) {
        const newInfo = { tableNumber: Number(manualTableNumber) };
        localStorage.setItem("lastOrderInfo", JSON.stringify(newInfo));
        setTableInfo({ number: Number(manualTableNumber), type: t("menu.table") });
      }

      toast({
        title: t("waiterCall.callSent"),
        description: assignedWaiterId ? t("waiterCall.waiterNotified") : "Barcha ofitsiantlarga xabar yuborildi",
        className: "bg-green-500 text-white"
      });
      setWaiterCallOpen(false);
    } catch (error) {
      console.error("Error calling waiter:", error);
      toast({
        title: t("common.error"),
        description: "Failed to call waiter",
        variant: "destructive"
      });
    } finally {
      setIsCallingWaiter(false);
    }
  };

  const [hasOrders, setHasOrders] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const orders = JSON.parse(localStorage.getItem("myOrders") || "[]");
        setHasOrders(orders.length > 0);
      } catch {
        setHasOrders(false);
      }
    }
  }, []);

  // 🔹 Dynamic Theme Styles
  const themeStyles = useMemo(() => {
    if (primaryColor) {
      const hsl = hexToHSL(primaryColor);
      if (hsl) {
        return {
          "--primary": hsl,
          "--ring": hsl,
          // Optional: Adjust foreground if needed, but white usually works well for dark primary colors
          // "--primary-foreground": "0 0% 100%" 
        } as React.CSSProperties;
      }
    }
    return {};
  }, [primaryColor]);


  if (restaurantData?.status === 'maintenance' || restaurantData?.isMaintenance) {
    return <MaintenancePage restaurantName={restaurantData?.name} logoUrl={restaurantData?.logoUrl} />;
  }

  return (
    <div
      vaul-drawer-wrapper=""
      className={cn(
        "flex min-h-screen flex-col isolate",
        restaurantData?.enableAnimations !== false ? "menu-animations" : "",
        restaurantData?.menuStyle === 'scan' ? "bg-black" : (restaurantData?.enableAnimatedBg ? "pb-20 bg-zinc-50/50 dark:bg-zinc-950/50" : "pb-20 bg-primary/10")
      )}
      style={{
        ...themeStyles,
      }}
    >
      {restaurantData?.enableAnimatedBg && mounted && (
        <AnimatedBackground 
          color={primaryColor || '#f43f5e'} 
          opacity={restaurantData?.animatedBgOpacity || 0.15} 
        />
      )}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-50 bg-white dark:bg-zinc-950 flex flex-col"
          >
            {/* Background Skeleton */}
            <MenuLoadingSkeleton />

            {/* Center Floating Logo Overlay */}
            <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
              <div className="relative">
                {/* Ripple Effect */}
                <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping opacity-75"></div>
                <div className="relative w-28 h-28 md:w-36 md:h-36 bg-white rounded-full flex items-center justify-center p-2 shadow-2xl ring-4 ring-primary/20 animate-pulse">
                  <Image
                    src={logoSrc}
                    alt="Loading..."
                    width={120}
                    height={120}
                    className="object-cover rounded-full w-full h-full"
                    priority
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analytics Tracking */}
      <AnalyticsTracker restaurantId={restaurantId} />

      {/* 🔹 Glassmorphism Scroll Progress Bar */}
      {mounted && (
        <motion.div 
          className="fixed top-0 left-0 right-0 h-1.5 z-[1000] origin-left"
          style={{ 
            backgroundColor: primaryColor || '#f43f5e',
            scaleX: typeof window !== 'undefined' ? (window.scrollY / (Math.max(1, document.documentElement.scrollHeight - window.innerHeight))) : 0,
            opacity: typeof window !== 'undefined' && window.scrollY > 20 ? 1 : 0
          }}
        />
      )}

      {/* 🔹 Premium Sticky Mini Header (Glassmorphism) */}
      {/* <AnimatePresence>
        {mounted && typeof window !== 'undefined' && window.scrollY > 100 && (
          <motion.header
            key="sticky-header"
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-0 left-0 right-0 z-[500] bg-white/70 dark:bg-black/70 backdrop-blur-2xl border-b border-white/20 dark:border-white/10 px-4 py-3 pb-4 shadow-[0_8px_32px_rgba(0,0,0,0.1)] rounded-b-[32px] overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 pointer-events-none" />
            
            <div className="relative flex flex-col gap-3 max-w-lg mx-auto">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white shadow-md flex items-center justify-center p-1 ring-1 ring-black/5">
                    <img src={logoSrc} alt="" className="w-full h-full object-contain rounded-lg" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black tracking-tight leading-none mb-1">{restaurantName}</h2>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_6px_rgba(34,197,94,0.8)]" />
                      <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Restoran ochiq</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   <button 
                    onClick={() => setActiveTab('menu')}
                    className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-primary transition-all active:scale-90"
                   >
                     <Utensils className="w-4 h-4" />
                   </button>
                   <button 
                    onClick={() => setWaiterCallOpen(true)}
                    className="p-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 transition-all active:scale-95 border border-red-100/50 dark:border-red-900/30"
                   >
                     <Bell className="w-4 h-4" />
                   </button>
                </div>
              </div>

              {activeTab === 'menu' && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t("menu.searchPlaceholder") || "Qidirish..."}
                    className="w-full h-9 bg-zinc-200/40 dark:bg-zinc-800/40 border border-white/20 rounded-xl pl-9 pr-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              )}
            </div>
          </motion.header>
        )}
      </AnimatePresence> */}

   
      {restaurantData?.menuStyle === 'book' ? (
        <BookMenu
          items={menuItems}
          categories={categories}
          restaurantData={restaurantData}
        />
      ) : restaurantData?.menuStyle === 'scan' ? (
        <ScanMenu
          urls={restaurantData.scanMenuUrls || []}
          restaurantName={restaurantName}
        />
      ) : (
        <>
          {/* 🔹 Banner */}
          <div className="relative w-full h-[250px] md:h-[350px] overflow-hidden shadow-xl mb-4">
            <Image
              src={getOptimizedImageUrl(bannerSrc || "/Banner.png", { width: 1200, quality: 85 })}
              alt="Banner"
              fill
              priority
              loading="eager"
              onError={() => {
                console.warn("Banner load failed, falling back to placeholder:", bannerSrc);
                setBannerSrc("/placeholder.jpg");
              }}
              className="object-cover"
              unoptimized={!bannerSrc?.startsWith('http')}
            />

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

            {/* Logo Circle - Absolute Top Left (Sony UI Style) */}
            <div className="absolute top-6 left-6 md:top-10 md:left-10 z-10 animate-in fade-in zoom-in duration-700 delay-100">
              <div className="w-[80px] h-[80px] md:w-[110px] md:h-[110px] bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/20 overflow-hidden ring-1 ring-white/10">
                <div className="w-full h-full bg-white rounded-full flex items-center justify-center p-0.5 overflow-hidden shadow-inner">
                  <Image
                    src={logoSrc}
                    alt={`${restaurantName} Logo`}
                    width={100}
                    height={100}
                    className="object-contain w-full h-full rounded-full transition-transform hover:scale-110 duration-500"
                    priority
                    unoptimized
                  />
                </div>
              </div>
            </div>

            {/* Text Content - Absolute Bottom Left (Sony UI Style) */}
            <div className="absolute bottom-6 left-6 md:bottom-10 md:left-10 z-10 text-white animate-in slide-in-from-bottom-6 duration-700 delay-200 pr-20">
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-0.5"
              >
                <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-[0.9] mb-1 drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
                  {restaurantName}
                </h1>
                <h3 className="text-sm md:text-xl font-bold tracking-[0.2em] opacity-80 uppercase drop-shadow-md text-white/90">
                  {slogan}
                </h3>
              </motion.div>

              {tableInfo && restaurantData?.enableWaiterCall !== false && (
                <div className="mt-4 flex items-center gap-2">
                  <div className="bg-green-500 w-2 h-2 rounded-full animate-pulse shadow-[0_0_12px_rgba(34,197,94,0.6)]" />
                  <div className="px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg text-[10px] md:text-xs font-black uppercase tracking-widest text-white/90">
                    {tableInfo.type} • <span className="text-white">{tableInfo.number}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Social Icons - Absolute Bottom Right */}
            <div className="absolute bottom-4 right-4 md:bottom-8 md:right-8 z-10 flex gap-2 md:gap-3 animate-in slide-in-from-right-4 duration-500 delay-300">
              {telegramUrl && (
                <button
                  onClick={() => openLink(telegramUrl)}
                  className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-[#0088cc] hover:bg-[#0077b5] text-white transition-all hover:scale-110 active:scale-95 shadow-lg"
                >
                  <Send className="w-5 h-5 md:w-6 md:h-6" />
                </button>
              )}
              {instagramUrl && (
                <button
                  onClick={() => openLink(instagramUrl)}
                  className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 text-white transition-all hover:scale-110 active:scale-95 shadow-lg"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 md:w-6 md:h-6"><rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" /></svg>
                </button>
              )}
            </div>
          </div>

          {/* 🔹 Header Buttons (Premium Glass Style) */}
          <div className={cn(
            "grid gap-4 px-4 -mt-8 mb-8 relative z-30",
            (restaurantData?.enableWaiterCall !== false && restaurantData?.enableWifi !== false) ? "grid-cols-2" : "grid-cols-1"
          )}>
            {/* Call Waiter Button */}
            {restaurantData?.enableWaiterCall !== false && (
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  if (tableInfo?.number) {
                    handleWaiterCall();
                  } else {
                    setWaiterCallOpen(true);
                  }
                }}
                disabled={isCallingWaiter}
                className={cn(
                  "relative group h-24 rounded-[32px] bg-white/10 dark:bg-black/40 backdrop-blur-3xl border border-white/20 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col items-center justify-center gap-2 transition-all p-0 disabled:opacity-50",
                  restaurantData?.enableWifi === false ? "col-span-1" : ""
                )}
              >
                {/* Dynamic Background Glow */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-gradient-to-br from-red-500/20 via-transparent to-red-500/10 pointer-events-none"
                />
                
                {/* Shiny Highlight Layer */}
                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />
                
                {/* Icon Container with Glow */}
                <div className="relative">
                  <div className="absolute inset-0 bg-red-500/30 blur-xl rounded-full scale-150 group-hover:bg-red-500/50 transition-all duration-500" />
                  <div className="relative bg-gradient-to-br from-red-500/20 to-red-600/30 p-3 rounded-2xl ring-1 ring-red-500/40 shadow-inner group-hover:scale-110 transition-transform duration-500 group-hover:rotate-6">
                    <Bell className="h-6 w-6 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-tada" />
                  </div>
                </div>
                
                {/* Text styling */}
                <div className="flex flex-col items-center">
                  <span className="text-[11px] font-black text-red-500 dark:text-red-400 uppercase tracking-[0.25em] drop-shadow-sm font-outfit">
                    {mounted ? t("waiterCall.callButton") : "Ofitsiantni chaqirish"}
                  </span>
                  <div className="h-0.5 w-0 group-hover:w-8 bg-red-500/50 rounded-full transition-all duration-500 mt-0.5" />
                </div>
              </motion.button>
            )}

            {/* Wi-Fi Button */}
            {restaurantData?.enableWifi !== false && (
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setWifiModalOpen(true)}
                className="relative group h-24 rounded-[32px] bg-white/10 dark:bg-black/40 backdrop-blur-3xl border border-white/20 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col items-center justify-center gap-2 transition-all p-0"
              >
                {/* Dynamic Background Glow */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-gradient-to-br from-blue-500/20 via-transparent to-blue-500/10 pointer-events-none"
                />
                
                {/* Shiny Highlight Layer */}
                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />
                
                {/* Icon Container with Glow */}
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500/30 blur-xl rounded-full scale-150 group-hover:bg-blue-500/50 transition-all duration-500" />
                  <div className="relative bg-gradient-to-br from-blue-500/20 to-blue-600/30 p-3 rounded-2xl ring-1 ring-blue-500/40 shadow-inner group-hover:scale-110 transition-transform duration-500 group-hover:-rotate-6">
                    <Wifi className="h-6 w-6 text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                  </div>
                </div>
                
                {/* Text styling */}
                <div className="flex flex-col items-center">
                  <span className="text-[11px] font-black text-blue-500 dark:text-blue-400 uppercase tracking-[0.25em] drop-shadow-sm font-outfit">
                    {mounted ? "Wi-Fi" : "Wi-Fi"}
                  </span>
                  <div className="h-0.5 w-0 group-hover:w-8 bg-blue-500/50 rounded-full transition-all duration-500 mt-0.5" />
                </div>
              </motion.button>
            )}
          </div>

          <div className="flex-1 px-2 py-2 space-y-6">
            <Tabs defaultValue="menu" value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
              {(() => {
                const gallery: any[] = restaurantData?.gallery || [];
                const hasGallery = gallery.length > 0;
                const hasSpinWheel = !!restaurantData?.enableSpinWheel;
                const hasOrders = typeof window !== 'undefined' && localStorage.getItem("orders") !== null;
                const totalTabs = 1 + (hasGallery ? 1 : 0) + (hasSpinWheel ? 1 : 0) + (hasOrders ? 1 : 0) + (effectiveIsTelegramWebApp ? 1 : 0);
                if (totalTabs <= 1) return null;
                return (
                  <div className="flex gap-1 mb-8 bg-zinc-950/20 dark:bg-black/40 backdrop-blur-2xl p-1.5 rounded-[32px] border border-white/20 dark:border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.1)] relative">
                    {/* Menu Tab */}
                    <button
                      onClick={() => setActiveTab('menu')}
                      className={cn(
                        "flex-1 flex flex-col items-center gap-0.5 py-2.5 px-1 rounded-[24px] transition-all duration-500 text-[10px] font-black uppercase tracking-[0.1em] relative z-10",
                        activeTab === 'menu' ? "text-white" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                      )}
                    >
                      {activeTab === 'menu' && (
                        <motion.div
                          layoutId="activeTabPill"
                          className="absolute inset-0 shadow-xl z-[-1] rounded-[22px]"
                          style={{ backgroundColor: primaryColor || '#f43f5e' }}
                          transition={{ type: "spring", bounce: 0.25, duration: 0.6 }}
                        />
                      )}
                      <Utensils className={cn("w-4 h-4 transition-all duration-500", activeTab === 'menu' ? "scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" : "")} />
                      <span className="leading-none">{t("menu.title")}</span>
                    </button>

                    {hasGallery && (
                      <button
                        onClick={() => setActiveTab('gallery')}
                        className={cn(
                          "flex-1 flex flex-col items-center gap-0.5 py-2.5 px-1 rounded-[24px] transition-all duration-500 text-[10px] font-black uppercase tracking-[0.1em] relative z-10",
                          activeTab === 'gallery' ? "text-white" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                        )}
                      >
                        {activeTab === 'gallery' && (
                          <motion.div
                            layoutId="activeTabPill"
                            className="absolute inset-0 shadow-xl z-[-1] rounded-[22px]"
                            style={{ backgroundColor: primaryColor || '#f43f5e' }}
                            transition={{ type: "spring", bounce: 0.25, duration: 0.6 }}
                          />
                        )}
                        <Images className={cn("w-4 h-4 transition-all duration-500", activeTab === 'gallery' ? "scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" : "")} />
                        <span className="leading-none">Galereya</span>
                      </button>
                    )}

                    {hasSpinWheel && (
                      <button
                        onClick={() => setActiveTab('prizes')}
                        className={cn(
                          "flex-1 flex flex-col items-center gap-0.5 py-2.5 px-1 rounded-[24px] transition-all duration-500 text-[10px] font-black uppercase tracking-[0.1em] relative z-10",
                          activeTab === 'prizes' ? "text-white" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                        )}
                      >
                        {activeTab === 'prizes' && (
                          <motion.div
                            layoutId="activeTabPill"
                            className="absolute inset-0 shadow-xl z-[-1] rounded-[22px]"
                            style={{ backgroundColor: primaryColor || '#f43f5e' }}
                            transition={{ type: "spring", bounce: 0.25, duration: 0.6 }}
                          />
                        )}
                        <Gift className={cn("w-4 h-4 transition-all duration-500", activeTab === 'prizes' ? "scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" : "")} />
                        <span className="leading-none">Sovg'a</span>
                      </button>
                    )}

                    {hasOrders && (
                      <button
                        onClick={() => setActiveTab('orders')}
                        className={cn(
                          "flex-1 flex flex-col items-center gap-0.5 py-2.5 px-1 rounded-[24px] transition-all duration-500 text-[10px] font-black uppercase tracking-[0.1em] relative z-10",
                          activeTab === 'orders' ? "text-white" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                        )}
                      >
                        {activeTab === 'orders' && (
                          <motion.div
                            layoutId="activeTabPill"
                            className="absolute inset-0 shadow-xl z-[-1] rounded-[22px]"
                            style={{ backgroundColor: primaryColor || '#f43f5e' }}
                            transition={{ type: "spring", bounce: 0.25, duration: 0.6 }}
                          />
                        )}
                        <History className={cn("w-4 h-4 transition-all duration-500", activeTab === 'orders' ? "scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" : "")} />
                        <span className="leading-none">Tarix</span>
                      </button>
                    )}



                    {/* Profile Tab - Always visible now */}
                    <button
                      onClick={() => setActiveTab('account')}
                      className={cn(
                        "flex-1 flex flex-col items-center gap-0.5 py-2.5 px-1 rounded-[24px] transition-all duration-500 text-[10px] font-black uppercase tracking-[0.1em] relative z-10",
                        activeTab === 'account' ? "text-white" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                      )}
                    >
                      {activeTab === 'account' && (
                        <motion.div
                          layoutId="activeTabPill"
                          className="absolute inset-0 shadow-xl z-[-1] rounded-[22px]"
                          style={{ backgroundColor: primaryColor || '#f43f5e' }}
                          transition={{ type: "spring", bounce: 0.25, duration: 0.6 }}
                        />
                      )}
                      <UserCircle className={cn("w-4 h-4 transition-all duration-500", activeTab === 'account' ? "scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" : "")} />
                      <span className="leading-none">Profil</span>
                    </button>
                  </div>
                );
              })()}

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="w-full flex-1"
                >
                  <TabsContent value="menu" className="mt-0 min-h-[50vh] pb-32">
                    {/* NEW items section */}
                    {(() => {
                      const newItems = filteredItems.filter(item => item.isNew);
                      if (newItems.length > 0) {
                        return (
                          <div id="category-new" className="space-y-3 pt-2 pb-4 scroll-mt-24">
                            <div className="flex items-center gap-3 px-3">
                              <motion.h2 
                                animate={{ 
                                  color: ["#ef4444", "#f97316", "#ef4444"],
                                  scale: [1, 1.05, 1] 
                                }}
                                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                className="text-lg font-black uppercase tracking-widest text-red-500 whitespace-nowrap drop-shadow-[0_0_8px_rgba(239,68,68,0.3)]"
                              >
                                {t("menu.newItems") || "NEW"}
                              </motion.h2>
                              <div className="h-[2px] w-full rounded-full bg-gradient-to-r from-red-500/50 to-transparent"></div>
                            </div>
                            <MenuGrid
                              items={newItems}
                              language={language}
                              primaryColor={primaryColor}
                              menuGridColumns={restaurantData?.menuGridColumns || 2}
                              restaurantId={restaurantId}
                              isOrderingEnabled={isOrderingEnabled}
                              isTelegramWebApp={effectiveIsTelegramWebApp}
                              isTelegramOrderOnly={restaurantData?.isTelegramOrderOnly}
                              onOrderTelegram={onOrderTelegram}
                            />

                            {/* General Banners (positioned after NEW) */}
                            {bannersBySection.general.length > 0 && (
                              <div className="px-2 mt-4">
                                <BannerCarousel
                                  banners={bannersBySection.general}
                                  onBannerClick={handleCategoryScroll}
                                />
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Categories sections */}
                    {categories.map((category, idx) => {
                      const effectiveIsTelegramWebApp = isTelegramWebApp || (typeof window !== 'undefined' && /Telegram/i.test(window.navigator.userAgent));
                      // If it's a discount category pseudo-category, filter discounted items
                      let categoryItems = [];
                      if (category.isDiscountCategory) {
                        categoryItems = filteredItems.filter((item) => {
                          const hasDiscountPrice = item.discountPrice !== null && item.discountPrice !== undefined;
                          if (!hasDiscountPrice || item.isNew) return false;
                          if (!item.discountEndsAt) return true;
                          try {
                            const endDate = new Date(item.discountEndsAt);
                            return !isNaN(endDate.getTime()) && endDate > new Date();
                          } catch (e) {
                            return true;
                          }
                        });
                      } else {
                        categoryItems = filteredItems.filter(item => item.categoryId === category.id && !item.isNew);
                      }

                      if (categoryItems.length === 0) return null;

                      // Get banners for this specific category
                      const categoryBanners = bannersBySection[category.id] || [];

                      return (
                        <div key={category.id} id={`category-${category.id}`} className="space-y-3 pt-4 pb-2 scroll-mt-24">
                          <div className="flex items-center gap-3 px-3">
                            <h2 className="text-lg font-bold uppercase tracking-wide text-zinc-800 dark:text-zinc-100 whitespace-nowrap">
                              {getLocalizedName(category, language) || category.name}
                            </h2>
                            <div className="h-[2px] w-full rounded-full bg-gradient-to-r from-primary/50 to-transparent" style={{ "--tw-gradient-from": `${primaryColor || "#f43f5e"}80` } as React.CSSProperties}></div>
                          </div>
                          <MenuGrid
                            items={categoryItems}
                            language={language}
                            primaryColor={primaryColor}
                            menuGridColumns={restaurantData?.menuGridColumns || 2}
                            restaurantId={restaurantId}
                            isOrderingEnabled={isOrderingEnabled}
                            isTelegramWebApp={effectiveIsTelegramWebApp}
                            isTelegramOrderOnly={restaurantData?.isTelegramOrderOnly}
                            onOrderTelegram={onOrderTelegram}
                          />

                          {/* Banners for this category */}
                          {categoryBanners.length > 0 && (
                            <div className="px-2 mt-2">
                              <BannerCarousel
                                banners={categoryBanners}
                                onBannerClick={handleCategoryScroll}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Items without category or new status */}
                    {(() => {
                      const effectiveIsTelegramWebApp = isTelegramWebApp || (typeof window !== 'undefined' && /Telegram/i.test(window.navigator.userAgent));
                      const orphanItems = filteredItems.filter(item => !item.isNew && !categories.some(c => c.id === item.categoryId));
                      if (orphanItems.length > 0 && categories.length > 0) {
                        return (
                          <div className="space-y-3 pt-4 pb-4 scroll-mt-24">
                            <div className="flex items-center gap-3 px-3">
                              <h2 className="text-lg font-bold uppercase tracking-wide text-primary whitespace-nowrap">Boshqa</h2>
                              <div className="h-[2px] w-full rounded-full bg-gradient-to-r from-gray-300 to-transparent dark:from-gray-700"></div>
                            </div>
                            <MenuGrid
                              items={orphanItems}
                              language={language}
                              primaryColor={primaryColor}
                              menuGridColumns={restaurantData?.menuGridColumns || 2}
                              restaurantId={restaurantId}
                              isOrderingEnabled={isOrderingEnabled}
                              isTelegramWebApp={effectiveIsTelegramWebApp}
                              isTelegramOrderOnly={restaurantData?.isTelegramOrderOnly}
                              onOrderTelegram={onOrderTelegram}
                            />
                          </div>
                        )
                      }
                      return null;
                    })()}

                    {filteredItems.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">{t("menu.noDishesFound")}</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="prizes" className="mt-0">
                    <div className="py-4">
                      <SpinWheel
                        restaurantId={restaurantId || "default"}
                        logoUrl={logoSrc}
                        limit={restaurantData?.spinWheelLimit || 3}
                        maxAttempts={restaurantData?.spinWheelMaxAttempts || 3}
                        winEveryX={restaurantData?.spinWheelWinEveryX || 10}
                        prizes={restaurantData?.spinWheelPrizes}
                        primaryColor={primaryColor}
                      />
                    </div>
                  </TabsContent>

                  {/* Gallery Tab */}
                  {(restaurantData?.gallery?.length > 0) && (
                    <TabsContent value="gallery" className="mt-0 pb-32">
                      <div className="space-y-5">
                          {/* Yandex / Google Map */}
                        {primaryEmbedUrl && (
                          <div className="mt-2">
                            <div className="flex items-center gap-3 mb-3">
                              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 whitespace-nowrap flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-red-500" />
                                Manzil
                              </h2>
                              <div className="h-[1.5px] w-full rounded-full bg-gradient-to-r from-red-400/40 to-transparent"></div>
                            </div>
                            <div className="rounded-2xl overflow-hidden shadow-lg ring-1 ring-white/10 relative">
                              <iframe
                                src={primaryEmbedUrl}
                                width="100%"
                                height="260"
                                style={{ border: 0 }}
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                                className="w-full"
                                allowFullScreen
                              />
                              <a
                                href={primaryOriginalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute bottom-3 right-3 bg-white/90 dark:bg-black/70 backdrop-blur-sm text-xs font-bold px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5 text-gray-700 dark:text-white hover:scale-105 transition-transform"
                              >
                                <MapPin className="w-3 h-3 text-red-500" />
                                Yo'l olish
                              </a>
                            </div>
                          </div>
                        )}
                        {/* Videos — full width */}
                        {restaurantData.gallery.filter((m: any) => m.type === 'video').map((item: any) => (
                          <div key={item.id} className="rounded-2xl overflow-hidden shadow-lg bg-black ring-1 ring-white/10">
                            {item.isYoutube ? (
                              <div className="aspect-video w-full">
                                <iframe
                                  src={getYoutubeEmbedUrl(item.url)}
                                  className="w-full h-full"
                                  allowFullScreen
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  loading="lazy"
                                />
                              </div>
                            ) : (
                              <video
                                src={item.url}
                                controls
                                playsInline
                                className="w-full aspect-video object-contain bg-black"
                                poster={item.thumbnail}
                              />
                            )}
                          </div>
                        ))}

                        {/* Photos — tap to open lightbox with smooth transition */}
                        {restaurantData.gallery.filter((m: any) => m.type === 'image').length > 0 && (
                          <div className="columns-2 gap-2 space-y-2">
                            {restaurantData.gallery.filter((m: any) => m.type === 'image').map((item: any, idx: number) => (
                              <motion.div
                                key={item.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.05 }}
                                layoutId={`gallery-img-${item.id}`}
                                onClick={() => setSelectedGalleryImage(item.url)}
                                className={cn(
                                  "relative overflow-hidden rounded-xl shadow-sm break-inside-avoid cursor-pointer active:scale-95 transition-all duration-300 group bg-gray-100",
                                  idx % 5 === 0 ? "aspect-[4/5]" : idx % 5 === 2 ? "aspect-square" : "aspect-[3/4]"
                                )}
                              >
                                <Image
                                  src={getOptimizedImageUrl(item.url, { width: 500, quality: 75 })}
                                  alt=""
                                  fill
                                  loading="lazy"
                                  sizes="(max-width: 768px) 50vw, 33vw"
                                  className="object-cover transition-all duration-700 group-hover:scale-110 group-hover:brightness-110"
                                />
                                {/* Loading Skeleton built-in */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                                  <Search className="w-4 h-4 text-white opacity-70" />
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        )}

                        {/* Full Screen Lightbox Overlay */}
                        <AnimatePresence>
                          {selectedGalleryImage && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out"
                              onClick={() => setSelectedGalleryImage(null)}
                            >
                              <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                                className="relative max-w-full max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <img
                                  src={getOptimizedImageUrl(selectedGalleryImage, { width: 1200, quality: 90 })}
                                  alt="Galereya"
                                  className="w-full h-auto object-contain max-h-[90vh] rounded-2xl"
                                />
                                <button
                                  onClick={() => setSelectedGalleryImage(null)}
                                  className="absolute top-4 right-4 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                                >
                                  <X className="w-5 h-5" />
                                </button>
                              </motion.div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                      
                      </div>
                    </TabsContent>
                  )}

                  <TabsContent value="orders" className="mt-0">
                    <OrderHistory 
                      restaurantId={restaurantId} 
                      onOrderClick={(orderId) => setConfirmationOrderId(orderId)}
                    />
                  </TabsContent>

                  <TabsContent value="account" className="mt-0 min-h-[50vh] px-4 pb-32">
                    <TelegramUserAccount
                      telegramId={telegramUser?.id || 0}
                      restaurantId={restaurantId || "default"}
                      primaryColor={primaryColor}
                      onOrderClick={(orderId) => setConfirmationOrderId(orderId)}
                      webAppUser={telegramUser}
                      isTelegramWebApp={isTelegramWebApp}
                    />
                  </TabsContent>
                </motion.div>
              </AnimatePresence>
            </Tabs>

            {/* {hasOrders && activeTab === "menu" && (
              <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[100] w-full px-4 max-w-sm">
                <ViewMyOrdersButton onClick={() => setActiveTab("orders")} />
              </div>
            )} */}
          </div>
        </>
      )
      }

      {/* 🔹 Social Drawers & Modal Triggers */}

      {/* 🔹 Phone Contacts Drawer */}
      <Drawer open={phoneDrawerOpen} onOpenChange={setPhoneDrawerOpen} shouldScaleBackground={false}>
        <DrawerContent className="rounded-t-[30px] border-none outline-none bg-white dark:bg-zinc-900" style={themeStyles}>
          <div className="w-full max-w-md mx-auto">
            <DrawerHeader className="text-center pb-2">
              <DrawerTitle className="text-xl font-bold">{t("menu.contactUs") || "Bog'lanish"}</DrawerTitle>
              <DrawerDescription>{t("menu.contactDesc") || "Biz bilan bog'laning"}</DrawerDescription>
            </DrawerHeader>
            <div className="p-4 space-y-3">
              {phones.map((phone, idx) => (
                <a
                  key={idx}
                  href={phone.phone ? `tel:${phone.phone.toString().replace(/\s/g, '')}` : '#'}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-zinc-800 rounded-2xl active:bg-gray-100 dark:active:bg-zinc-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white">{phone.name}</h4>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 font-mono tracking-wide">{phone.phone}</p>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white dark:bg-zinc-700 shadow-sm flex items-center justify-center text-gray-400">
                    <Phone className="w-4 h-4" />
                  </div>
                </a>
              ))}
            </div>
            <DrawerFooter className="pt-2">
              <DrawerClose asChild>
                <Button variant="outline" className="w-full h-12 rounded-xl text-base font-bold bg-gray-100 border-none">
                  {t("common.cancel") || "Bekor qilish"}
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>

      {/* 🔹 Locations Drawer */}
      <Drawer open={locationDrawerOpen} onOpenChange={setLocationDrawerOpen} shouldScaleBackground={false}>
        <DrawerContent className="rounded-t-[30px] border-none outline-none bg-white dark:bg-zinc-900" style={themeStyles}>
          <div className="w-full max-w-md mx-auto">
            <DrawerHeader className="text-center pb-2">
              <DrawerTitle className="text-xl font-bold">{t("menu.ourLocations") || "Bizning Filiallar"}</DrawerTitle>
              <DrawerDescription>{t("menu.chooseLocation") || "Yaqin filialni tanlang"}</DrawerDescription>
            </DrawerHeader>
            <div className="p-4 space-y-3">
              {locations.map((loc: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => openLink(loc.url)}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-zinc-800 rounded-2xl active:bg-gray-100 dark:active:bg-zinc-700 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white">{loc.name}</h4>
                      {/* Optional Address if available */}
                      {/* <p className="text-xs text-gray-500">Toshkent, Chilonzor...</p> */}
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white dark:bg-zinc-700 shadow-sm flex items-center justify-center text-gray-400">
                    <ExternalLink className="w-4 h-4" />
                  </div>
                </button>
              ))}
            </div>
            <DrawerFooter className="pt-2">
              <DrawerClose asChild>
                <Button variant="outline" className="w-full h-12 rounded-xl text-base font-bold bg-gray-100 border-none">
                  {t("common.cancel") || "Yopish"}
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>

      {/* 🔹 Telegram Drawer */}
      <Drawer open={telegramDrawerOpen} onOpenChange={setTelegramDrawerOpen} shouldScaleBackground={false}>
        <DrawerContent className="rounded-t-[30px] border-none outline-none bg-white dark:bg-zinc-900" style={themeStyles}>
          <div className="w-full max-w-md mx-auto">
            <DrawerHeader className="text-center pb-2">
              <div className="w-12 h-12 rounded-2xl bg-sky-500 mx-auto mb-3 flex items-center justify-center text-white shadow-lg">
                <Send className="w-6 h-6" />
              </div>
              <DrawerTitle className="text-2xl font-black text-sky-600 italic">Telegram</DrawerTitle>
              <DrawerDescription className="font-medium">Bizning Telegram kanallarimiz</DrawerDescription>
            </DrawerHeader>
            <div className="p-4 space-y-3">
              {telegrams.map((item: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => openLink(item.url)}
                  className="w-full flex items-center justify-between p-4 bg-gradient-to-br from-gray-50 to-white dark:from-zinc-800 dark:to-zinc-800/50 rounded-2xl active:scale-[0.98] transition-all duration-300 text-left border border-black/5 dark:border-white/5 shadow-sm hover:shadow-md"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center text-sky-600 dark:text-sky-400">
                      <Send className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white text-lg">{item.name}</h4>
                      <p className="text-sm text-sky-600 dark:text-sky-400 font-bold tracking-tight">{extractTelegramUsername(item.url)}</p>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-white dark:bg-zinc-700 shadow-sm flex items-center justify-center text-gray-400">
                    <ExternalLink className="w-5 h-5" />
                  </div>
                </button>
              ))}
            </div>
            <DrawerFooter className="pt-2">
              <DrawerClose asChild>
                <Button variant="outline" className="w-full h-14 rounded-2xl text-base font-bold bg-gray-100 border-none hover:bg-gray-200 transition-colors">
                  {t("common.cancel") || "Yopish"}
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>


      <Drawer open={instagramDrawerOpen} onOpenChange={setInstagramDrawerOpen} shouldScaleBackground={false}>
        <DrawerContent className="rounded-t-[30px] border-none outline-none bg-white dark:bg-zinc-900" style={themeStyles}>
          <div className="w-full max-w-md mx-auto">
            <DrawerHeader className="text-center pb-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] mx-auto mb-3 flex items-center justify-center text-white shadow-lg">
                <Instagram className="w-6 h-6" />
              </div>
              <DrawerTitle className="text-2xl font-black bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] bg-clip-text text-transparent italic">Instagram</DrawerTitle>
              <DrawerDescription className="font-medium">Bizning Instagram sahifalarimiz</DrawerDescription>
            </DrawerHeader>
            <div className="p-4 space-y-3">
              {instagrams.map((item: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => openLink(item.url)}
                  className="w-full flex items-center justify-between p-4 bg-gradient-to-br from-gray-50 to-white dark:from-zinc-800 dark:to-zinc-800/50 rounded-2xl active:scale-[0.98] transition-all duration-300 text-left border border-black/5 dark:border-white/5 shadow-sm hover:shadow-md"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center text-pink-600 dark:text-pink-400">
                      <Instagram className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white text-lg">{item.name}</h4>
                      <p className="text-sm text-pink-600 dark:text-pink-400 font-bold tracking-tight">{extractInstagramUsername(item.url)}</p>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-white dark:bg-zinc-700 shadow-sm flex items-center justify-center text-gray-400">
                    <ExternalLink className="w-5 h-5" />
                  </div>
                </button>
              ))}
            </div>
            <DrawerFooter className="pt-2">
              <DrawerClose asChild>
                <Button variant="outline" className="w-full h-14 rounded-2xl text-base font-bold bg-gray-100 border-none hover:bg-gray-200 transition-colors">
                  {t("common.cancel") || "Yopish"}
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>



      {/* 🔹 Waiter Call Modal */}
      < Dialog open={waiterCallOpen} onOpenChange={setWaiterCallOpen} >
        <DialogContent className="max-w-sm rounded-2xl" style={themeStyles}>
          <DialogHeader>
            <DialogTitle className="text-center text-xl">{t("waiterCall.title")}</DialogTitle>
            <DialogDescription className="text-center">
              {tableInfo ? (
                <span>{t("waiterCall.yourTable")}: <b className="text-primary text-lg">#{tableInfo.number}</b></span>
              ) : (
                t("tables.enterTableNumber")
              )}
            </DialogDescription>
          </DialogHeader>

          {!tableInfo && (
            <div className="py-4">
              <Label htmlFor="table-num" className="text-right mb-2 block">{t("menu.table")}</Label>
              <Input
                id="table-num"
                type="number"
                className="text-lg text-center"
                placeholder="1"
                value={manualTableNumber}
                onChange={(e) => setManualTableNumber(e.target.value)}
                autoFocus
              />
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              onClick={handleWaiterCall}
              className="w-full bg-red-500 hover:bg-red-600 text-lg h-12"
              disabled={isCallingWaiter || (!tableInfo && !manualTableNumber)}
            >
              {isCallingWaiter ? t("waiterCall.calling") : t("waiterCall.callButton")}
            </Button>
            <Button
              onClick={() => setWaiterCallOpen(false)}
              variant="ghost"
              className="w-full"
            >
              {t("menu.call.no")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog >

      {/* Wi-Fi Modal */}
      <Dialog open={wifiModalOpen} onOpenChange={setWifiModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl shadow-lg">
                <Wifi className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">Wi-Fi Ma'lumotlari</DialogTitle>
                <DialogDescription>
                   Internet tarmog'iga ulanish uchun ma'lumotlar.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* SSID */}
            <div className="space-y-2">
              <Label htmlFor="wifi-ssid" className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Wi-Fi Nomi (SSID)
              </Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-3 p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 rounded-xl border-2 border-blue-200 dark:border-blue-800">
                  <Wifi className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <code id="wifi-ssid" className="font-mono font-bold text-lg text-blue-900 dark:text-blue-100 flex-1">
                    {restaurantData?.wifiSSID || "7days-burger_Guest"}
                  </code>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 rounded-xl border-2 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                  onClick={() => {
                    navigator.clipboard.writeText(restaurantData?.wifiSSID || "7days-burger_Guest");
                    toast({ title: "Nusxalandi!", description: "Wi-Fi nomi nusxalandi" });
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                    <path d="M4 16c-1.1 0-2-.9-2 2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                  </svg>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground pl-1">Mijozlarga ko'rinadigan Wi-Fi nomi</p>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="wifi-password" className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Wi-Fi Paroli
              </Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-3 p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl border-2 border-green-200 dark:border-green-800">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600 dark:text-green-400">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <code id="wifi-password" className="font-mono font-bold text-lg text-green-900 dark:text-green-100 tracking-wider flex-1">
                    {restaurantData?.wifiPassword || "20252025"}
                  </code>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 rounded-xl border-2 hover:bg-green-50 dark:hover:bg-green-950/50"
                  onClick={() => {
                    navigator.clipboard.writeText(restaurantData?.wifiPassword || "20252025");
                    toast({ title: "Nusxalandi!", description: "Wi-Fi paroli nusxalandi" });
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                    <path d="M4 16c-1.1 0-2-.9-2 2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                  </svg>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground pl-1">Wi-Fi ulanish paroli</p>
            </div>
          </div>

          <DialogFooter className="sm:justify-center">
            <Button
              type="button"
              onClick={() => setWifiModalOpen(false)}
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg"
            >
              Yopish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 🔹 Footer Category Filter (Integrated White UI) */}
      {activeTab === "menu" && restaurantData?.menuStyle !== 'book' && restaurantData?.menuStyle !== 'scan' && (
        <div className="fixed bottom-0 left-0 right-0 z-[90] pointer-events-none">
          <footer className="w-full bg-white dark:bg-zinc-950 border-t border-black/5 dark:border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.08)] rounded-t-[36px] pointer-events-auto overflow-hidden animate-in slide-in-from-bottom-5 duration-500">
            
            {/* 🔹 Social Quick Links (Vertical Column on Right) */}
            <div className="absolute right-4 bottom-[calc(100%+16px)] flex flex-col gap-3 items-center pointer-events-auto">
                {(locations.length > 0 || restaurantData?.locationUrl) && (
                  <button 
                    onClick={() => setLocationDrawerOpen(true)} 
                    className="group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-blue-500/20 shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex items-center justify-center text-blue-600 dark:text-blue-400 group-active:scale-90 transition-all duration-300">
                      <MapPin className="w-6 h-6" />
                    </div>
                  </button>
                )}
                {phones.length > 0 && (
                  <button 
                    onClick={() => setPhoneDrawerOpen(true)} 
                    className="group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-green-500/20 shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex items-center justify-center text-green-600 dark:text-green-400 group-active:scale-90 transition-all duration-300">
                      <Phone className="w-6 h-6" />
                    </div>
                  </button>
                )}
                {telegrams.length > 0 && (
                  <button 
                    onClick={() => setTelegramDrawerOpen(true)} 
                    className="group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-sky-500/20 shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex items-center justify-center text-sky-600 dark:text-sky-400 group-active:scale-90 transition-all duration-300">
                      <Send className="w-6 h-6" />
                    </div>
                  </button>
                )}
                {instagrams.length > 0 && (
                  <button 
                    onClick={() => setInstagramDrawerOpen(true)} 
                    className="group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-pink-500/20 shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex items-center justify-center text-pink-600 dark:text-pink-400 group-active:scale-90 transition-all duration-300">
                      <Instagram className="w-6 h-6" />
                    </div>
                  </button>
                )}
            </div>

            <div className="overflow-x-auto px-6 py-4">
              <CategoryFilter
                categories={categories}
                selectedCategory={selectedCategory}
                onSelectCategory={handleCategoryScroll}
                hasActiveDiscounts={hasActiveDiscounts}
                primaryColor={primaryColor}
                showLanguageSwitcher={restaurantData?.enableLanguageSwitcher !== false}
              />
            </div>

            {restaurantData?.showDeveloperCredit !== false && (
              <div className="flex items-center justify-center text-[11px] font-bold text-muted-foreground/40 pb-5 uppercase tracking-[0.2em]">
                <p className="flex items-center gap-1.5">
                  <span>© 2025</span>
                  <a className="text-primary hover:underline font-black" href="http://abdiaxatov.uz">Abdiaxatov</a>
                  <span>{t("menu.itServices")}</span>
                </p>
              </div>
            )}
          </footer>
        </div>
      )}

      <CartButton 
        primaryColor={primaryColor} 
        restaurantId={restaurantId} 
        onCartClick={() => setCartDrawerOpen(true)}
        activeTab={activeTab}
        isOrderingEnabled={isOrderingEnabled}
      />

      {/* Cart Drawer */}
      <Drawer open={cartDrawerOpen} onOpenChange={setCartDrawerOpen} shouldScaleBackground={false}>
        <DrawerContent className="max-h-[85vh] h-full p-0 overflow-hidden bg-background">
          <DrawerHeader className="sr-only">
             <DrawerTitle>Savat</DrawerTitle>
             <DrawerDescription>
                Savatingizdagi mahsulotlar
             </DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto h-full pb-10">
            <CartPage 
              restaurantId={restaurantId} 
              slug={restaurantData?.slug}
              customDomain={restaurantData?.customDomain}
              onClose={() => setCartDrawerOpen(false)}
              onOrderPlaced={(orderId) => {
                setCartDrawerOpen(false);
                setConfirmationOrderId(orderId);
              }}
              isOrderingEnabled={isOrderingEnabled}
              isTelegramWebApp={effectiveIsTelegramWebApp}
              telegramUrl={restaurantData?.telegramBotUsername ? `https://t.me/${restaurantData.telegramBotUsername.replace('@', '')}` : restaurantData?.telegramUrl}
              primaryColor={primaryColor}
              enableManualTableSelection={restaurantData?.enableManualTableSelection !== false}
              isTableFromQR={!!searchParams.get("table")}
            />
          </div>
        </DrawerContent>
      </Drawer>

      {/* Confirmation Drawer */}
      <Drawer open={!!confirmationOrderId} onOpenChange={(open) => !open && setConfirmationOrderId(null)} shouldScaleBackground={false}>
        <DrawerContent className="max-h-[85vh] h-full p-0 overflow-hidden bg-background">
          <DrawerHeader className="sr-only">
             <DrawerTitle>Buyurtma tasdiqlandi</DrawerTitle>
             <DrawerDescription>
                Sizning buyurtmangiz qabul qilindi
             </DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto h-full pb-10">
            {confirmationOrderId && (
              <ConfirmationContent 
                orderId={confirmationOrderId} 
                restaurantId={restaurantId}
                onClose={() => setConfirmationOrderId(null)}
              />
            )}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Telegram Order Only Drawer */}
      <Drawer open={telegramOrderDrawerOpen} onOpenChange={setTelegramOrderDrawerOpen} shouldScaleBackground={false}>
        <DrawerContent className="max-h-[50vh] rounded-t-[32px] border-0 bg-white dark:bg-zinc-950 overflow-hidden outline-none">
          <div className="mx-auto mt-4 h-1.5 w-12 rounded-full bg-zinc-200 dark:bg-zinc-800" />
          
          <div className="px-6 py-8 flex flex-col items-center text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-sky-50 dark:bg-sky-900/20 flex items-center justify-center">
              <Send className="w-10 h-10 text-sky-500" />
            </div>
            
            <div className="space-y-2">
              <DrawerTitle className="text-2xl font-black text-gray-900 dark:text-white">
                {language === 'uz' ? "Buyurtma berish" : language === 'ru' ? "Заказать еду" : "Order Food"}
              </DrawerTitle>
              <DrawerDescription className="text-gray-500 dark:text-zinc-400 font-medium">
                {language === 'uz' 
                  ? "Buyurtma berish uchun bizning Telegram botimizga o'ting" 
                  : language === 'ru' 
                    ? "Для оформления заказа перейдите в наш Telegram бот" 
                    : "To place an order, please visit our Telegram bot"}
              </DrawerDescription>
            </div>

            <Button
              onClick={() => {
                let botUrl = restaurantData?.orderingTelegramBot;
                
                if (botUrl) {
                  // Handle @username format
                  if (botUrl.startsWith('@')) {
                    botUrl = `https://t.me/${botUrl.replace('@', '')}`;
                  } else if (!botUrl.startsWith('http') && !botUrl.startsWith('tg://')) {
                    // Handle raw username format
                    botUrl = `https://t.me/${botUrl}`;
                  }
                } else {
                  // Fallback to legacy fields
                  botUrl = restaurantData?.telegramBotUsername 
                    ? `https://t.me/${restaurantData.telegramBotUsername.replace('@', '')}` 
                    : restaurantData?.telegramUrl;
                }

                if (botUrl) openLink(botUrl);
                setTelegramOrderDrawerOpen(false);
              }}
              className="w-full h-14 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-black text-lg shadow-xl shadow-sky-500/20 flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
            >
              <Send className="w-5 h-5" />
              <span>{language === 'uz' ? "Telegram botga o'tish" : language === 'ru' ? "Перейти в бот" : "Go to Bot"}</span>
            </Button>
            
            <button 
              onClick={() => setTelegramOrderDrawerOpen(false)}
              className="text-zinc-400 dark:text-zinc-500 text-sm font-bold uppercase tracking-widest hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            >
              {language === 'uz' ? "Yopish" : language === 'ru' ? "Закрыть" : "Close"}
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* {!hasOrders && <ViewMyOrdersButton />} */}

      {/* Spin Wheel Trigger */}
      {/* {
        restaurantData?.enableSpinWheel && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setSpinWheelOpen(true)}
            className="fixed bottom-24 right-6 z-[60] w-14 h-14 bg-gradient-to-br from-purple-600 to-purple-800 rounded-full flex items-center justify-center shadow-2xl ring-4 ring-white/20 animate-bounce-subtle"
          >
            <Gift className="w-7 h-7 text-white" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center border-2 border-white">
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
            </div>
          </motion.button>
        )
      } */}

      {/* Spin Wheel Dialog for Floating Button */}
      <Dialog open={spinWheelOpen} onOpenChange={setSpinWheelOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden bg-transparent border-none shadow-none">
          <DialogHeader className="sr-only">
            <DialogTitle>Omad charxi</DialogTitle>
            <DialogDescription>
              Sovg'alar va chegirmalar yutib olish uchun charxni aylantiring.
            </DialogDescription>
          </DialogHeader>
          <SpinWheel
            restaurantId={restaurantId || "default"}
            logoUrl={logoSrc}
            limit={restaurantData?.spinWheelLimit || 3}
            maxAttempts={restaurantData?.spinWheelMaxAttempts || 3}
            primaryColor={primaryColor}
            onClose={() => setSpinWheelOpen(false)}
            prizes={restaurantData?.spinWheelPrizes}
          />
        </DialogContent>
      </Dialog>
      <style jsx global>{`
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 3s infinite ease-in-out;
        }
      `}</style>
    </div >
  );
}

/* 🔹 Animated Background Component */
function AnimatedBackground({ color, opacity }: { color: string; opacity: number }) {
  // Use HSL for variations
  const secondaryColor = color + '80'; // 50% opacity string
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
      {/* Dynamic Blob 1 */}
      <motion.div
        animate={{
          scale: [1, 1.4, 1.1, 1],
          x: [0, 150, 100, 0],
          y: [0, 100, 150, 0],
          rotate: [0, 120, 240, 360],
        }}
        transition={{
          duration: 35,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute -top-[10%] -left-[10%] w-[80%] h-[80%] rounded-[40%] blur-[120px]"
        style={{ background: color, opacity: opacity * 0.8 }}
      />

      {/* Dynamic Blob 2 */}
      <motion.div
        animate={{
          scale: [1.2, 1, 1.4, 1.2],
          x: [0, -120, -50, 0],
          y: [0, -150, -80, 0],
          rotate: [0, -90, -180, -360],
        }}
        transition={{
          duration: 40,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute -bottom-[15%] -right-[10%] w-[75%] h-[75%] rounded-[30%] blur-[140px]"
        style={{ background: secondaryColor, opacity: opacity }}
      />

      {/* Dynamic Blob 3 - Accenting center */}
      <motion.div
        animate={{
          scale: [0.8, 1.2, 1, 0.8],
          x: [-50, 50, -30, -50],
          y: [50, -50, 20, 50],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-1/4 left-1/4 w-[60%] h-[60%] rounded-full blur-[100px]"
        style={{ background: color, opacity: opacity * 0.5 }}
      />

      {/* Premium Glass Overlay */}
      <div className="absolute inset-0 bg-white/40 dark:bg-black/80 backdrop-blur-[6px] transition-colors duration-700" />
      
      {/* Noise Texture Layer for premium feel */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")" }} />
    </div>
  );
}

/* 🔹 Action Button Component */
function ActionButton({
  onClick,
  icon,
  gradient,
  className,
  style,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  gradient: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <Button
      onClick={onClick}
      size="icon"
      className={cn(
        "h-12 w-12 rounded-full shadow-lg transition-transform active:scale-95 bg-gradient-to-r",
        gradient,
        className
      )}
      style={style}
    >
      {icon}
    </Button>
  );
}


/* 🔹 No Items Component */
function NoItems({
  hasItems,
  resetSearch,
}: {
  hasItems: boolean;
  resetSearch: () => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="text-center py-8">
      <p className="text-muted-foreground">
        {hasItems ? t("menu.noItems") : t("menu.noAvailable")}
      </p>
      {hasItems && (
        <Button variant="outline" onClick={resetSearch} className="mt-2 text-xs">
          {t("menu.clearSearch")}
        </Button>
      )}
    </div>
  );
}

/* 🔹 Skeleton Loader - Premium Sony Style */
function MenuLoadingSkeleton() {
  return (
    <div className="flex flex-col min-h-screen pb-20 bg-background">

      {/* 1. Header Skeleton */}
      <div className="relative w-full h-[280px] md:h-[350px] bg-muted overflow-hidden shadow-2xl mb-6 rounded-b-[40px] shrink-0">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />

        {/* Logo Circle */}
        <div className="absolute top-6 left-6 z-20">
          <Skeleton className="w-[88px] h-[88px] rounded-full ring-4 ring-background/20" />
        </div>

        {/* Text Content */}
        <div className="absolute bottom-8 left-6 z-20 space-y-4 w-2/3">
          <Skeleton className="h-10 w-3/4 rounded-xl" />
          <Skeleton className="h-5 w-1/2 rounded-lg opacity-70" />
        </div>

        {/* Social Icons */}
        <div className="absolute bottom-8 right-6 z-20 flex flex-col gap-3">
          <Skeleton className="w-11 h-11 rounded-full" />
          <Skeleton className="w-11 h-11 rounded-full" />
        </div>
      </div>

      <div className="px-4 space-y-8 flex-1">

        {/* 2. Action Buttons (Grid) */}
        <div className="grid grid-cols-2 gap-4 -mt-14 relative z-30 px-2">
          <Skeleton className="h-24 rounded-[24px] shadow-lg" />
          <Skeleton className="h-24 rounded-[24px] shadow-lg" />
        </div>

        {/* 3. Search & Tabs */}
        <div className="space-y-4">
          <Skeleton className="h-12 w-full rounded-2xl" />
          <div className="flex gap-2 overflow-hidden">
            <Skeleton className="h-10 w-24 rounded-full shrink-0" />
            <Skeleton className="h-10 w-24 rounded-full shrink-0" />
            <Skeleton className="h-10 w-24 rounded-full shrink-0" />
          </div>
        </div>

        {/* 4. Menu Grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 pb-20">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3">
              <Skeleton className="aspect-[4/3] w-full rounded-[24px]" />
              <div className="space-y-2 px-1">
                <Skeleton className="h-4 w-3/4 rounded-md" />
                <Skeleton className="h-4 w-1/2 rounded-md opacity-60" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
