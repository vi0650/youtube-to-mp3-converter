import { useEffect, useState } from "react";
import { cn } from "../../lib/utils";

const Meteors = ({ number = 10 }: { number?: number }) => {
  const [meteorStyles, setMeteorStyles] = useState<Array<React.CSSProperties>>([]);

  useEffect(() => {
    const styles = [...new Array(number)].map(() => ({
      top: -5,
      left: Math.floor(Math.random() * 100) + "%",
      animationDelay: Math.random() * (0.8 - 0.2) + 0.2 + "s",
      animationDuration: Math.floor(Math.random() * (10 - 2) + 2) + "s",
    }));
    setMeteorStyles(styles);
  }, [number]);

  return (
    <>
      {meteorStyles.map((style, idx) => (
        <span
          key={idx}
          className="animate-meteor-effect absolute h-px w-px rounded-[9999px] bg-white opacity-20 shadow-[0_0_0_1px_#ffffff10] rotate-[215deg] before:content-[''] before:absolute before:top-1/2 before:w-[50px] before:h-[1px] before:bg-gradient-to-r before:from-white/20 before:to-transparent"
          style={style}
        ></span>
      ))}
    </>
  );
};

export const RetroGrid = ({ className }: { className?: string }) => {
  return (
    <div
      className={cn(
        "pointer-events-none absolute h-full w-full overflow-hidden opacity-30 [perspective:200px]",
        className
      )}
    >
      {/* Grid */}
      <div className="absolute inset-0 [transform:rotateX(35deg)]">
        <div
          className={cn(
            "animate-grid",
            "[background-repeat:repeat] [background-size:60px_60px] [height:300vh] [inset:0%_0px] [margin-left:-50%] [transform-origin:100%_0_0] [width:200vw]",
            "[background-image:linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_0),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_0)]"
          )}
        />
      </div>

      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent to-90%" />
    </div>
  );
};

export const LiveBackground = () => {
    return (
        <div className="fixed inset-0 z-0 h-full w-full bg-black overflow-hidden pointer-events-none">
            {/* Soft Glowing Orbs */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-white/5 blur-[120px] rounded-full" />
            <div className="absolute bottom-[10%] right-[-10%] w-[30%] h-[30%] bg-white/5 blur-[100px] rounded-full" />
            
            <RetroGrid />
            <Meteors number={15} />
            
            {/* Center Glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_600px_at_50%_40%,rgba(100,100,100,0.05),transparent)]" />
        </div>
    );
};
