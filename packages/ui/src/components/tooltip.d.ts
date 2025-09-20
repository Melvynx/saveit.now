import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as React from "react";
declare const InlineTooltip: ({ children, title, delayDuration, className, }: React.PropsWithChildren<{
    title: string;
    delayDuration?: number;
    className?: string;
}>) => import("react/jsx-runtime").JSX.Element;
declare function TooltipProvider({ delayDuration, ...props }: React.ComponentProps<typeof TooltipPrimitive.Provider>): import("react/jsx-runtime").JSX.Element;
declare function Tooltip({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Root>): import("react/jsx-runtime").JSX.Element;
declare function TooltipTrigger({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Trigger>): import("react/jsx-runtime").JSX.Element;
declare function TooltipContent({ className, sideOffset, children, ...props }: React.ComponentProps<typeof TooltipPrimitive.Content>): import("react/jsx-runtime").JSX.Element;
export { InlineTooltip, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, };
//# sourceMappingURL=tooltip.d.ts.map