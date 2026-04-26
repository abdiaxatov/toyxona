"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, query, where, Timestamp } from "firebase/firestore";
import { useLanguage } from "@/hooks/use-language";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Bell, CheckCircle2, Loader2, AlertCircle } from "lucide-react";

export default function WaiterCallPage() {
    const params = useParams();
    const tableNumber = params.tableNumber ? parseInt(params.tableNumber as string) : null;
    const { t } = useLanguage();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [calling, setCalling] = useState(false);
    const [callSent, setCallSent] = useState(false);
    const [waiterName, setWaiterName] = useState<string | null>(null);
    const [tableExists, setTableExists] = useState(false);

    useEffect(() => {
        if (tableNumber) {
            fetchTableInfo();
        }
    }, [tableNumber]);

    const fetchTableInfo = async () => {
        try {
            setLoading(true);

            // Check in seatingItems collection (the existing table management system)
            const seatingItemsQuery = query(
                collection(db, "seatingItems"),
                where("number", "==", tableNumber)
            );
            const seatingItemsSnapshot = await getDocs(seatingItemsQuery);

            if (!seatingItemsSnapshot.empty) {
                const tableData = seatingItemsSnapshot.docs[0].data();
                setTableExists(true);

                // If there's a waiterId, fetch the waiter info
                if (tableData.waiterId) {
                    const waitersQuery = query(
                        collection(db, "waiters"),
                        where("__name__", "==", tableData.waiterId)
                    );
                    const waitersSnapshot = await getDocs(waitersQuery);

                    if (!waitersSnapshot.empty) {
                        const waiterData = waitersSnapshot.docs[0].data();
                        setWaiterName(waiterData.name);
                    }
                }
            } else {
                setTableExists(false);
            }
        } catch (error) {
            console.error("Error fetching table info:", error);
            toast({
                title: t("common.error"),
                description: t("waiterCall.tableNotFound"),
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCallWaiter = async () => {
        if (!tableNumber) return;

        try {
            setCalling(true);

            // Create a waiter call entry
            await addDoc(collection(db, "waiter_calls"), {
                tableNumber,
                waiterName: waiterName || "Unassigned",
                status: "pending",
                timestamp: Timestamp.now()
            });

            setCallSent(true);
            toast({
                title: t("waiterCall.callSent"),
                description: t("waiterCall.waiterNotified")
            });

            // Reset after 5 seconds
            setTimeout(() => {
                setCallSent(false);
            }, 5000);
        } catch (error) {
            console.error("Error calling waiter:", error);
            toast({
                title: t("common.error"),
                description: "Failed to call waiter",
                variant: "destructive"
            });
        } finally {
            setCalling(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    if (!tableExists) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
                <Card className="max-w-md w-full">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <AlertCircle className="h-16 w-16 text-destructive mb-4" />
                        <h2 className="text-2xl font-bold mb-2">{t("waiterCall.tableNotFound")}</h2>
                        <p className="text-muted-foreground text-center">
                            {t("tables.tableNumber")} {tableNumber}
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
            <Card className="max-w-md w-full shadow-2xl">
                <CardHeader className="text-center space-y-2">
                    <CardTitle className="text-3xl font-bold">
                        {t("waiterCall.title")}
                    </CardTitle>
                    <CardDescription className="text-lg">
                        {t("waiterCall.yourTable")}: <span className="font-bold text-primary text-2xl">#{tableNumber}</span>
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {waiterName && (
                        <div className="p-4 bg-primary/10 rounded-lg text-center">
                            <p className="text-sm text-muted-foreground mb-1">{t("waiterCall.yourWaiter")}</p>
                            <p className="text-xl font-bold text-primary">{waiterName}</p>
                        </div>
                    )}

                    {!waiterName && (
                        <div className="p-4 bg-muted rounded-lg text-center">
                            <p className="text-sm text-muted-foreground">{t("waiterCall.noWaiterAssigned")}</p>
                        </div>
                    )}

                    {callSent ? (
                        <div className="flex flex-col items-center justify-center py-8 space-y-4">
                            <CheckCircle2 className="h-20 w-20 text-green-500 animate-pulse" />
                            <div className="text-center space-y-2">
                                <h3 className="text-2xl font-bold text-green-600">{t("waiterCall.callSent")}</h3>
                                <p className="text-muted-foreground">{t("waiterCall.waiterNotified")}</p>
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => setCallSent(false)}
                                className="mt-4"
                            >
                                {t("waiterCall.callAgain")}
                            </Button>
                        </div>
                    ) : (
                        <Button
                            onClick={handleCallWaiter}
                            disabled={calling}
                            size="lg"
                            className="w-full h-20 text-xl font-bold shadow-lg hover:shadow-xl transition-all"
                        >
                            {calling ? (
                                <>
                                    <Loader2 className="h-6 w-6 mr-3 animate-spin" />
                                    {t("waiterCall.calling")}
                                </>
                            ) : (
                                <>
                                    <Bell className="h-6 w-6 mr-3" />
                                    {t("waiterCall.callButton")}
                                </>
                            )}
                        </Button>
                    )}

                    <div className="text-center text-sm text-muted-foreground pt-4 border-t">
                        <p>{t("menu.title")}</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
