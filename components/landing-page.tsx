"use client"

import React, { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence, Variants, useMotionValue, useTransform } from "framer-motion"
import {
  Utensils, ShoppingBag, Zap, Star, ArrowRight, CheckCircle2,
  Globe, LayoutDashboard, MessageCircle, Phone, Instagram, Send, Sparkles,
  ShieldCheck, TrendingUp, CreditCard, Languages, BadgeCheck, BarChart3,
  Users2, Users, Percent, Megaphone, UserCheck, History, Wallet, MessagesSquare,
  Bell, PieChart, MessageSquare, Menu, X, ChevronDown, Clock,
  Headphones, Award, Rocket, Heart, CheckCheck, ArrowUpRight, Play, Flame, Wifi
} from "lucide-react"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { toast } from "sonner"
import { useLanguage } from "@/hooks/use-language"

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
}
const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } }
}

const LandingPage = () => {
  const { t, language, setLanguage } = useLanguage()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [formData, setFormData] = useState({ name: "", restaurantName: "", phone: "", description: "" })

  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (el) { el.scrollIntoView({ behavior: "smooth" }); setIsMobileMenuOpen(false) }
  }

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.restaurantName || !formData.phone) {
      toast.error("Iltimos, barcha majburiy maydonlarni to'ldiring"); return
    }
    setIsSubmitting(true)
    try {
      await addDoc(collection(db, "landing_contacts"), { ...formData, createdAt: serverTimestamp(), status: "new" })
      toast.success(t("landing.contact.success"))
      setFormData({ name: "", restaurantName: "", phone: "", description: "" })
    } catch { toast.error("Xatolik yuz berdi") }
    finally { setIsSubmitting(false) }
  }

  const allFeatures = [
    { key: "profile", icon: <Utensils className="w-4 h-4" />, color: "from-orange-500 to-amber-500" },
    { key: "multilingual", icon: <Languages className="w-4 h-4" />, color: "from-emerald-500 to-teal-500" },
    { key: "order", icon: <ShoppingBag className="w-4 h-4" />, color: "from-violet-500 to-purple-500" },
    { key: "payment", icon: <Wallet className="w-4 h-4" />, color: "from-blue-500 to-cyan-500" },
    { key: "tracking", icon: <History className="w-4 h-4" />, color: "from-rose-500 to-pink-500" },
    { key: "survey", icon: <BadgeCheck className="w-4 h-4" />, color: "from-amber-500 to-yellow-500" },
    { key: "feedback", icon: <BarChart3 className="w-4 h-4" />, color: "from-indigo-500 to-blue-500" },
    { key: "staff", icon: <UserCheck className="w-4 h-4" />, color: "from-green-500 to-emerald-500" },
    { key: "rating", icon: <Star className="w-4 h-4" />, color: "from-yellow-500 to-orange-500" },
    { key: "promo", icon: <Percent className="w-4 h-4" />, color: "from-fuchsia-500 to-pink-500" },
    { key: "ads", icon: <Megaphone className="w-4 h-4" />, color: "from-orange-600 to-red-500" },
    { key: "loyalty", icon: <ShieldCheck className="w-4 h-4" />, color: "from-sky-500 to-blue-500" },
    { key: "chat", icon: <MessagesSquare className="w-4 h-4" />, color: "from-teal-500 to-cyan-500" },
    { key: "marketing", icon: <PieChart className="w-4 h-4" />, color: "from-purple-500 to-indigo-500" },
    { key: "notifications", icon: <Bell className="w-4 h-4" />, color: "from-red-500 to-rose-500" },
    { key: "analytics", icon: <Users2 className="w-4 h-4" />, color: "from-blue-600 to-indigo-500" },
    { key: "product_analytics", icon: <LayoutDashboard className="w-4 h-4" />, color: "from-violet-600 to-purple-500" },
    { key: "advertising", icon: <Globe className="w-4 h-4" />, color: "from-emerald-600 to-green-500" },
  ]

  const pricingPoints = [
    t("landing.pricing_points.0") || "24/7 Qo'llab-quvvatlash",
    t("landing.pricing_points.1") || "Cheksiz Buyurtmalar",
    t("landing.pricing_points.2") || "Shaxsiy Admin Panel",
    t("landing.pricing_points.3") || "Statistika & Analitika",
    t("landing.pricing_points.4") || "Mijozlar bilan chat",
    t("landing.pricing_points.5") || "Marketing hisobotlari",
  ]

  const faqItems = [
    { q: "FoodHub platformasi qanday ishlaydi?", a: "Restoraningiz uchun QR-kod yaratilib, mijozlar uni skanerlasa, onlayn menyu ochilib, buyurtma bera oladi. Barcha buyurtmalar admin panelida real vaqtda ko'rinadi va Telegram orqali xabar keladi." },
    { q: "Menyu qancha vaqtda tayyor bo'ladi?", a: "Demo talabidan so'ng 24 soat ichida admin panel va menyu sahifasi tayyor qilinadi. Taomlarni qo'shish esa bir necha daqiqa ichida bajariladi." },
    { q: "Oylik to'lov tizimi qanday ishlaydi?", a: "Oylik ($20), 6 oylik ($100 — 30% chegirma) yoki yillik ($100 — maxsus promo narx) rejimda ishlash mumkin. To'lov Payme, Click yoki karta orqali amalga oshiriladi." },
    { q: "Buyurtmalar qanday qabul qilinadi?", a: "Har bir buyurtma Telegram orqali ofitsiant yoki manager ga zudlik bilan yetkaziladi. Admin panelda ham barcha buyurtmalarni real vaqtda kuzatish imkoni bor." },
    { q: "Ko'p tilli menyu qulayligini bildiradimi?", a: "Ha! Menyu O'zbek, Rus va Ingliz tillarida avtomatik ishlaydi. Mijoz o'z tiliga qarab ko'radi va buyurtma beradi." },
    { q: "Internet bo'lmasa ham ishlaydimi?", a: "Platforma PWA (Progressive Web App) texnologiyasida ishlaydi. Menyu keshi saqlanadi, lekin buyurtma yuborish uchun internet zarur." },
    { q: "Demo davri qancha vaqt?", a: "Forma orqali murojaat qilsangiz, 3 kunlik bepul demo beriladi. Demo davomida barcha funksiyalar to'liq ishlaydi." },
    { q: "Qo'llab-quvvatlash (support) qanday?", a: "24/7 Telegram va telefon orqali texnik yordam ko'rsatiladi. Har qanday savolga 1 soat ichida javob beriladi." },
  ]

  const getFaqItems = () => {
    try {
      const item0q = t("landing.faq_items.0.q")
      if (item0q && item0q !== "landing.faq_items.0.q") {
        return Array.from({ length: 8 }, (_, i) => ({
          q: t(`landing.faq_items.${i}.q`), a: t(`landing.faq_items.${i}.a`)
        }))
      }
    } catch {}
    return faqItems
  }

  const navItems = [
    { label: t("landing.nav.services"), id: "xizmatlar" },
    { label: t("landing.nav.pricing"), id: "narxlar" },
    { label: t("landing.nav.features"), id: "imkoniyatlar" },
    { label: t("landing.nav.faq") || "FAQ", id: "faq" },
  ]

  const steps = [
    { num: "01", icon: <MessageSquare className="w-5 h-5" />, title: t("landing.step1Title"), desc: t("landing.step1Desc"), color: "from-orange-500 to-amber-500", bg: "bg-orange-50", border: "border-orange-100" },
    { num: "02", icon: <Utensils className="w-5 h-5" />, title: t("landing.step2Title"), desc: t("landing.step2Desc"), color: "from-emerald-500 to-teal-500", bg: "bg-emerald-50", border: "border-emerald-100" },
    { num: "03", icon: <Zap className="w-5 h-5" />, title: t("landing.step3Title"), desc: t("landing.step3Desc"), color: "from-violet-500 to-purple-500", bg: "bg-violet-50", border: "border-violet-100" },
  ]

  return (
    <div id="top" className="min-h-screen bg-[#FFFBF5] text-slate-900 overflow-x-hidden" suppressHydrationWarning>

      {/* Background blobs */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <motion.div animate={{ scale: [1, 1.3, 1], x: [0, 60, 0], y: [0, -40, 0] }} transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[20%] -right-[15%] w-[500px] h-[500px] md:w-[800px] md:h-[800px] bg-gradient-to-br from-orange-200/40 to-amber-200/30 rounded-full blur-[80px] md:blur-[120px]" />
        <motion.div animate={{ scale: [1, 1.2, 1], x: [0, -40, 0], y: [0, 40, 0] }} transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-[15%] -left-[10%] w-[400px] h-[400px] md:w-[700px] md:h-[700px] bg-gradient-to-br from-emerald-200/35 to-teal-200/25 rounded-full blur-[80px] md:blur-[100px]" />
      </div>

      {/* ===== NAVBAR ===== */}
      <motion.nav initial={{ y: -80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15, duration: 0.5 }}
        className="fixed top-0 left-0 right-0 z-[100] px-3 py-2.5 md:px-6 md:py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between bg-white/85 backdrop-blur-2xl border border-orange-100/60 px-4 py-2.5 md:px-7 md:py-3 rounded-2xl shadow-[0_4px_20px_rgba(234,88,12,0.08)]">

          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => scrollTo("top")}>
            <div className="w-8 h-8 md:w-9 md:h-9 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center shadow-md shadow-orange-500/25">
              <Utensils className="text-white w-3.5 h-3.5 md:w-4 md:h-4" />
            </div>
            <span className="text-base md:text-lg font-black tracking-tighter text-slate-900">FoodHub</span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-8">
            {navItems.map(item => (
              <button key={item.id} onClick={() => scrollTo(item.id)} className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 hover:text-orange-600 transition-colors whitespace-nowrap">
                {item.label}
              </button>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <div className="hidden sm:flex bg-slate-50 p-0.5 rounded-xl border border-slate-100 gap-0.5">
              {(["uz", "ru", "en"] as const).map(lang => (
                <button key={lang} onClick={() => setLanguage(lang)}
                  className={`px-2 py-1.5 rounded-lg text-[9px] md:text-[10px] font-black uppercase transition-all ${language === lang ? "bg-orange-500 text-white shadow-sm" : "text-slate-400 hover:text-slate-700"}`}>
                  {lang}
                </button>
              ))}
            </div>

            {/* CTA (Desktop) */}
            <button onClick={() => scrollTo("contact")}
              className="hidden md:flex items-center gap-1.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider hover:from-orange-600 hover:to-amber-600 transition-all shadow-md shadow-orange-500/25 active:scale-95 whitespace-nowrap">
              {t("landing.startBtn")} <ArrowUpRight className="w-3 h-3" />
            </button>

            {/* Mobile hamburger */}
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-slate-700 active:scale-90 transition-transform">
              {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }} transition={{ duration: 0.18 }}
              className="lg:hidden absolute top-[calc(100%+4px)] left-3 right-3 bg-white/97 backdrop-blur-2xl border border-orange-100 rounded-2xl shadow-xl shadow-orange-500/10 z-[90] overflow-hidden">
              <div className="p-4 space-y-1">
                {navItems.map(item => (
                  <button key={item.id} onClick={() => scrollTo(item.id)}
                    className="w-full text-left px-4 py-3 rounded-xl text-sm font-bold text-slate-700 hover:bg-orange-50 hover:text-orange-600 transition-all">
                    {item.label}
                  </button>
                ))}
              </div>
              {/* Lang + CTA row */}
              <div className="px-4 pb-4 flex flex-col gap-3">
                <div className="flex gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
                  {(["uz", "ru", "en"] as const).map(lang => (
                    <button key={lang} onClick={() => setLanguage(lang)}
                      className={`flex-1 py-2 rounded-lg text-xs font-black uppercase transition-all ${language === lang ? "bg-orange-500 text-white" : "text-slate-400"}`}>
                      {lang}
                    </button>
                  ))}
                </div>
                <button onClick={() => scrollTo("contact")}
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white py-3.5 rounded-xl text-sm font-black uppercase tracking-wide shadow-lg shadow-orange-500/20 active:scale-95">
                  {t("landing.startBtn")} 🎉
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>


      {/* ===== HERO — Festive Edition ===== */}
      <section className="relative pt-20 md:pt-36 pb-10 md:pb-24 z-10 overflow-hidden">

        {/* ── Floating food/emoji particles ── */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[
            { emoji: "🍕", x: "8%",  y: "15%", delay: 0,    size: "text-2xl" },
            { emoji: "🍜", x: "85%", y: "10%", delay: 0.4,  size: "text-3xl" },
            { emoji: "🥗", x: "75%", y: "60%", delay: 0.8,  size: "text-xl"  },
            { emoji: "🍔", x: "5%",  y: "65%", delay: 1.2,  size: "text-2xl" },
            { emoji: "🍣", x: "92%", y: "40%", delay: 0.6,  size: "text-2xl" },
            { emoji: "🧆", x: "15%", y: "82%", delay: 1.5,  size: "text-xl"  },
            { emoji: "☕", x: "50%", y: "5%",  delay: 1.0,  size: "text-2xl" },
            { emoji: "🍰", x: "62%", y: "80%", delay: 0.3,  size: "text-xl"  },
            { emoji: "✨", x: "30%", y: "12%", delay: 0.9,  size: "text-lg"  },
            { emoji: "⭐", x: "70%", y: "25%", delay: 1.8,  size: "text-base" },
          ].map((p, i) => (
            <motion.div
              key={i}
              className={`absolute ${p.size} select-none opacity-0`}
              style={{ left: p.x, top: p.y }}
              animate={{
                opacity: [0, 0.7, 0.4, 0.7, 0],
                y: [0, -20, -8, -20, 0],
                rotate: [0, 10, -8, 10, 0],
                scale: [0.8, 1.1, 1, 1.1, 0.8],
              }}
              transition={{
                duration: 6 + Math.random() * 4,
                delay: p.delay,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              {p.emoji}
            </motion.div>
          ))}
        </div>

        {/* ── Glowing ring behind headline ── */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] md:w-[700px] md:h-[700px] pointer-events-none">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="w-full h-full rounded-full border-[2px] border-dashed border-orange-300/20"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute inset-8 rounded-full border-[2px] border-dashed border-amber-400/15"
          />
          <div className="absolute inset-0 rounded-full bg-gradient-radial from-orange-200/15 via-amber-100/8 to-transparent blur-3xl" />
        </div>

        <div className="max-w-5xl mx-auto text-center px-4 md:px-6 relative z-10">
          <motion.div initial="hidden" animate="visible" variants={staggerContainer}>

            {/* Live badge */}
            <motion.div variants={fadeInUp} className="inline-flex items-center gap-2.5 mb-6">
              <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm border border-orange-200 text-orange-700 px-4 py-2 rounded-full text-[11px] font-bold shadow-lg shadow-orange-500/10">
                <motion.span
                  animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-2 h-2 rounded-full bg-green-500 inline-block"
                />
                <Wifi className="w-3 h-3" />
                <span>{t("landing.heroBadge")}</span>
                <span className="bg-orange-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">LIVE</span>
              </div>
            </motion.div>

            {/* ── Main Headline ── */}
            <motion.div variants={fadeInUp} className="mb-5 md:mb-7">
              {/* Top line: Restaurant name */}
              <div className="relative inline-block">
                <h1 className="text-[2.6rem] sm:text-6xl md:text-7xl lg:text-[5.5rem] font-black leading-[1.03] tracking-tighter">
                  <motion.span
                    className="text-slate-900 relative inline-block"
                    animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                    transition={{ duration: 6, repeat: Infinity }}
                  >
                    {t("landing.heroTitle")}
                    {/* underline squiggle */}
                    <motion.span
                      className="absolute -bottom-1 left-0 right-0 h-1 rounded-full bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ delay: 0.8, duration: 0.7, ease: "easeOut" }}
                      style={{ originX: 0 }}
                    />
                  </motion.span>
                </h1>
              </div>

              {/* Bottom gradient line */}
              <h1 className="text-[2.6rem] sm:text-6xl md:text-7xl lg:text-[5.5rem] font-black leading-[1.05] tracking-tighter mt-1">
                <span
                  className="bg-gradient-to-r from-orange-500 via-amber-400 to-rose-500 bg-clip-text text-transparent"
                  style={{
                    backgroundSize: "200% auto",
                    animation: "gradientShift 4s ease infinite",
                  }}
                >
                  {t("landing.heroSubtitle")}
                </span>
              </h1>
            </motion.div>

            {/* Description */}
            <motion.p
              variants={fadeInUp}
              className="text-slate-500 text-sm sm:text-base md:text-lg mb-8 md:mb-10 leading-relaxed max-w-xl md:max-w-2xl mx-auto px-2 font-medium"
            >
              {t("landing.heroDesc")}
            </motion.p>

            {/* ── CTA Buttons ── */}
            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-12 md:mb-16 px-2">
              {/* Primary CTA */}
              <motion.button
                onClick={() => scrollTo("contact")}
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.96 }}
                className="w-full sm:w-auto relative overflow-hidden bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 text-white px-8 py-4 md:py-5 rounded-2xl font-black text-base shadow-2xl shadow-orange-500/35 flex items-center justify-center gap-3"
                style={{ backgroundSize: "200% auto", animation: "gradientShift 3s ease infinite" }}
              >
                {/* shimmer */}
                <motion.span
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1.5 }}
                />
                <Sparkles className="w-4 h-4" />
                {t("landing.startBtn")}
                <ArrowRight className="w-5 h-5" />
              </motion.button>

              {/* Secondary CTA */}
              <motion.button
                onClick={() => scrollTo("xizmatlar")}
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.97 }}
                className="w-full sm:w-auto group flex items-center justify-center gap-2.5 bg-white/90 backdrop-blur-sm border-2 border-slate-200 text-slate-700 px-7 py-4 md:py-5 rounded-2xl font-bold text-base hover:border-orange-300 hover:text-orange-600 transition-all shadow-lg"
              >
                <motion.span
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Play className="w-4 h-4 fill-orange-500 text-orange-500" />
                </motion.span>
                {t("landing.howItWorks")}
              </motion.button>
            </motion.div>

            {/* ── Stats Row — glassmorphism cards ── */}
            <motion.div variants={fadeInUp} className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 max-w-sm sm:max-w-md md:max-w-3xl mx-auto">
              {[
                { val: "20+",  label: t("landing.stats.restaurants") || "Faol Restoran",       icon: <Utensils className="w-4 h-4" />,  color: "from-orange-500 to-amber-500",   glow: "shadow-orange-500/20" },
                { val: "99.9%",label: t("landing.stats.uptime")       || "Uptime",             icon: <Zap className="w-4 h-4" />,       color: "from-emerald-500 to-teal-500",  glow: "shadow-emerald-500/20" },
                { val: language === "ru" ? "1 день" : language === "en" ? "1 day" : "1 kun", label: t("landing.stats.setup") || "Ishga tushirish",    icon: <Rocket className="w-4 h-4" />,    color: "from-violet-500 to-purple-500", glow: "shadow-violet-500/20" },
                { val: "24/7", label: t("landing.stats.support")      || "Qo'llab-quvvatlash", icon: <Headphones className="w-4 h-4" />,color: "from-blue-500 to-cyan-500",    glow: "shadow-blue-500/20" },
              ].map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + i * 0.12 }}
                  whileHover={{ y: -4, scale: 1.04 }}
                  className={`bg-white/80 backdrop-blur-md border border-white/60 rounded-2xl p-3 md:p-4 text-center shadow-lg ${s.glow} cursor-default`}
                >
                  <div className={`w-8 h-8 md:w-9 md:h-9 bg-gradient-to-br ${s.color} rounded-xl flex items-center justify-center text-white mx-auto mb-2 shadow-md`}>
                    {s.icon}
                  </div>
                  <motion.div
                    className="text-xl md:text-2xl font-black text-slate-900"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ delay: 1 + i * 0.3, duration: 3, repeat: Infinity }}
                  >
                    {s.val}
                  </motion.div>
                  <div className="text-[9px] md:text-xs font-semibold text-slate-500 mt-0.5 leading-tight">{s.label}</div>
                </motion.div>
              ))}
            </motion.div>

          </motion.div>
        </div>

        {/* CSS keyframes injected inline */}
        <style jsx>{`
          @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        `}</style>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section id="xizmatlar" className="py-14 md:py-24 px-4 md:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 md:mb-14">
            <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-full text-[11px] font-bold mb-3">
              <CheckCheck className="w-3 h-3" /> {t("landing.howItWorks")}
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-black tracking-tight text-slate-900 mb-3">{t("landing.howTitle")}</h2>
            <p className="text-slate-500 text-sm md:text-lg max-w-sm md:max-w-xl mx-auto">{t("landing.howDesc")}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-8">
            {steps.map((step, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 25 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.12 }}
                className={`${step.bg} border ${step.border} rounded-2xl md:rounded-3xl p-5 md:p-8`}>
                <div className={`w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br ${step.color} rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-lg mb-4`}>
                  {step.icon}
                </div>
                <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1.5">{step.num}</div>
                <h3 className="text-lg md:text-xl font-black text-slate-900 mb-2">{step.title}</h3>
                <p className="text-slate-600 text-xs md:text-sm leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section id="imkoniyatlar" className="py-14 md:py-24 px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 md:mb-14">
            <div className="inline-flex items-center gap-2 bg-violet-50 border border-violet-200 text-violet-700 px-3 py-1.5 rounded-full text-[11px] font-bold mb-3">
              <Sparkles className="w-3 h-3" /> {t("landing.featuresBadge")}
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-black tracking-tight text-slate-900 mb-3">{t("landing.featuresTitle")}</h2>
            <p className="text-slate-500 text-sm md:text-lg">18+ {language === "ru" ? "профессиональных функций" : language === "en" ? "professional features" : "professional funksiya"}</p>
          </div>

          {/* 3 cols mobile → 4 → 6 */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 md:gap-3">
            {allFeatures.map((f, i) => (
              <motion.div key={f.key} initial={{ opacity: 0, scale: 0.85 }} whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }} transition={{ delay: i * 0.03 }}
                whileHover={{ y: -4, scale: 1.05 }}
                className="group bg-white border border-slate-100 rounded-xl md:rounded-2xl p-3 md:p-4 hover:shadow-xl hover:border-orange-100 transition-all cursor-default text-center">
                <div className={`w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br ${f.color} rounded-lg md:rounded-xl flex items-center justify-center text-white mx-auto mb-2 group-hover:scale-110 transition-transform shadow-sm md:shadow-md`}>
                  {f.icon}
                </div>
                <p className="text-[9px] md:text-xs font-bold text-slate-700 leading-tight">{t(`landing.features_list.${f.key}`)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <section id="narxlar" className="py-14 md:py-24 px-4 md:px-6 bg-slate-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_50%,rgba(249,115,22,0.12),transparent_55%),radial-gradient(ellipse_at_80%_50%,rgba(139,92,246,0.08),transparent_55%)] pointer-events-none" />
        <div className="max-w-5xl mx-auto relative z-10">

          <div className="text-center mb-10 md:mb-14">
            <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 px-3 py-1.5 rounded-full text-[11px] font-bold mb-3">
              <CreditCard className="w-3 h-3" /> {t("landing.pricingBadge")}
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-black tracking-tight text-white mb-3">{t("landing.pricingTitle")}</h2>
          </div>

          {/* Pricing cards — stack on mobile, 3-col on lg */}
          <div className="flex flex-col gap-4 md:grid md:grid-cols-3 md:gap-5 items-stretch">

            {/* ── MONTHLY — $20/mo ── */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              whileHover={{ y: -6 }} transition={{ duration: 0.3 }}
              className="bg-white/5 border border-white/10 rounded-2xl md:rounded-3xl p-5 md:p-7 flex flex-col">
              <div className="mb-4">
                <h3 className="text-white font-black text-lg mb-0.5">{t("landing.monthly.name")}</h3>
                <p className="text-slate-500 text-xs">{t("landing.monthly.desc")}</p>
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl md:text-5xl font-black text-white">$20</span>
                <span className="text-slate-500 text-xs font-medium">{t("landing.monthly.period")}</span>
              </div>
              <p className="text-slate-600 text-xs mb-5">{t("landing.monthly.note") || "Yiliga: $240"}</p>
              <div className="space-y-2.5 mb-6 flex-1">
                {pricingPoints.map(f => (
                  <div key={f} className="flex items-center gap-2.5 text-slate-400 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-slate-600 shrink-0" /> {f}
                  </div>
                ))}
              </div>
              <button onClick={() => scrollTo("contact")} className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/18 text-white font-bold text-sm transition-all active:scale-95 border border-white/10">
                {t("landing.monthly.action") || t("landing.buyBtn")}
              </button>
            </motion.div>

            {/* ── 6 MONTHS — $200→$100 (50% OFF) ── */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              whileHover={{ y: -6 }} transition={{ duration: 0.3, delay: 0.08 }}
              className="bg-gradient-to-b from-orange-500 to-amber-500 rounded-2xl md:rounded-3xl p-5 md:p-7 flex flex-col shadow-2xl shadow-orange-500/25 relative overflow-hidden order-first md:order-none">

              {/* "Eng Mashhur" pill */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white text-orange-600 text-[9px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full shadow-md whitespace-nowrap z-10">
                {t("landing.sixMonth.badge")}
              </div>

              {/* 50% OFF corner */}
              <div className="absolute top-2 right-3 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-lg shadow z-10">30% OFF</div>

              <div className="mb-3 mt-7">
                <h3 className="text-white font-black text-lg mb-0.5">{t("landing.sixMonth.name")}</h3>
                <p className="text-orange-100 text-xs">{t("landing.sixMonth.desc")}</p>
              </div>

              {/* Crossed price */}
              <div className="flex items-center gap-2 mb-1">
                <span className="text-orange-200 line-through text-base font-bold">$100</span>
                <span className="bg-white/25 text-white text-[9px] font-black px-1.5 py-0.5 rounded">
                  {language === "ru" ? "Скидка 30%" : language === "en" ? "30% OFF" : "30% chegirma"}
                </span>
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl md:text-5xl font-black text-white">$70</span>
                <span className="text-orange-100 text-xs font-medium">{t("landing.sixMonth.period")}</span>
              </div>
              <div className="text-center mt-3 text-xs font-medium text-emerald-50">
                ⚡ {language === "ru" ? "Экономия $30 в год" : language === "en" ? "Save $30/year" : "Yiliga $30 tejaysiz"}
              </div>

              <div className="space-y-2.5 mb-6 flex-1">
                {pricingPoints.map(f => (
                  <div key={f} className="flex items-center gap-2.5 text-white text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0" /> {f}
                  </div>
                ))}
              </div>
              <button onClick={() => scrollTo("contact")} className="w-full py-3.5 rounded-xl bg-white text-orange-600 font-black text-sm transition-all active:scale-95 shadow-xl hover:bg-orange-50">
                {t("landing.sixMonth.action")}
              </button>
            </motion.div>

            {/* ── YEARLY — $200→$100 (50% OFF) ── */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              whileHover={{ y: -6 }} transition={{ duration: 0.3, delay: 0.16 }}
              className="bg-white border-2 border-amber-200 rounded-2xl md:rounded-3xl p-5 md:p-7 flex flex-col relative overflow-hidden">

              {/* 50% corner badge */}
              <div className="absolute top-3 right-3 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-lg shadow z-10">50% OFF</div>

              <div className="mb-3">
                <h3 className="text-slate-900 font-black text-lg mb-0.5">{t("landing.yearly.name")}</h3>
                <p className="text-slate-400 text-xs">{t("landing.yearly.desc")}</p>
              </div>

              {/* Crossed original price */}
              <div className="flex items-center gap-2 mb-1">
                <span className="text-slate-400 line-through text-base font-bold">$200</span>
                <span className="bg-pink-500/10 text-pink-500 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider mb-2 block w-fit mx-auto">
                  {language === "ru" ? "Скидка 50%" : language === "en" ? "50% OFF" : "50% chegirma"}
                </span>
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl md:text-5xl font-black text-amber-500">$100</span>
                <span className="text-slate-400 text-xs font-medium">{t("landing.yearly.period")}</span>
              </div>

              <div className="flex flex-col gap-1.5 mb-5">
                <div className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold px-2.5 py-1 rounded-full w-fit">
                  <Star className="w-2.5 h-2.5 fill-amber-500" /> {t("landing.yearly.savings")}
                </div>
                <div className="inline-flex items-center gap-1 bg-orange-50 text-orange-600 text-[10px] font-bold px-2.5 py-1 rounded-full w-fit">
                  ⚡ {t("landing.yearly.promotion")}
                </div>
              </div>

              <div className="space-y-2.5 mb-5 flex-1">
                {pricingPoints.map(f => (
                  <div key={f} className="flex items-center gap-2.5 text-slate-600 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0" /> {f}
                  </div>
                ))}
                <div className="text-[10px] text-amber-600 font-bold">{t("landing.yearly.unlimited")}</div>
              </div>
              <button onClick={() => scrollTo("contact")} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-sm transition-all active:scale-95 shadow-lg shadow-amber-500/25 hover:from-amber-600 hover:to-orange-600">
                {t("landing.yearly.action")}
              </button>
            </motion.div>
          </div>

          <p className="text-center text-slate-600 text-xs mt-7 font-medium">
            💬 {t("landing.pricingNote")}{" "}
            <button onClick={() => scrollTo("contact")} className="text-orange-400 hover:text-orange-300 font-bold underline underline-offset-2">{t("landing.pricingContact")}</button>
          </p>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="faq" className="py-14 md:py-24 px-4 md:px-6 bg-white">
        <div className="max-w-2xl md:max-w-3xl mx-auto">
          <div className="text-center mb-10 md:mb-14">
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1.5 rounded-full text-[11px] font-bold mb-3">
              <MessageCircle className="w-3 h-3" /> {t("landing.faqBadge")}
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-black tracking-tight text-slate-900 mb-3">{t("landing.faqTitle")}</h2>
            <p className="text-slate-500 text-sm">{t("landing.faqDesc")}</p>
          </div>

          <div className="space-y-2.5">
            {getFaqItems().map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                className={`border rounded-2xl overflow-hidden transition-all ${openFaq === i ? "border-orange-200 bg-orange-50/50" : "border-slate-100 bg-white hover:border-orange-100"}`}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between gap-3 p-4 md:p-5 text-left">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${openFaq === i ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-500"}`}>{i + 1}</span>
                    <span className="font-bold text-slate-800 text-xs md:text-sm leading-snug">{item.q}</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-300 ${openFaq === i ? "rotate-180 text-orange-500" : ""}`} />
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
                      <div className="px-4 md:px-5 pb-4 md:pb-5 pl-14 md:pl-16 text-slate-600 text-xs md:text-sm leading-relaxed">{item.a}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-8">
            <p className="text-slate-500 text-xs mb-3">{t("landing.faqMoreQ")}</p>
            <div className="flex gap-2.5 justify-center flex-wrap">
              <a href="tel:+998940192117" className="inline-flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-800 transition-all active:scale-95">
                <Phone className="w-3.5 h-3.5" /> {t("landing.faqCall")}
              </a>
              <a href="https://t.me/abdiaxatov" target="_blank" className="inline-flex items-center gap-2 bg-[#2AABEE] text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-[#1a9bde] transition-all active:scale-95">
                <Send className="w-3.5 h-3.5" /> Telegram
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ===== TRUST BANNER ===== */}
      <section className="py-10 md:py-14 px-4 md:px-6 bg-gradient-to-r from-orange-500 to-amber-500">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 text-white text-center">
            {[
              { icon: <Users className="w-5 h-5" />,  val: "500+", label: language === "ru" ? "Заказов в день" : language === "en" ? "Orders Daily" : "Kunlik buyurtmalar" },
              { icon: <Heart className="w-5 h-5" />, val: "100%", label: language === "ru" ? "Удовлетворённость" : language === "en" ? "Satisfaction" : "Mijoz mamnuniyati" },
              { icon: <Globe className="w-5 h-5" />,  val: "3",    label: language === "ru" ? "Языка" : language === "en" ? "Languages" : "Tillar" },
              { icon: <Award className="w-5 h-5" />, val: "20+", label: t("landing.stats.restaurants") },
            ].map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-white/20 rounded-xl md:rounded-2xl flex items-center justify-center">{s.icon}</div>
                <div className="text-xl md:text-3xl font-black">{s.val}</div>
                <div className="text-orange-100 text-[10px] md:text-sm font-medium leading-tight">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CONTACT FORM ===== */}
      <section id="contact" className="py-14 md:py-24 px-4 md:px-6 bg-[#FFFBF5]">
        <div className="max-w-lg md:max-w-2xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="bg-white border border-orange-100 rounded-3xl shadow-xl shadow-orange-500/5 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500" />
            <div className="p-6 md:p-10">
              <div className="text-center mb-7">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/25">
                  <MessageSquare className="w-6 h-6 md:w-7 md:h-7 text-white" />
                </div>
                <h2 className="text-xl md:text-4xl font-black text-slate-900 mb-2">{t("landing.contact.title")}</h2>
                <p className="text-slate-500 text-xs md:text-base">{t("landing.contact.desc")}</p>
              </div>

              <form onSubmit={handleContactSubmit} className="space-y-3.5">
                {/* Name + Restaurant — side by side on md+ */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5 ml-0.5">{t("landing.contact.nameLabel")}</label>
                    <input type="text" placeholder={t("landing.contact.namePlaceholder")}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all font-medium text-slate-800 placeholder:text-slate-300"
                      value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5 ml-0.5">{t("landing.contact.restaurantLabel")}</label>
                    <input type="text" placeholder={t("landing.contact.restaurantPlaceholder")}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all font-medium text-slate-800 placeholder:text-slate-300"
                      value={formData.restaurantName} onChange={e => setFormData({ ...formData, restaurantName: e.target.value })} />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5 ml-0.5">{t("landing.contact.phoneLabel")}</label>
                  <input type="tel" placeholder={t("landing.contact.phonePlaceholder") || "+998 90 123 45 67"}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all font-medium text-slate-800 placeholder:text-slate-300"
                    value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5 ml-0.5">{t("landing.contact.descLabel")}</label>
                  <textarea placeholder={t("landing.contact.descPlaceholder")} rows={3}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all font-medium text-slate-800 placeholder:text-slate-300 resize-none"
                    value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                </div>

                <motion.button disabled={isSubmitting} whileTap={{ scale: 0.98 }}
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl py-3.5 md:py-4 font-black text-sm shadow-xl shadow-orange-500/20 flex items-center justify-center gap-2.5 hover:from-orange-600 hover:to-amber-600 transition-all disabled:opacity-60">
                  {isSubmitting ? <><span className="animate-spin">⏳</span> {t("landing.contact.submitting")}</> : <><Send className="w-4 h-4" /> {t("landing.contact.submitBtn")}</>}
                </motion.button>

                <p className="text-center text-slate-400 text-[10px]">{t("landing.contact.privacy")}</p>
              </form>
            </div>
          </motion.div>

          {/* Direct contacts */}
          <div className="flex gap-2.5 justify-center mt-5 flex-wrap">
            <a href="tel:+998940192117" className="inline-flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold hover:border-orange-300 hover:text-orange-600 transition-all shadow-sm">
              <Phone className="w-3.5 h-3.5" /> +998 94 019 21 17
            </a>
            <a href="https://t.me/abdiaxatov" target="_blank" className="inline-flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold hover:border-blue-200 hover:text-blue-600 transition-all shadow-sm">
              <Send className="w-3.5 h-3.5" /> @abdiaxatov
            </a>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="py-10 md:py-14 px-4 md:px-6 bg-slate-950 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 md:gap-6 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center">
                  <Utensils className="text-white w-4 h-4" />
                </div>
                <span className="text-lg font-black text-white">FoodHub</span>
              </div>
              <p className="text-slate-500 text-xs leading-relaxed max-w-xs">{t("landing.footer.desc")}</p>
            </div>
            <div>
              <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-3">{t("landing.footer.pages") || "Sahifalar"}</h4>
              <div className="space-y-2 columns-2 sm:columns-1">
                {navItems.map(item => (
                  <button key={item.id} onClick={() => scrollTo(item.id)} className="block text-slate-500 hover:text-orange-400 text-xs font-medium transition-colors">
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-3">
                {language === "ru" ? "Связаться" : language === "en" ? "Contact" : "Bog'lanish"}
              </h4>
              <div className="space-y-2.5">
                <a href="tel:+998940192117" className="flex items-center gap-2 text-slate-500 hover:text-orange-400 transition-colors text-xs">
                  <Phone className="w-3.5 h-3.5" /> +998 94 019 21 17
                </a>
                <a href="https://instagram.com/nurbek.abdiaxatov" target="_blank" className="flex items-center gap-2 text-slate-500 hover:text-pink-400 transition-colors text-xs">
                  <Instagram className="w-3.5 h-3.5" /> @nurbek.abdiaxatov
                </a>
                <a href="https://t.me/abdiaxatov" target="_blank" className="flex items-center gap-2 text-slate-500 hover:text-blue-400 transition-colors text-xs">
                  <Send className="w-3.5 h-3.5" /> @abdiaxatov
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row justify-between items-center gap-2">
            <p className="text-slate-600 text-[10px] font-medium">{t("landing.footer.rights")}</p>
            <p className="text-slate-700 text-[10px] italic">{t("landing.footer.designer")}</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export { LandingPage }
