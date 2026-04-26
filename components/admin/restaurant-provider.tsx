"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/components/admin/admin-auth-provider";
import { Restaurant } from "@/types"; // Ensure Restaurant type exists or define partial

interface RestaurantContextType {
    restaurant: any | null; // Replace any with proper type if available
    isLoading: boolean;
}

const RestaurantContext = createContext<RestaurantContextType>({
    restaurant: null,
    isLoading: true,
});

export function RestaurantProvider({ children }: { children: React.ReactNode }) {
    const { restaurantId } = useAuth();
    const [restaurant, setRestaurant] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!restaurantId) {
            setRestaurant(null);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const unsubscribe = onSnapshot(doc(db, "restaurants", restaurantId), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setRestaurant({ id: doc.id, ...data });

                // 🔹 Update Document Title & Favicon
                if (data.name) {
                    document.title = `${data.name} - Admin`;
                }

                if (data.logoUrl) {
                    const links = document.querySelectorAll("link[rel*='icon']");
                    if (links.length > 0) {
                        links.forEach(link => {
                            (link as HTMLLinkElement).href = data.logoUrl;
                        });
                    } else {
                        const newLink = document.createElement('link');
                        newLink.rel = 'icon';
                        newLink.href = data.logoUrl;
                        document.head.appendChild(newLink);
                    }
                }
            } else {
                setRestaurant(null);
            }
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching restaurant data:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [restaurantId]);

    return (
        <RestaurantContext.Provider value={{ restaurant, isLoading }}>
            {children}
        </RestaurantContext.Provider>
    );
}

export function useRestaurant() {
    const context = useContext(RestaurantContext);
    if (context === undefined) {
        throw new Error("useRestaurant must be used within a RestaurantProvider");
    }
    return context;
}

