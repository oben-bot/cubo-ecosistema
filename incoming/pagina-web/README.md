# CatPy — Página web

Sitio Next.js + Tailwind del taller (hero, accesos bento a Gumroad/TikTok/Instagram,
catálogo con datos de ejemplo, sección "sobre el taller" y footer). Construido
según el brief de diseño: dark mode, acentos dirigidos (ámbar como único CTA),
tipografía Space Grotesk + Inter, mobile-first.

## Pendiente antes de publicar

- **Logo real**: `components/Logo.tsx` tiene un SVG placeholder fiel a la
  descripción de marca (insignia hexagonal, gato, monograma CP). Reemplázalo
  por el archivo real del logo "CatPy" cuando lo tengas a mano.
- **Datos del catálogo**: `components/Catalog.tsx` tiene productos de ejemplo
  en el arreglo `products`. Ese es el punto exacto donde, más adelante,
  Cubo Manager exportará los productos reales.
- **Links de redes**: los `href` de Gumroad/TikTok/Instagram están como
  placeholder (`gumroad.com`, `tiktok.com`, `instagram.com`) — cámbialos por
  tus URLs reales.

## Subir al repositorio (oben-bot/Pagina-web)

Desde la carpeta del proyecto:

```bash
git init
git add .
git commit -m "Sitio inicial CatPy: hero, bento, catálogo, footer"
git branch -M main
git remote add origin https://github.com/oben-bot/Pagina-web.git
git push -u origin main
```

## Conectar con Netlify

1. En Netlify, "Add new site" → "Import an existing project" → GitHub →
   selecciona `oben-bot/Pagina-web`.
2. Build command: `npm run build` — Publish directory: `.next`
   (Netlify detecta Next.js automáticamente y configura esto solo).
3. Deploy. Netlify te da la URL antes de conectar el dominio propio de marca.

## Desarrollo local

```bash
npm install
npm run dev
```
