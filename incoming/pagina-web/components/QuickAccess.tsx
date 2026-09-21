const socials = [
  { name: "TikTok", href: "https://tiktok.com", handle: "@catpy" },
  { name: "Instagram", href: "https://instagram.com", handle: "@catpy" },
];

export function QuickAccess() {
  return (
    <section className="px-6 py-10 md:py-14">
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-3 md:grid-rows-2">
        {/* Bloque grande: Gumroad */}
        <a
          href="https://gumroad.com"
          className="group relative col-span-1 row-span-2 flex flex-col justify-end overflow-hidden rounded-3xl border border-white/5 bg-surface p-8 transition-colors hover:border-amber/40 md:col-span-2"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-amber/0 blur-3xl transition-colors duration-500 group-hover:bg-amber/20"
          />
          <span className="text-sm text-silver-dim">Pieza destacada</span>
          <h3 className="mt-2 font-display text-2xl font-semibold text-silver md:text-3xl">
            Compra directa en Gumroad
          </h3>
          <p className="mt-2 max-w-sm text-sm text-silver-dim">
            Diseños digitales y piezas listas para pedir, con entrega y pago
            gestionados ahí mismo.
          </p>
          <span className="mt-5 inline-flex w-fit items-center gap-1 rounded-full bg-amber/10 px-4 py-2 text-sm font-medium text-amber transition-colors group-hover:bg-amber group-hover:text-[#0A0E13]">
            Ir a la tienda →
          </span>
        </a>

        {/* Bloque mediano: catálogo */}
        <a
          href="#catalogo"
          className="group flex flex-col justify-between rounded-3xl border border-white/5 bg-surface p-6 transition-colors hover:border-blue/40"
        >
          <span className="text-sm text-silver-dim">Explora</span>
          <div>
            <h3 className="font-display text-xl font-semibold text-silver">
              Catálogo completo
            </h3>
            <p className="mt-1 text-sm text-silver-dim">
              Todas las piezas del taller, por categoría.
            </p>
          </div>
        </a>

        {/* Bloques pequeños: redes */}
        <div className="grid grid-cols-2 gap-4">
          {socials.map((s) => (
            <a
              key={s.name}
              href={s.href}
              className="flex flex-col items-center justify-center gap-1 rounded-3xl border border-white/5 bg-surface p-5 text-center transition-colors hover:border-silver/30"
            >
              <span className="font-display text-sm font-semibold text-silver">
                {s.name}
              </span>
              <span className="text-xs text-silver-dim">{s.handle}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
