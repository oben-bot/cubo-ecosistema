'use client';

import { useSession } from 'next-auth/react';
import { useMemo } from 'react';
import { StorageProvider } from './types';
import { LocalStorageProvider } from './localStorageProvider';
import { GoogleDriveProvider } from './googleDriveProvider';

const localProvider = new LocalStorageProvider();
const driveProvider = new GoogleDriveProvider();

/**
 * Devuelve el proveedor de almacenamiento activo:
 * - Si el usuario inició sesión con Google -> Google Drive (modo real/producción)
 * - Si no -> almacenamiento local del navegador (modo demo, sin necesidad de cuenta)
 *
 * El resto de la app usa este hook y nunca necesita saber cuál de los
 * dos está activo.
 */
export function useStorageProvider(): { provider: StorageProvider; isCloudConnected: boolean } {
  const { data: session, status } = useSession();

  return useMemo(() => {
    const isCloudConnected = status === 'authenticated' && !!(session as any)?.accessToken;
    return {
      provider: isCloudConnected ? driveProvider : localProvider,
      isCloudConnected,
    };
  }, [session, status]);
}
