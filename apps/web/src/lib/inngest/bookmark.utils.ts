import { CheerioAPI } from "cheerio";
import sharp from "sharp";

export function splitMarkdownIntoChunks(
  md: string,
  max = 1000, // char length
): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < md.length) {
    let end = start + max;

    // Try to cut neatly at the nearest newline before `end`
    const nl = md.lastIndexOf("\n", end);
    if (nl > start + 200) end = nl; // keep chunk ≥ 200 chars

    // Fallback: cut at the next sentence end after `end`
    const dot = md.indexOf(".", end);
    if (dot !== -1 && dot - end < 120) end = dot + 1;

    chunks.push(md.slice(start, end).trim());
    start = end;
  }

  return chunks;
}

export const getFaviconUrl = ($: CheerioAPI, url: string) => {
  const faviconSelectors = [
    "link[rel='icon'][sizes='32x32']",
    "link[rel='shortcut icon']",
    "link[rel='icon']",
    "link[rel='apple-touch-icon']",
    "link[rel='apple-touch-icon-precomposed']",
  ];

  let faviconUrl = null;
  for (const selector of faviconSelectors) {
    const iconHref = $(selector).attr("href");
    if (iconHref) {
      faviconUrl = iconHref.startsWith("http")
        ? iconHref
        : `${new URL(url).origin}${iconHref}`;
      break;
    }
  }

  return faviconUrl;
};

export const getImageUrlToBase64 = async (url: string) => {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const base64Content = Buffer.from(arrayBuffer).toString("base64");
  return base64Content;
};

/**
 * Vérifie si une image est utilisable (pas principalement noire et de taille suffisante)
 * @param imageUrl URL de l'image à analyser
 * @returns true si l'image est utilisable, false sinon
 */
export const isImageUsable = async (imageUrl: string): Promise<boolean> => {
  try {
    // Téléchargement de l'image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      return false;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Obtention des métadonnées de l'image
    const metadata = await sharp(buffer).metadata();

    // Vérifier la taille minimale (au moins 100x100 pixels)
    if (
      !metadata.width ||
      !metadata.height ||
      metadata.width < 100 ||
      metadata.height < 100
    ) {
      return false;
    }

    // Statistiques sur l'image pour détecter si elle est principalement noire
    const stats = await sharp(buffer).stats();

    // Calculer la luminance moyenne
    // Pour chaque canal, moyenne pondérée en fonction de la perception humaine
    const channels = stats.channels;

    // Vérifier si les canaux RGB existent
    if (!channels || channels.length < 3) {
      return false;
    }

    const luminance =
      0.299 * (channels[0]?.mean ?? 0) + // Rouge
      0.587 * (channels[1]?.mean ?? 0) + // Vert
      0.114 * (channels[2]?.mean ?? 0); // Bleu

    // Si la luminance est trop faible (image principalement noire)
    // ou si le contraste est trop faible (image uniforme)
    const isTooDark = luminance < 40; // Valeur sur 255

    // Vérifier également l'écart-type pour le contraste (variété des couleurs)
    const avgStdDev =
      ((channels[0]?.stdev ?? 0) +
        (channels[1]?.stdev ?? 0) +
        (channels[2]?.stdev ?? 0)) /
      3;
    const isLowContrast = avgStdDev < 15; // Valeur arbitraire pour le contraste

    return !isTooDark && !isLowContrast;
  } catch (error) {
    console.error("Error analyzing image:", error);
    return false; // En cas d'erreur, considérer l'image comme non utilisable
  }
};
