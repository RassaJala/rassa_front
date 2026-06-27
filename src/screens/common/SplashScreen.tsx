import React, { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet } from "react-native";

export default function SplashScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoEmoji}>🌿</Text>
        </View>
        <Text style={styles.title}>Rassa</Text>
        <Text style={styles.subtitle}>Tu mercado agrícola</Text>
        <View style={styles.dots}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.dot, { opacity: 0.4 + i * 0.2 }]} />
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#16a34a",
    justifyContent: "center",
    alignItems: "center",
  },
  content: { alignItems: "center" },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  logoEmoji: { fontSize: 52 },
  title: { fontSize: 48, fontWeight: "900", color: "#fff", letterSpacing: 2 },
  subtitle: { fontSize: 18, color: "rgba(255,255,255,0.8)", marginTop: 8, marginBottom: 40 },
  dots: { flexDirection: "row", gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#fff" },
});
