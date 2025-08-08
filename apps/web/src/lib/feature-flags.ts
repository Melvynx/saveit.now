export const FEATURE_FLAGS = {
  ENABLE_VIRTUALIZATION: "ENABLE_VIRTUALIZATION",
} as const;

export function isVirtualizationEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_ENABLE_VIRTUALIZATION;
  if (!raw) return false;
  const normalized = String(raw).toLowerCase().trim();
  return normalized === "1" || normalized === "true" || normalized === "on";
}


