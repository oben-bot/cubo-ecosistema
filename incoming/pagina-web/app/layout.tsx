import type { Metadata } from "next";
import "./globals.css";

// Se cargan por <link> (no next/font/google) porque el entorno de build
// de esta sesión no tiene salida a fonts.googleapis.com. Netlify sí la
// tendrá, así que esto funciona igual en producción; si más adelante
// quieres optimizarlo con next/font, basta con cambiar este bloque.

export const metadata: Metadata = {
  title: "CatPy — El Cubo de Madera",
  description:
    "Diseños de corte láser hechos a medida. Catálogo, piezas y encargos del taller CatPy.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body">{children}</body>
    </html>
  );
}
