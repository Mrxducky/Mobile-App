import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";

const { width, height } = Dimensions.get("window");

export default function SplashPage() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const poweredFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(200),
      Animated.timing(poweredFade, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.delay(1200),
    ]).start(() => {
      router.replace("/(tabs)");
    });
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.bg} />
      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <Animated.View style={[styles.logoWrap, { transform: [{ scale: logoScale }] }]}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>📍</Text>
          </View>
        </Animated.View>

        <Text style={styles.appName}>Talabat COD Finder</Text>
        <Text style={styles.tagline}>Qatar's fastest COD machine locator</Text>

        <View style={styles.illustrationWrap}>
          <Image
            source={require("../assets/images/splash-illustration.png")}
            style={styles.illustration}
            resizeMode="contain"
          />
        </View>
      </Animated.View>

      <Animated.View style={[styles.powered, { opacity: poweredFade }]}>
        <Text style={styles.poweredBy}>Powered By</Text>
        <Text style={styles.studio}>R &amp; L Studio</Text>
      </Animated.View>

      <View style={styles.pulseRing1} />
      <View style={styles.pulseRing2} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FF5A00",
    alignItems: "center",
    justifyContent: "center",
    ...(Platform.OS === "web" ? { paddingTop: 67, paddingBottom: 34 } : {}),
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#FF5A00",
  },
  pulseRing1: {
    position: "absolute",
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width * 0.6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    top: -width * 0.4,
    left: -width * 0.1,
  },
  pulseRing2: {
    position: "absolute",
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    bottom: -width * 0.2,
    right: -width * 0.2,
  },
  content: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  logoWrap: {
    marginBottom: 20,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
  },
  logoEmoji: {
    fontSize: 44,
  },
  appName: {
    fontFamily: "Poppins_700Bold",
    fontSize: 28,
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  tagline: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginTop: 6,
    textAlign: "center",
  },
  illustrationWrap: {
    width: width * 0.75,
    height: height * 0.3,
    marginTop: 32,
  },
  illustration: {
    width: "100%",
    height: "100%",
  },
  powered: {
    position: "absolute",
    bottom: Platform.OS === "web" ? 60 : 48,
    alignItems: "center",
  },
  poweredBy: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  studio: {
    fontFamily: "Poppins_700Bold",
    fontSize: 16,
    color: "#FFFFFF",
    letterSpacing: 1,
  },
});
