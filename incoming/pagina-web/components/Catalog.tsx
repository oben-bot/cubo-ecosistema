export type Product = {
  id: string;
  name: string;
  price: string;
  category: string;
  href: string;
};

// Datos de ejemplo — este arreglo es el punto donde, más adelante,
// Cubo Manager exportará los productos "listos para publicar".
const products: Product[] = [
  { id: "1", name: "Organizador de escritorio", price: "$249", category: "Hogar", href: "#" },
  { id: "2", name: "Set de posavasos geométricos", price: "$149", category: "Hogar", href: "#" },
  { id: "3", name: "Letrero personalizado", price: "$199", category: "Decoración", href: "#" },
  { id: "4", name: "Rompecabezas de madera", price: "$179", category: "Regalos", href: "#" },
  { id: "5", name: "Marco de foto grabado", price: "$129", category: "Regalos", href: "#" },
  { id: "6", name: "Caja de recuerdos", price: "$299", category: "Decoración", href: "#" },
];

export function Catalog() {
  return (
    <section id="catalogo" className="px-6 py-16 md:py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <span className="text-sm text-silver-dim">Catálogo</span>
            <h2 className="mt-1 font-display text-3xl font-semibold text-silver md:text-4xl">
              Piezas del taller
            </h2>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {products.map((p) => (
            <a
              key={p.id}
              href={p.href}
              className="group flex flex-col overflow-hidden rounded-2xl border border-white/5 bg-surface transition-colors hover:border-blue/40"
            >
              <div className="aspect-square w-full bg-surface2" />
              <div className="flex flex-1 flex-col gap-1 p-4">
                <span className="text-xs text-silver-dim">{p.category}</span>
                <h3 className="font-display text-sm font-semibold text-silver">
                  {p.name}
                </h3>
                <span className="mt-auto pt-2 text-sm font-medium text-amber">
                  {p.price}
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
