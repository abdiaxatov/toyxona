import { AliPOSService } from "./lib/alipos-service";
import { adminDb } from "./lib/firebase-admin";

async function checkAliPOS() {
    // Get config from Firestore for the target restaurant
    const restId = "v5K3bHKNpR0dab4jPb7U"; // The one from logs
    const restDoc = await adminDb.collection("restaurants").doc(restId).get();
    const data = restDoc.data();
    
    if (!data?.integrations?.alipos) {
        console.log("No AliPOS config found");
        return;
    }
    
    const config = data.integrations.alipos;
    const service = new AliPOSService({
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        baseUrl: config.baseUrl || "https://web.alipos.uz"
    });
    
    try {
        console.log("Fetching AliPOS restaurants...");
        const restaurants = await service.getRestaurants();
        console.log("Available AliPOS Restaurants:", JSON.stringify(restaurants, null, 2));
        
        console.log("Current Configured RestaurantId (for menu):", config.restaurantId);
    } catch (e) {
        console.error("Error:", e);
    }
}

checkAliPOS();
