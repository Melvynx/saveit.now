"use client";

import { CardHeader } from "@workspace/ui/components/card";
import { ReactNode } from "react";
import useMeasure from "react-use-measure";

const HEADER_HEIGHT = 213;

interface BookmarkCardHeaderProps {
  children:
    | ReactNode
    | ((bounds: { width: number; height: number }) => ReactNode);
  height?: number;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export const BookmarkCardHeader = ({
  children,
  height = HEADER_HEIGHT,
  className = "",
  onClick,
  style,
}: BookmarkCardHeaderProps) => {
  const [ref, bounds] = useMeasure();

  const renderedChildren =
    typeof children === "function" ? children(bounds) : children;

  return (
    <CardHeader
      className={`relative flex flex-col p-0 rounded-xl border ${className}`}
      style={{
        height,
        overflow: "hidden",
        ...style,
      }}
      ref={ref}
      onClick={onClick}
    >
      {renderedChildren}
    </CardHeader>
  );
};

export { HEADER_HEIGHT };
