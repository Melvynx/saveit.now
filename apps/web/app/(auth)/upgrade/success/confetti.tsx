"use client";

import { Button } from "@workspace/ui/components/button";
import confetti from "canvas-confetti";
import { useEffect } from "react";

export default function ConfettiBurst() {
  const fireConfetti = () => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors: ["oklch(0.77 0.16 70.08)", "oklch(0 0 0)"],
      });

      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors: ["oklch(0.77 0.16 70.08)", "oklch(0 0 0)"],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  };

  useEffect(() => {
    fireConfetti();
  }, []);

  return (
    <Button onClick={fireConfetti} variant="ghost">
      Add more confetti 🎉
    </Button>
  );
}
