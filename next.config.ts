import type { NextConfig } from "next";

/** A week fresh, then served from cache while it refreshes in the background for another month. */
const WEEK_CACHE = "public, max-age=604800, stale-while-revalidate=2592000";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    // 75 is the default; 40 for the hero's blurred backdrop, 90 for its studio boot cutouts
    qualities: [40, 75, 90],
    // optimized product photos rarely change: keep them a week instead of the default 4 hours
    minimumCacheTTL: 604800,
    // Studio style photos (src/lib/cloudinary-shots.json)
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com", pathname: "/dg0ffut8a/image/upload/**", search: "" }],
  },
  // Photos and the season art (public/images) keep the same names when replaced, so they are cached for a week, not
  // forever; a returning visitor's repeat views load from the browser.
  async headers() {
    return [{ source: "/images/:path*", headers: [{ key: "Cache-Control", value: WEEK_CACHE }] }];
  },
};

export default nextConfig;
