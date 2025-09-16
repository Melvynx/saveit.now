import { type VariantProps } from "class-variance-authority";
import * as React from "react";
declare const buttonVariants: (props?: ({
    variant?: "default" | "link" | "destructive" | "outline" | "secondary" | "ghost" | null | undefined;
    size?: "default" | "sm" | "lg" | "icon" | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string;
export type ButtonProps = React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
};
declare function Button({ className, variant, size, asChild, ...props }: ButtonProps): import("react/jsx-runtime").JSX.Element;
export { Button, buttonVariants };
//# sourceMappingURL=button.d.ts.map