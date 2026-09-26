# Licencias de tipografias incluidas

Este proyecto incluye tipografias con licencia libre que permiten uso comercial.

## 1. DejaVu Sans Bold (principal v2)
- **Archivo:** `DejaVuSans-Bold.ttf` (y fallback `/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf`)
- **Id:** `dejavu-sans-bold`
- **Autor:** DejaVu Project (derivada de Bitstream Vera, con aportes Arev)
- **Licencia:** Bitstream Vera + Arev + DejaVu — licencia libre permisiva, permite uso comercial, distribucion y uso en productos. Ver https://dejavu-fonts.github.io/License.html
- **Uso:** Sans bold muy legible, trazo grueso, soldadura excelente con solapamiento 15%. Es la fuente principal para v2 porque su contorno exterior tiene area negativa (criterio documentado) y funciona con opentype.js@1.2.1.
- **Nota tecnica:** DejaVu exterior area negativa, interior (huecos) positiva. opentype.js@1.2.1 parsea correctamente; 2.0.0 rompe.

## 2. DejaVu Sans Regular
- **Archivo:** `DejaVuSans.ttf`
- **Id:** `dejavu-sans`
- **Autor:** DejaVu Project
- **Licencia:** Bitstream Vera + Arev + DejaVu (libre)
- **Uso:** Sans regular, para pruebas de soldadura con fuentes menos negritas.

## 3. Anton Regular
- **Archivo:** `anton-latin-400-normal.woff`
- **Id:** `anton`
- **Autor:** The Anton Project Authors (https://github.com/googlefonts/AntonFont)
- **Licencia:** SIL Open Font License 1.1 (https://scripts.sil.org/OFL)
- **Uso:** Display muy negrita, ideal para corte laser.

## 4. Oswald Bold
- **Archivo:** `oswald-latin-700-normal.woff`
- **Id:** `oswald-bold`
- **Autor:** The Oswald Project Authors (https://github.com/googlefonts/OswaldFont)
- **Licencia:** SIL Open Font License 1.1
- **Uso:** Grotesca condensada, buen equilibrio.

## 5. Bebas Neue Regular
- **Archivo:** `bebas-neue-latin-400-normal.woff`
- **Id:** `bebas-neue`
- **Autor:** The Bebas Neue Project Authors (https://github.com/dharmatype/Bebas-Neue)
- **Licencia:** SIL Open Font License 1.1
- **Uso:** Condensada alta, popular para letreros.

## Verificacion de licencia
Todas permiten:
- Uso comercial
- Distribucion
- Modificacion
- Uso en productos fisicos y digitales

No requieren atribucion en el producto final, pero se documentan aqui por transparencia.
OFL 1.1 completa en node_modules/@fontsource/*, DejaVu license en https://dejavu-fonts.github.io/License.html

## Notas de entrega v2
- Stack v2: opentype.js@1.2.1 (no 2.0.0, rompe con DejaVu) + clipper2-js@1.2.4
- Criterio area negativa para contorno exterior DejaVu (y Anton/Oswald/Bebas) verificado con test_area.
- Soldadura: HOLA con dejavu-sans-bold y solapamiento 0.15 => 3 poligonos (1 exterior + 2 huecos O y A) = una sola region, OK.
- Filtrado de artefactos de area <0.01 mm2 de clipper2-js necesario.
