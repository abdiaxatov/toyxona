export interface MenuItem {
  id: string;
  name: string; // Default name (usually Uzbek)
  name_uz?: string;
  name_ru?: string;
  name_en?: string;
  description?: string;
  description_uz?: string;
  description_ru?: string;
  description_en?: string;
  price: number;
  category: string;
  imageUrl?: string; // Kept for backward compatibility if needed, but primary is imageUrls
  imageUrls?: string[];
  available?: boolean;
  isAvailable?: boolean;
  modelUrl?: string;
  categoryId?: string;
  discountPrice?: number;
  discountEndsAt?: string; // ISO date string
  availableDays?: number[]; // [0, 1, 2, 3, 4, 5, 6] where 0 is Sunday
  remainingServings?: number;
  servesCount?: number;
  variants?: MenuItemVariant[];
  aliposId?: string;
  order?: number;
  isNew?: boolean;
}

export interface MenuItemVariant {
  id: string;
  name: string;
  name_uz?: string;
  name_ru?: string;
  name_en?: string;
  price: number;
  discountPrice?: number;
  discountEndsAt?: string; // ISO date string
  aliposId?: string;
  unit?: "gr" | "pc" | "kg" | "l"; // gram, piece, kilogram, liter
}

export interface CartItem {
  id: string;
  productId?: string;
  name: string;
  price: number;
  originalPrice?: number;
  quantity: number;
  maxQuantity?: number; // from remainingServings at time of adding
  imageUrl?: string;
  variant?: MenuItemVariant;
  aliposId?: string;
}

export interface Category {
  id: string;
  name: string;
  name_uz?: string;
  name_ru?: string;
  name_en?: string;
  description?: string;
  description_uz?: string;
  description_ru?: string;
  description_en?: string;
  imageUrl?: string;
  order?: number;
  active?: boolean;
  isDiscountCategory?: boolean; // Special flag for Chegirmalar category
  createdAt?: any;
  updatedAt?: any;
}

// Update the Table interface to include floor
export interface Table {
  id: string;
  number: number;
  seats: number;
  status: "available" | "occupied" | "reserved";
  roomId?: string;
  floor?: number;
}

// Update the Room interface to include floor
export interface Room {
  id: string;
  number: number;
  status: "available" | "occupied" | "reserved";
  description?: string;
  floor?: number;
}

// Update the Order type to include floor
export type Order = {
  id: string;
  orderType: "table" | "delivery";
  tableNumber?: number | null;
  roomNumber?: number | null;
  status: string;
  createdAt: any;
  updatedAt?: any;
  items: CartItem[];
  total: number;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  deliveryFee?: number;
  paymentMethod?: string;
  notes?: string;
  tableType?: string;
  seatingType?: string;
  floor?: number;
  weddingDate?: string;
  guestCount?: number;
  hallDetails?: string;
};

export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "chef" | "waiter";
  createdAt: any;
}

// Add Floor interface
export interface Floor {
  id: string;
  number: number;
  name: string;
  description?: string;
}

export interface Banner {
  id: string;
  name: string;
  name_uz?: string;
  name_ru?: string;
  name_en?: string;
  imageUrl: string;
  categoryId?: string; // Target category to link to
  displayAfterCategoryId?: string; // Where the banner is shown
  active: boolean; // default true
  createdAt?: any;
}

export interface TvSettings {
  id: string;
  slideDuration: number; // in seconds
  activeCategoryIds: string[];
  activeItemIds?: string[]; // If set, only these items show on TV
  theme: 'modern' | 'classic' | 'grid' | 'dark' | 'light';
  showLogo?: boolean;
  showClock?: boolean;
  showCategoryNav?: boolean;
  showTopBar?: boolean;
  showBottomBar?: boolean;
  showProgressDots?: boolean;
  showDescriptions?: boolean;
  showOutOfStock?: boolean;
  showBadges?: boolean;
  showImages?: boolean;
  marqueeText?: string;
  showMarquee?: boolean;
  marqueeSpeed?: number;
  fontSize?: 'small' | 'medium' | 'large' | 'xl';
  fontFamily?: string;
  columns?: 1 | 2 | 3 | 4;
  rows?: 2 | 3 | 4 | 5;
  bgColor?: string;
  cardColor?: string;
  textColor?: string;
  backgroundOverlay?: number;
  bgImageUrl?: string;
  bgType?: 'color' | 'image' | 'video' | 'mesh' | 'gradient';
  meshColors?: string[];
  gradientColors?: string[];
  bgAnimationSpeed?: number;
  catNavActiveColor?: string;
  catNavInactiveColor?: string;
  marqueeBgColor?: string;
  marqueeTextColor?: string;
  transitionStyle?: 'fade' | 'slide' | 'zoom';
  cardStyle?: 'horizontal' | 'vertical' | 'minimal';
  cardRadius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  displayMode?: 'menu' | 'promo' | 'mixed';
  promoImages?: string[];
  promoSlideDuration?: number;
  promoInterval?: number;
  // Video Background
  videoUrl?: string;
  // QR Code
  showQrCode?: boolean;
  qrCodeUrl?: string;
  qrCodeText?: string;
  qrCodePosition?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  // Dayparting
  timeBasedMenu?: {
    breakfast?: { start: string; end: string; categoryIds: string[] };
    lunch?: { start: string; end: string; categoryIds: string[] };
    dinner?: { start: string; end: string; categoryIds: string[] };
  };
  lastUpdated?: any;
}
