export function optimizeImage(url: any, width: number = 800) {
    if (!url) return "/placeholder.svg";
    
    // Handle AliPOS style image objects { url, hash, ... }
    let urlString = typeof url === 'string' ? url : (url.url || url.imageUrl || url.image);
    
    if (!urlString || typeof urlString !== 'string') return "/placeholder.svg";

    // If it's already a placeholder or local image, return as is
    if (urlString.startsWith("/") || urlString.startsWith("data:")) return urlString;

    // Utilize wsrv.nl for on-the-fly optimization
    // w: width
    // q: quality (default 80)
    // output: webp (modern format)
    return `https://wsrv.nl/?url=${encodeURIComponent(urlString)}&w=${width}&q=75&output=webp`;
}
