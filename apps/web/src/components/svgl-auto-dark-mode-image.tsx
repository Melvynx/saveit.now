/* eslint-disable @next/next/no-img-element */
import { useTheme } from "next-themes";
import { ImgHTMLAttributes } from "react";

type SvglImgProps = {
  lightIconName: string;
  darkIconName: string;
} & Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt">;

export const SvglImg = ({
  lightIconName,
  darkIconName,
  ...imgProps
}: SvglImgProps) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const src = `https://svgl.app/library/${isDark ? darkIconName : lightIconName}.svg`;

  return (
    <img src={src} alt={isDark ? darkIconName : lightIconName} {...imgProps} />
  );
};
