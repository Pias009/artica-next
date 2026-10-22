import type { Metadata } from "next";
import { HomePage } from "@/components/home/HomePage";
import { DEFAULT_SEASON } from "@/lib/season";

export const metadata: Metadata = { alternates: { canonical: "/" } };

/**
 * The home page without a known season. proxy.ts normally serves "/" from /season/[season] instead; this copy is what
 * shows wherever the proxy doesn't run.
 */
export default function Home() {
  return <HomePage season={DEFAULT_SEASON} />;
}
