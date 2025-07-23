"use client";

import { Typography } from "@workspace/ui/components/typography";
import { useIsClient } from "@workspace/ui/hooks/use-is-client";
import { cn } from "@workspace/ui/lib/utils";
import { X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useLocalStorage } from "react-use";
import styles from "./ProductHuntCat.module.css";

export const ProductHuntCat = () => {
  const [open, setOpen] = useLocalStorage("product-hunt-cat", true);
  const isClient = useIsClient();

  if (!isClient) {
    return;
  }

  if (!open) {
    return;
  }

  return (
    <Link
      href="https://mlv.sh/saveit"
      className={cn(
        "flex  items-center shadow-md fixed bottom-4 gap-3 left-4 bg-gradient-to-r from-teal-200 to-lime-200 p-4 rounded-xl z-50",
        styles.slideInFromBottom,
      )}
    >
      <div
        className="absolute right-2 top-2 p-1 bg-background/40 rounded-md hover:bg-background/80 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen(false);
        }}
      >
        <X />
      </div>
      <Image
        src="/images/product-hunt-cat.png"
        width={64}
        height={64}
        alt="Product Hunt Cat"
        className="drop-shadow-xl"
      />
      <div className="flex flex-col text-black gap-0.5">
        <Typography variant="large">
          We're live on{" "}
          <span className="underline decoration-2 hover:decoration-4">
            Product Hunt
          </span>{" "}
          now!
        </Typography>
        <Typography>Would love your support and feedback! 🙏</Typography>
      </div>
    </Link>
  );
};
