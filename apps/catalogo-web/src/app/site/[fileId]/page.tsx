'use client';

import { useEffect, useState } from 'react';
import { SiteConfig } from '@/types/siteConfig';

const iconMap: Record<string, string> = {
  catalog: '🛒',
  whatsapp: '📱',
  instagram: '📷',
  facebook: '👍',
  custom: '🔗',
};

export default function PublicSitePage({ params }: { params: { fileId: string } }) {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/public-site/${params.fileId}`)
      .then((r) => {
        if (!r.ok) throw new Error('not found');
        return r.json();
      })
      .then((data) => setConfig(data.siteConfig))
      .catch(() => setNotFound(true));
  }, [params.fileId]);

  if (notFound) {
    return <div className="min-h-screen flex items-center justify-center">Página no encontrada</div>;
  }

  if (!config) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center px-6 py-12">
      <h1 className="text-3xl font-bold mb-2">{config.businessName}</h1>
      <p className="text-gray-400 mb-8 text-center">{config.tagline}</p>

      <div className="w-full max-w-sm flex flex-col gap-4">
        {config.links
          .filter((l) => l.url)
          .map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl py-4 px-6 text-center font-semibold transition"
            >
              {iconMap[link.icon] || '🔗'} {link.label}
            </a>
          ))}
      </div>

      {config.location && <p className="text-gray-500 text-sm mt-10">{config.location}</p>}
    </div>
  );
}
