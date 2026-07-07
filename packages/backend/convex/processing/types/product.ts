export type ProductMetadata = {
  price?: number;
  currency?: string;
  brand?: string;
  availability?: string;
  description?: string;
  category?: string;
  [key: string]: unknown;
};
