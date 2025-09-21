"use client";

import { Skeleton } from "@workspace/ui/components/skeleton";

import { cn } from "@workspace/ui/lib/utils";
import Image from "next/image";
import { useEffect, useState } from "react";

function useIsClient() {
  const [isClient, setClient] = useState(false);

  useEffect(() => {
    setClient(true);
  }, []);

  return isClient;
}

interface ImageWithPlaceholderProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "onError"> {
  className?: string;
  fallbackImage?: string | null;
  onError?: (error: Error) => void;
}

export const ImageWithPlaceholder = ({
  className,
  fallbackImage,
  onError,
  width,
  ...props
}: ImageWithPlaceholderProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const isClient = useIsClient();

  if (!isClient) {
    return (
      <div className={cn("relative", className)}>
        {isLoading && (
          <Skeleton
            className={cn("absolute inset-0 h-full w-full", className)}
          />
        )}
      </div>
    );
  }

  if (!props.src) {
    props.src = fallbackImage ?? "";
  }

  const handleError = () => {
    setIsLoading(false);
    setError(true);
    if (onError) {
      onError(new Error("Failed to load image"));
    }
  };

  const src = error && fallbackImage ? fallbackImage : props.src;

  if (!src) {
    return (
      <div
        style={{
          // @ts-expect-error CSS Variable
          "--color-bg": `color-mix(in srgb, var(--border) 50%, transparent)`,
        }}
        className={cn(
          "relative w-full h-full",
          className,
          "bg-[image:repeating-linear-gradient(315deg,_var(--color-bg)_0,_var(--color-bg)_1px,_transparent_0,_transparent_50%)] bg-[size:10px_10px] bg-fixed",
        )}
      ></div>
    );
  }

  const ImageComp = src.includes("saveit.mlvcdn.com") ? Image : "img";

  if (!isLoading) {
    return (
      <ImageComp
        {...props}
        width={width ? Number(width) : 380}
        height={(width ? Number(width) : 380) * 0.5625}
        alt="image"
        src={src}
        className={cn(
          isLoading ? "opacity-0" : "opacity-100",
          "transition-opacity duration-200",
          className,
        )}
      />
    );
  }

  return (
    <div className={cn("relative", className)}>
      {isLoading && (
        <Skeleton className={cn("absolute inset-0 h-full w-full", className)} />
      )}

      <ImageComp
        {...props}
        width={width ? Number(width) : 380}
        height={(width ? Number(width) : 380) * 0.5625}
        alt="image"
        src={src}
        className={cn(
          isLoading ? "opacity-0" : "opacity-100",
          "transition-opacity duration-200 relative z-10",
          className,
        )}
        onLoad={() => {
          setIsLoading(false);
        }}
        onError={handleError}
      />
    </div>
  );
};
