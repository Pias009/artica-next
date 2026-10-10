import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    // Studio style photos (src/lib/cloudinary-shots.json)
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com", pathname: "/dg0ffut8a/image/upload/**", search: "" }],
  },
  // The 3D showroom's photos rarely change: let browsers keep them for a year. Their URLs carry
  // ?v=SHOWROOM_ASSET_VERSION (src/lib/showroom.ts); bump it when a photo is replaced.
  async headers() {
    return [{ source: "/showroom/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] }];
  },
};

export default nextConfig;
