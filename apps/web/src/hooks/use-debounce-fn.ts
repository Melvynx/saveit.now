import { useRef } from 'react';

export const useDebounceFn = <T extends unknown[]>(
  callback: (...args: T) => void,
  time = 300
) => {
  const debounce = useRef<number>(0);

  const onDebounce = (...args: T) => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      callback(...args);
    }, time) as unknown as number;
  };

  return onDebounce;
};
