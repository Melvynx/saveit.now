"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";
import { Skeleton } from "./skeleton";

interface ImageWithPlaceholderProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "onError"> {
  className?: string;
  fallbackImage?: string;
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

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setIsLoading(false);
    setError(true);
    if (onError) {
      onError(new Error("Failed to load image"));
    }
  };

  const src = error && fallbackImage ? fallbackImage : props.src;

  if (!src) {
    return (
      <div className={cn("relative", className)}>
        <Skeleton className={cn("absolute inset-0 w-full h-full", className)} />
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {isLoading && (
        <Skeleton className={cn("absolute inset-0 w-full h-full", className)} />
      )}
      <img
        {...props}
        src={src}
        className={cn(
          isLoading ? "opacity-0" : "opacity-100",
          "transition-opacity duration-200",
          className
        )}
        onLoad={() => setIsLoading(false)}
        onError={handleError}
      />
    </div>
  );
};
