import { jsx as _jsx } from "react/jsx-runtime";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { cn } from "@workspace/ui/lib/utils";
import { cva } from "class-variance-authority";
import { forwardRef } from "react";
const fixedForwardRef = forwardRef;
export const typographyVariants = cva("", {
    variants: {
        variant: {
            h1: "scroll-m-20 font-caption text-4xl font-extrabold tracking-tight lg:text-5xl",
            h2: "scroll-m-20 font-caption text-3xl font-semibold tracking-tight transition-colors",
            h3: "scroll-m-20 font-caption text-xl font-semibold tracking-tight",
            p: "not-first:mt-6 leading-7",
            default: "",
            quote: "mt-6 border-l-2 pl-6 italic",
            code: "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold",
            lead: "text-xl text-muted-foreground",
            large: "text-lg font-semibold",
            small: "text-sm font-medium leading-none",
            muted: "text-sm text-muted-foreground",
            link: "font-medium text-cyan-600 hover:underline dark:text-primary",
        },
    },
    defaultVariants: {
        variant: "default",
    },
});
const defaultElementMapping = {
    h1: "h1",
    h2: "h2",
    h3: "h3",
    p: "p",
    quote: "p",
    code: "code",
    lead: "p",
    large: "p",
    small: "p",
    muted: "p",
    link: "a",
    default: "p",
};
/**
 * The Typography component is useful to add Text to your page
 *
 * Usage :
 *
 * ```tsx
 * <Typography variant="h1">Hello World</Typography>
 * <Typography variant="h2" as="a" href="#">Hello World</Typography>
 * <Typography variant="large" as={Link} href="#">Hello World</Typography>
 * ```
 *
 * You can use the `as` prop to define the element type of the component
 * `as` can be a string or a component
 *
 * @param params The parameters of the component
 * @param ref The ref of the element. Untyped because it's a generic
 * @returns
 */
const InnerTypography = ({ variant = "default", className, as, ...props }, ref) => {
    const Comp = as ?? defaultElementMapping[variant ?? "default"];
    return (_jsx(Comp, { ...props, className: cn(typographyVariants({ variant }), className), ref: ref }));
};
export const Typography = fixedForwardRef(InnerTypography);
