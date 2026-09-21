'use client';

import { useEffect, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { SiteConfig } from '@/types/siteConfig';

export default function AdminSitePage() {
  const { data: session, status } = useSession();
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publicUrl, setPublicUrl] = useState('');

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/drive/site-config')
      .then((r) => r.json())
      .then((data) => {
        setConfig(data.siteConfig);
        setPublicUrl(`${window.location.origin}/site/${data.siteConfig.id}`);
        setLoading(false);
      });
  }, [status]);

  const guardar = async () => {
    if (!config) return;
    setSaving(true);
    await fetch('/api/drive/site-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    setSaving(false);
  };

  if (status === 'loading') return <div className="p-8">Cargando...</div>;

  if (status !== 'authenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <button
          onClick={() => signIn('google')}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold"
        >
          Iniciar sesión con Google para administrar
        </button>
      </div>
    );
  }

  if (loading || !config) return <div className="p-8">Cargando configuración...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold">Editar mi página de enlaces</h1>
          <span className="text-sm text-gray-500">{session?.user?.email}</span>
        </div>

        {publicUrl && (
          <div className="bg-blue-50 text-blue-800 text-sm p-3 rounded mb-6">
            Link público (compártelo con tus clientes):{' '}
            <a href={publicUrl} target="_blank" className="underline font-medium">
              {publicUrl}
            </a>
          </div>
        )}

        <label className="block text-sm font-medium mb-1">Nombre del negocio</label>
        <input
          className="w-full border rounded px-3 py-2 mb-4"
          value={config.businessName}
          onChange={(e) => setConfig({ ...config, businessName: e.target.value })}
        />

        <label className="block text-sm font-medium mb-1">Descripción corta</label>
        <input
          className="w-full border rounded px-3 py-2 mb-4"
          value={config.tagline}
          onChange={(e) => setConfig({ ...config, tagline: e.target.value })}
        />

        <label className="block text-sm font-medium mb-1">Ubicación</label>
        <input
          className="w-full border rounded px-3 py-2 mb-6"
          value={config.location}
          onChange={(e) => setConfig({ ...config, location: e.target.value })}
        />

        <h2 className="font-semibold mb-2">Enlaces</h2>
        {config.links.map((link, i) => (
          <div key={link.id} className="flex gap-2 mb-2">
            <input
              className="border rounded px-2 py-1 w-1/3"
              value={link.label}
              onChange={(e) => {
                const links = [...config.links];
                links[i] = { ...link, label: e.target.value };
                setConfig({ ...config, links });
              }}
            />
            <input
              className="border rounded px-2 py-1 flex-1"
              placeholder="https://..."
              value={link.url}
              onChange={(e) => {
                const links = [...config.links];
                links[i] = { ...link, url: e.target.value };
                setConfig({ ...config, links });
              }}
            />
            <button
              className="text-red-600 text-sm"
              onClick={() => setConfig({ ...config, links: config.links.filter((l) => l.id !== link.id) })}
            >
              Quitar
            </button>
          </div>
        ))}
        <button
          className="text-sm text-blue-600 mb-6"
          onClick={() =>
            setConfig({
              ...config,
              links: [...config.links, { id: crypto.randomUUID(), label: 'Nuevo enlace', url: '', icon: 'custom' }],
            })
          }
        >
          + Agregar enlace
        </button>

        <button
          onClick={guardar}
          disabled={saving}
          className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
}
