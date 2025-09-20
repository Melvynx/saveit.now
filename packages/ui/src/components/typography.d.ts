import type { VariantProps } from "class-variance-authority";
import type { ComponentPropsWithRef, ElementType } from "react";
import React from "react";
type DistributiveOmit<T, TOmitted extends PropertyKey> = T extends any ? Omit<T, TOmitted> : never;
export declare const typographyVariants: (props?: ({
    variant?: "default" | "code" | "h1" | "h2" | "h3" | "link" | "p" | "small" | "large" | "quote" | "lead" | "muted" | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string;
type TypographyCvaProps = VariantProps<typeof typographyVariants>;
declare const defaultElementMapping: {
    h1: "h1";
    h2: "h2";
    h3: "h3";
    p: "p";
    quote: "p";
    code: "code";
    lead: "p";
    large: "p";
    small: "p";
    muted: "p";
    link: "a";
    default: "p";
};
type ElementMapping = typeof defaultElementMapping;
type ElementTypeForVariant<TVariant extends keyof ElementMapping> = ElementMapping[TVariant];
export declare const Typography: <TAs extends ElementType, TVariant extends TypographyCvaProps["variant"] = "default">(props: {
    as?: TAs;
    variant?: TVariant;
} & DistributiveOmit<ComponentPropsWithRef<ElementType extends TAs ? ElementTypeForVariant<NonNullable<TVariant>> : TAs>, "as"> & React.RefAttributes<any>) => React.ReactNode;
export {};
//# sourceMappingURL=typography.d.ts.map