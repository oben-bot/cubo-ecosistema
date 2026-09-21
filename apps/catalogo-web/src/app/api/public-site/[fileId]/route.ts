import { NextRequest, NextResponse } from 'next/server';

export async function GET(_req: NextRequest, { params }: { params: { fileId: string } }) {
  try {
    const url = `https://drive.google.com/uc?export=download&id=${params.fileId}`;
    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json({ error: 'Sitio no encontrado' }, { status: 404 });
    }
    const text = await res.text();
    const siteConfig = JSON.parse(text);
    return NextResponse.json({ siteConfig: { ...siteConfig, id: params.fileId } });
  } catch {
    return NextResponse.json({ error: 'Sitio no encontrado' }, { status: 404 });
  }
}
