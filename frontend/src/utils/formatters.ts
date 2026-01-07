/**
 * Formats a number as a currency string (USD).
 * Returns '$0' if the value is null, undefined, or NaN.
 */
export const formatCurrency = (value: number | undefined | null): string => {
    if (value === undefined || value === null || isNaN(value)) {
        return '$0';
    }
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
};

/**
 * Formats a number as a compact currency string (e.g., $1.5k, $2M).
 * Returns '$0' if the value is null, undefined, or NaN.
 */
export const formatCompactCurrency = (value: number | undefined | null): string => {
    if (value === undefined || value === null || isNaN(value)) {
        return '$0';
    }

    if (value === 0) return '$0';

    if (Math.abs(value) >= 1_000_000) {
        return `$${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    }
    if (Math.abs(value) >= 1_000) {
        return `$${(value / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
    }

    return formatCurrency(value);
};

/**
 * Formats a date string or object into a localized string.
 * Returns 'N/A' if the value is null, undefined, or invalid.
 */
export const formatDate = (date: string | Date | undefined | null, options?: Intl.DateTimeFormatOptions): string => {
    if (!date) return 'N/A';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'N/A';

    return d.toLocaleDateString('en-US', options || { year: 'numeric', month: 'long', day: 'numeric' });
};
