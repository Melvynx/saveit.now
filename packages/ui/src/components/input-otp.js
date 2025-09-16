"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from "react";
import { OTPInput, OTPInputContext } from "input-otp";
import { MinusIcon } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
function InputOTP({ className, containerClassName, ...props }) {
    return (_jsx(OTPInput, { "data-slot": "input-otp", containerClassName: cn("flex items-center gap-2 has-disabled:opacity-50", containerClassName), className: cn("disabled:cursor-not-allowed", className), ...props }));
}
function InputOTPGroup({ className, ...props }) {
    return (_jsx("div", { "data-slot": "input-otp-group", className: cn("flex items-center", className), ...props }));
}
function InputOTPSlot({ index, className, ...props }) {
    const inputOTPContext = React.useContext(OTPInputContext);
    const { char, hasFakeCaret, isActive } = inputOTPContext?.slots[index] ?? {};
    return (_jsxs("div", { "data-slot": "input-otp-slot", "data-active": isActive, className: cn("data-[active=true]:border-ring data-[active=true]:ring-ring/50 data-[active=true]:aria-invalid:ring-destructive/20 dark:data-[active=true]:aria-invalid:ring-destructive/40 aria-invalid:border-destructive data-[active=true]:aria-invalid:border-destructive dark:bg-input/30 border-input relative flex h-9 w-9 items-center justify-center border-y border-r text-sm shadow-xs transition-all outline-none first:rounded-l-md first:border-l last:rounded-r-md data-[active=true]:z-10 data-[active=true]:ring-[3px]", className), ...props, children: [char, hasFakeCaret && (_jsx("div", { className: "pointer-events-none absolute inset-0 flex items-center justify-center", children: _jsx("div", { className: "animate-caret-blink bg-foreground h-4 w-px duration-1000" }) }))] }));
}
function InputOTPSeparator({ ...props }) {
    return (_jsx("div", { "data-slot": "input-otp-separator", role: "separator", ...props, children: _jsx(MinusIcon, {}) }));
}
export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator };
