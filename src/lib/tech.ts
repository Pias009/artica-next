import type { IconName } from "@/components/Icon";

export type TechSpec = { icon: IconName; title: string; value: number; suffix: string; note: string; tag?: string };

export const TECH: TechSpec[] = [
  { icon: "drop", title: "Waterproof", value: 6, suffix: " h", note: "Water immersion test", tag: "waterproof" },
  { icon: "snow", title: "Thermal lining", value: -25, suffix: "°C", note: "Shearling and wool", tag: "insulated" },
  { icon: "grid", title: "Grip outsole", value: 6, suffix: " mm", note: "Deep lug on snow and ice" },
  { icon: "bolt", title: "Flex sole", value: 100, suffix: "K", note: "Bend cycles, no cracks" },
  { icon: "boot", title: "Heel support", value: 3, suffix: " layer", note: "Firm counter, keeps shape" },
  { icon: "shield", title: "Tested zips", value: 10, suffix: "K", note: "Pulls per zip, lab tested", tag: "zip" },
];
