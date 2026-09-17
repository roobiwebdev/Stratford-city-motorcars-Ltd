"use client";

import Image from "next/image";
import { Car, ImageOff } from "lucide-react";
import { useState } from "react";

import { cn } from "@Stratford-city-motorcars-Ltd/ui/lib/utils";

import { SITE_URL } from "@/lib/api";

/**
 * A vehicle photograph, from wherever it lives:
 *
 *  - `sample:<category>`  a placeholder frame (sample data has no real photos)
 *  - `/sample/…`          a file bundled with the admin for sample data
 *  - `data:` / `blob:`    a photograph just added in this browser
 *  - `/media/…`           the website's media route, resolved against the site
 *  - `https://…`          object storage behind a CDN
 */
export function Photo({
  src,
  alt,
  className,
  sizes = "96px",
  label,
  priority,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  sizes?: string;
  /** Shown on the placeholder, e.g. "Exterior". */
  label?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (!src) {
    return (
      <span role="img" aria-label="No photograph yet" className={cn("relative flex items-center justify-center overflow-hidden bg-ink-100 text-ink-500", className)}>
        <Car className="size-[38%] max-h-8 max-w-8" strokeWidth={1.25} aria-hidden />
      </span>
    );
  }

  if (src.startsWith("sample:")) {
    const category = label ?? src.slice("sample:".length);
    return (
      <span role="img" aria-label={alt || `Sample ${category} photograph`} className={cn("sample-frame @container relative flex flex-col items-center justify-center gap-1 overflow-hidden text-ink-500", className)}>
        <Car className="size-[34%] max-h-10 max-w-10" strokeWidth={1.1} aria-hidden />
        <span aria-hidden className="hidden font-roman text-[0.5rem] tracking-[0.2em] uppercase @[7rem]:block">
          {category}
        </span>
      </span>
    );
  }

  if (failed) {
    return (
      <span role="img" aria-label={`${alt} (preview unavailable)`} className={cn("flex items-center justify-center bg-ink-100 text-ink-500", className)}>
        <ImageOff className="size-5" strokeWidth={1.25} aria-hidden />
      </span>
    );
  }

  if (src.startsWith("data:") || src.startsWith("blob:")) {
    return (
      <span className={cn("relative block overflow-hidden bg-ink-100", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element -- in-browser photographs cannot go through the optimiser */}
        <img src={src} alt={alt} className="absolute inset-0 size-full object-cover" onError={() => setFailed(true)} />
      </span>
    );
  }

  const resolved = src.startsWith("/sample/") || /^https?:\/\//.test(src) ? src : `${SITE_URL}${src}`;
  return (
    <span className={cn("relative block overflow-hidden bg-ink-100", className)}>
      <Image
        src={resolved}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover"
        onError={() => setFailed(true)}
      />
    </span>
  );
}
