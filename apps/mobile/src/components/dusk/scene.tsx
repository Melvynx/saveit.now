import { Image, type ImageProps } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { cn } from "../../lib/utils";

export type DuskSceneProps = {
  source: ImageProps["source"];
  children?: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  imagePosition?: ImageProps["contentPosition"];
  scrim?: "bottom" | "top" | "both";
};

/**
 * Scenic image card for dusk surfaces: a rounded, hairline-bordered frame
 * holding one of the landing photographs behind a #120a10 gradient scrim so
 * overlaid text stays legible. Children lay out normally on top of the image.
 */
export function DuskScene({
  source,
  children,
  className,
  style,
  imagePosition = "center",
  scrim = "bottom",
}: DuskSceneProps) {
  return (
    <View
      className={cn(
        "overflow-hidden rounded-[28px] border border-white/10 bg-dusk-card",
        className,
      )}
      style={style}
    >
      <Image
        source={source}
        contentFit="cover"
        contentPosition={imagePosition}
        style={StyleSheet.absoluteFill}
        transition={220}
        accessible={false}
      />
      {scrim === "bottom" || scrim === "both" ? (
        <LinearGradient
          colors={[
            "rgba(18, 10, 16, 0)",
            "rgba(18, 10, 16, 0.45)",
            "rgba(18, 10, 16, 0.92)",
          ]}
          locations={[0.4, 0.72, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      ) : null}
      {scrim === "top" || scrim === "both" ? (
        <LinearGradient
          colors={["rgba(18, 10, 16, 0.55)", "rgba(18, 10, 16, 0)"]}
          locations={[0, 0.5]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      ) : null}
      {children}
    </View>
  );
}
