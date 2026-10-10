import { SplineScene } from "@/components/ui/splite";
import { Card } from "@/components/ui/card";
import { Spotlight } from "@/components/ui/spotlight";
import { Sparkles, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export function SplineShowcase() {
  return (
    <section className="py-20 px-4 md:px-8 max-w-6xl mx-auto relative z-10">
      <Card className="w-full min-h-[500px] bg-zinc-950 text-white relative overflow-hidden border-4 border-black dark:border-zinc-700 shadow-[10px_10px_0_0_#000] dark:shadow-[10px_10px_0_0_#FFE600] rounded-3xl">
        <Spotlight
          className="-top-40 left-0 md:left-60 md:-top-20"
          size={350}
        />
        
        <div className="flex flex-col lg:flex-row h-full min-h-[500px]">
          {/* Left content */}
          <div className="flex-1 p-8 md:p-12 relative z-10 flex flex-col justify-center space-y-6">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-[#FFE600] text-black font-black text-xs uppercase tracking-wider border-2 border-black shadow-[2px_2px_0_0_#000]">
                ✦ 3D INTERACTIVO
              </span>
              <span className="text-xs font-bold text-zinc-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#00E5FF]" /> Arrastrá la escena 3D
              </span>
            </div>

            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white via-zinc-100 to-zinc-400">
              EL UNIVERSO TABE EN 3D
            </h2>

            <p className="text-zinc-300 font-medium text-sm md:text-base leading-relaxed max-w-lg">
              Interactuá con la experiencia tridimensional de aprendizaje: herramientas conectadas, sincronización en la nube y visualización espacial de tus objetivos universitarios.
            </p>

            <div className="pt-2">
              <Link
                to="/registro"
                data-cursor-text="PROBAR"
                className="inline-flex items-center gap-3 px-8 py-4 bg-[#00E5FF] text-black font-black text-sm uppercase tracking-wider rounded-xl border-3 border-black shadow-[4px_4px_0_0_#fff] hover:bg-white transition-all"
              >
                <span>Explorar la app</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Right 3D Spline Canvas */}
          <div className="flex-1 relative min-h-[350px] lg:min-h-full">
            <SplineScene 
              scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
              className="w-full h-full min-h-[350px]"
            />
          </div>
        </div>
      </Card>
    </section>
  );
}
