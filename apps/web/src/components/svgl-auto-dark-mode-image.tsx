import { useTheme } from "@/features/dark-mode/theme-provider";
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
  const { theme } = useTheme();
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  const src = `https://svgl.app/library/${isDark ? darkIconName : lightIconName}.svg`;

  return (
    <img src={src} alt={isDark ? darkIconName : lightIconName} {...imgProps} />
  );
};
