export const escapeHTML = (text: string) => {
    if (!text) return ""
    return text.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
}

export function formatOrderMessage(order: any, orderId: string, restaurant: any) {
    // Format Message using HTML
    let message = `<b>🆕 Yangi Buyurtma!</b> (#${orderId.substring(0, 8)})\n\n`
    
    // Customer Info
    if (order?.customerName) message += `👤 Mijoz: <b>${escapeHTML(order.customerName)}</b>\n`
    if (order?.phoneNumber) message += `📞 Telefon: <b>${escapeHTML(order.phoneNumber)}</b>\n`
    
    if (order?.waiterName) message += `👨‍🍳 Ofitsiant: <b>${escapeHTML(order.waiterName)}</b>\n`
    
    if (order?.paymentMethod) {
        const method = order.paymentMethod === "card" ? "💳 Karta" : "💵 Naqd"
        message += `💰 To'lov turi: <b>${method}</b>\n`
    }
    
    message += `\n`

    if (order?.orderType === "delivery") {
        message += `🛵 <b>Yetkazib berish</b>\n`
        if (order?.address) message += `📍 Manzil: ${escapeHTML(order.address)}\n`
        if (order?.telegramUsername) message += `👤 TG Username: @${escapeHTML(order.telegramUsername.replace("@", ""))}\n`
    } else {
        message += `🏢 <b>Restoranda xizmat ko'rsatish</b>\n`
        if (order?.seatingType && order?.tableNumber) {
            message += `🪑 ${escapeHTML(order.seatingType)} #${order.tableNumber}\n`
        } else if (order?.roomNumber) {
            message += `🚪 Xona #${order.roomNumber}\n`
        }
    }

    message += `\n🛒 <b>Buyurtma ro'yxati:</b>\n`
    let count = 1
    order?.items?.forEach((item: any) => {
        const variantText = item.variantName ? ` (${escapeHTML(item.variantName)})` : ""
        message += `${count}. ${escapeHTML(item.name)}${variantText} - ${item.quantity} x ${item.price.toLocaleString("uz-UZ")} $\n`
        count++
    })

    message += `\n━━━━━━━━━━━━━━━\n`
    message += `💰 <b>Taomlar summasi:</b> ${order?.subtotal?.toLocaleString("uz-UZ") || 0} $`
    
    if (order?.containerCost) {
        message += `\n📦 <b>Idish puli:</b> ${order.containerCost.toLocaleString("uz-UZ")} $`
    }
    
    const showDelivery = order?.deliveryFee && order.orderType === "delivery" && restaurant?.showDeliveryFeeInMessage !== false;
    if (showDelivery) {
        message += `\n🚚 <b>Yetkazib berish:</b> ${order.deliveryFee.toLocaleString("uz-UZ")} $`
    }

    message += `\n\n💵 <b>JAMI SUMMA:</b> ${order?.total?.toLocaleString("uz-UZ") || 0} $`

    if (order?.latitude && order?.longitude) {
        message += `\n\n📍 <b>Manzil (Xarita):</b>\n`
        message += `<a href="https://www.google.com/maps?q=${order.latitude},${order.longitude}">Google Maps</a>\n`
        message += `<a href="https://yandex.uz/maps/?pt=${order.longitude},${order.latitude}&z=16&l=map">Yandex Maps</a>`
    }

    return message;
}
