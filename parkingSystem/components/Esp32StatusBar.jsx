import React, { useEffect, useRef } from "react";
import {
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
  View
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useEsp32 } from "../contexts/Esp32Context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { COLORS, SHADOWS } from "../constants/theme";

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

  const handleRefresh = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    checkESP32Status();
  };

  let statusText = "Connecting...";
  let colors = [COLORS.gray400, COLORS.gray500];
  let iconName = "loading";

  if (checking) {
    statusText = "Checking...";
    colors = [COLORS.warning, "#FFB74D"];
  } else if (esp32Online) {
    statusText = "System Online";
    colors = [COLORS.success, "#66BB6A"];
    iconName = "check-circle-outline";
  } else {
    statusText = "System Offline";
    colors = [COLORS.error, "#EF5350"];
    iconName = "alert-circle-outline";
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.pill}
      >
        <View style={styles.contentRow}>
          {checking ? (
             <ActivityIndicator size="small" color={COLORS.white} style={{ marginRight: 6 }} />
          ) : (
             <MaterialCommunityIcons name={iconName} size={25} color={COLORS.white} style={{ marginRight: 10 }} />
          )}
          
          <Text style={styles.text}>{statusText}</Text>
        </View>
        {!checking && (
          <TouchableOpacity
            onPress={handleRefresh}
            style={styles.refreshBtn}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="refresh" size={21} color={COLORS.white} />
          </TouchableOpacity>
        )}
      </LinearGradient>
    </Animated.View>
  );
};

export default Esp32StatusBar;

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginTop: 2,
    marginBottom: 2,
    zIndex: 100,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    minWidth: 360,
    minHeight: 10,
    ...SHADOWS.small,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 0.8,
  },
  refreshBtn: {
    marginLeft: 12,
    paddingLeft: 12,
    borderLeftWidth: 1,
    borderLeftColor: "rgba(255,255,255,0.3)",
  },
});