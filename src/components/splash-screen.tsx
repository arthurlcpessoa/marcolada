import { useEffect, useState } from "react";
import logoAsset from "@/assets/marcolada-logo.png.asset.json";

const KEY = "marcolada:splash-seen";

export function SplashScreen() {
  const [show, setShow] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(KEY)) return;
    sessionStorage.setItem(KEY, "1");
    setShow(true);
    const t1 = setTimeout(() => setLeaving(true), 1700);
    const t2 = setTimeout(() => setShow(false), 2300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (!show) return null;

  return (
    <div
      aria-hidden
      className="hero-blue fixed inset-0 z-[100] grid place-items-center"
      style={{
        opacity: leaving ? 0 : 1,
        transform: leaving ? "scale(1.06)" : "scale(1)",
        transition: "opacity 600ms ease, transform 600ms ease",
      }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <span className="splash-ring absolute top-1/2 left-1/2 h-40 w-40 rounded-full border border-white/25" />
        <span className="splash-ring splash-ring-delay absolute top-1/2 left-1/2 h-40 w-40 rounded-full border border-white/20" />
      </div>

      <div className="relative flex flex-col items-center gap-5 px-6 text-center">
        <img
          src={logoAsset.url}
          alt="Marcolada Futebol Clube"
          className="splash-logo h-32 w-32 object-contain drop-shadow-[0_18px_40px_rgba(0,0,0,0.35)] sm:h-40 sm:w-40"
        />
        <div className="splash-text">
          <p className="font-display text-2xl font-extrabold tracking-tight">Marcolada Stats</p>
          <p className="mt-1 text-xs font-semibold tracking-[0.22em] uppercase opacity-75">
            Estatísticas ao vivo
          </p>
        </div>
      </div>
    </div>
  );
}
