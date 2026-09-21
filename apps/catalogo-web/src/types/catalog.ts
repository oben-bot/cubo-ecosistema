export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  discount?: {
    enabled: boolean;
    percentage: number;
    label?: string; // Ej: "Oferta especial", "Liquidación"
  };
}

export interface CatalogTheme {
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  backgroundColor: string;
  fontFamily: string;
}

export interface PremiumFeatures {
  // MEDIUM FEATURES
  whatsapp?: {
    enabled: boolean;
    number: string;
  };
  contactInfo?: {
    enabled: boolean;
    phone?: string;
    address?: string;
    hours?: string;
  };

  // PREMIUM FEATURES
  socialMedia?: {
    enabled: boolean;
    instagram?: string;
    facebook?: string;
    tiktok?: string;
  };
  shoppingCart?: {
    enabled: boolean;
  };
  googleMaps?: {
    enabled: boolean;
    address?: string;
    embedUrl?: string;
  };
  categories?: {
    enabled: boolean;
  };

  shareProducts?: {
    enabled: boolean;
  };
  darkMode?: {
    enabled: boolean;
  };
  analytics?: {
    enabled: boolean;
  };
}

export type PlanType = "standard" | "medium" | "premium";

export interface BusinessHours {
  monday: { open: string; close: string; closed: boolean };
  tuesday: { open: string; close: string; closed: boolean };
  wednesday: { open: string; close: string; closed: boolean };
  thursday: { open: string; close: string; closed: boolean };
  friday: { open: string; close: string; closed: boolean };
  saturday: { open: string; close: string; closed: boolean };
  sunday: { open: string; close: string; closed: boolean };
}

export interface Catalog {
  id: string;
  name: string;
  storeName: string;
  logo?: string;
  backgroundImage?: string;
  businessInfo: string;
  whatsappNumber: string;
  products: Product[];
  theme: CatalogTheme;
  planType: PlanType;
  premiumFeatures: PremiumFeatures;
  businessHours?: BusinessHours;
  generalDiscount?: {
    enabled: boolean;
    percentage: number;
    label?: string;
  };
  createdAt: Date;
}
