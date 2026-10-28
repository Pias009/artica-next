import clsx from "clsx";

/**
 * The agent's face: a friendly robot head that bobs, blinks, glances about, talks (its mouth lights) and pulses its
 * antenna. Pure SVG and CSS keyframes (globals.css, robot-*); still for reduced motion.
 */
export function RobotHead({ className }: { className?: string }) {
  const swing = "motion-safe:animate-[robot-look_6s_ease-in-out_infinite]";
  return (
    <svg viewBox="0 0 160 160" aria-hidden="true" className={clsx("overflow-visible", className)}>
      <defs>
        <linearGradient id="robot-shell" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#d9dde0" />
        </linearGradient>
        <linearGradient id="robot-visor" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#2a2d31" />
          <stop offset="1" stopColor="#121416" />
        </linearGradient>
        <radialGradient id="robot-glow">
          <stop offset="0" stopColor="#c86bb8" stopOpacity=".9" />
          <stop offset="1" stopColor="#c86bb8" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g className="origin-[80px_150px] motion-safe:animate-[robot-bob_3.2s_ease-in-out_infinite]">
        {/* antenna */}
        <line x1="80" y1="30" x2="80" y2="14" stroke="#9aa3a9" strokeWidth="3" strokeLinecap="round" />
        <circle cx="80" cy="11" r="11" fill="url(#robot-glow)" className="origin-[80px_11px] motion-safe:animate-[robot-pulse_1.6s_ease-in-out_infinite]" />
        <circle cx="80" cy="11" r="5" fill="#8e3f82" />

        {/* ears */}
        <rect x="14" y="66" width="14" height="34" rx="6" fill="#c3cacf" />
        <rect x="132" y="66" width="14" height="34" rx="6" fill="#c3cacf" />
        <rect x="9" y="76" width="6" height="14" rx="3" fill="#8e3f82" />
        <rect x="145" y="76" width="6" height="14" rx="3" fill="#8e3f82" />

        {/* head */}
        <rect x="24" y="30" width="112" height="104" rx="34" fill="url(#robot-shell)" stroke="rgb(18 20 22 / .08)" strokeWidth="1.5" />
        <rect x="36" y="48" width="88" height="62" rx="24" fill="url(#robot-visor)" />
        <path d="M44 58c8-6 20-8 30-8" stroke="#fff" strokeOpacity=".18" strokeWidth="4" strokeLinecap="round" fill="none" />

        {/* eyes: glance and blink */}
        <g className={swing}>
          {[60, 100].map((x) => (
            <g key={x} className="motion-safe:animate-[robot-blink_4.8s_ease-in-out_infinite]" style={{ transformOrigin: `${x}px 76px` }}>
              <circle cx={x} cy="76" r="11" fill="#7fe3d0" opacity=".25" />
              <circle cx={x} cy="76" r="7" fill="#9ff0e0" />
              <circle cx={x + 2.5} cy="73.5" r="2.2" fill="#fff" />
            </g>
          ))}
        </g>

        {/* mouth lights: talking */}
        <g>
          {[66, 74, 82, 90].map((x, i) => (
            <rect
              key={x}
              x={x - 2.5}
              y="92"
              width="5"
              height="10"
              rx="2.5"
              fill="#9ff0e0"
              className="motion-safe:animate-[robot-talk_.9s_ease-in-out_infinite]"
              style={{ transformOrigin: `${x}px 97px`, animationDelay: `${i * 0.12}s` }}
            />
          ))}
        </g>

        {/* cheeks */}
        <circle cx="42" cy="104" r="5" fill="#f2b8d8" opacity=".55" />
        <circle cx="118" cy="104" r="5" fill="#f2b8d8" opacity=".55" />
      </g>
    </svg>
  );
}
