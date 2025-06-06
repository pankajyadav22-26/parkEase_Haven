import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useEsp32 } from "../contexts/Esp32Context";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

const Esp32StatusBar = () => {
  const { esp32Online, checking, checkESP32Status } = useEsp32();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [esp32Online]);

  let statusText = "Checking ESP32...";
  let colors = ["#bdc3c7", "#95a5a6"];
  let glowStyle = {};

  if (esp32Online === true) {
    statusText = "ESP32 Online";
    colors = ["#00c853", "#2ecc71"];
    glowStyle = {
      shadowColor: "#2ecc71",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.7,
      shadowRadius: 8,
      elevation: 10,
    };
  } else if (esp32Online === false) {
    statusText = "ESP32 Offline";
    colors = ["#e74c3c", "#c0392b"];
  }

  const handleRefresh = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    checkESP32Status();
  };

  return (
    <Animated.View style={[{ opacity: fadeAnim }]}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.container, glowStyle]}
      >
        <Text style={styles.text}>{statusText}</Text>

        {checking ? (
          <ActivityIndicator size="small" color="#fff" style={styles.icon} />
        ) : (
          <Pressable
            onPress={handleRefresh}
            android_ripple={{ color: "#ffffff44", borderless: true }}
          >
            <MaterialIcons name="refresh" size={22} color="#fff" style={styles.icon} />
          </Pressable>
        )}
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 4,
    zIndex: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ddd",
  },
  text: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  icon: {
    marginLeft: 10,
  },
});

export default Esp32StatusBar;