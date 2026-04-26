"use client";

import { useState, useEffect } from "react";
import { getDoc, setDoc, deleteDoc, onSnapshot, query, orderBy } from "firebase/firestore";
import { getRestaurantDoc, getRestaurantCollection } from "@/lib/firebase-utils";
import { uploadToGitHub } from "@/lib/github-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import {
  Monitor, Save, Settings, Layers, Type, Image as ImageIcon,
  CheckSquare, Square, ChevronDown, ChevronUp, Search, PaintBucket, ListTree,
  Presentation, Trash, Plus, UploadCloud, Tv2, Clock, QrCode, Sparkles, Palette, MonitorOff
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input as SearchInput } from "@/components/ui/input";
import type { Category, MenuItem, TvSettings } from "@/types";

interface TvSettingsManagementProps {
  restaurantId: string;
  slug?: string;  // restaurant slug for URL preview
  categories: Category[];
}

export function TvSettingsManagement({ restaurantId, slug, categories }: TvSettingsManagementProps) {
  const [settings, setSettings] = useState<TvSettings | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [newPromoUrl, setNewPromoUrl] = useState("");
  const [uploadingBg, setUploadingBg] = useState(false);
  const [uploadingPromo, setUploadingPromo] = useState(false);
  const [activeScreenId, setActiveScreenId] = useState<string>("main");
  // Dynamic screen list
  const [screens, setScreens] = useState<{id: string; name: string}[]>([
    { id: "main", name: "Asosiy TV" }
  ]);
  const [newScreenName, setNewScreenName] = useState("");
  const [addingScreen, setAddingScreen] = useState(false);
  const { toast } = useToast();

  // Load screen list from Firestore
  useEffect(() => {
    const docRef = getRestaurantDoc(restaurantId, "settings", "tv-screens");
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data.screens)) {
          setScreens(data.screens);
        }
      }
    });
    return unsub;
  }, [restaurantId]);

  const saveScreensList = async (list: {id: string; name: string}[]) => {
    await setDoc(getRestaurantDoc(restaurantId, "settings", "tv-screens"), { screens: list });
  };

  const handleAddScreen = async () => {
    const name = newScreenName.trim();
    if (!name) return;
    // Generate a safe id from name or use incrementing number
    const id = String(screens.length); // e.g. "2", "3" → URL /tv/2/slug
    const next = [...screens, { id, name }];
    setScreens(next);
    await saveScreensList(next);
    setActiveScreenId(id);
    setNewScreenName("");
    setAddingScreen(false);
    toast({ title: `📺 ${name} qo'shildi`, description: `URL: /tv/${id}/${slug || 'slug'}` });
  };

  const handleDeleteScreen = async (sid: string) => {
    if (sid === "main") return; // Can't delete main
    const next = screens.filter(s => s.id !== sid);
    setScreens(next);
    await saveScreensList(next);
    
    // Also delete the actual configuration document to trigger 404 on frontend
    try {
      await deleteDoc(getRestaurantDoc(restaurantId, "settings", `tv-${sid}`));
    } catch (err) {
      console.error("Settings deletion error:", err);
    }

    if (activeScreenId === sid) setActiveScreenId("main");
    toast({ title: "O'chirildi", description: `TV "${sid}" butunlay o'chirib tashlandi.` });
  };

  // Load TV settings
  useEffect(() => {
    async function fetchSettings() {
      try {
        const docId = (!activeScreenId || activeScreenId === "main") ? "tv" : `tv-${activeScreenId}`;
        const tvDoc = await getDoc(getRestaurantDoc(restaurantId, "settings", docId));
        if (tvDoc.exists()) {
          setSettings(tvDoc.data() as TvSettings);
        } else {
          setSettings({
            id: "tv",
            slideDuration: 15,
            activeCategoryIds: categories.map(c => c.id),
            activeItemIds: null as any,
            theme: "modern",
            showTopBar: true,
            showBottomBar: true,
            showLogo: true,
            showClock: true,
            showCategoryNav: true,
            showProgressDots: true,
            showImages: true,
            showDescriptions: true,
            showOutOfStock: true,
            showBadges: true,
            showMarquee: true,
            marqueeSpeed: 25,
            marqueeText: "Barcha taomlarimiz yangi mahsulotlardan tayyorlanadi • Yoqimli ishtaha!",
            fontSize: "medium",
            fontFamily: "Inter, sans-serif",
            columns: 2,
            rows: 2,
            bgColor: "#ffffff",
            cardColor: "#ffffff",
            textColor: "#111827",
            backgroundOverlay: 0,
            transitionStyle: "fade",
            bgImageUrl: "",
            cardRadius: "lg",
            displayMode: "menu",
            promoImages: [],
            promoSlideDuration: 10,
            promoInterval: 1,
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    setLoading(true);
    fetchSettings();
  }, [restaurantId, activeScreenId, categories]);

  // Listen for menu items in real-time
  useEffect(() => {
    const q = query(getRestaurantCollection(restaurantId, "menuItems"));
    return onSnapshot(q, (snap) => {
      setMenuItems(snap.docs.map(d => ({ id: d.id, ...d.data() })) as MenuItem[]);
    });
  }, [restaurantId]);

  const handleSave = async () => {
    if (!settings) return;
    try {
      const docId = (!activeScreenId || activeScreenId === "main") ? "tv" : `tv-${activeScreenId}`;
      await setDoc(getRestaurantDoc(restaurantId, "settings", docId), {
        ...settings,
        lastUpdated: new Date()
      });
      const screenName = screens.find(s => s.id === activeScreenId)?.name || activeScreenId;
      toast({ title: "✅ Saqlandi!", description: `"${screenName}" sozlamalari yangilandi.` });
    } catch (err) {
      toast({ variant: "destructive", title: "Xatolik", description: "Saqlashda xatolik yuz berdi!" });
    }
  };

  const update = (patch: Partial<TvSettings>) => setSettings(s => s ? { ...s, ...patch } : s);

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBg(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const fName = `tv_bg_${Date.now()}.${ext}`;
      const res = await uploadToGitHub(file, fName, "tv-images");
      if (res.success && res.url) {
        update({ bgImageUrl: res.url });
        toast({ title: "Muvaffaqiyatli", description: "Fon rasmi yuklandi!" });
      } else {
        throw new Error(res.error || "Yuklashda noma'lum xatolik");
      }
    } catch(err: any) {
      toast({ variant: "destructive", title: "Xatolik", description: err.message });
    } finally {
      setUploadingBg(false);
      // Reset input value
      e.target.value = '';
    }
  };

  const handlePromoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !settings) return;
    setUploadingPromo(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const fName = `tv_promo_${Date.now()}.${ext}`;
      const res = await uploadToGitHub(file, fName, "tv-images");
      if (res.success && res.url) {
         const currentArr = settings.promoImages || [];
         update({ promoImages: [...currentArr, res.url] });
         toast({ title: "Muvaffaqiyatli", description: "Banner yuklandi!" });
      } else {
         throw new Error(res.error || "Yuklashda noma'lum xatolik");
      }
    } catch(err: any) {
      toast({ variant: "destructive", title: "Xatolik", description: err.message });
    } finally {
      setUploadingPromo(false);
      e.target.value = '';
    }
  };

  // Category toggle
  const toggleCategory = (id: string) => {
    const cur = settings?.activeCategoryIds || [];
    update({ activeCategoryIds: cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id] });
  };

  // Item toggle
  const toggleItem = (id: string, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!settings) return;
    const isAllMode = settings.activeItemIds === null || settings.activeItemIds === undefined;
    if (isAllMode) {
      const allIds = menuItems.map(m => m.id).filter(x => x !== id);
      update({ activeItemIds: allIds });
    } else {
      const cur = settings.activeItemIds || [];
      if (cur.includes(id)) {
        update({ activeItemIds: cur.filter(x => x !== id) });
      } else {
        update({ activeItemIds: [...cur, id] });
      }
    }
  };

  const isItemActive = (id: string) => {
    if (!settings) return false;
    if (settings.activeItemIds === null || settings.activeItemIds === undefined) return true;
    return settings.activeItemIds.includes(id);
  };

  const selectAllItems = () => update({ activeItemIds: null as any });
  const deselectAllItems = () => update({ activeItemIds: [] });

  const activeCatIds = settings?.activeCategoryIds || [];
  const visibleCategories = categories.filter(c => activeCatIds.includes(c.id));

  const filteredItems = (catId: string) =>
    menuItems
      .filter(i => i.categoryId === catId)
      .filter(i => !search || (i.name_uz || i.name).toLowerCase().includes(search.toLowerCase()));

  if (loading) {
    return <div className="flex items-center justify-center h-40 text-muted-foreground">Yuklanmoqda...</div>;
  }

  const isAllItemsMode = settings?.activeItemIds === null || settings?.activeItemIds === undefined;
  const totalActive = isAllItemsMode
    ? menuItems.filter(m => activeCatIds.includes(m.categoryId || "")).length
    : (settings?.activeItemIds || []).length;

  return (
    <div className="space-y-8 w-full mx-auto pb-20 px-6 lg:px-10">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between sticky top-0 bg-gray-50/80 backdrop-blur-md z-10 py-4 -mx-4 px-4 border-b border-gray-100">
        <div>
          <h2 className="text-2xl font-black flex items-center gap-2 text-gray-900">
            <Monitor className="w-6 h-6 text-primary" /> TV Menyu Pro Sozlamalari
          </h2>
          <p className="text-sm text-gray-500 mt-1 font-medium">
            TV displeyni eng mayda shaxar ehtiyojlarigacha moslang.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-1">
          {/* Dynamic Multi-Screen Selector - Full Width Scrollable */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl flex-1 overflow-x-auto min-w-0">
            {screens.map((screen) => {
              const isActive = activeScreenId === screen.id;
              const urlPath = screen.id === "main"
                ? `/tv/${slug || 'slug'}`
                : `/tv/${slug || 'slug'}/${screen.id}`;
              return (
                <div key={screen.id} className="relative group flex-none">
                  <button
                    onClick={() => setActiveScreenId(screen.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                      isActive
                        ? "bg-white shadow-sm text-gray-900"
                        : "text-gray-400 hover:text-gray-700"
                    }`}
                    title={urlPath}
                  >
                    <Tv2 className="w-3.5 h-3.5" />
                    {screen.name}
                  </button>
                  {screen.id !== "main" && (
                    <button
                      onClick={() => handleDeleteScreen(screen.id)}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full hidden group-hover:flex items-center justify-center text-[9px] font-black"
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}

            {/* Add new screen */}
            {addingScreen ? (
              <div className="flex items-center gap-1 px-1">
                <Input
                  autoFocus
                  placeholder="TV nomi..."
                  value={newScreenName}
                  onChange={e => setNewScreenName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddScreen(); if (e.key === 'Escape') setAddingScreen(false); }}
                  className="h-7 w-24 text-xs border-gray-300"
                />
                <button onClick={handleAddScreen} className="h-7 px-2 bg-gray-900 text-white text-xs font-bold rounded-lg">OK</button>
                <button onClick={() => setAddingScreen(false)} className="h-7 px-2 text-xs text-gray-400">Bekor</button>
              </div>
            ) : (
              <button
                onClick={() => setAddingScreen(true)}
                className="flex items-center gap-1 px-2 py-2 rounded-lg text-xs font-bold text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Yangi TV
              </button>
            )}
          </div>

          {/* URL badge */}
          {slug && (
            <div className="hidden lg:flex items-center gap-1 text-[11px] text-gray-400 font-mono bg-gray-50 border border-gray-200 rounded-lg px-2 py-1">
              /tv/{slug}/{activeScreenId !== "main" && activeScreenId}
            </div>
          )}

          <Button onClick={handleSave} size="lg" className="gap-2 shadow-lg hover:shadow-xl transition-shadow bg-gray-900 text-white hover:bg-black rounded-xl">
            <Save className="w-4 h-4" /> Saqlash
          </Button>
        </div>
      </div>

      <Tabs defaultValue="layout" className="w-full">
        <TabsList className="grid w-full grid-cols-5 p-1 bg-gray-200/50 rounded-2xl mb-8 h-auto shadow-inner border border-gray-100">
          <TabsTrigger value="layout" className="rounded-xl py-3.5 font-black uppercase tracking-wider text-[10px] data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all">
            <Layers className="w-4 h-4 mr-2" /> O'lchamlar
          </TabsTrigger>
          <TabsTrigger value="design" className="rounded-xl py-3.5 font-black uppercase tracking-wider text-[10px] data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all">
            <PaintBucket className="w-4 h-4 mr-2" /> Dizayn
          </TabsTrigger>
          <TabsTrigger value="content" className="rounded-xl py-3.5 font-black uppercase tracking-wider text-[10px] data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all">
            <ListTree className="w-4 h-4 mr-2" /> Taomlar
          </TabsTrigger>
          <TabsTrigger value="promos" className="rounded-xl py-3.5 font-black uppercase tracking-wider text-[10px] data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all">
            <Presentation className="w-4 h-4 mr-2" /> Reklama
          </TabsTrigger>
          <TabsTrigger value="advanced" className="rounded-xl py-3.5 font-black uppercase tracking-wider text-[10px] data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all">
            <Settings className="w-4 h-4 mr-2" /> Ilg'or
          </TabsTrigger>
        </TabsList>

        {/* ──────────── TAB: LAYOUT ──────────── */}
        <TabsContent value="layout" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-gray-100 shadow-sm">
              <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4">
                <CardTitle className="text-base flex items-center gap-2 text-gray-800"><Monitor className="w-4 h-4 text-blue-500" /> Ekran tuzilishi</CardTitle>
                <CardDescription>Grid (setka) o'lchamlari barqaror turishini ta'minlang.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-gray-700">Ustunlar soni (Kengligi)</Label>
                    <Select
                      value={settings?.columns?.toString()}
                      onValueChange={(v) => update({ columns: parseInt(v) as any })}
                    >
                      <SelectTrigger className="h-11 rounded-xl bg-gray-50/50 border-gray-200 shadow-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 ta ustun (Katta karta)</SelectItem>
                        <SelectItem value="2">2 ta ustun (Optimal)</SelectItem>
                        <SelectItem value="3">3 ta ustun</SelectItem>
                        <SelectItem value="4">4 ta ustun (Kichik kartalar)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-gray-700">Qatorlar soni (Bo'yi)</Label>
                    <Select
                      value={settings?.rows?.toString()}
                      onValueChange={(v) => update({ rows: parseInt(v) as any })}
                    >
                      <SelectTrigger className="h-11 rounded-xl bg-gray-50/50 border-gray-200 shadow-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 ta qator</SelectItem>
                        <SelectItem value="2">2 ta qator (Optimal)</SelectItem>
                        <SelectItem value="3">3 ta qator</SelectItem>
                        <SelectItem value="4">4 ta qator</SelectItem>
                        <SelectItem value="5">5 ta qator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 space-y-4">
                  <div className="flex justify-between items-center mb-2">
                    <Label className="text-sm font-semibold text-gray-700">Avto-Slayd vaqti</Label>
                    <Badge variant="outline" className="font-mono text-xs">{settings?.slideDuration} sekund</Badge>
                  </div>
                  <Slider
                    value={[settings?.slideDuration || 15]}
                    onValueChange={([v]) => update({ slideDuration: v })}
                    min={5} max={60} step={1}
                    className="py-2"
                  />
                  <p className="text-[11px] text-gray-400 font-medium">Har bir bitta sahifani tahlil qilish uchun qancha vaqt ekranda qotib turish kerakligi.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-gray-100 shadow-sm">
              <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4">
                <CardTitle className="text-base flex items-center gap-2 text-gray-800"><Layers className="w-4 h-4 text-emerald-500" /> Boshqaruv Elementlari</CardTitle>
                <CardDescription>Navbar, Bottom bar kabilarni o'chirish/yoqish.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-5">
                {[
                  { key: "showTopBar", label: "Yuqori Bar (Navbar)", desc: "Logo va soat qismini to'liq ko'rsatish" },
                  { key: "showBottomBar", label: "Pastki Bar (Footer)", desc: "Yuguruvchi satr va nuqtalarni to'liq ko'rsatish" },
                  { key: "showCategoryNav", label: "Turkum tugmalari", desc: "Navbar ichidagi kategoriya nomlarini ko'rsatish" },
                  { key: "showProgressDots", label: "Varaqlar indikatori", desc: "Pastki barda sahifalar/kategoriyalar qadamini ko'rsatish" },
                  { key: "showClock", label: "Soat va vaqt", desc: "Tepada jonli soatni ko'rsatish" },
                  { key: "showLogo", label: "Restoran Logotipi", desc: "" },
                ].map(({ key, label, desc }) => (
                  <div key={key} className="flex items-start justify-between bg-white rounded-lg">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-semibold text-gray-800 cursor-pointer">{label}</Label>
                      {desc && <p className="text-[11px] text-gray-400 font-medium leading-tight">{desc}</p>}
                    </div>
                    <Switch
                      checked={!!(settings as any)?.[key]}
                      onCheckedChange={(v) => update({ [key]: v })}
                      className="data-[state=checked]:bg-green-500 ml-4"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ──────────── TAB: DESIGN ──────────── */}
        <TabsContent value="design" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Color Palette */}
            <Card className="border-gray-100 shadow-sm">
              <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4">
                <CardTitle className="text-base flex items-center gap-2 text-gray-800"><PaintBucket className="w-4 h-4 text-purple-500" /> Ranglar Palitrasi</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-4">
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Fon Turi (Background Type)</Label>
                  <Select
                    value={settings?.bgType || "color"}
                    onValueChange={(v) => update({ bgType: v as any })}
                  >
                    <SelectTrigger className="h-12 rounded-xl bg-gray-50 border-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="color">Oddiy Rang (Static)</SelectItem>
                      <SelectItem value="mesh">Animatsion Mesh (Zamonaviy) ✨</SelectItem>
                      <SelectItem value="gradient">Animatsion Gradient 🌈</SelectItem>
                      <SelectItem value="image">Maxsus Rasm (URL / Upload) 🖼</SelectItem>
                      <SelectItem value="video">Maxsus Video (MP4) 🎥</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* --- MESH GRADIENT CONTROLS --- */}
                {(settings?.bgType === "mesh" || settings?.bgType === "gradient") && (
                  <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-100 shadow-inner translate-y-0">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                        {settings.bgType === "mesh" ? "Mesh Ranglari (4 ta)" : "Gradient Ranglari (2 ta)"}
                      </Label>
                      <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {(settings.bgType === "mesh" ? [0, 1, 2, 3] : [0, 1]).map((idx) => {
                        const colors = settings.bgType === "mesh" ? (settings.meshColors || ["#f87171", "#60a5fa", "#4ade80", "#fbbf24"]) : (settings.gradientColors || ["#3b82f6", "#8b5cf6"]);
                        return (
                          <div key={idx} className="flex flex-col items-center gap-1.5 p-2 bg-white rounded-lg border border-gray-200">
                            <input
                              type="color"
                              value={colors[idx] || "#ffffff"}
                              onChange={(e) => {
                                const newColors = [...colors];
                                newColors[idx] = e.target.value;
                                update(settings.bgType === "mesh" ? { meshColors: newColors } : { gradientColors: newColors });
                              }}
                              className="w-10 h-10 rounded-full cursor-pointer bg-transparent border-2 border-gray-100"
                            />
                            <span className="text-[9px] font-mono text-gray-400">#{idx + 1}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="space-y-2 pt-2">
                       <div className="flex justify-between items-center">
                        <Label className="text-[10px] font-bold text-gray-400 uppercase">Animatsiya Tezligi</Label>
                        <Badge variant="secondary" className="text-[10px]">{settings.bgAnimationSpeed || 5}s</Badge>
                      </div>
                      <Slider
                        value={[settings.bgAnimationSpeed || 5]}
                        onValueChange={([v]) => update({ bgAnimationSpeed: v })}
                        min={1} max={30} step={1}
                      />
                    </div>
                  </div>
                )}

                {/* --- VIDEO URL --- */}
                {settings?.bgType === "video" && (
                  <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Presentation className="w-4 h-4 text-blue-500" /> Video Fon (MP4 havolasi)
                    </Label>
                    <Input
                      placeholder="https://...example.mp4"
                      value={settings?.videoUrl || ""}
                      onChange={(e) => update({ videoUrl: e.target.value })}
                      className="h-11 bg-white rounded-xl border-gray-200"
                    />
                  </div>
                )}

                {/* --- IMAGE URL / UPLOAD --- */}
                {(settings?.bgType === "image" || !settings?.bgType || settings?.bgType === "color") && (
                  <>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex flex-col items-center p-3 py-4 bg-gray-50 rounded-xl border border-gray-100 gap-3 shadow-inner">
                        <Label className="text-[11px] text-gray-500 font-bold uppercase tracking-wider text-center">Asosiy fon</Label>
                        <input
                          type="color"
                          value={settings?.bgColor || "#ffffff"}
                          onChange={(e) => update({ bgColor: e.target.value })}
                          className="w-10 h-10 rounded-full cursor-pointer bg-transparent border-[3px] border-white shadow-md outline-none"
                        />
                      </div>
                      <div className="flex flex-col items-center p-3 py-4 bg-gray-50 rounded-xl border border-gray-100 gap-3 shadow-inner text-center">
                        <Label className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Kartalar foni</Label>
                        <input
                          type="color"
                          value={settings?.cardColor || "#ffffff"}
                          onChange={(e) => update({ cardColor: e.target.value })}
                          className="w-10 h-10 rounded-full cursor-pointer bg-transparent border-[3px] border-white shadow-md outline-none"
                        />
                      </div>
                      <div className="flex flex-col items-center p-3 py-4 bg-gray-50 rounded-xl border border-gray-100 gap-3 shadow-inner text-center">
                        <Label className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Matn rangi</Label>
                        <input
                          type="color"
                          value={settings?.textColor || "#111827"}
                          onChange={(e) => update({ textColor: e.target.value })}
                          className="w-10 h-10 rounded-full cursor-pointer bg-transparent border-[3px] border-white shadow-md outline-none"
                        />
                      </div>
                    </div>

                    {settings?.bgType === "image" && (
                      <div className="space-y-3 pt-4 border-t border-gray-100">
                        <Label className="text-sm font-semibold text-gray-700">Maxsus Fon Rasmi</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="https://... yoki yuklang"
                            value={settings?.bgImageUrl || ""}
                            onChange={(e) => update({ bgImageUrl: e.target.value })}
                            className="h-11 flex-1 bg-gray-50/50 rounded-xl border-gray-200"
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={uploadingBg}
                            className="h-11 px-4 relative overflow-hidden font-bold"
                          >
                            {uploadingBg ? "..." : <UploadCloud className="w-4 h-4" />}
                            <input type="file" accept="image/*" onChange={handleBgUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* --- NAVIGATION & MARQUEE COLORS --- */}
                <div className="space-y-4 pt-6 border-t border-gray-100">
                  <Label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Navigatsiya va Satr ranglari</Label>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="flex flex-col items-center p-3 bg-gray-50 rounded-xl border border-gray-100 gap-2">
                       <Label className="text-[10px] font-bold text-gray-500 uppercase">Aktiv Tab</Label>
                       <input type="color" value={settings?.catNavActiveColor || settings?.textColor || "#000000"} onChange={(e) => update({ catNavActiveColor: e.target.value })} className="w-8 h-8 rounded-full cursor-pointer border-2 border-white shadow-sm" />
                    </div>
                    <div className="flex flex-col items-center p-3 bg-gray-50 rounded-xl border border-gray-100 gap-2">
                       <Label className="text-[10px] font-bold text-gray-500 uppercase">Noaktiv Tab</Label>
                       <input type="color" value={settings?.catNavInactiveColor || "#f3f4f6"} onChange={(e) => update({ catNavInactiveColor: e.target.value })} className="w-8 h-8 rounded-full cursor-pointer border-2 border-white shadow-sm" />
                    </div>
                    <div className="flex flex-col items-center p-3 bg-gray-50 rounded-xl border border-gray-100 gap-2">
                       <Label className="text-[10px] font-bold text-gray-500 uppercase">Satr foni</Label>
                       <input type="color" value={settings?.marqueeBgColor || "transparent"} onChange={(e) => update({ marqueeBgColor: e.target.value })} className="w-8 h-8 rounded-full cursor-pointer border-2 border-white shadow-sm" />
                    </div>
                    <div className="flex flex-col items-center p-3 bg-gray-50 rounded-xl border border-gray-100 gap-2">
                       <Label className="text-[10px] font-bold text-gray-500 uppercase">Satr matni</Label>
                       <input type="color" value={settings?.marqueeTextColor || settings?.textColor || "#000000"} onChange={(e) => update({ marqueeTextColor: e.target.value })} className="w-8 h-8 rounded-full cursor-pointer border-2 border-white shadow-sm" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-semibold text-gray-700">Fon ustidagi Soya qatlami (Overlay)</Label>
                    <Badge variant="outline" className="font-mono text-xs">{settings?.backgroundOverlay || 0}%</Badge>
                  </div>
                  <Slider
                    value={[settings?.backgroundOverlay || 0]}
                    onValueChange={([v]) => update({ backgroundOverlay: v })}
                    min={0} max={100} step={5}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-gray-100 shadow-sm">
              <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4">
                <CardTitle className="text-base flex items-center gap-2 text-gray-800"><Type className="w-4 h-4 text-rose-500" /> Uslub & Harakat</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Shrift turi</Label>
                    <Select
                      value={settings?.fontFamily || "Inter, sans-serif"}
                      onValueChange={(v) => update({ fontFamily: v })}
                    >
                      <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Inter, sans-serif">Inter (Zamonaviy)</SelectItem>
                        <SelectItem value="'Outfit', sans-serif">Outfit (Qalin/Professional)</SelectItem>
                        <SelectItem value="'Caveat', cursive">Caveat (Tashrif qog'ozi)</SelectItem>
                        <SelectItem value="'Playfair Display', serif">Playfair (Klassik)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Sahifa Almashinuvi</Label>
                    <Select
                      value={settings?.transitionStyle || "fade"}
                      onValueChange={(v: "fade"|"slide"|"zoom") => update({ transitionStyle: v })}
                    >
                      <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fade">Xiralashib (Fade)</SelectItem>
                        <SelectItem value="slide">Surilib (Slide)</SelectItem>
                        <SelectItem value="zoom">Kattalashib (Zoom)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Karta Chetkalari</Label>
                    <Select
                      value={settings?.cardRadius || "lg"}
                      onValueChange={(v: any) => update({ cardRadius: v })}
                    >
                      <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Shtrix (O'tkir) - 0px</SelectItem>
                        <SelectItem value="md">Biroz yumaloq - 4px</SelectItem>
                        <SelectItem value="lg">Odatiy - 8px</SelectItem>
                        <SelectItem value="xl">Katta - 12px</SelectItem>
                        <SelectItem value="full">To'liq aylanma (Full)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold text-gray-800">Yuguruvchi satr</Label>
                    <Switch
                      checked={!!settings?.showMarquee}
                      onCheckedChange={(v) => update({ showMarquee: v })}
                    />
                  </div>
                  {settings?.showMarquee && (
                    <>
                      <div className="space-y-2">
                         <Label className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Metn so'zi</Label>
                         <Input
                           value={settings?.marqueeText || ""}
                           onChange={e => update({ marqueeText: e.target.value })}
                           placeholder="Bon Appétit..."
                           className="bg-white border-gray-200"
                         />
                      </div>
                      <div className="space-y-3 pt-2">
                         <div className="flex justify-between items-center">
                           <Label className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Tezligi (Sekund o'tish per sikl)</Label>
                           <Badge variant="secondary" className="font-mono text-xs">{settings?.marqueeSpeed || 25}s</Badge>
                         </div>
                         <Slider
                           value={[settings?.marqueeSpeed || 25]}
                           onValueChange={([v]) => update({ marqueeSpeed: v })}
                           min={10} max={60} step={1}
                         />
                      </div>
                    </>
                  )}
                </div>

              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ──────────── TAB: CONTENT ──────────── */}
        <TabsContent value="content" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Taom ma'lumotlari */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="border-gray-100 shadow-sm border-t-4 border-t-indigo-500">
                <CardHeader className="pb-3 border-b border-gray-50">
                  <CardTitle className="text-base flex items-center gap-2 text-gray-800"><Settings className="w-4 h-4 text-indigo-500" /> Filter & Elementlar</CardTitle>
                </CardHeader>
                <CardContent className="pt-5 space-y-5">
                  {[
                    { key: "showDescriptions", label: "Ta'riflarni ko'rsatish", desc: "Taom ostidagi kichik ma'lumotlar textini ko'rsatish" },
                    { key: "showBadges", label: "Belgilar (Badges)", desc: "Chegirma, Yangi degan teglar" },
                    { key: "showImages", label: "Rasmlarni ekranda ko'rsatish", desc: "" },
                    { key: "showOutOfStock", label: "Tugagan taomlarni ham ko'rsatib turish", desc: "O'chirsangiz sotuvda yo'q ovqatlar menyudan avto-yo'qoladi" },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-start justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-semibold text-gray-800 cursor-pointer">{label}</Label>
                        {desc && <p className="text-[11px] text-gray-400 font-medium leading-[1.3]">{desc}</p>}
                      </div>
                      <Switch
                        checked={!!(settings as any)?.[key]}
                        onCheckedChange={(v) => update({ [key]: v })}
                        className="ml-3"
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Categories block */}
              <Card className="border-gray-100 shadow-sm">
                <CardHeader className="bg-gray-50/50 pb-3 border-b border-gray-100">
                  <CardTitle className="text-base font-bold flex items-center gap-2 text-gray-700">
                    <Layers className="w-4 h-4" /> Kategoriyalar Filtri
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 max-h-[350px] overflow-y-auto">
                  <div className="flex flex-col gap-2">
                    {categories.map(cat => {
                      const active = activeCatIds.includes(cat.id);
                      return (
                        <button
                          key={cat.id}
                          onClick={() => toggleCategory(cat.id)}
                          className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border flex items-center justify-between ${
                            active
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                              : "bg-white text-gray-500 border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          {cat.name_uz || cat.name}
                          {active && <CheckSquare className="w-4 h-4 text-indigo-500" />}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Selector */}
            <div className="lg:col-span-2">
              <Card className="border border-gray-100 shadow-sm h-full flex flex-col">
                <CardHeader className="pb-3 bg-gray-50/50 border-b border-gray-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-base font-bold flex items-center gap-2 text-gray-800">
                        <ImageIcon className="w-4 h-4 text-blue-500" /> Ekrandagi aniq mahsulotlar
                      </CardTitle>
                      <CardDescription className="text-[11px] mt-1 text-gray-500 font-medium">
                        Quyidagi ro'yxatdan shaxsan ajratib olishingiz mumkin. Hammasini tanlasangiz, dinamik ishlaydi.
                      </CardDescription>
                      <div className="mt-2 text-xs font-bold text-indigo-600 bg-indigo-50 inline-flex px-2 py-1 rounded">
                        {totalActive} ta aktiv
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Button variant="outline" size="sm" onClick={selectAllItems} className="text-xs w-full sm:w-auto hover:bg-indigo-50 hover:text-indigo-600">Hammasi</Button>
                      <Button variant="outline" size="sm" onClick={deselectAllItems} className="text-xs w-full sm:w-auto hover:bg-red-50 hover:text-red-600">Tozalash</Button>
                    </div>
                  </div>
                  
                  <div className="relative mt-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <SearchInput
                      placeholder="Qidiruv (nomi bo'yicha)..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="pl-9 h-10 bg-white border-gray-200 shadow-sm rounded-xl"
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-0 flex-1 overflow-hidden">
                  <div className="h-[600px] overflow-y-auto w-full p-2 space-y-2">
                    {visibleCategories.map(cat => {
                      const catItems = filteredItems(cat.id);
                      if (catItems.length === 0 && search) return null;
                      const isExpanded = expandedCats[cat.id] !== false;

                      return (
                        <div key={cat.id} className="border border-gray-100 rounded-xl bg-white shadow-sm mb-3 overflow-hidden">
                          <button
                            type="button"
                            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50/80 border-b border-gray-50"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setExpandedCats(p => ({ ...p, [cat.id]: !isExpanded })); }}
                          >
                            <span className="text-sm font-bold text-gray-800">
                              {cat.name_uz || cat.name} <Badge variant="secondary" className="ml-2 font-mono">{catItems.length}</Badge>
                            </span>
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                          </button>

                          {isExpanded && (
                            <div className="px-1 py-1">
                              {catItems.length === 0 ? (
                                <p className="text-[11px] font-medium text-gray-400 text-center py-6">Taomlar yo'q</p>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1 p-1">
                                  {catItems.map(item => {
                                    const active = isItemActive(item.id);
                                    const imgSrc = item.imageUrl || item.imageUrls?.[0];
                                    const hasVariants = item.variants && item.variants.length > 0;
                                    const priceMin = hasVariants
                                      ? Math.min(...item.variants!.map(v => v.discountPrice ?? v.price))
                                      : item.discountPrice ?? item.price;
                                    
                                    return (
                                      <button
                                        type="button"
                                        key={item.id}
                                        onClick={(e) => toggleItem(item.id, e)}
                                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all border ${
                                          active ? "bg-indigo-50/40 border-indigo-100" : "bg-white border-transparent hover:bg-gray-50 grayscale opacity-60"
                                        }`}
                                      >
                                        {imgSrc ? (
                                          <img src={imgSrc} className="w-10 h-10 rounded-md object-cover flex-none bg-gray-100 border border-black/5" />
                                        ) : (
                                          <div className="w-10 h-10 bg-gray-100 rounded-md flex-none border border-black/5 flex items-center justify-center"><span className="opacity-30">🍽</span></div>
                                        )}
                                        <div className="flex-1 min-w-0 pr-2">
                                          <div className="text-[12px] font-bold text-gray-800 truncate">{item.name_uz || item.name}</div>
                                          <div className="text-[11px] font-bold text-gray-500 mt-0.5">{priceMin.toLocaleString()} s.</div>
                                        </div>
                                        <div className="flex-none pr-1">
                                          {active ? <CheckSquare className="w-4 h-4 text-indigo-500" /> : <Square className="w-4 h-4 text-gray-300" />}
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
            
          </div>
        </TabsContent>
        
        {/* ──────────── TAB: PROMOS ──────────── */}
        <TabsContent value="promos" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Promo Konfiguratsiya */}
            <div className="space-y-6">
              <Card className="border-gray-100 shadow-sm border-t-4 border-t-sky-500">
                <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4">
                  <CardTitle className="text-base flex items-center gap-2 text-gray-800"><Presentation className="w-4 h-4 text-sky-500" /> Namoyish Rejimi</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-gray-700">Asosiy ish rejimi</Label>
                    <Select
                      value={settings?.displayMode || "menu"}
                      onValueChange={(v: "menu"|"promo"|"mixed") => update({ displayMode: v })}
                    >
                      <SelectTrigger className="h-12 bg-gray-50/80 rounded-xl border-gray-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="menu">Faqat Menyu (Oddiy ishlash) 🍔</SelectItem>
                        <SelectItem value="promo">Faqat Reklama (Karusel banner) 🖼</SelectItem>
                        <SelectItem value="mixed">Gibrid (Taomlar → Reklama → Taomlar) 🔄</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-gray-400 font-medium">TV ekran orqali nima namoyish qilinishini global hal qiladi.</p>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-100 space-y-4">
                    <div className="flex justify-between items-center mb-2">
                      <Label className="text-sm font-semibold text-gray-700">Har bir reklama necha sek turishi kerak?</Label>
                      <Badge variant="outline" className="font-mono text-xs">{settings?.promoSlideDuration || 10} sekund</Badge>
                    </div>
                    <Slider
                      value={[settings?.promoSlideDuration || 10]}
                      onValueChange={([v]) => update({ promoSlideDuration: v })}
                      min={5} max={60} step={1}
                      className="py-2"
                    />
                  </div>

                  {settings?.displayMode === "mixed" && (
                    <div className="pt-4 border-t border-gray-100 space-y-4 animate-in fade-in zoom-in-95 duration-300">
                      <div className="flex justify-between items-center mb-2">
                        <Label className="text-sm font-semibold text-sky-700">Har nechta menyudan so'ng reklama chiqsin?</Label>
                        <Badge className="font-mono text-xs bg-sky-100 text-sky-700 hover:bg-sky-100 border-none">
                          {settings?.promoInterval || 1} ta menyu
                        </Badge>
                      </div>
                      <Slider
                        value={[settings?.promoInterval || 1]}
                        onValueChange={([v]) => update({ promoInterval: v })}
                        min={1} max={10} step={1}
                        className="py-2"
                      />
                      <p className="text-[11px] text-gray-500 font-medium leading-tight">
                        Masalan, "2" ni tanlasangiz, ekranda ikkita taomlar sahifasi o'tgach, bitta to'liq ekran reklama ko'rsatiladi.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Promo Rasmlari Tizimi */}
            <div>
              <Card className="border-gray-100 shadow-sm">
                <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4">
                  <CardTitle className="text-base flex items-center gap-2 text-gray-800"><ImageIcon className="w-4 h-4 text-rose-500" /> Yuklangan Bannerlar</CardTitle>
                  <CardDescription>To'liq ekranni qoplaydigan vertikal/gorizontal bannerlar rasm (URL).</CardDescription>
                </CardHeader>
                <CardContent className="pt-5 space-y-4">
                  <div className="flex flex-col gap-3">
                    <div className="relative border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50 hover:bg-sky-50 transition-colors overflow-hidden">
                      <div className="p-8 text-center flex flex-col items-center justify-center">
                         <UploadCloud className="w-8 h-8 text-sky-400 mb-3" />
                         <p className="text-sm font-bold text-gray-700 mb-1">Rasm yuklash darchasi</p>
                         <p className="text-[11px] text-gray-400">Kompyuteringizdan reklama bannerini tanlang</p>
                         {uploadingPromo && <p className="text-xs text-sky-600 font-bold mt-3 animate-pulse">Serverga yuklanmoqda... iltimos kuting</p>}
                      </div>
                      <input type="file" accept="image/*" onChange={handlePromoUpload} disabled={uploadingPromo} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                      <Input
                        placeholder="Yoki URL link yozing (https://...)"
                        value={newPromoUrl}
                        onChange={e => setNewPromoUrl(e.target.value)}
                        className="text-sm border-gray-200 shadow-sm"
                        disabled={uploadingPromo}
                      />
                      <Button 
                        onClick={() => {
                          if (newPromoUrl.trim() && settings) {
                            const validUrl = newPromoUrl.trim();
                            const currentArr = settings.promoImages || [];
                            if (!currentArr.includes(validUrl)) {
                              update({ promoImages: [...currentArr, validUrl] });
                              setNewPromoUrl("");
                            }
                          }
                        }}
                        disabled={uploadingPromo || !newPromoUrl.trim()}
                        className="gap-2 bg-gray-900 text-white shadow-md hover:bg-black"
                      >
                        <Plus className="w-4 h-4" /> Link orqali qo'shish
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3 pt-4">
                    {(!settings?.promoImages || settings.promoImages.length === 0) ? (
                      <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <Presentation className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-xs font-semibold text-gray-400">Hech qanday reklama banneri kiritilmagan</p>
                      </div>
                    ) : (
                      settings.promoImages.map((imgUrl, i) => (
                        <div key={i} className="flex items-center border border-gray-100 rounded-xl p-2 gap-3 bg-white shadow-sm overflow-hidden">
                          <img src={imgUrl} alt={`Promo ${i}`} className="w-16 h-12 object-cover rounded-lg bg-gray-100" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-800 truncate">{imgUrl}</p>
                          </div>
                          <Button
                            variant="ghost" size="icon"
                            className="text-red-400 hover:text-red-600 hover:bg-red-50 w-8 h-8 flex-none"
                            onClick={() => {
                              update({ promoImages: settings.promoImages!.filter(u => u !== imgUrl) });
                            }}
                          >
                            <Trash className="w-4 h-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

          </div>
        </TabsContent>

        {/* ──────────── TAB: ADVANCED ──────────── */}
        <TabsContent value="advanced" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* ── VIDEO BACKGROUND ── */}
            <Card className="border-gray-100 shadow-sm border-t-4 border-t-purple-500">
              <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4">
                <CardTitle className="text-base flex items-center gap-2 text-gray-800">
                  <ImageIcon className="w-4 h-4 text-purple-500" /> Video Fon (MP4)
                </CardTitle>
                <CardDescription>TV orqa fonida davra va davomiy aylanuvchi video qo'yish imkonini beradi.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">Video URL (MP4/WebM)</Label>
                  <Input
                    placeholder="https://.../video.mp4"
                    value={settings?.videoUrl || ""}
                    onChange={e => update({ videoUrl: e.target.value })}
                    className="border-gray-200 bg-gray-50/50"
                  />
                  <p className="text-[11px] text-gray-400">Fon uchun .mp4 yoki .webm havolasini kiriting. Video muted, loop, autoPlay holatda aylanadi.</p>
                </div>
                {settings?.videoUrl && (
                  <div className="rounded-xl overflow-hidden border border-gray-100 bg-black aspect-video">
                    <video src={settings.videoUrl} muted loop autoPlay playsInline className="w-full h-full object-cover opacity-80" />
                  </div>
                )}
                {settings?.videoUrl && (
                  <Button variant="ghost" size="sm" className="text-red-500" onClick={() => update({ videoUrl: "" })}>
                    <Trash className="w-3.5 h-3.5 mr-1" /> Video olib tashlash
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* ── QR CODE ── */}
            <Card className="border-gray-100 shadow-sm border-t-4 border-t-emerald-500">
              <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4">
                <CardTitle className="text-base flex items-center gap-2 text-gray-800">
                  <QrCode className="w-4 h-4 text-emerald-500" /> Doimiy QR Kod
                </CardTitle>
                <CardDescription>Ekran burchagida doim ko'rinib turuvchi QR kod.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">QR Kodni ko'rsatish</Label>
                    <p className="text-xs text-gray-400 mt-0.5">Ekranning burchagida QR holda chiqadi</p>
                  </div>
                  <Switch
                    checked={settings?.showQrCode || false}
                    onCheckedChange={v => update({ showQrCode: v })}
                  />
                </div>

                {settings?.showQrCode && (
                  <div className="space-y-4 border-t border-gray-100 pt-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-700">Havola (URL)</Label>
                      <Input
                        placeholder="https://t.me/yourbot yoki menulink"
                        value={settings?.qrCodeUrl || ""}
                        onChange={e => update({ qrCodeUrl: e.target.value })}
                        className="border-gray-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-700">QR ostidagi matn</Label>
                      <Input
                        placeholder="Telegram botimizga ulaning!"
                        value={settings?.qrCodeText || ""}
                        onChange={e => update({ qrCodeText: e.target.value })}
                        className="border-gray-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-700">Joylashuv</Label>
                      <Select
                        value={settings?.qrCodePosition || "bottom-right"}
                        onValueChange={(v: any) => update({ qrCodePosition: v })}
                      >
                        <SelectTrigger className="border-gray-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bottom-right">Pastki o'ng</SelectItem>
                          <SelectItem value="bottom-left">Pastki chap</SelectItem>
                          <SelectItem value="top-right">Yuqori o'ng</SelectItem>
                          <SelectItem value="top-left">Yuqori chap</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {settings?.qrCodeUrl && (
                      <div className="flex items-center gap-4 pt-2">
                        <img
                          src={`https://chart.googleapis.com/chart?chs=120x120&cht=qr&chl=${encodeURIComponent(settings.qrCodeUrl)}`}
                          alt="QR preview"
                          className="w-20 h-20 rounded-lg border border-gray-100"
                        />
                        <p className="text-xs text-gray-500">Haqiqiy ko'rinish</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── DAYPARTING ── */}
          <Card className="border-gray-100 shadow-sm border-t-4 border-t-amber-500">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4">
              <CardTitle className="text-base flex items-center gap-2 text-gray-800">
                <Clock className="w-4 h-4 text-amber-500" /> Aqlli Vaqt Menyusi (Dayparting)
              </CardTitle>
              <CardDescription>Shart vaqtga yetganda TV o'zi tanlangan kategoriyalarni ko'rsata boshlaydi.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Breakfast */}
                {(["breakfast", "lunch", "dinner"] as const).map((meal, idx) => {
                  const labels = ["🌅 Nonushta (Breakfast)", "☀️ Tushlik (Lunch)", "🌙 Kechki ovqat (Dinner)"];
                  const colors = ["border-t-amber-400", "border-t-orange-400", "border-t-indigo-400"];
                  const current = settings?.timeBasedMenu?.[meal];
                  return (
                    <div key={meal} className={`border border-gray-100 rounded-xl ${colors[idx]} border-t-2 p-4 space-y-4`}>
                      <h4 className="text-sm font-bold text-gray-800">{labels[idx]}</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-gray-500">Boshlanish</Label>
                          <Input
                            type="time"
                            value={current?.start || ""}
                            onChange={e => update({
                              timeBasedMenu: {
                                ...settings?.timeBasedMenu,
                                [meal]: { ...(current || { categoryIds: [] }), start: e.target.value }
                              }
                            })}
                            className="text-sm border-gray-200"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-gray-500">Tugash</Label>
                          <Input
                            type="time"
                            value={current?.end || ""}
                            onChange={e => update({
                              timeBasedMenu: {
                                ...settings?.timeBasedMenu,
                                [meal]: { ...(current || { categoryIds: [] }), end: e.target.value }
                              }
                            })}
                            className="text-sm border-gray-200"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-gray-500 font-semibold">Ko'rsatiladigan kategoriyalar</Label>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {categories.map(cat => {
                            const ids = current?.categoryIds || [];
                            const checked = ids.includes(cat.id);
                            return (
                              <button
                                key={cat.id}
                                onClick={() => {
                                  const newIds = checked ? ids.filter(i => i !== cat.id) : [...ids, cat.id];
                                  update({
                                    timeBasedMenu: {
                                      ...settings?.timeBasedMenu,
                                      [meal]: { ...(current || { start: "", end: "" }), categoryIds: newIds }
                                    }
                                  });
                                }}
                                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs font-medium transition-colors ${
                                  checked ? "bg-amber-50 text-amber-800" : "hover:bg-gray-50 text-gray-600"
                                }`}
                              >
                                {checked ? <CheckSquare className="w-3.5 h-3.5 text-amber-600" /> : <Square className="w-3.5 h-3.5 text-gray-300" />}
                                {cat.name_uz || cat.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}

              </div>
            </CardContent>
          </Card>

        </TabsContent>

      </Tabs>
    </div>
  );
}
