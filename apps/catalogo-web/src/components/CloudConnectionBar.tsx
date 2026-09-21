'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { Cloud, CloudOff, LogOut } from 'lucide-react';

export default function CloudConnectionBar() {
  const { data: session, status } = useSession();
  const isConnected = status === 'authenticated';

  if (status === 'loading') {
    return (
      <div className="bg-gray-800 text-gray-300 text-sm px-4 py-2 text-center">
        Verificando conexión...
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className="bg-green-700 text-white text-sm px-4 py-2 flex items-center justify-center gap-3">
        <Cloud size={16} />
        <span>
          Conectado a Google Drive como <strong>{session.user?.email}</strong> — tus catálogos se
          guardan en tu propia cuenta.
        </span>
        <button
          onClick={() => signOut()}
          className="flex items-center gap-1 underline hover:no-underline ml-2"
        >
          <LogOut size={14} /> Desconectar
        </button>
      </div>
    );
  }

  return (
    <div className="bg-amber-600 text-white text-sm px-4 py-2 flex items-center justify-center gap-3">
      <CloudOff size={16} />
      <span>
        Modo local (demo) — tus catálogos solo se guardan en este navegador y no podrán verse
        desde otros dispositivos.
      </span>
      <button
        onClick={() => signIn('google')}
        className="bg-white text-amber-700 font-semibold px-3 py-1 rounded hover:bg-amber-50"
      >
        Conectar Google Drive
      </button>
    </div>
  );
}
