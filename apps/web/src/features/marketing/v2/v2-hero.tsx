"use client";

import { APP_LINKS } from "@/lib/app-links";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import { LandingAppButton } from "../landing-app-button";

const TRUST_SIGNALS = [
  "Free forever",
  "20 bookmarks",
  "No credit card",
  "Web + iOS",
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.4, 0.25, 1] as const },
  },
};

export const V2Hero = () => {
  return (
    <section className="px-6 pt-24 sm:pt-28">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-white/[0.08]">
        {/* Background: the glowing house on the hill */}
        <img
          src="/images/landing/v2/home.webp"
          alt=""
          fetchPriority="high"
          className="absolute inset-0 size-full object-cover object-[center_30%]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#120a10]/50 via-[#120a10]/20 to-[#120a10]/90" />
        <div className="v2-noise absolute inset-0 z-[1]" />

        <div className="relative z-[2] px-6 pb-20 pt-16 sm:px-12 sm:pb-28 sm:pt-24 lg:px-16">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-center text-center"
          >
            <motion.div variants={itemVariants}>
              <span className="text-[13px] tracking-wide text-[#ffd9c2]">
                Agentic bookmarks · Web + iOS
              </span>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="v2-display mt-6 text-5xl tracking-tight text-white [text-shadow:0_2px_40px_rgba(18,10,16,0.55)] sm:text-6xl lg:text-7xl"
            >
              A home for everything
              <br />
              <em>you save.</em>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-[#f3dfd6] [text-shadow:0_1px_20px_rgba(18,10,16,0.7)]"
            >
              One tap to save any link. An AI agent reads it, files it, and
              hands it back the moment you ask. You never organize a thing.
            </motion.p>

            <motion.div
              variants={itemVariants}
              className="mt-8 flex flex-wrap items-center justify-center gap-3"
            >
              <LandingAppButton
                className="h-10 rounded-full border border-white/10 bg-white/10 px-6 text-sm font-medium text-white backdrop-blur-sm transition-[background-color,transform] hover:bg-white/20 active:scale-[0.96]"
                signedOutChildren={
                  <>
                    Start saving free
                    <ArrowRight className="ml-1 size-3.5" />
                  </>
                }
              />
              <a
                href={APP_LINKS.ios}
                className="inline-flex h-10 items-center rounded-full border border-white/10 bg-transparent px-6 text-sm font-medium text-[#ffd9c2] transition-[background-color,color,transform] hover:bg-white/5 hover:text-white active:scale-[0.96]"
              >
                Get the iOS app
              </a>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="mt-4 flex flex-wrap items-center justify-center gap-3 text-[13px] text-[#e8cfc4]/70"
            >
              {TRUST_SIGNALS.map((signal, i) => (
                <span key={signal}>
                  {signal}
                  {i < TRUST_SIGNALS.length - 1 && (
                    <span className="ml-3">-</span>
                  )}
                </span>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
