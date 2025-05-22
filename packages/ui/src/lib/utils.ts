import {
  cva as CvaCva,
  type VariantProps as CvaVariantProps,
} from "class-variance-authority";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const cva = CvaCva;

export type VariantProp<T extends ReturnType<typeof cva>> = CvaVariantProps<T>;
