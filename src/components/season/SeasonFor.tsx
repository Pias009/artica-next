"use client";

import { useCountryName } from "./SeasonContext";
import { SEASONS, type SeasonId } from "@/lib/season";

/** "Picked for Bangladesh's summer", once the browser knows the country; a neutral line until then. */
export function SeasonFor({ season }: { season: SeasonId }) {
  const country = useCountryName();
  return (
    <p className="mt-3 text-[14px] font-medium text-ink-2">
      {country ? `Picked for ${country}'s ${SEASONS[season].name.toLowerCase()}.` : "Picked for this time of year."}
    </p>
  );
}
