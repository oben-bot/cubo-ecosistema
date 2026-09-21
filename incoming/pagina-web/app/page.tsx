import { Hero } from "@/components/Hero";
import { QuickAccess } from "@/components/QuickAccess";
import { Catalog } from "@/components/Catalog";
import { About } from "@/components/About";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-base">
      <Hero />
      <QuickAccess />
      <Catalog />
      <About />
      <Footer />
    </main>
  );
}
