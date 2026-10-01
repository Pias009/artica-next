"use client";

import { useEffect } from "react";
import { useInquiry } from "@/lib/store";

/** Loads the persisted inquiry list after hydration so server and client HTML match. */
export function StoreHydrator() {
  useEffect(() => {
    useInquiry.persist.rehydrate();
  }, []);
  return null;
}
