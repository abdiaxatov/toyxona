"use client";

import { useEffect, useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

/* 🔹 New Imports */
import { useParams } from "next/navigation";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [restaurantName, setRestaurantName] = useState("Menu");
  const { toast } = useToast();
  const { t } = useLanguage();
  const params = useParams();

  /* 🔹 Fetch Restaurant Name based on Slug */
  useEffect(() => {
    const fetchRestaurantName = async () => {
      if (params?.slug && db) {
        try {
          const q = query(collection(db, "restaurants"), where("slug", "==", params.slug));
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            setRestaurantName(snapshot.docs[0].data().name);
          }
        } catch (error) {
          console.error("Error fetching restaurant name for PWA:", error);
        }
      }
    };
    fetchRestaurantName();
  }, [params?.slug]);

  const toastRef = useRef<{ dismiss: () => void } | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      const isDismissed = localStorage.getItem("pwa_install_dismissed");
      if (isDismissed === "true") return;

      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    const handleAppInstalled = () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
      if (toastRef.current) toastRef.current.dismiss();

      toast({
        title: t("pwa.installSuccess"),
        description: t("pwa.installSuccessDesc").replace("{name}", restaurantName),
      });
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [toast, t, restaurantName]);

  useEffect(() => {
    const isDismissed = localStorage.getItem("pwa_install_dismissed");
    if (isDismissed === "true") return;

    if (showPrompt && deferredPrompt) {
      toastRef.current = toast({
        title: t("pwa.installToastTitle").replace("{name}", restaurantName),
        description: t("pwa.installToastDesc"),
        action: (
          <div className="flex flex-col gap-2">
            <ToastAction
              altText={t("pwa.installToastAction")}
              onClick={async () => {
                if (deferredPrompt) {
                  deferredPrompt.prompt();
                  const { outcome } = await deferredPrompt.userChoice;
                  if (outcome === "accepted") {
                    console.log("User accepted the install prompt");
                  }
                  setDeferredPrompt(null);
                  setShowPrompt(false);
                }
              }}
            >
              {t("pwa.installToastAction")}
            </ToastAction>
            <Button
              variant="outline"
              size="sm"
              className="text-[10px] h-7"
              onClick={() => {
                localStorage.setItem("pwa_install_dismissed", "true");
                setShowPrompt(false);
                if (toastRef.current) toastRef.current.dismiss();
              }}
            >
              Boshqa ko'rsatilmasin
            </Button>
          </div>
        ),
        duration: 7000,
      });
    }
  }, [showPrompt, deferredPrompt, toast, t, restaurantName]);

  return null;
}
