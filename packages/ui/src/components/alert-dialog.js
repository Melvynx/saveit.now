"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { cn } from "@workspace/ui/lib/utils";
import { buttonVariants } from "@workspace/ui/components/button";
function AlertDialog({ ...props }) {
    return _jsx(AlertDialogPrimitive.Root, { "data-slot": "alert-dialog", ...props });
}
function AlertDialogTrigger({ ...props }) {
    return (_jsx(AlertDialogPrimitive.Trigger, { "data-slot": "alert-dialog-trigger", ...props }));
}
function AlertDialogPortal({ ...props }) {
    return (_jsx(AlertDialogPrimitive.Portal, { "data-slot": "alert-dialog-portal", ...props }));
}
function AlertDialogOverlay({ className, ...props }) {
    return (_jsx(AlertDialogPrimitive.Overlay, { "data-slot": "alert-dialog-overlay", className: cn("data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50", className), ...props }));
}
function AlertDialogContent({ className, ...props }) {
    return (_jsxs(AlertDialogPortal, { children: [_jsx(AlertDialogOverlay, {}), _jsx(AlertDialogPrimitive.Content, { "data-slot": "alert-dialog-content", className: cn("bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed left-[50%] top-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg", className), ...props })] }));
}
function AlertDialogHeader({ className, ...props }) {
    return (_jsx("div", { "data-slot": "alert-dialog-header", className: cn("flex flex-col gap-2 text-center sm:text-left", className), ...props }));
}
function AlertDialogFooter({ className, ...props }) {
    return (_jsx("div", { "data-slot": "alert-dialog-footer", className: cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className), ...props }));
}
function AlertDialogTitle({ className, ...props }) {
    return (_jsx(AlertDialogPrimitive.Title, { "data-slot": "alert-dialog-title", className: cn("text-lg font-semibold", className), ...props }));
}
function AlertDialogDescription({ className, ...props }) {
    return (_jsx(AlertDialogPrimitive.Description, { "data-slot": "alert-dialog-description", className: cn("text-muted-foreground text-sm", className), ...props }));
}
function AlertDialogAction({ className, ...props }) {
    return (_jsx(AlertDialogPrimitive.Action, { className: cn(buttonVariants(), className), ...props }));
}
function AlertDialogCancel({ className, ...props }) {
    return (_jsx(AlertDialogPrimitive.Cancel, { className: cn(buttonVariants({ variant: "outline" }), className), ...props }));
}
export { AlertDialog, AlertDialogPortal, AlertDialogOverlay, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel, };
