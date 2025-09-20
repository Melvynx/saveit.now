import { type VariantProps as CvaVariantProps } from "class-variance-authority";
import { type ClassValue } from "clsx";
export declare function cn(...inputs: ClassValue[]): string;
export declare const cva: <T>(base?: import("class-variance-authority/types").ClassValue, config?: T extends {
    [x: string]: Record<string, import("clsx").ClassValue>;
} ? {
    variants?: T | undefined;
    defaultVariants?: { [Variant in keyof T]?: import("class-variance-authority/types").StringToBoolean<keyof T[Variant]> | null | undefined; } | undefined;
    compoundVariants?: (T extends {
        [x: string]: Record<string, import("clsx").ClassValue>;
    } ? ({ [Variant in keyof T]?: import("class-variance-authority/types").StringToBoolean<keyof T[Variant]> | null | undefined; } | { [Variant_1 in keyof T]?: import("class-variance-authority/types").StringToBoolean<keyof T[Variant_1]> | import("class-variance-authority/types").StringToBoolean<keyof T[Variant_1]>[] | undefined; }) & import("class-variance-authority/types").ClassProp : import("class-variance-authority/types").ClassProp)[] | undefined;
} : never) => (props?: T extends {
    [x: string]: Record<string, import("clsx").ClassValue>;
} ? { [Variant in keyof T]?: import("class-variance-authority/types").StringToBoolean<keyof T[Variant]> | null | undefined; } & import("class-variance-authority/types").ClassProp : import("class-variance-authority/types").ClassProp) => string;
export type VariantProp<T extends ReturnType<typeof cva>> = CvaVariantProps<T>;
//# sourceMappingURL=utils.d.ts.map