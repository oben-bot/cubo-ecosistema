import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCatalogFile, updateCatalogFile, deleteCatalogFile } from '@/lib/drive/driveClient';

async function requireAccessToken() {
  const session = await getServerSession(authOptions);
  const accessToken = (session as any)?.accessToken;
  if (!accessToken) throw new Error('No autenticado con Google');
  return accessToken as string;
}

export async function GET(_req: NextRequest, { params }: { params: { fileId: string } }) {
  try {
    const accessToken = await requireAccessToken();
    const data = await getCatalogFile(accessToken, params.fileId);
    return NextResponse.json({ catalog: { ...(data as object), id: params.fileId } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 404 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { fileId: string } }) {
  try {
    const accessToken = await requireAccessToken();
    const body = await req.json();
    await updateCatalogFile(accessToken, params.fileId, body);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { fileId: string } }) {
  try {
    const accessToken = await requireAccessToken();
    await deleteCatalogFile(accessToken, params.fileId);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
