import * as React from "react";
import { OTPInput } from "input-otp";
declare function InputOTP({ className, containerClassName, ...props }: React.ComponentProps<typeof OTPInput> & {
    containerClassName?: string;
}): import("react/jsx-runtime").JSX.Element;
declare function InputOTPGroup({ className, ...props }: React.ComponentProps<"div">): import("react/jsx-runtime").JSX.Element;
declare function InputOTPSlot({ index, className, ...props }: React.ComponentProps<"div"> & {
    index: number;
}): import("react/jsx-runtime").JSX.Element;
declare function InputOTPSeparator({ ...props }: React.ComponentProps<"div">): import("react/jsx-runtime").JSX.Element;
export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator };
//# sourceMappingURL=input-otp.d.ts.map