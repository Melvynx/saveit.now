"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
function Accordion({ ...props }) {
    return _jsx(AccordionPrimitive.Root, { "data-slot": "accordion", ...props });
}
function AccordionItem({ className, ...props }) {
    return (_jsx(AccordionPrimitive.Item, { "data-slot": "accordion-item", className: cn("border-b last:border-b-0", className), ...props }));
}
function AccordionTrigger({ className, children, ...props }) {
    return (_jsx(AccordionPrimitive.Header, { className: "flex", children: _jsxs(AccordionPrimitive.Trigger, { "data-slot": "accordion-trigger", className: cn("focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 items-start justify-between gap-4 rounded-md py-4 text-left text-sm font-medium transition-all outline-none hover:underline focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180", className), ...props, children: [children, _jsx(ChevronDownIcon, { className: "text-muted-foreground pointer-events-none size-4 shrink-0 translate-y-0.5 transition-transform duration-200" })] }) }));
}
function AccordionContent({ className, children, ...props }) {
    return (_jsx(AccordionPrimitive.Content, { "data-slot": "accordion-content", className: "data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden text-sm", ...props, children: _jsx("div", { className: cn("pt-0 pb-4", className), children: children }) }));
}
export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
