const TARGET_PREVIEW_BYTES = 1_800_000;
const MAX_PREVIEW_WIDTH = 1920;
const MAX_PREVIEW_HEIGHT = 1200;
const JPEG_QUALITIES = [0.82, 0.7, 0.58, 0.46] as const;

export type NormalizedPreviewResult =
  | { success: true; dataUrl: string }
  | { success: false; error: string };

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function canvasToJpeg(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );
}

export async function normalizePreviewDataUrl(
  screenshotDataUrl: string,
): Promise<NormalizedPreviewResult> {
  try {
    const initialBlob = await fetch(screenshotDataUrl).then((response) =>
      response.blob(),
    );
    if (initialBlob.size <= TARGET_PREVIEW_BYTES) {
      return { success: true, dataUrl: screenshotDataUrl };
    }

    const bitmap = await createImageBitmap(initialBlob);
    try {
      let scale = Math.min(
        1,
        MAX_PREVIEW_WIDTH / bitmap.width,
        MAX_PREVIEW_HEIGHT / bitmap.height,
      );

      for (const quality of JPEG_QUALITIES) {
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const context = canvas.getContext("2d", { alpha: false });
        if (!context) break;

        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const encoded = await canvasToJpeg(canvas, quality);
        if (encoded && encoded.size <= TARGET_PREVIEW_BYTES) {
          return { success: true, dataUrl: await blobToDataUrl(encoded) };
        }
        scale *= 0.78;
      }
    } finally {
      bitmap.close();
    }

    return {
      success: false,
      error: "Chrome's preview is too large to upload safely.",
    };
  } catch {
    return {
      success: false,
      error: "Chrome captured the tab, but the preview could not be prepared.",
    };
  }
}
