import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

const Aurora = ({ className }: { className?: string }) => {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden opacity-50 mix-blend-screen",
        className
      )}
    >
      <div className="absolute -inset-[10px] opacity-50">
        <motion.div
          animate={{
            transform: [
              "translate(0, 0)",
              "translate(20%, 10%)",
              "translate(-10%, 20%)",
              "translate(10%, -10%)",
              "translate(0, 0)",
            ],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-[radial-gradient(circle_at_50%_50%,rgba(0,255,150,0.15),transparent_50%)] blur-[100px]"
        />
        <motion.div
          animate={{
            transform: [
              "translate(0, 0)",
              "translate(-20%, -10%)",
              "translate(10%, -20%)",
              "translate(-10%, 10%)",
              "translate(0, 0)",
            ],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[160%] h-[160%] bg-[radial-gradient(circle_at_50%_50%,rgba(0,180,255,0.15),transparent_60%)] blur-[120px]"
        />
        <motion.div
          animate={{
            transform: [
              "translate(0, 0)",
              "translate(10%, -20%)",
              "translate(-20%, 10%)",
              "translate(20%, -10%)",
              "translate(0, 0)",
            ],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%] bg-[radial-gradient(circle_at_50%_50%,rgba(180,50,255,0.1),transparent_50%)] blur-[100px]"
        />
      </div>
    </div>
  );
};

export const LiveBackground = () => {
  return (
    <div className="fixed inset-0 z-0 h-full w-full bg-black overflow-hidden pointer-events-none">
      <Aurora />
      
      {/* Dynamic scanlines for retro feel but subtle */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(0,0,0,0.1)_50%,transparent_100%)] bg-[length:100%_4px] opacity-20" />
      
      {/* Center Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_40%,rgba(255,255,255,0.03),transparent)]" />
      
      {/* Noise layer */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} 
      />
    </div>
  );
};

