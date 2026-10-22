import clsx from "clsx";
import Image from "next/image";

/**
 * The picture beside a buyer-desk page's title: a photo filling the frame (`cover`), or a cutout boot standing on a
 * pale plate (`contain`). It is the first large image on the page, so it loads first.
 */
export function IntroImage({ src, alt, fit = "cover", className }: { src: string; alt: string; fit?: "cover" | "contain"; className?: string }) {
  return (
    <div
      data-deco="card"
      className={clsx(
        "relative aspect-[4/3] overflow-hidden rounded-shell max-lg:aspect-[16/10]",
        fit === "contain" ? "bg-white/70" : "bg-photo",
        className,
      )}
    >
      <Image
        src={src}
        alt={alt}
        fill
        priority
        sizes="(min-width: 1024px) 560px, 100vw"
        className={fit === "contain" ? "object-contain p-[9%] drop-shadow-boot" : "object-cover"}
      />
    </div>
  );
}
