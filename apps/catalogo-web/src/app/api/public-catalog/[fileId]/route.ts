import { NextRequest, NextResponse } from 'next/server';

/**
 * Ruta PÚBLICA (a propósito, sin getServerSession): el cliente final que
 * abre el link/QR del catálogo NO tiene cuenta de Google ni sesión con
 * nosotros. El archivo en Drive ya está marcado como "anyone/reader",
 * así que solo hace falta pedirlo por su URL pública - sin token.
 *
 * Se hace desde el servidor (no directo desde el navegador del cliente)
 * para evitar problemas de CORS con drive.google.com.
 */
export async function GET(_req: NextRequest, { params }: { params: { fileId: string } }) {
  try {
    const url = `https://drive.google.com/uc?export=download&id=${params.fileId}`;
    const res = await fetch(url);

    if (!res.ok) {
      return NextResponse.json({ error: 'Catálogo no encontrado' }, { status: 404 });
    }

    const text = await res.text();
    const catalog = JSON.parse(text);
    return NextResponse.json({ catalog: { ...catalog, id: params.fileId } });
  } catch (err) {
    return NextResponse.json({ error: 'Catálogo no encontrado o no disponible públicamente' }, { status: 404 });
  }
}
