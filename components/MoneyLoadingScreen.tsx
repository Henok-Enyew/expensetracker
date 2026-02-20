import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { useColors } from "@/contexts/ThemeContext";

const COIN_SIZE = 44;
const COIN_GAP = 12;

function Coin({ delay, index }: { delay: number; index: number }) {
  const c = useColors();
  const scale = useSharedValue(0.92);
  const opacity = useSharedValue(0.85);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1.12, { duration: 500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.92, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      ),
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 500 }),
          withTiming(0.85, { duration: 500 }),
        ),
        -1,
        true,
      ),
    );
  }, [delay, scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.coinOuter, animatedStyle]}>
      <View
        style={[
          styles.coinInner,
          {
            backgroundColor: index === 0 ? c.primary : index === 1 ? c.accent : c.income,
            borderColor: index === 0 ? c.primaryDark : index === 1 ? "#d95a32" : "#1a9e3e",
          },
        ]}
      >
        <View
          style={[
            styles.coinHighlight,
            { backgroundColor: index === 0 ? c.primaryLight : "rgba(255,255,255,0.35)" },
          ]}
        />
      </View>
    </Animated.View>
  );
}

function AnimatedRing() {
  const c = useColors();
  const scale = useSharedValue(0.7);
  const opacity = useSharedValue(0.35);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.35, { duration: 1400, easing: Easing.out(Easing.ease) }),
        withTiming(0.7, { duration: 0 }),
      ),
      -1,
      false,
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 1400, easing: Easing.out(Easing.ease) }),
        withTiming(0.35, { duration: 0 }),
      ),
      -1,
      false,
    );
  }, [scale, opacity]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[styles.ring, { borderColor: c.primary }, ringStyle]}
      pointerEvents="none"
    />
  );
}

function LoadingDots() {
  const c = useColors();
  const dot1 = useSharedValue(0.4);
  const dot2 = useSharedValue(0.4);
  const dot3 = useSharedValue(0.4);

  useEffect(() => {
    dot1.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 200 }),
        withDelay(200, withTiming(0.4, { duration: 400 })),
        withDelay(0, withTiming(0.4, { duration: 0 })),
      ),
      -1,
      false,
    );
    dot2.value = withDelay(
      266,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 200 }),
          withDelay(200, withTiming(0.4, { duration: 400 })),
          withDelay(0, withTiming(0.4, { duration: 0 })),
        ),
        -1,
        false,
      ),
    );
    dot3.value = withDelay(
      533,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 200 }),
          withDelay(200, withTiming(0.4, { duration: 400 })),
          withDelay(0, withTiming(0.4, { duration: 0 })),
        ),
        -1,
        false,
      ),
    );
  }, [dot1, dot2, dot3]);

  const d1Style = useAnimatedStyle(() => ({ opacity: dot1.value }));
  const d2Style = useAnimatedStyle(() => ({ opacity: dot2.value }));
  const d3Style = useAnimatedStyle(() => ({ opacity: dot3.value }));

  return (
    <View style={styles.dotsRow}>
      <Animated.Text style={[styles.dots, { color: c.textSecondary }, d1Style]}>.</Animated.Text>
      <Animated.Text style={[styles.dots, { color: c.textSecondary }, d2Style]}>.</Animated.Text>
      <Animated.Text style={[styles.dots, { color: c.textSecondary }, d3Style]}>.</Animated.Text>
    </View>
  );
}

export function MoneyLoadingScreen() {
  const c = useColors();

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={styles.coinStack}>
        <AnimatedRing />
        <View style={styles.coinsRow}>
          <Coin delay={0} index={0} />
          <Coin delay={180} index={1} />
          <Coin delay={360} index={2} />
        </View>
      </View>
      <Text style={[styles.title, { color: c.text }]}>Getting your finances ready</Text>
      <View style={styles.dotsWrap}>
        <Text style={[styles.subtitle, { color: c.textSecondary }]}>Securing Birr Track</Text>
        <LoadingDots />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  coinStack: {
    position: "relative",
    marginBottom: 28,
  },
  ring: {
    position: "absolute",
    width: COIN_SIZE * 3 + COIN_GAP * 2 + 32,
    height: COIN_SIZE * 3 + COIN_GAP * 2 + 32,
    borderRadius: 999,
    borderWidth: 2,
    alignSelf: "center",
    top: -16,
    left: -((COIN_SIZE * 3 + COIN_GAP * 2 + 32) / 2 - (COIN_SIZE * 3 + COIN_GAP * 2) / 2),
  },
  coinsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: COIN_GAP,
  },
  coinOuter: {
    width: COIN_SIZE,
    height: COIN_SIZE,
    borderRadius: COIN_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  coinInner: {
    width: COIN_SIZE - 4,
    height: COIN_SIZE - 4,
    borderRadius: (COIN_SIZE - 4) / 2,
    borderWidth: 2,
    overflow: "hidden",
    justifyContent: "flex-start",
    alignItems: "center",
  },
  coinHighlight: {
    position: "absolute",
    top: 2,
    left: "50%",
    marginLeft: -8,
    width: 16,
    height: 8,
    borderRadius: 4,
    opacity: 0.9,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  dotsWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  subtitle: {
    fontSize: 14,
  },
  dotsRow: {
    flexDirection: "row",
    marginLeft: 2,
  },
  dots: {
    fontSize: 14,
    fontWeight: "700",
  },
});
