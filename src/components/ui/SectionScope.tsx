"use client";

import { createContext, useContext, type ReactNode } from "react";

/** Which home-page section a heading belongs to, so SectionHead can show the admin's own words for it. */
const Scope = createContext<string | null>(null);
export const SectionScope = ({ id, children }: { id: string; children: ReactNode }) => <Scope value={id}>{children}</Scope>;
export const useSectionScope = () => useContext(Scope);
