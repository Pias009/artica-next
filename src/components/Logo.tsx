import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";

/** Chime Long company logo (the artwork already contains the wordmark). */
export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" aria-label="Guangzhou Chime Long Trading Co., Ltd, home" className="flex flex-none items-center">
      <Image
        src="/images/chime-long-logo.png"
        alt="Guangzhou Chime Long Trading Co., Ltd 昌喆隆"
        width={923}
        height={380}
        priority
        sizes="140px"
        className={clsx("h-10 w-auto sm:h-11", className)}
      />
    </Link>
  );
}
