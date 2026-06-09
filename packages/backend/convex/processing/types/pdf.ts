export type PdfMetadata = {
  pdfUrl?: string | null;
  originalUrl?: string;
  fileSize?: number;
  screenshotUrl?: string | null;
  [key: string]: unknown;
};
