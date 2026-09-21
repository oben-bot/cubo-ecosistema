'use client';

import { Instagram, Facebook } from 'lucide-react';
import { motion } from 'framer-motion';

interface SocialMediaLinksProps {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
}

export default function SocialMediaLinks({ instagram, facebook, tiktok }: SocialMediaLinksProps) {
  const socialLinks = [
    { name: 'Instagram', url: instagram, icon: Instagram, color: 'bg-pink-500' },
    { name: 'Facebook', url: facebook, icon: Facebook, color: 'bg-blue-600' },
    { name: 'TikTok', url: tiktok, icon: '🎵', color: 'bg-black' },
  ].filter(link => link.url);

  if (socialLinks.length === 0) return null;

  return (
    <div className="flex justify-center gap-4 py-6">
      {socialLinks.map((social, index) => {
        const Icon = social.icon;
        
        return (
          <motion.a
            key={social.name}
            href={social.url}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className={`${social.color} text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all`}
            title={`Seguinos en ${social.name}`}
          >
            {typeof Icon === 'string' ? (
              <span className="text-xl">{Icon}</span>
            ) : (
              <Icon size={20} />
            )}
          </motion.a>
        );
      })}
    </div>
  );
}