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
import { COLORS } from "../constants/theme";

import { StatusBar } from "expo-status-bar";

SplashScreen.preventAutoHideAsync();

const { width, height } = Dimensions.get("window");

type Props = {
  onFinish: () => void;
};

const CustomSplash = ({ onFinish }: Props) => {
  const [appIsReady, setAppIsReady] = useState(false);
  const [animationFinished, setAnimationFinished] = useState(false);

  const ripple1 = useRef(new Animated.Value(0)).current;
  const ripple2 = useRef(new Animated.Value(0)).current;
  const ripple3 = useRef(new Animated.Value(0)).current;

  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(20)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  const exitScale = useRef(new Animated.Value(1)).current;
  const exitOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    async function prepare() {
      try {
        await Font.loadAsync({
          "SpaceMono-Regular": require("../assets/fonts/SpaceMono-Regular.ttf"),
        });

        const images = [
          require("../assets/images/splashscreen_logo.png"),
        ];

        const cacheImages = images.map((image) =>
          Asset.fromModule(image).downloadAsync(),
        );
        await Promise.all(cacheImages);

        await new Promise((resolve) => setTimeout(resolve, 5000));
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
        tension: 20,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      }),
      Animated.stagger(500, [
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
      ]),
    ]).start();

    const createRipple = (animValue: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: 1,
            duration: 4000,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      );
    };

    const anim1 = createRipple(ripple1, 0);
    const anim2 = createRipple(ripple2, 1500);
    const anim3 = createRipple(ripple3, 3000);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, []);

  useEffect(() => {
    if (appIsReady) {
      SplashScreen.hideAsync();

      Animated.sequence([
        Animated.timing(exitScale, {
          toValue: 0.85,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.quad),
        }),
        Animated.parallel([
          Animated.timing(exitScale, {
            toValue: 40,
            duration: 2000,
            useNativeDriver: true,
            easing: Easing.in(Easing.cubic),
          }),
          Animated.timing(exitOpacity, {
            toValue: 0,
            duration: 1000,
            delay: 500,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        setAnimationFinished(true);
        onFinish();
      });
    }
  }, [appIsReady]);

  if (animationFinished) return null;

  return (
    <Animated.View style={[styles.container, { opacity: exitOpacity }]}>
      <StatusBar
        style="light"
        backgroundColor="transparent"
        translucent={true}
      />

      <LinearGradient
        colors={[COLORS.primary, "#006D77", "#00251a"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <Animated.View
        style={{
          alignItems: "center",
          justifyContent: "center",
          transform: [{ scale: exitScale }],
        }}
      >
        {[ripple1, ripple2, ripple3].map((ripple, index) => {
          const scale = ripple.interpolate({
            inputRange: [0, 1],
            outputRange: [0.8, 4],
          });
          const opacity = ripple.interpolate({
            inputRange: [0, 1],
            outputRange: [0.5, 0],
          });
          return (
            <Animated.View
              key={index}
              style={[styles.ripple, { transform: [{ scale }], opacity }]}
            />
          );
        })}

        <Animated.View
          style={{ transform: [{ scale: logoScale }], opacity: logoOpacity }}
        >
          <Image
            source={require("../assets/images/splashscreen_logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>
      </Animated.View>

      <Animated.View
        style={[
          styles.textContainer,
          {
            opacity: Animated.multiply(textOpacity, exitOpacity),
            transform: [{ translateY: textTranslateY }],
          },
        ]}
      >
        <Text style={styles.titleText}>ParkEase Haven</Text>
        <Text 
          style={styles.subtitleText} 
          numberOfLines={1} 
          adjustsFontSizeToFit={true}
        >
          SMART PARKING SOLUTION
        </Text>
      </Animated.View>
    </Animated.View>
  );
};

export default CustomSplash;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 99999,
    backgroundColor: COLORS.primary,
  },
  logo: {
    width: width * 0.45,
    height: width * 0.45,
    zIndex: 10,
  },
  ripple: {
    position: "absolute",
    width: width * 0.45,
    height: width * 0.45,
    borderRadius: (width * 0.45) / 2,
    borderColor: "rgba(131, 197, 190, 0.4)",
    borderWidth: 1.5,
    backgroundColor: "rgba(131, 197, 190, 0.05)",
    zIndex: 1,
  },
  textContainer: {
    position: "absolute",
    bottom: height * 0.15,
    alignItems: "center",
    width: "90%", // FIX: Ensures container spans width so centering works
  },
  titleText: {
    color: "#FFFFFF",
    fontSize: 26,
    fontFamily: "SpaceMono-Regular",
    fontWeight: "bold",
    letterSpacing: 1,
    textAlign: "center", // FIX: Ensure title centers too
  },
  subtitleText: {
    color: "#83C5BE",
    fontSize: 10,
    fontFamily: "SpaceMono-Regular",
    marginTop: 8,
    letterSpacing: 3,
    fontWeight: "600",
    textAlign: "center", // FIX: Center alignment
    width: "100%",       // FIX: Use full container width
  },
});