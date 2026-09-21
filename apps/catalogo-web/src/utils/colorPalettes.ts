import { CatalogTheme } from '@/types/catalog';

export interface ColorPalette {
  id: string;
  name: string;
  description: string;
  theme: CatalogTheme;
  preview: {
    primary: string;
    secondary: string;
    background: string;
  };
}

export const colorPalettes: ColorPalette[] = [
  {
    id: 'elegant-purple',
    name: 'Púrpura Elegante',
    description: 'Sofisticado y moderno',
    theme: {
      primaryColor: '#6b46c1',
      secondaryColor: '#8b5cf6',
      textColor: '#ffffff',
      backgroundColor: '#1e1b4b',
      fontFamily: 'Poppins',
    },
    preview: {
      primary: '#6b46c1',
      secondary: '#8b5cf6',
      background: '#1e1b4b',
    },
  },
  {
    id: 'ocean-blue',
    name: 'Azul Océano',
    description: 'Fresco y confiable',
    theme: {
      primaryColor: '#0ea5e9',
      secondaryColor: '#38bdf8',
      textColor: '#ffffff',
      backgroundColor: '#0c4a6e',
      fontFamily: 'Inter',
    },
    preview: {
      primary: '#0ea5e9',
      secondary: '#38bdf8',
      background: '#0c4a6e',
    },
  },
  {
    id: 'forest-green',
    name: 'Verde Bosque',
    description: 'Natural y orgánico',
    theme: {
      primaryColor: '#059669',
      secondaryColor: '#10b981',
      textColor: '#ffffff',
      backgroundColor: '#064e3b',
      fontFamily: 'Lato',
    },
    preview: {
      primary: '#059669',
      secondary: '#10b981',
      background: '#064e3b',
    },
  },
  {
    id: 'sunset-orange',
    name: 'Naranja Atardecer',
    description: 'Cálido y energético',
    theme: {
      primaryColor: '#ea580c',
      secondaryColor: '#fb923c',
      textColor: '#ffffff',
      backgroundColor: '#9a3412',
      fontFamily: 'Montserrat',
    },
    preview: {
      primary: '#ea580c',
      secondary: '#fb923c',
      background: '#9a3412',
    },
  },
  {
    id: 'rose-gold',
    name: 'Rosa Dorado',
    description: 'Femenino y lujoso',
    theme: {
      primaryColor: '#e11d48',
      secondaryColor: '#f43f5e',
      textColor: '#ffffff',
      backgroundColor: '#881337',
      fontFamily: 'Playfair Display',
    },
    preview: {
      primary: '#e11d48',
      secondary: '#f43f5e',
      background: '#881337',
    },
  },
  {
    id: 'midnight-black',
    name: 'Negro Medianoche',
    description: 'Elegante y premium',
    theme: {
      primaryColor: '#374151',
      secondaryColor: '#6b7280',
      textColor: '#ffffff',
      backgroundColor: '#111827',
      fontFamily: 'Inter',
    },
    preview: {
      primary: '#374151',
      secondary: '#6b7280',
      background: '#111827',
    },
  },
  {
    id: 'golden-luxury',
    name: 'Dorado Lujo',
    description: 'Exclusivo y premium',
    theme: {
      primaryColor: '#d97706',
      secondaryColor: '#f59e0b',
      textColor: '#ffffff',
      backgroundColor: '#78350f',
      fontFamily: 'Playfair Display',
    },
    preview: {
      primary: '#d97706',
      secondary: '#f59e0b',
      background: '#78350f',
    },
  },
  {
    id: 'coral-pink',
    name: 'Rosa Coral',
    description: 'Fresco y moderno',
    theme: {
      primaryColor: '#f97316',
      secondaryColor: '#fb923c',
      textColor: '#ffffff',
      backgroundColor: '#c2410c',
      fontFamily: 'Poppins',
    },
    preview: {
      primary: '#f97316',
      secondary: '#fb923c',
      background: '#c2410c',
    },
  },
];