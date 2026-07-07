import { BlurView } from "expo-blur";
import type { ReactNode } from "react";
import { useState } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedProps,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useThemeColors } from "../../lib/theme";
import { Text } from "./text";

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

export type BlurHeaderScreenProps = {
  title: string;
  trailing?: ReactNode;
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  contentTopOffset?: number;
  headerTopPadding?: number;
  headerTopOffset?: number;
  scrollEnabled?: boolean;
};

export function BlurHeaderScreen({
  title,
  trailing,
  children,
  contentContainerStyle,
  contentTopOffset = 20,
  headerTopPadding,
  headerTopOffset = 10,
  scrollEnabled = true,
}: BlurHeaderScreenProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const [headerHeight, setHeaderHeight] = useState(insets.top + 72);

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const blurAnimatedProps = useAnimatedProps(() => ({
    intensity: interpolate(
      scrollY.value,
      [0, 56],
      [58, 86],
      Extrapolation.CLAMP,
    ),
  }));

  const borderAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [8, 48], [0, 1], Extrapolation.CLAMP),
  }));

  return (
    <View className="flex-1 bg-background">
      <Animated.ScrollView
        className="flex-1"
        scrollEnabled={scrollEnabled}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={[
          {
            paddingTop: headerHeight + contentTopOffset,
            paddingBottom: insets.bottom + 28,
          },
          contentContainerStyle,
        ]}
      >
        {children}
      </Animated.ScrollView>

      <Animated.View
        pointerEvents="box-none"
        onLayout={(event) =>
          setHeaderHeight(Math.round(event.nativeEvent.layout.height))
        }
        className="absolute left-0 right-0 top-0 z-10"
      >
        <AnimatedBlurView
          tint={colors.isDark ? "dark" : "light"}
          animatedProps={blurAnimatedProps}
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: colors.isDark
                ? "rgba(10, 10, 10, 0.48)"
                : "rgba(255, 255, 255, 0.48)",
            },
          ]}
        />
        <Animated.View
          style={[
            {
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: StyleSheet.hairlineWidth,
              backgroundColor: colors.border,
            },
            borderAnimatedStyle,
          ]}
        />
        <View
          className="flex-row items-center justify-between px-4 pb-3"
          style={{
            paddingTop: headerTopPadding ?? insets.top + headerTopOffset,
          }}
        >
          <Text variant="title" className="text-[32px] leading-[38px]">
            {title}
          </Text>
          {trailing ? (
            <View className="flex-row items-center gap-2">{trailing}</View>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
}
