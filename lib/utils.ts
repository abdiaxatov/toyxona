import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, lang: string = "uz"): string {
  const suffix = lang === "uz" ? " so'm" : lang === "ru" ? " сум" : " UZS";
  return new Intl.NumberFormat(lang === "uz" ? "uz-UZ" : lang === "ru" ? "ru-RU" : "en-US", {
    style: "currency",
    currency: "UZS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace("UZS", suffix)
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat("uz-UZ").format(num)
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("uz-UZ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleString("uz-UZ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleTimeString("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function getDateString(date: Date = new Date()): string {
  return date.toISOString().split("T")[0]
}

export function parseDate(dateString: string): Date {
  return new Date(dateString + "T00:00:00")
}
// Helper to convert Hex to HSL for Tailwind CSS variables
export function hexToHSL(hex: string): string | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;

  let r = parseInt(result[1], 16);
  let g = parseInt(result[2], 16);
  let b = parseInt(result[3], 16);

  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  // Round values to match Tailwind's expected format (integers/percentages)
  // Tailwind uses space separated values: H S% L%
  // e.g. 217 80% 10%
  const hDeg = Math.round(h * 360);
  const sPct = Math.round(s * 100);
  const lPct = Math.round(l * 100);

  return `${hDeg} ${sPct}% ${lPct}%`;
}

/**
 * Optimizes an image URL using the wsrv.nl CDN service.
 * Resizes, converts to WebP, and caches images on the fly.
 */
export function getOptimizedImageUrl(url: string, { width, height, quality = 80, format = 'webp' }: { width?: number; height?: number; quality?: number; format?: string } = {}) {
  if (!url || typeof url !== 'string') return "";
  
  // Normalize local paths that might be missing a leading slash
  if (!url.startsWith('http') && !url.startsWith('/') && !url.startsWith('data:')) {
    url = '/' + url;
  }

  // Don't double-optimize or try to optimize base64/relative paths
  if (url.startsWith('data:') || url.includes('wsrv.nl') || !url.startsWith('http')) return url;

  const params = new URLSearchParams();
  params.append('url', url);
  if (width) params.append('w', width.toString());
  if (height) params.append('h', height.toString());
  params.append('q', quality.toString());
  params.append('output', format);
  params.append('fit', 'cover');
  params.append('il', ''); // Interlaced for progressive loading

  // Convert + back to %20 for spaces since wsrv.nl prefers %20 for URLs in its url parameter
  const queryString = params.toString().replace(/\+/g, '%20');
  return `https://wsrv.nl/?${queryString}`;
}
