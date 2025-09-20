"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@workspace/ui/lib/utils";
const InlineTooltip = ({ children, title, delayDuration = 200, className, }) => {
    return (_jsxs(Tooltip, { delayDuration: delayDuration, children: [_jsx(TooltipTrigger, { asChild: true, children: children }), _jsx(TooltipContent, { title: title, className: className, children: title })] }));
};
function TooltipProvider({ delayDuration = 0, ...props }) {
    return (_jsx(TooltipPrimitive.Provider, { "data-slot": "tooltip-provider", delayDuration: delayDuration, ...props }));
}
function Tooltip({ ...props }) {
    return (_jsx(TooltipProvider, { children: _jsx(TooltipPrimitive.Root, { "data-slot": "tooltip", ...props }) }));
}
function TooltipTrigger({ ...props }) {
    return _jsx(TooltipPrimitive.Trigger, { "data-slot": "tooltip-trigger", ...props });
}
function TooltipContent({ className, sideOffset = 0, children, ...props }) {
    return (_jsx(TooltipPrimitive.Portal, { children: _jsxs(TooltipPrimitive.Content, { "data-slot": "tooltip-content", sideOffset: sideOffset, className: cn("bg-primary text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-md px-3 py-1.5 text-xs text-balance", className), ...props, children: [children, _jsx(TooltipPrimitive.Arrow, { className: "bg-transparent z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px] fill-primary", style: { fill: "var(--primary)" } })] }) }));
}
export { InlineTooltip, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, };
