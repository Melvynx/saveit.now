"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

type V2RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

export const V2Reveal = ({ children, className, delay = 0 }: V2RevealProps) => {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.55, delay, ease: [0.25, 0.4, 0.25, 1] }}
    >
      {children}
    </motion.div>
  );
};
