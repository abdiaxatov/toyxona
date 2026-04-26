import { adminDb } from "./lib/firebase-admin"

async function checkProduct() {
  try {
    const productId = "UR9Po6NKXKZ5QuUewKll"
    
    // Check in all restaurants menuItems
    const restaurants = await adminDb.collection("restaurants").get()
    for (const rest of restaurants.docs) {
      const product = await rest.ref.collection("menuItems").doc(productId).get()
      if (product.exists) {
        console.log(`FOUND in restaurant ${rest.id}:`, JSON.stringify(product.data(), null, 2))
        return
      }
    }
    
    // Check in root menuItems
    const rootProduct = await adminDb.collection("menuItems").doc(productId).get()
    if (rootProduct.exists) {
      console.log("FOUND in root:", JSON.stringify(rootProduct.data(), null, 2))
    } else {
      console.log("Product not found anywhere in Firestore")
    }
  } catch (e) {
    console.error(e)
  }
}

checkProduct()
