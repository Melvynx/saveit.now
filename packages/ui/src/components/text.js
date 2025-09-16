"use client"; // @NOTE: Add in case you are using Next.js
import { createElement as _createElement } from "react";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as Slot from "@radix-ui/react-slot";
import { cn } from "@workspace/ui/lib/utils";
import { motion } from "motion/react";
const variants = [
    {
        variant: "shine",
        component: ({ children, className, ...props }) => (_jsx(motion.span, { ...props, className: cn("bg-[linear-gradient(110deg,#bfbfbf,35%,#000,50%,#bfbfbf,75%,#bfbfbf)] dark:bg-[linear-gradient(110deg,#404040,35%,#fff,50%,#404040,75%,#404040)]", "bg-[length:200%_100%] bg-clip-text text-transparent", className), initial: { backgroundPosition: "200% 0" }, animate: { backgroundPosition: "-200% 0" }, transition: {
                repeat: Number.POSITIVE_INFINITY,
                duration: 2,
                ease: "linear",
            }, children: children })),
    },
    {
        variant: "generate-effect",
        component: ({ children, className, ...props }) => {
            if (typeof children !== "string")
                return null;
            return (_jsx("div", { className: "inline-block whitespace-pre", children: children.split("").map((char, index) => (_createElement(motion.span, { ...props, key: char + String(index), className: cn("inline-block whitespace-pre text-primary-foreground", className), initial: { opacity: 0, filter: "blur(4px)", rotateX: 90, y: 5 }, whileInView: {
                        opacity: 1,
                        filter: "blur(0px)",
                        rotateX: 0,
                        y: 0,
                    }, transition: {
                        ease: "easeOut",
                        duration: 0.3,
                        delay: index * 0.015,
                    }, viewport: { once: true } }, char))) }));
        },
    },
    {
        variant: "glitch",
        component: ({ children, className, ...props }) => (_jsxs("div", { className: "group relative overflow-hidden font-medium", children: [_jsx("span", { ...props, className: cn("invisible", className), children: children }), _jsx("span", { ...props, className: cn("absolute top-0 left-0 text-primary-muted transition-transform duration-500 ease-in-out", "group-hover:-translate-y-full hover:duration-300", className), children: children }), _jsx("span", { ...props, className: cn("absolute top-0 left-0 translate-y-full text-primary-muted transition-transform duration-500", "ease-in-out hover:duration-300 group-hover:translate-y-0", className), children: children })] })),
    },
    {
        variant: "hover-enter",
        component: ({ children, className, ...props }) => {
            if (typeof children !== "string")
                return null;
            const DURATION = 0.25;
            const STAGGER = 0.025;
            const letters = children
                .split("")
                .map((letter) => (letter === " " ? "\u00A0" : letter));
            return (_jsxs(motion.span, { ...props, className: cn("relative block select-none overflow-hidden whitespace-nowrap text-primary-muted", className), initial: "initial", whileHover: "hovered", style: { lineHeight: 0.9 }, children: [_jsx("div", { children: letters.map((letter, i) => (_jsx(motion.span, { className: "inline-block", variants: {
                                initial: { y: 0 },
                                hovered: { y: "-100%" },
                            }, transition: {
                                duration: DURATION,
                                ease: "easeInOut",
                                delay: STAGGER * i,
                            }, children: letter }, String(i)))) }), _jsx("div", { className: cn("absolute inset-0"), children: letters.map((letter, i) => (_jsx(motion.span, { className: "inline-block", variants: {
                                initial: { y: "100%" },
                                hovered: { y: 0 },
                            }, transition: {
                                duration: DURATION,
                                ease: "easeInOut",
                                delay: STAGGER * i,
                            }, children: letter }, String(i)))) })] }));
        },
    },
    {
        variant: "shake",
        component: ({ children, className, ...props }) => (_jsx("span", { ...props, className: cn("text-primary-muted hover:animate-text-shake", className), children: children })),
    },
    {
        variant: "hover-decoration",
        component: ({ children, className, ...props }) => (_jsx("div", { className: cn("relative after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:origin-bottom-right", "after:scale-x-0 after:bg-primary-muted after:transition-transform after:duration-300 after:ease-in-out hover:after:origin-bottom-left hover:after:scale-x-100"), children: _jsx("span", { ...props, className: cn("text-primary-muted", className), children: children }) })),
    },
];
export function Text({ variant = "shine", className, ...props }) {
    const FALLBACK_INDEX = 0;
    const variantComponent = variants.find((v) => v.variant === variant)?.component;
    const Component = variantComponent || variants[FALLBACK_INDEX].component;
    return (_jsx(Slot.Root, { className: cn("font-medium text-sm"), children: _jsx(Component, { ...props, className: className }) }));
}
