import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="border-t border-white/5 px-6 py-10">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 text-center md:flex-row md:justify-between md:text-left">
        <div className="flex items-center gap-3">
          <Logo size={32} />
          <span className="font-display text-sm font-semibold text-silver">
            CatPy
          </span>
        </div>
        <div className="flex gap-5 text-sm text-silver-dim">
          <a href="https://gumroad.com" className="hover:text-silver">Gumroad</a>
          <a href="https://tiktok.com" className="hover:text-silver">TikTok</a>
          <a href="https://instagram.com" className="hover:text-silver">Instagram</a>
        </div>
        <span className="text-xs text-silver-dim">
          © {new Date().getFullYear()} El Cubo de Madera
        </span>
      </div>
    </footer>
  );
}
