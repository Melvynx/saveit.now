import { useEffect, useState } from "react";

export const useCountdown = (initialCount: number) => {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    if (count <= 0) return;

    const interval = setInterval(() => {
      setCount((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [count]);

  return {
    count,
    isCountdownFinished: count <= 0,
    reset: () => setCount(initialCount),
  };
};
