import {
  StyleSheet,
  View,
  Image,
  Animated,
  Dimensions,
  Easing,
  Text,
} from "react-native";
import React, { useEffect, useRef, useState } from "react";
import * as SplashScreen from "expo-splash-screen";
import * as Font from "expo-font";
import { Asset } from "expo-asset";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { StatusBar } from "expo-status-bar";

import { COLORS } from "../constants/theme";

SplashScreen.preventAutoHideAsync();

const { width, height } = Dimensions.get("window");

type Props = {
  onFinish: () => void;
};

const CustomSplash = ({ onFinish }: Props) => {
  const [appIsReady, setAppIsReady] = useState(false);
  const [animationFinished, setAnimationFinished] = useState(false);

  const logoScale = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(20)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  
  const ripple1 = useRef(new Animated.Value(0)).current;
  const ripple2 = useRef(new Animated.Value(0)).current;
  
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const containerScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    async function prepare() {
      try {
        await Font.loadAsync({
          "SpaceMono-Regular": require("../assets/fonts/SpaceMono-Regular.ttf"),
        });

        const images = [require("../assets/images/splashscreen_logo.png")];
        const cacheImages = images.map((image) => Asset.fromModule(image).downloadAsync());
        await Promise.all(cacheImages);

        await new Promise((resolve) => setTimeout(resolve, 2500));
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }
    prepare();
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(300),
        Animated.parallel([
          Animated.timing(textOpacity, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(textTranslateY, {
            toValue: 0,
            duration: 800,
            easing: Easing.out(Easing.bezier(0.25, 0.1, 0.25, 1)),
            useNativeDriver: true,
          }),
        ])
      ])
    ]).start();
    const createRipple = (animValue: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: 1,
            duration: 3000,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(animValue, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      );
    };

    const r1 = createRipple(ripple1, 0);
    const r2 = createRipple(ripple2, 1500);

    r1.start();
    r2.start();

    return () => {
      r1.stop();
      r2.stop();
    };
  }, []);

  useEffect(() => {
    if (appIsReady) {
      SplashScreen.hideAsync();

      Animated.parallel([
        Animated.timing(containerScale, {
          toValue: 1.1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(containerOpacity, {
          toValue: 0,
          duration: 500,
          delay: 100,
          useNativeDriver: true,
        })
      ]).start(() => {
        setAnimationFinished(true);
        onFinish();
      });
    }
  }, [appIsReady]);

  if (animationFinished) return null;

  return (
    <Animated.View 
      style={[styles.container, { opacity: containerOpacity, transform: [{ scale: containerScale }] }]} 
      pointerEvents="none"
    >
      <StatusBar style="light" backgroundColor="transparent" translucent={true} />

      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <View style={styles.centerAnchor}>
        {[ripple1, ripple2].map((ripple, index) => {
          const scale = ripple.interpolate({
            inputRange: [0, 1],
            outputRange: [0.8, 2.5],
          });
          const opacity = ripple.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0, 0.3, 0],
          });
          return (
            <Animated.View
              key={index}
              style={[styles.ripple, { transform: [{ scale }], opacity }]}
            />
          );
        })}

        <Animated.View
          style={{
            alignItems: "center",
            justifyContent: "center",
            transform: [{ scale: logoScale }],
            opacity: logoOpacity
          }}
        >
          <Image
            source={require("../assets/images/splashscreen_logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>
      </View>

      <Animated.View
        style={[
          styles.textContainer,
          {
            opacity: textOpacity,
            transform: [{ translateY: textTranslateY }],
          },
        ]}
      >
        <Text style={styles.titleText}>ParkEase Haven</Text>
        <Text style={styles.subtitleText}>SMART VALLEY PARKING</Text>
      </Animated.View>

    </Animated.View>
  );
};

export default CustomSplash;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    backgroundColor: COLORS.primary,
  },
  centerAnchor: {
    position: 'absolute',
    top: height * 0.38,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: width * 0.42,
    height: width * 0.42,
    zIndex: 10,
  },
  ripple: {
    position: "absolute",
    width: width * 0.45,
    height: width * 0.45,
    borderRadius: (width * 0.45) / 2,
    borderColor: COLORS.white,
    borderWidth: 1.5,
    zIndex: 1,
  },
  textContainer: {
    position: "absolute",
    bottom: height * 0.15,
    alignItems: "center",
    width: "100%",
  },
  titleText: {
    color: COLORS.white,
    fontSize: 28,
    fontFamily: "SpaceMono-Regular",
    fontWeight: "800",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  subtitleText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontFamily: "SpaceMono-Regular",
    marginTop: 8,
    letterSpacing: 4,
    fontWeight: "700",
    textAlign: "center",
  },
});