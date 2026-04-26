import { adminDb } from "../lib/firebase-admin";

async function checkAllProducts() {
  console.log("--- Checking All Products and AliPOS IDs ---");
  
  // 1. Root menuItems
  const rootItems = await adminDb.collection("menuItems").get();
  console.log(`Root Items: ${rootItems.size}`);
  rootItems.docs.forEach(doc => {
    const data = doc.data();
    console.log(`  [Root] ${doc.id}: ${data.name} (aliposId: ${data.aliposId || 'NONE'})`);
  });

  // 2. Restaurant-specific menuItems
  const restaurants = await adminDb.collection("restaurants").get();
  for (const res of restaurants.docs) {
    const resData = res.data();
    const items = await res.ref.collection("menuItems").get();
    console.log(`Restaurant ${res.id} (${resData.name || resData.slug}): ${items.size} items`);
    items.docs.forEach(doc => {
      const data = doc.data();
      console.log(`  [${res.id}] ${doc.id}: ${data.name} (aliposId: ${data.aliposId || 'NONE'})`);
    });
  }
}

checkAllProducts().catch(console.error);
