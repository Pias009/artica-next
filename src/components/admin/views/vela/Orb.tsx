import clsx from "clsx";

export type OrbState = "idle" | "thinking" | "speaking";

/**
 * Vela's presence: a glowing orb that breathes while she waits, swirls while a team works on an answer, and sends out
 * ripples while she speaks. CSS keyframes only (globals.css, vela-*); still for reduced motion.
 */
export function Orb({ state, className }: { state: OrbState; className?: string }) {
  return (
    <div aria-hidden="true" className={clsx("relative grid place-items-center", className)}>
      {/* ripples while speaking */}
      {state === "speaking" &&
        [0, 1, 2].map((i) => (
          <span
            key={i}
            style={{ animationDelay: `${i * 0.6}s` }}
            className="absolute inset-[12%] rounded-full ring-2 ring-[#b98cff]/60 motion-safe:animate-[vela-ripple_1.8s_ease-out_infinite]"
          />
        ))}
      {/* the halo */}
      <span
        className={clsx(
          "absolute inset-0 rounded-full bg-[radial-gradient(circle,rgb(185_140_255/.55),rgb(110_210_200/.18)_45%,transparent_70%)] blur-md transition-opacity duration-500",
          state === "idle" ? "opacity-70" : "opacity-100",
          "motion-safe:animate-[vela-breathe_4.5s_ease-in-out_infinite]",
        )}
      />
      {/* the orbit ring, faster while thinking */}
      <span
        className={clsx(
          "absolute inset-[6%] rounded-full border border-dashed border-white/25",
          state === "thinking" ? "motion-safe:animate-[spin-slow_2.4s_linear_infinite]" : "motion-safe:animate-[spin-slow_18s_linear_infinite]",
        )}
      >
        <span className="absolute top-0 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#7fe0d2] shadow-[0_0_12px_#7fe0d2]" />
      </span>
      {/* the core */}
      <span
        className={clsx(
          "relative size-[58%] overflow-hidden rounded-full shadow-[inset_0_-10px_24px_rgb(40_20_80/.55),inset_0_8px_18px_rgb(255_255_255/.35),0_0_40px_rgb(185_140_255/.45)]",
          "bg-[conic-gradient(from_200deg,#7d5cff,#c86bb8,#6fd6c8,#7d5cff)]",
          state === "thinking" ? "motion-safe:animate-[spin-slow_3s_linear_infinite]" : "motion-safe:animate-[spin-slow_14s_linear_infinite]",
        )}
      >
        <span className="absolute inset-[10%] rounded-full bg-[radial-gradient(circle_at_35%_30%,rgb(255_255_255/.75),transparent_42%)]" />
      </span>
      {/* the voice bars */}
      {state !== "idle" && (
        <span className="absolute bottom-[14%] flex h-4 items-end gap-[3px]">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              style={{ animationDelay: `${i * 0.12}s` }}
              className={clsx(
                "w-[3px] rounded-full bg-white/90",
                state === "speaking" ? "motion-safe:animate-[vela-wave_.8s_ease-in-out_infinite]" : "h-1 motion-safe:animate-[vela-wave_1.4s_ease-in-out_infinite]",
              )}
            />
          ))}
        </span>
      )}
    </div>
  );
}
