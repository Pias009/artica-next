import clsx from "clsx";
import { cropStyle, type Crop } from "@/lib/products";

/** A detail crop cut from a product photo with CSS; `aspect` is the box's width / height. */
export function CropImage({ crop, aspect = 4 / 5, className }: { crop: Crop; aspect?: number; className?: string }) {
  return <span role="img" aria-label={crop.label} className={clsx("block bg-photo", className)} style={cropStyle(crop, aspect)} />;
}
