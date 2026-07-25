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

interface ImageWithPlaceholderProps extends Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  "onError"
> {
  className?: string;
  fallbackImage?: string | null;
  onError?: (error: Error) => void;
}

export const ImageWithPlaceholder = ({
  alt = "",
  className,
  fallbackImage,
  onError,
  width,
  ...props
}: ImageWithPlaceholderProps) => {
  const requestedSrc = (props.src as string | undefined) || fallbackImage || "";
  const [activeSrc, setActiveSrc] = useState(requestedSrc);
  const [isLoading, setIsLoading] = useState(Boolean(requestedSrc));
  const [hasError, setHasError] = useState(false);
  const isClient = useIsClient();

  useEffect(() => {
    setActiveSrc(requestedSrc);
    setIsLoading(Boolean(requestedSrc));
    setHasError(false);
  }, [requestedSrc]);

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

  const handleError = () => {
    if (fallbackImage && activeSrc !== fallbackImage) {
      setActiveSrc(fallbackImage);
      setIsLoading(true);
      return;
    }

    setIsLoading(false);
    setHasError(true);
    if (onError) {
      onError(new Error("Failed to load image"));
    }
  };

  if (!activeSrc || hasError) {
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
        width={width ? Number(width) : 380}
        height={(width ? Number(width) : 380) * 0.5625}
        alt={alt}
        src={activeSrc}
        className={cn(
          isLoading ? "opacity-0" : "opacity-100",
          "transition-opacity duration-200",
          className,
        )}
        onError={handleError}
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
        width={width ? Number(width) : 380}
        height={(width ? Number(width) : 380) * 0.5625}
        alt={alt}
        src={activeSrc}
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
