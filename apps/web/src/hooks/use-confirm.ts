/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useRef, useState } from "react";

export const useConfirm = <T extends (...args: any[]) => any>(
  actionFn: T,
  timeout = 5000,
) => {
  const [isConfirm, setIsConfirm] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const action = useCallback(
    (...args: Parameters<T>) => {
      if (!isConfirm) {
        setIsConfirm(true);
        timeoutRef.current = setTimeout(() => {
          setIsConfirm(false);
        }, timeout);
        return;
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setIsConfirm(false);
      return actionFn(...args);
    },
    [actionFn, isConfirm, timeout],
  );

  return {
    action,
    isConfirm,
  };
};
