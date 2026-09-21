import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  findSiteConfigFile,
  createSiteConfigFile,
  updateSiteConfigFile,
  getSiteConfigFile,
} from '@/lib/drive/driveClient';
import { emptySiteConfig } from '@/types/siteConfig';

async function requireAccessToken() {
  const session = await getServerSession(authOptions);
  const accessToken = (session as any)?.accessToken;
  if (!accessToken) throw new Error('No autenticado');
  return accessToken as string;
}

export async function GET() {
  try {
    const accessToken = await requireAccessToken();
    let fileId = await findSiteConfigFile(accessToken);

    if (!fileId) {
      // Primera vez: se crea con valores por defecto para que el dueño
      // solo tenga que editar, no partir de cero.
      fileId = await createSiteConfigFile(accessToken, emptySiteConfig());
    }

    const data = await getSiteConfigFile(accessToken, fileId);
    return NextResponse.json({ siteConfig: { ...(data as object), id: fileId } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const accessToken = await requireAccessToken();
    const body = await req.json();
    let fileId = await findSiteConfigFile(accessToken);

    if (!fileId) {
      fileId = await createSiteConfigFile(accessToken, body);
    } else {
      await updateSiteConfigFile(accessToken, fileId, body);
    }

    return NextResponse.json({ success: true, id: fileId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
