import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { listCatalogFiles, createCatalogFile, getCatalogFile } from '@/lib/drive/driveClient';

async function requireAccessToken() {
  const session = await getServerSession(authOptions);
  const accessToken = (session as any)?.accessToken;
  if (!accessToken) throw new Error('No autenticado con Google');
  return accessToken as string;
}

export async function GET() {
  try {
    const accessToken = await requireAccessToken();
    const files = await listCatalogFiles(accessToken);

    // Traer el contenido de cada catálogo (nombre, cantidad de productos, etc.)
    const catalogs = await Promise.all(
      files.map(async (f) => {
        try {
          const data = await getCatalogFile(accessToken, f.id!);
          return { ...(data as object), id: f.id };
        } catch {
          return null;
        }
      })
    );

    return NextResponse.json({ catalogs: catalogs.filter(Boolean) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const accessToken = await requireAccessToken();
    const body = await req.json();

    const fileId = await createCatalogFile(accessToken, { ...body, createdAt: new Date() });
    const catalog = { ...body, id: fileId };

    // Persistimos el id real dentro del propio archivo también, para
    // que quede consistente si alguien lo lee directo desde Drive.
    return NextResponse.json({ catalog });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
