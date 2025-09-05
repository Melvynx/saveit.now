export const formatPrice = (
  price: number,
  currency: string = "USD",
  locale: string = "fr-FR",
): string => {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).format(price);
  } catch {
    return `${price} ${currency}`;
  }
};

