import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getDomainName(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
