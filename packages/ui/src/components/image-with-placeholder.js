"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
export const ImageWithPlaceholder = ({ className, fallbackImage, onError, ...props }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);
    const isClient = useIsClient();
    if (!isClient) {
        return (_jsx("div", { className: cn("relative", className), children: isLoading && (_jsx(Skeleton, { className: cn("absolute inset-0 h-full w-full", className) })) }));
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
        return (_jsx("div", { style: {
                // @ts-expect-error CSS Variable
                "--color-bg": `color-mix(in srgb, var(--border) 50%, transparent)`,
            }, className: cn("relative w-full h-full", className, "bg-[image:repeating-linear-gradient(315deg,_var(--color-bg)_0,_var(--color-bg)_1px,_transparent_0,_transparent_50%)] bg-[size:10px_10px] bg-fixed") }));
    }
    if (!isLoading) {
        return (_jsx("img", { ...props, src: src, className: cn(isLoading ? "opacity-0" : "opacity-100", "transition-opacity duration-200", className) }));
    }
    return (_jsxs("div", { className: cn("relative", className), children: [isLoading && (_jsx(Skeleton, { className: cn("absolute inset-0 h-full w-full", className) })), _jsx("img", { ...props, src: src, className: cn(isLoading ? "opacity-0" : "opacity-100", "transition-opacity duration-200 relative z-10", className), onLoad: () => {
                    setIsLoading(false);
                }, onError: handleError })] }));
};
