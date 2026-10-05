import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    // Studio style photos (src/lib/cloudinary-shots.json)
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com", pathname: "/dg0ffut8a/image/upload/**", search: "" }],
  },
};

export default nextConfig;
