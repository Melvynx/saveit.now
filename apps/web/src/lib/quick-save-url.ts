type QuickSaveUrlParts = {
  splat: string;
  searchStr?: string;
  hash?: string;
};

export function getQuickSaveTargetUrl({
  splat,
  searchStr = "",
  hash = "",
}: QuickSaveUrlParts): string | null {
  const query =
    searchStr && !searchStr.startsWith("?") ? `?${searchStr}` : searchStr;
  const fragment = hash && !hash.startsWith("#") ? `#${hash}` : hash;
  const candidate = `${splat}${query}${fragment}`.trim();

  try {
    const url = new URL(candidate);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}
