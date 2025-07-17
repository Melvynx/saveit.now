// Build-time configuration for Chrome extension
// This file will be replaced during build based on environment

declare const __BASE_URL__: string;
declare const __IS_DEV__: boolean;

export const config = {
  BASE_URL: __BASE_URL__,
  IS_DEV: __IS_DEV__,
} as const;