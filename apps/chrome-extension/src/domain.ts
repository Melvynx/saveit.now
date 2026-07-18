export const MAX_URL_LENGTH = 8_192;
export const MAX_TRANSCRIPT_LENGTH = 120_000;

export const SAVE_TYPES = ["page", "link", "image"] as const;
export type SaveType = (typeof SAVE_TYPES)[number];

export function isSaveType(value: unknown): value is SaveType {
  return SAVE_TYPES.some((saveType) => saveType === value);
}
