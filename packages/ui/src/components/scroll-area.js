"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { cn } from "@workspace/ui/lib/utils";
function ScrollArea({ className, children, ...props }) {
    return (_jsxs(ScrollAreaPrimitive.Root, { "data-slot": "scroll-area", className: cn("relative", className), ...props, children: [_jsx(ScrollAreaPrimitive.Viewport, { "data-slot": "scroll-area-viewport", className: "focus-visible:ring-ring/50 size-full rounded-[inherit] outline-none transition-[color,box-shadow] focus-visible:outline-1 focus-visible:ring-[3px]", children: children }), _jsx(ScrollBar, {}), _jsx(ScrollAreaPrimitive.Corner, {})] }));
}
function ScrollBar({ className, orientation = "vertical", ...props }) {
    return (_jsx(ScrollAreaPrimitive.ScrollAreaScrollbar, { "data-slot": "scroll-area-scrollbar", orientation: orientation, className: cn("flex touch-none select-none p-px transition-colors", orientation === "vertical" &&
            "h-full w-2.5 border-l border-l-transparent", orientation === "horizontal" &&
            "h-2.5 flex-col border-t border-t-transparent", className), ...props, children: _jsx(ScrollAreaPrimitive.ScrollAreaThumb, { "data-slot": "scroll-area-thumb", className: "bg-border relative flex-1 rounded-full" }) }));
}
export { ScrollArea, ScrollBar };
