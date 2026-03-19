import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

interface LiveBackgroundProps {
  appearance?: "light" | "dark";
}

const MeshGradient = ({ appearance = "dark" }: { appearance?: "light" | "dark" }) => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className={cn(
        "absolute inset-0 transition-opacity duration-1000",
        appearance === "dark" ? "opacity-60" : "opacity-40"
      )}>
        <motion.div
            animate={{
              x: ["0%", "50%", "-20%", "0%"],
              y: ["0%", "30%", "60%", "0%"],
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className={cn(
              "absolute top-[-10%] left-[-10%] w-[100%] h-[100%] rounded-full blur-[120px] mix-blend-screen",
              appearance === "dark" ? "bg-indigo-900/60" : "bg-blue-200/50"
            )}
        />
        <motion.div
            animate={{
              x: ["0%", "-40%", "20%", "0%"],
              y: ["0%", "50%", "-20%", "0%"],
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className={cn(
              "absolute top-[20%] right-[-10%] w-[90%] h-[90%] rounded-full blur-[140px] mix-blend-screen",
              appearance === "dark" ? "bg-purple-900/40" : "bg-purple-100/50"
            )}
        />
        <motion.div
            animate={{
              x: ["0%", "30%", "-50%", "0%"],
              y: ["0%", "-40%", "20%", "0%"],
            }}
            transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
            className={cn(
              "absolute bottom-[-10%] left-[10%] w-[80%] h-[80%] rounded-full blur-[110px] mix-blend-screen",
              appearance === "dark" ? "bg-cyan-900/30" : "bg-teal-50/60"
            )}
        />
      </div>
      
      {/* Noise Texture */}
      <div className={cn(
        "absolute inset-0 opacity-[0.04] pointer-events-none mix-blend-overlay",
        appearance === "dark" ? "invert" : ""
      )} style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
    </div>
  );
};

export const LiveBackground = ({ appearance = "dark" }: LiveBackgroundProps) => {
  return (
    <div className={cn(
      "fixed inset-0 z-0 h-full w-full overflow-hidden pointer-events-none transition-colors duration-1000",
      appearance === "dark" ? "bg-[#030612]" : "bg-[#f8fafc]"
    )}>
      {/* Base Grid Pattern */}
      <div className={cn(
        "absolute inset-0 transition-opacity duration-1000",
        appearance === "dark" ? "opacity-[0.03]" : "opacity-[0.05]"
      )} style={{ backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`, backgroundSize: '40px 40px' }} />

      <MeshGradient appearance={appearance} />
      
      {/* Dynamic Overlay Shading */}
      <div className={cn(
        "absolute inset-0 pointer-events-none transition-colors duration-1000",
        appearance === "dark" 
          ? "bg-gradient-to-b from-[#030612]/20 via-transparent to-[#030612]/80"
          : "bg-gradient-to-b from-white/10 via-transparent to-slate-200/30"
      )} />
    </div>
  );
};

