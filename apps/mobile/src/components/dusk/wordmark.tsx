import { Text as RNText, type TextStyle } from "react-native";

const overImageShadow: TextStyle = {
  textShadowColor: "rgba(18, 10, 16, 0.7)",
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 12,
};

/**
 * "SaveIt.now" wordmark in the landing serif, ".now" in the peach primary.
 * `overImage` adds the same soft text shadow the web landing uses on photos.
 */
export function DuskWordmark({
  size = 20,
  overImage = false,
}: {
  size?: number;
  overImage?: boolean;
}) {
  return (
    <RNText
      accessibilityRole="header"
      className="font-serif text-dusk-fg"
      style={[{ fontSize: size, lineHeight: size * 1.2 }, overImage ? overImageShadow : null]}
    >
      SaveIt
      <RNText className="font-serif text-dusk-primary">.now</RNText>
    </RNText>
  );
}
