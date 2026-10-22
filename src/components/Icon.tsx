import clsx from "clsx";
import type { ReactNode, SVGProps } from "react";

const paths = {
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  minus: <path d="M5 12h14" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.2-4.2" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.5" r="3.8" />
      <path d="M4.5 20c1.3-3.6 4.2-5.4 7.5-5.4s6.2 1.8 7.5 5.4" />
    </>
  ),
  list: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2.5" />
      <path d="M9 4.5V3.5h6v1M9 10h6M9 14h6M9 18h3" />
    </>
  ),
  menu: <path d="M4 8h16M4 16h16" />,
  /* featured item beside a list */
  rows: (
    <>
      <rect x="3.5" y="5" width="9" height="14" rx="2" />
      <path d="M15.5 7h5M15.5 12h5M15.5 17h5" />
    </>
  ),
  pause: <path d="M9 6v12M15 6v12" />,
  layers: (
    <>
      <path d="M12 4l8.5 4.5L12 13 3.5 8.5z" />
      <path d="M3.5 12.5L12 17l8.5-4.5M3.5 16.5L12 21l8.5-4.5" />
    </>
  ),
  zip: (
    <>
      <path d="M12 3v18" />
      <path d="M9.5 6h2.5M12 8.5h2.5M9.5 11h2.5M12 13.5h2.5M9.5 16h2.5" />
      <rect x="10" y="2.5" width="4" height="3.5" rx="1" />
    </>
  ),
  sole: (
    <>
      <path d="M3.5 13.5h17v2.5a2 2 0 01-2 2h-13a2 2 0 01-2-2z" />
      <path d="M6 18v2M10 18v2M14 18v2M18 18v2M5 13.5c0-3 2-5 5-5h3" />
    </>
  ),
  heel: (
    <>
      <path d="M4 6h8c3 0 5 2 6.5 5L20 14v3H9l-1.5 3H5l.5-3H4z" />
      <path d="M9 17l-.2-3" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8.5a2 2 0 012-2h2l1.5-2h5L16 6.5h2a2 2 0 012 2V17a2 2 0 01-2 2H6a2 2 0 01-2-2z" />
      <circle cx="12" cy="12.5" r="3.5" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
      <path d="M8.5 10.5V8a3.5 3.5 0 017 0v2.5" />
    </>
  ),
  zoom: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.2-4.2M11 8.5v5M8.5 11h5" />
    </>
  ),
  play: <path d="M8 5.5v13l10.5-6.5z" />,
  truck: (
    <>
      <path d="M3 6.5h11v10H3zM14 10h4l3 3.5v3h-7" />
      <circle cx="7" cy="17.5" r="1.8" />
      <circle cx="17.5" cy="17.5" r="1.8" />
    </>
  ),
  sample: (
    <>
      <path d="M4 16.5c0-2 1.2-3 3-3.4l5-1.2 2-5.4c.3-.8 1.2-1.1 1.9-.7l3 1.6c.7.4.9 1.2.6 1.9L17 16.5v2H4z" />
      <path d="M8 13v-1.5M11 12.3v-1.5" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3.5l7 2.6v5.5c0 4.5-3 7.8-7 9-4-1.2-7-4.5-7-9V6.1z" />
      <path d="M8.8 12.2l2.2 2.2 4.3-4.4" />
    </>
  ),
  box: (
    <>
      <path d="M3.5 7.5L12 3.5l8.5 4v9L12 20.5l-8.5-4z" />
      <path d="M3.5 7.5L12 11.5l8.5-4M12 11.5v9M7.8 5.5l8.5 4" />
    </>
  ),
  snow: <path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5L12 7l2.5-2.5M9.5 19.5L12 17l2.5 2.5" />,
  // the season icons (with snow above): spring, summer, rainy, autumn, holiday
  flower: (
    <>
      <circle cx="12" cy="7" r="3.2" />
      <circle cx="17" cy="12" r="3.2" />
      <circle cx="12" cy="17" r="3.2" />
      <circle cx="7" cy="12" r="3.2" />
      <circle cx="12" cy="12" r="1.8" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </>
  ),
  rain: (
    <>
      <path d="M7 15.5a4 4 0 01-.4-8 5.5 5.5 0 0110.7 1.6A3.3 3.3 0 0117.2 15.5z" />
      <path d="M8.5 18.5l-1 2M12.5 18.5l-1 2M16.5 18.5l-1 2" />
    </>
  ),
  leaf: (
    <>
      <path d="M5 19.5C5 11 10 5 20 4.5c-.5 9.5-6 15-15 15z" />
      <path d="M5 19.5c3-4.5 6.5-7.8 10.5-10" />
    </>
  ),
  gift: (
    <>
      <rect x="4" y="9" width="16" height="11.5" rx="1.5" />
      <path d="M3 9h18M12 9v11.5M12 9c-1.2-2.8-4.8-4.2-5.2-2.2S9.5 9 12 9zm0 0c1.2-2.8 4.8-4.2 5.2-2.2S14.5 9 12 9z" />
    </>
  ),
  drop: (
    <>
      <path d="M12 3.5c3 3.8 5.5 7 5.5 10a5.5 5.5 0 01-11 0c0-3 2.5-6.2 5.5-10z" />
      <path d="M9.5 14.5a2.5 2.5 0 002.5 2.5" />
    </>
  ),
  kid: (
    <>
      <circle cx="12" cy="6.5" r="2.5" />
      <path d="M8 21l1-7-2.5-2.5L9 9h6l2.5 2.5L15 14l1 7" />
    </>
  ),
  tag: (
    <>
      <path d="M3.5 12.3V4.5a1 1 0 011-1h7.8l8.2 8.2a1.5 1.5 0 010 2.1l-6.7 6.7a1.5 1.5 0 01-2.1 0z" />
      <circle cx="8" cy="8" r="1.4" />
    </>
  ),
  grid: (
    <>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
    </>
  ),
  boot: (
    <>
      <path d="M7 3h6v8.5l5.2 2.2c1.1.5 1.8 1.5 1.8 2.7V19H4.5v-2.5c0-.8.2-1.5.5-2.2L7 10z" />
      <path d="M4.5 19v1.5H20V19M13 7h-2M13 9.5h-2" />
    </>
  ),
  man: (
    <>
      <circle cx="12" cy="5.5" r="2.3" />
      <path d="M9 21v-7H7.5V10a2 2 0 012-2h5a2 2 0 012 2v4H15v7" />
    </>
  ),
  woman: (
    <>
      <circle cx="12" cy="5.5" r="2.3" />
      <path d="M10 21v-5H7.5l2-7.2A2 2 0 0111.4 7.5h1.2a2 2 0 011.9 1.3l2 7.2H14v5" />
    </>
  ),
  phone: <path d="M6.5 3.5h3l1.5 4-2 1.3a10 10 0 005.2 5.2l1.3-2 4 1.5v3a2 2 0 01-2 2A15 15 0 014.5 5.5a2 2 0 012-2z" />,
  mail: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="M4 7l8 6 8-6" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0113 0c0 5.4-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.3" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  chat: (
    <>
      <path d="M4 18.5V6.5a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H8z" />
      <path d="M8.5 9.5h7M8.5 12.5h4" />
    </>
  ),
  bolt: <path d="M13 3L5 13.5h6L10 21l8-10.5h-6z" />,
  percent: (
    <>
      <path d="M18 6L6 18" />
      <circle cx="7.5" cy="7.5" r="2.3" />
      <circle cx="16.5" cy="16.5" r="2.3" />
    </>
  ),
  linkedin: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
      <path d="M8 10.5V16M8 7.8v.1M11.5 16v-5.5M11.5 13c0-1.6 1-2.6 2.3-2.6s2.2.9 2.2 2.6V16" />
    </>
  ),
  instagram: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="3.8" />
      <path d="M17 7v.1" />
    </>
  ),
  whatsapp: (
    <>
      <path d="M4 20l1.2-4A8 8 0 1112 20a8 8 0 01-4-1.1z" />
      <path d="M9 9.5c.3 2.3 2.2 4.3 4.5 4.8l1-1.2 1.8.9" />
    </>
  ),
  youtube: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="4" />
      <path d="M10.5 9.5v5l4-2.5z" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof paths;

export function Icon({ name, className, ...rest }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={clsx("size-[18px] flex-none fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] stroke-[1.6]", className)}
      {...rest}
    >
      {paths[name]}
    </svg>
  );
}
