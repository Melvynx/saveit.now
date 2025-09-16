import * as React from "react";
export const useDebounce = (value, delay = 500) => {
    const [debouncedValue, setDebouncedValue] = React.useState(value);
    React.useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        // Cancel the timeout if value changes (also on delay change or unmount)
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
};
