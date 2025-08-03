"use client";

import { Skeleton } from "@workspace/ui/components/skeleton";

import { cn } from "@workspace/ui/lib/utils";
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

  if (!isLoading) {
    return (
      <img
        {...props}
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
      <img
        {...props}
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
