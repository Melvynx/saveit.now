export const formatPrice = (price, currency = "USD", locale = "fr-FR") => {
    try {
        return new Intl.NumberFormat(locale, {
            style: "currency",
            currency,
        }).format(price);
    }
    catch {
        return `${price} ${currency}`;
    }
};
