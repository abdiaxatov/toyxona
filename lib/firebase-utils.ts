import { collection, doc, CollectionReference, DocumentReference } from "firebase/firestore"
import { db } from "@/lib/firebase"

/**
 * Returns a CollectionReference for a sub-collection within a specific restaurant.
 * @param restaurantId The ID of the restaurant.
 * @param collectionName The name of the sub-collection (e.g., 'orders', 'menuItems').
 */
export const getRestaurantCollection = (restaurantId: string, collectionName: string): CollectionReference => {
    if (!restaurantId) {
        throw new Error(`Restaurant ID is missing for collection: ${collectionName}`)
    }
    return collection(db, "restaurants", restaurantId, collectionName)
}

/**
 * Returns a DocumentReference for a specific document within a restaurant's sub-collection.
 * @param restaurantId The ID of the restaurant.
 * @param collectionName The name of the sub-collection.
 * @param docId The ID of the document.
 */
export const getRestaurantDoc = (restaurantId: string, collectionName: string, docId: string): DocumentReference => {
    if (!restaurantId) {
        throw new Error(`Restaurant ID is missing for document in: ${collectionName}`)
    }
    return doc(db, "restaurants", restaurantId, collectionName, docId)
}

/**
 * Helper to get path string if needed for queries that accept path strings
 */
export const getRestaurantPath = (restaurantId: string, collectionName: string): string => {
    return `restaurants/${restaurantId}/${collectionName}`
}
