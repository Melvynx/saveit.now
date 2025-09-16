import { cva as CvaCva, } from "class-variance-authority";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}
export const cva = CvaCva;
