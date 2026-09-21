import { Logo } from "./Logo";

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pt-16 pb-20 md:pt-24 md:pb-28">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-teal/60 blur-[110px]"
      />
      <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center reveal">
        <div className="mb-8 drop-shadow-[0_0_30px_rgba(62,111,242,0.35)]">
          <Logo size={72} />
        </div>
        <h1 className="font-display text-4xl font-semibold leading-tight text-silver md:text-6xl">
          Piezas de madera cortadas con precisión de láser
        </h1>
        <p className="mt-5 max-w-xl text-balance text-base text-silver-dim md:text-lg">
          CatPy es el taller digital de El Cubo de Madera: diseños propios,
          cortes a medida y piezas listas para regalar o decorar.
        </p>
        <a
          href="#catalogo"
          className="group mt-9 inline-flex items-center gap-2 rounded-full bg-amber px-7 py-3 font-medium text-[#0A0E13] shadow-glow transition-transform hover:scale-[1.03]"
        >
          Ver catálogo
        </a>
      </div>
    </section>
  );
}
