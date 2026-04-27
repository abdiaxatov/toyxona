"use client";

import React, { ReactElement, memo, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Coffee,
  ChevronLeft,
  ChevronRight,
  LogOut,
  X,
  MenuIcon,
  Activity,
  LayoutGrid,
  UserCog,
  Bell,
  Shield,
  Armchair,
  Settings,
  Gift,
  Images,
  Send,
  Users,
  ShoppingCart,
  MessageCircle,
  Zap,
  Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";
import { useAuth } from "./admin-auth-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useLanguage } from "@/hooks/use-language";
import { auth, db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { useRestaurant } from "./restaurant-provider";

const NavItem = memo(
  ({
    href,
    icon: Icon,
    title,
    isActive,
    isOpen,
    badge,
    isMobile
  }: {
    href: string;
    icon: ReactElement;
    title: string;
    isActive: boolean;
    isOpen?: boolean;
    badge?: string;
    isMobile?: boolean;
  }) => (
    <div className={cn("relative group", isMobile ? "flex-1" : "")}>
      <Link
        href={href}
        className={cn(
          "relative flex items-center transition-all duration-300 ease-in-out",
          isMobile
            ? "flex-col justify-center gap-1 p-2 rounded-xl"
            : "gap-3 rounded-xl px-2 py-2",
          isActive
            ? "text-primary"
            : "text-muted-foreground hover:text-primary",
          !isMobile && isActive && "bg-gradient-to-r from-primary/10 to-primary/5 shadow-sm",
          !isMobile && !isOpen && "justify-center px-0 py-3",
          "focus:outline-none focus:ring-2 focus:ring-primary/20",
          "active:scale-95 touch-manipulation"
        )}
      >
        <div className="relative">
          {/* @ts-ignore */}
          <Icon.type className={cn(
            "transition-transform duration-200",
            isMobile ? "h-6 w-6" : "h-5 w-5 shrink-0",
            isActive && "scale-110 drop-shadow-sm",
            !isMobile && "group-hover:scale-110"
          )} />
          {badge && (
            <Badge className={cn(
              "absolute p-0 text-[10px] bg-red-500 border-background flex items-center justify-center",
              isMobile ? "-top-1 -right-1 h-3.5 w-3.5 rounded-full" : "-top-2 -right-2 h-4 w-4"
            )}>
              {badge}
            </Badge>
          )}
        </div>

        {isMobile && (
          <span className={cn("text-[10px] font-medium transition-colors", isActive ? "text-primary font-bold" : "text-gray-500")}>
            {title}
          </span>
        )}

        {!isMobile && isOpen && (
          <div className="flex items-center justify-between w-full min-w-0">
            <span className="truncate font-medium">{title}</span>
            {badge && !isMobile && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {badge}
              </Badge>
            )}
            {isActive && (
              <ChevronRight className="h-4 w-4 ml-2 opacity-70" />
            )}
          </div>
        )}

        {!isMobile && !isOpen && (
          <div className="absolute left-full ml-3 px-2 py-2 bg-popover border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 whitespace-nowrap">
            <span className="text-sm font-medium">{title}</span>
            <div className="absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-popover border-l border-b rotate-45"></div>
          </div>
        )}
      </Link>
    </div>
  )
);

NavItem.displayName = "NavItem";

export const AdminSidebar = memo(() => {
  const pathname = usePathname();
  const { open, toggleSidebar } = useSidebar();
  const { userRole, signOut, restaurantId } = useAuth();
  const { t } = useLanguage();
  const { restaurant } = useRestaurant();

  const navItems = useMemo(() => [
    {
      href: "/admin/super-admin",
      icon: <LayoutGrid />,
      title: "Asosiy Ekran",
      roles: ["super_admin", "co_founder"]
    },
    {
      href: "/admin/super-admin/contacts",
      icon: <MessageCircle />,
      title: "Murojaatlar",
      roles: ["super_admin", "co_founder"]
    },
    {
      href: "/admin/analytics",
      icon: <Activity />,
      title: userRole === "super_admin" ? "Global Analitika" : "Analitika",
      roles: ["super_admin", "co_founder", "admin"]
    },
    {
      href: "/admin/orders",
      icon: <ShoppingCart />,
      title: "Buyurtmalar",
      roles: ["admin", "waiter"],
    },
    {
      href: "/admin/bookings",
      icon: <Calendar />,
      title: "Bron Kalendari",
      roles: ["admin"],
    },
    {
      href: "/admin/menu",
      icon: <Coffee />,
      title: t("nav.menu"),
      roles: ["admin"],
    },
    {
      href: "/admin/categories",
      icon: <LayoutGrid />,
      title: t("admin.menu.tabs.categories") || "Kategoriyalar",
      roles: ["admin"],
    },
    {
      href: "/admin/tables",
      icon: <Armchair />,
      title: "Stollar",
      roles: ["admin"],
      conditional: restaurant?.enableWaiterCall !== false
    },
    {
      href: "/admin/register-staff",
      icon: <UserCog />,
      title: "Xodimlar",
      roles: ["admin"],
      conditional: restaurant?.enableWaiterCall !== false
    },
    {
      href: "/admin/waiter-calls",
      icon: <Bell />,
      title: "Chaqiruvlar",
      roles: ["admin", "waiter"],
      conditional: restaurant?.enableWaiterCall !== false
    },
    {
      href: "/admin/baraban",
      icon: <Gift />,
      title: "Baraban",
      roles: ["admin"],
    },
    {
      href: "/admin/gallery",
      icon: <Images />,
      title: "Galereya",
      roles: ["admin"],
    },
    {
      href: "/admin/telegram",
      icon: <Send />,
      title: "Telegram Bot",
      roles: ["admin"],
      conditional: restaurant?.enableTelegramIntegration === true
    },
    {
      href: "/admin/users",
      icon: <Users />,
      title: "Mijozlar",
      roles: ["admin"],
      conditional: restaurant?.enableTelegramIntegration === true
    },
    {
      href: "/admin/integrations/alipos",
      icon: <Zap />,
      title: "AliPOS",
      roles: ["admin"],
    },
    {
      href: "/admin/settings",
      icon: <Settings />,
      title: "Sozlamalar",
      roles: ["admin"],
    }
  ], [t, restaurant?.enableWaiterCall, restaurant?.enableTelegramIntegration, userRole]);

  const filteredNavItems = useMemo(() => {
    if (!userRole) return [];
    return navItems.filter((item) => {
      const isGlobalAdmin = userRole.toLowerCase() === "super_admin" || userRole.toLowerCase() === "co_founder";
      const roleMatch = item.roles.includes(userRole.toLowerCase()) ||
        (isGlobalAdmin && restaurantId && item.roles.includes("admin"));
      const conditionMatch = item.conditional !== undefined ? item.conditional : true;
      return roleMatch && conditionMatch;
    });
  }, [userRole, restaurantId, navItems]);

  const sidebarWidth = open
    ? "md:w-[220px] lg:w-[260px]"
    : "md:w-[64px] lg:w-[70px]";

  const logoutWidth = open
    ? "260px"
    : "70px";

  return (
    <>
      {/* --- MOBILE BOTTOM NAVIGATION --- */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-[74px] bg-white/95 backdrop-blur-xl border-t border-gray-200 z-50 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="flex items-center h-full px-2 overflow-x-auto no-scrollbar snap-x snap-mandatory">
          <div className="flex items-center min-w-full justify-around gap-1">
            {filteredNavItems.map((item) => (
              <div key={item.href} className="snap-center shrink-0 min-w-[64px]">
                <NavItem
                  href={item.href}
                  icon={item.icon}
                  title={item.title}
                  isActive={pathname.startsWith(item.href)}
                  isMobile={true}
                  badge={item.badge}
                />
              </div>
            ))}
            <div className="snap-center shrink-0 min-w-[64px] flex justify-center">
              <LanguageSwitcher isMobile={true} />
            </div>
            {/* Mobile Logout Button */}
            <div className="snap-center shrink-0 min-w-[64px] flex justify-center">
              <button
                onClick={signOut}
                className="flex flex-col items-center justify-center gap-1 p-2 text-muted-foreground hover:text-red-500 rounded-xl transition-colors active:scale-90"
              >
                <LogOut className="h-6 w-6" />
                <span className="text-[10px] font-medium">{t("nav.logout")}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- DESKTOP SIDEBAR --- */}
      <aside
        className={cn(
          "hidden md:flex fixed left-0 top-0 z-50 h-screen flex-col transition-all duration-300 ease-in-out",
          "border-r border-border/50 bg-gradient-to-b from-background via-background/95 to-background/90",
          "backdrop-blur-md supports-[backdrop-filter]:bg-background/80 shadow-xl",
          sidebarWidth
        )}
      >
        {/* Header */}
        <div className={cn(
          "flex h-16 items-center border-b border-border/50 px-4 transition-all duration-200",
          (userRole === "super_admin" || userRole === "co_founder") ? "bg-zinc-950 text-white" : "bg-background/60 backdrop-blur-sm",
          open ? "justify-between" : "justify-center"
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl",
              (userRole === "super_admin" || userRole === "co_founder") ? "bg-white text-black" : "bg-gradient-to-tr from-primary/20 to-primary/5"
            )}>
              {userRole === "super_admin" || userRole === "co_founder" ? (
                <Shield className="h-6 w-6" />
              ) : (
                <img
                  src={restaurant?.logoUrl || "/Logo.png"}
                  alt="Logo"
                  className="h-8 w-8 object-contain"
                  onError={(e) => {
                    // Fallback if image fails
                    (e.target as HTMLImageElement).src = "/Logo.png";
                  }}
                />
              )}
            </div>
            {open && (
              <div className="flex flex-1 items-center justify-between min-w-0">
                <div className="animate-in slide-in-from-left-2 duration-200">
                  <h1 className={cn(
                    "font-bold truncate max-w-[120px]",
                    (userRole === "super_admin" || userRole === "co_founder") ? "text-white" : "bg-gradient-to-r from-primary via-primary/90 to-primary/70 bg-clip-text text-transparent"
                  )}>
                    {userRole === "super_admin" ? "Super Admin" : userRole === "co_founder" ? "Co-Founder" : (restaurant?.name || "Menu")}
                  </h1>
                  <p className={cn(
                    "text-[10px] uppercase tracking-wider font-semibold",
                    (userRole === "super_admin" || userRole === "co_founder") ? "text-zinc-400" : "text-muted-foreground"
                  )}>{(userRole === "super_admin" || userRole === "co_founder") ? "Boshqaruv" : "Admin Panel"}</p>
                </div>
                {!userRole?.includes("super_admin") && <LanguageSwitcher variant="ghost" className="h-8 px-2" />}
              </div>
            )}
          </div>
          {!open && <LanguageSwitcher variant="ghost" size="icon" className="absolute bottom-20 left-1/2 -translate-x-1/2" />}
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-4">
          <nav className={cn("space-y-1", open ? "px-3" : "px-2")}>
            {filteredNavItems.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                icon={item.icon}
                title={item.title}
                isActive={pathname.startsWith(item.href)}
                isOpen={open}
                badge={item.badge}
              />
            ))}
          </nav>
        </div>

        {/* Toggle button */}
        <Button
          onClick={toggleSidebar}
          variant="outline"
          size="icon"
          className={cn(
            "absolute -right-3 top-20 h-6 w-6 rounded-full shadow-md bg-background border border-border/50 hover:bg-muted z-50"
          )}
        >
          {open ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </Button>

        {/* Logout */}
        <div className="p-4 border-t border-border mt-auto">
          {(userRole === "super_admin" || userRole === "co_founder") && (
            <Button
              variant="outline"
              className="w-full justify-start gap-2 mb-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200"
              onClick={async () => {
                // Clear restaurantId context
                if (auth.currentUser) {
                  await updateDoc(doc(db, "users", auth.currentUser.uid), {
                    restaurantId: null
                  })
                  window.location.href = "/admin/super-admin"
                }
              }}
            >
              <Shield className="h-4 w-4" />
              {open && <span>Super Admin</span>}
            </Button>
          )}
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10",
              open ? "px-4" : "px-2"
            )}
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
            {open && <span>{t("nav.logout")}</span>}
          </Button>
        </div>
      </aside>
    </>
  );
});

AdminSidebar.displayName = "AdminSidebar";
