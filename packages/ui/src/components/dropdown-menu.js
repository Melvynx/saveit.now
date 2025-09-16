"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { CheckIcon, ChevronRightIcon, CircleIcon } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
function DropdownMenu({ ...props }) {
    return _jsx(DropdownMenuPrimitive.Root, { "data-slot": "dropdown-menu", ...props });
}
function DropdownMenuPortal({ ...props }) {
    return (_jsx(DropdownMenuPrimitive.Portal, { "data-slot": "dropdown-menu-portal", ...props }));
}
function DropdownMenuTrigger({ ...props }) {
    return (_jsx(DropdownMenuPrimitive.Trigger, { "data-slot": "dropdown-menu-trigger", ...props }));
}
function DropdownMenuContent({ className, sideOffset = 4, ...props }) {
    return (_jsx(DropdownMenuPrimitive.Portal, { children: _jsx(DropdownMenuPrimitive.Content, { "data-slot": "dropdown-menu-content", sideOffset: sideOffset, className: cn("bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 max-h-(--radix-dropdown-menu-content-available-height) origin-(--radix-dropdown-menu-content-transform-origin) z-50 min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border p-1 shadow-md", className), ...props }) }));
}
function DropdownMenuGroup({ ...props }) {
    return (_jsx(DropdownMenuPrimitive.Group, { "data-slot": "dropdown-menu-group", ...props }));
}
function DropdownMenuItem({ className, inset, variant = "default", ...props }) {
    return (_jsx(DropdownMenuPrimitive.Item, { "data-slot": "dropdown-menu-item", "data-inset": inset, "data-variant": variant, className: cn("focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*='text-'])]:text-muted-foreground outline-hidden relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm data-[disabled]:pointer-events-none data-[inset]:pl-8 data-[disabled]:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0", className), ...props }));
}
function DropdownMenuCheckboxItem({ className, children, checked, ...props }) {
    return (_jsxs(DropdownMenuPrimitive.CheckboxItem, { "data-slot": "dropdown-menu-checkbox-item", className: cn("focus:bg-accent focus:text-accent-foreground outline-hidden relative flex cursor-default select-none items-center gap-2 rounded-sm py-1.5 pl-8 pr-2 text-sm data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0", className), checked: checked, ...props, children: [_jsx("span", { className: "pointer-events-none absolute left-2 flex size-3.5 items-center justify-center", children: _jsx(DropdownMenuPrimitive.ItemIndicator, { children: _jsx(CheckIcon, { className: "size-4" }) }) }), children] }));
}
function DropdownMenuRadioGroup({ ...props }) {
    return (_jsx(DropdownMenuPrimitive.RadioGroup, { "data-slot": "dropdown-menu-radio-group", ...props }));
}
function DropdownMenuRadioItem({ className, children, ...props }) {
    return (_jsxs(DropdownMenuPrimitive.RadioItem, { "data-slot": "dropdown-menu-radio-item", className: cn("focus:bg-accent focus:text-accent-foreground outline-hidden relative flex cursor-default select-none items-center gap-2 rounded-sm py-1.5 pl-8 pr-2 text-sm data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0", className), ...props, children: [_jsx("span", { className: "pointer-events-none absolute left-2 flex size-3.5 items-center justify-center", children: _jsx(DropdownMenuPrimitive.ItemIndicator, { children: _jsx(CircleIcon, { className: "size-2 fill-current" }) }) }), children] }));
}
function DropdownMenuLabel({ className, inset, ...props }) {
    return (_jsx(DropdownMenuPrimitive.Label, { "data-slot": "dropdown-menu-label", "data-inset": inset, className: cn("px-2 py-1.5 text-sm font-medium data-[inset]:pl-8", className), ...props }));
}
function DropdownMenuSeparator({ className, ...props }) {
    return (_jsx(DropdownMenuPrimitive.Separator, { "data-slot": "dropdown-menu-separator", className: cn("bg-border -mx-1 my-1 h-px", className), ...props }));
}
function DropdownMenuShortcut({ className, ...props }) {
    return (_jsx("span", { "data-slot": "dropdown-menu-shortcut", className: cn("text-muted-foreground ml-auto text-xs tracking-widest", className), ...props }));
}
function DropdownMenuSub({ ...props }) {
    return _jsx(DropdownMenuPrimitive.Sub, { "data-slot": "dropdown-menu-sub", ...props });
}
function DropdownMenuSubTrigger({ className, inset, children, ...props }) {
    return (_jsxs(DropdownMenuPrimitive.SubTrigger, { "data-slot": "dropdown-menu-sub-trigger", "data-inset": inset, className: cn("focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground outline-hidden flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm data-[inset]:pl-8", className), ...props, children: [children, _jsx(ChevronRightIcon, { className: "ml-auto size-4" })] }));
}
function DropdownMenuSubContent({ className, ...props }) {
    return (_jsx(DropdownMenuPrimitive.SubContent, { "data-slot": "dropdown-menu-sub-content", className: cn("bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-dropdown-menu-content-transform-origin) z-50 min-w-[8rem] overflow-hidden rounded-md border p-1 shadow-lg", className), ...props }));
}
export { DropdownMenu, DropdownMenuPortal, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, };
