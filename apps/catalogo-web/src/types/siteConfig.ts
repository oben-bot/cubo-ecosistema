export interface SiteLink {
  id: string;
  label: string;
  url: string;
  icon: string; // nombre simple: 'whatsapp' | 'instagram' | 'facebook' | 'catalog' | 'custom'
}

export interface SiteConfig {
  id: string; // ID del archivo en Drive - también es el ID público para compartir
  businessName: string;
  tagline: string;
  location: string;
  links: SiteLink[];
  updatedAt?: string;
}

export const emptySiteConfig = (): Omit<SiteConfig, 'id'> => ({
  businessName: 'El Cubo de Madera',
  tagline: 'Diseños personalizados en madera, corte láser',
  location: 'San Luis Potosí, México',
  links: [
    { id: crypto.randomUUID?.() || 'catalog', label: 'Ver catálogo', url: '', icon: 'catalog' },
    { id: crypto.randomUUID?.() || 'whatsapp', label: 'WhatsApp', url: '', icon: 'whatsapp' },
    { id: crypto.randomUUID?.() || 'instagram', label: 'Instagram', url: '', icon: 'instagram' },
    { id: crypto.randomUUID?.() || 'facebook', label: 'Facebook', url: '', icon: 'facebook' },
  ],
});
