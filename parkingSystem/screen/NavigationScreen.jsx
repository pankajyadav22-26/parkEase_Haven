import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  StatusBar,
} from "react-native";
import axios from "axios";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import * as Speech from "expo-speech";
import Svg, { Path, Defs, Pattern, Rect, Circle } from "react-native-svg";

import { backendUrl } from "../constants";
import { COLORS, SHADOWS } from "../constants/theme";
import { findAStarPath } from "../utils/AStar";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const MAP_PADDING = 24;

const NavigationScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { parkingLotId, targetSlotName } = route.params;

  const [roiData, setRoiData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEntranceTop, setIsEntranceTop] = useState(false);
  const [isParked, setIsParked] = useState(false);

  const [isMuted, setIsMuted] = useState(false);
  const [distanceLeft, setDistanceLeft] = useState(0);
  const [instruction, setInstruction] = useState("Calculating smart route...");

  const [svgPathStr, setSvgPathStr] = useState("");
  const [pathLength, setPathLength] = useState(0);

  const drawProgress = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const haloAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const textFadeAnim = useRef(new Animated.Value(1)).current;

  const puckPos = useRef(new Animated.ValueXY({ x: -100, y: -100 })).current;
  const puckRot = useRef(new Animated.Value(0)).current;
  const timeouts = useRef([]);

  const speakInstruction = (text) => {
    Animated.sequence([
      Animated.timing(textFadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(textFadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => setInstruction(text), 200);

    if (!isMuted) {
      Speech.speak(text);
    }
  };

  useEffect(() => {
    fetchLayout();

    const distListener = progressAnim.addListener(({ value }) => {
      const remainingPx = pathLength * (1 - value);
      const meters = Math.max(0, Math.round(remainingPx * 0.15));
      setDistanceLeft(meters);
    });

    return () => {
      timeouts.current.forEach(clearTimeout);
      [
        drawProgress,
        pulseAnim,
        haloAnim,
        opacityAnim,
        progressAnim,
        textFadeAnim,
        puckPos,
        puckRot,
      ].forEach((a) => a.stopAnimation());
      progressAnim.removeListener(distListener);
      Speech.stop();
    };
  }, [pathLength, isMuted]);

  const handleParkSuccess = () => {
    if (isParked) return;
    setIsParked(true);
    speakInstruction("Parking Secured. Have a great day!");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    timeouts.current.push(setTimeout(() => navigation.goBack(), 2500));
  };

  const fetchLayout = async () => {
    try {
      const res = await axios.get(`${backendUrl}/api/parkinglot/getRoi`, {
        params: { parkingLotId },
      });
      const data = res.data.roiData;

      if (!data || !data[targetSlotName]) {
        Alert.alert("Error", `Slot ${targetSlotName} not mapped.`);
        return navigation.goBack();
      }

      let maxX = 0,
        maxY = 0;
      Object.values(data).forEach(([x, y, w, h]) => {
        if (x + w > maxX) maxX = x + w;
        if (y + h > maxY) maxY = y + h;
      });

      const camW = maxX + 50,
        camH = maxY + 50;
      const mapHeight = SCREEN_HEIGHT * 0.65;
      const usableWidth = SCREEN_WIDTH - MAP_PADDING * 2;
      const usableHeight = mapHeight - MAP_PADDING * 2;

      const sX = (x) => (x / camW) * usableWidth + MAP_PADDING;
      const sY = (y) => (y / camH) * usableHeight + MAP_PADDING;

      const sortedSlots = Object.keys(data).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true }),
      );
      const entranceIsTop =
        data[sortedSlots[0]][1] < data[sortedSlots[sortedSlots.length - 1]][1];
      setIsEntranceTop(entranceIsTop);

      const obstaclesPx = Object.values(data).map(([x, y, w, h]) => ({
        x: sX(x),
        y: sY(y),
        w: (w / camW) * usableWidth,
        h: (h / camH) * usableHeight,
      }));

      const targetROI = data[targetSlotName];
      const tX = sX(targetROI[0]);
      const tW = (targetROI[2] / camW) * usableWidth;
      const tY = sY(targetROI[1]);
      const tH = (targetROI[3] / camH) * usableHeight;

      const startPx = {
        x: SCREEN_WIDTH / 2,
        y: entranceIsTop ? 10 : mapHeight - 10,
      };
      const isTargetRight = tX > SCREEN_WIDTH / 2;
      const endPx = {
        x: isTargetRight ? tX - 15 : tX + tW + 15,
        y: tY + tH / 2,
      };

      const path = findAStarPath(
        startPx,
        endPx,
        obstaclesPx,
        SCREEN_WIDTH,
        mapHeight,
        10,
      );

      if (!path || path.length === 0) {
        Alert.alert(
          "Routing Error",
          "Could not calculate a clear path to the slot.",
        );
        return navigation.goBack();
      }

      let pStr = `M ${path[0].x} ${path[0].y} `;
      let totalDist = 0;
      for (let i = 1; i < path.length; i++) {
        pStr += `L ${path[i].x} ${path[i].y} `;
        totalDist += Math.hypot(
          path[i].x - path[i - 1].x,
          path[i].y - path[i - 1].y,
        );
      }
      setSvgPathStr(pStr);
      setPathLength(totalDist + 10);
      setDistanceLeft(Math.round((totalDist + 10) * 0.15));

      setRoiData({ data, camW, camH, usableWidth, usableHeight });
      setLoading(false);

      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();

      timeouts.current.push(
        setTimeout(() => {
          speakInstruction("Proceed along the highlighted route.");
        }, 500),
      );

      timeouts.current.push(
        setTimeout(() => {
          Animated.timing(drawProgress, {
            toValue: 1,
            duration: 2500,
            useNativeDriver: false,
          }).start();
          Animated.timing(progressAnim, {
            toValue: 1,
            duration: 4000,
            useNativeDriver: false,
          }).start();

          Animated.loop(
            Animated.sequence([
              Animated.timing(pulseAnim, {
                toValue: 1.05,
                duration: 1200,
                useNativeDriver: true,
              }),
              Animated.timing(pulseAnim, {
                toValue: 1,
                duration: 1200,
                useNativeDriver: true,
              }),
            ]),
          ).start();

          Animated.loop(
            Animated.sequence([
              Animated.timing(haloAnim, {
                toValue: 1.4,
                duration: 1000,
                useNativeDriver: true,
              }),
              Animated.timing(haloAnim, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
              }),
            ]),
          ).start();

          puckPos.setValue({ x: path[0].x, y: path[0].y });
          let currentAngle = 0;
          if (path.length > 1) {
            currentAngle =
              Math.atan2(path[1].y - path[0].y, path[1].x - path[0].x) *
              (180 / Math.PI);
            puckRot.setValue(currentAngle + 90);
          }

          const animatePuck = () => {
            const sequence = [];
            for (let i = 1; i < path.length; i++) {
              const prev = path[i - 1];
              const curr = path[i];
              const dist = Math.hypot(curr.x - prev.x, curr.y - prev.y);
              let targetAngle =
                Math.atan2(curr.y - prev.y, curr.x - prev.x) * (180 / Math.PI);
              while (targetAngle - currentAngle > 180) targetAngle -= 360;
              while (targetAngle - currentAngle < -180) targetAngle += 360;
              currentAngle = targetAngle;

              sequence.push(
                Animated.timing(puckRot, {
                  toValue: targetAngle + 90,
                  duration: 200,
                  useNativeDriver: true,
                }),
              );
              sequence.push(
                Animated.timing(puckPos, {
                  toValue: { x: curr.x, y: curr.y },
                  duration: dist * 8,
                  useNativeDriver: true,
                }),
              );
            }

            Animated.sequence(sequence).start(({ finished }) => {
              if (finished) {
                speakInstruction(`Park in ${targetSlotName}.`);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }
            });
          };
          animatePuck();
        }, 1000),
      );
    } catch (error) {
      Alert.alert("Error", "Failed to compute GPS map.");
      navigation.goBack();
    }
  };

  if (loading || !roiData) {
    return (
      <View style={styles.loaderContainer}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>
          Initializing Routing...
        </Text>
      </View>
    );
  }

  const mapHeight = SCREEN_HEIGHT * 0.65;
  const scaleX = (x) => (x / roiData.camW) * roiData.usableWidth + MAP_PADDING;
  const scaleY = (y) => (y / roiData.camH) * roiData.usableHeight + MAP_PADDING;

  const strokeDashoffset = drawProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [pathLength, 0],
  });
  const progressBarWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });
  const puckRotationStr = puckRot.interpolate({
    inputRange: [-3600, 3600],
    outputRange: ["-3600deg", "3600deg"],
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          disabled={isParked}
        >
          <Ionicons name="close" size={24} color={COLORS.gray800} />
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Text style={styles.hudSub}>ROUTING </Text>
          <Text style={styles.hudTitle}>Proceed to {targetSlotName}</Text>
        </View>
        <TouchableOpacity
          style={[styles.muteBtn, isMuted && styles.muteBtnActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (!isMuted) Speech.stop();
            setIsMuted(!isMuted);
          }}
        >
          <Ionicons
            name={isMuted ? "volume-mute" : "volume-high"}
            size={20}
            color={isMuted ? COLORS.gray500 : COLORS.primary}
          />
        </TouchableOpacity>
      </View>

      {isParked && (
        <Animated.View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <MaterialCommunityIcons
              name="check-decagram"
              size={80}
              color={COLORS.success}
              style={{ marginBottom: 10 }}
            />
            <Text style={styles.successTitle}>Arrival Confirmed</Text>
          </View>
        </Animated.View>
      )}

      <Animated.View
        style={[
          styles.mapContainer,
          { height: mapHeight, opacity: opacityAnim },
        ]}
      >
        <View style={StyleSheet.absoluteFill}>
          <Svg width="100%" height="100%">
            <Defs>
              <Pattern
                id="grid"
                width="20"
                height="20"
                patternUnits="userSpaceOnUse"
              >
                <Circle cx="2" cy="2" r="1" fill={COLORS.gray300} />
              </Pattern>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#grid)" />
          </Svg>
        </View>

        <View style={[styles.zoneAnchor, { top: 0 }]}>
          <Text style={styles.zoneText}>
            {isEntranceTop ? "ENTRANCE" : "EXIT"}
          </Text>
        </View>
        <View style={[styles.zoneAnchor, { bottom: 10 }]}>
          <Text style={styles.zoneText}>
            {!isEntranceTop ? "ENTRANCE" : "EXIT"}
          </Text>
        </View>

        <View style={StyleSheet.absoluteFill}>
          <Svg width={SCREEN_WIDTH} height={mapHeight}>
            {svgPathStr !== "" && (
              <>
                <AnimatedPath
                  d={svgPathStr}
                  fill="none"
                  stroke={COLORS.primary}
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={pathLength}
                  strokeDashoffset={strokeDashoffset}
                  opacity={0.2}
                />
                <AnimatedPath
                  d={svgPathStr}
                  fill="none"
                  stroke={COLORS.primary}
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={pathLength}
                  strokeDashoffset={strokeDashoffset}
                  opacity={0.9}
                />
              </>
            )}
          </Svg>
        </View>

        {Object.keys(roiData.data).map((slotName) => {
          const [x, y, w, h] = roiData.data[slotName];
          const isTarget = slotName === targetSlotName;
          const SlotWrapper = isTarget ? Animated.View : View;

          return (
            <SlotWrapper
              key={slotName}
              style={[
                styles.slot,
                {
                  left: scaleX(x),
                  top: scaleY(y),
                  width: (w / roiData.camW) * roiData.usableWidth,
                  height: (h / roiData.camH) * roiData.usableHeight,
                  borderColor: isTarget ? COLORS.success : COLORS.gray300,
                  backgroundColor: isTarget
                    ? "rgba(16, 185, 129, 0.15)"
                    : COLORS.white,
                  borderWidth: isTarget ? 3 : 1,
                  borderStyle: isTarget ? "solid" : "dashed",
                  transform: isTarget ? [{ scale: pulseAnim }] : [],
                  zIndex: isTarget ? 10 : 1,
                  ...(isTarget ? SHADOWS.medium : {}),
                },
              ]}
            >
              <View style={styles.slotContentWrapper}>
                {isTarget && (
                  <MaterialCommunityIcons
                    name="map-marker-star"
                    size={20}
                    color={COLORS.success}
                  />
                )}
                <Text
                  style={[
                    styles.slotText,
                    { color: isTarget ? COLORS.success : COLORS.gray500 },
                  ]}
                >
                  {slotName}
                </Text>
              </View>
            </SlotWrapper>
          );
        })}

        <Animated.View
          style={[
            styles.navigatorIconWrap,
            {
              transform: [{ translateX: puckPos.x }, { translateY: puckPos.y }],
            },
          ]}
        >
          <Animated.View
            style={[styles.navigatorHalo, { transform: [{ scale: haloAnim }] }]}
          />
          <View style={styles.navigatorShadow}>
            <Animated.View
              style={[
                styles.navigatorPuck,
                { transform: [{ rotate: puckRotationStr }] },
              ]}
            >
              <Ionicons
                name="navigate"
                size={16}
                color={COLORS.white}
                style={{ marginLeft: 2, marginTop: 2 }}
              />
            </Animated.View>
          </View>
        </Animated.View>
      </Animated.View>

      <View
        style={[
          styles.bottomCard,
          { paddingBottom: Math.max(insets.bottom, 20) },
        ]}
      >
        <View style={styles.progressHeader}>
          <Text style={styles.etaText}>
            {distanceLeft > 0 ? `${distanceLeft}m Remaining` : "Arrived"}
          </Text>
        </View>

        <View style={styles.progressTrack}>
          <Animated.View
            style={[styles.progressBar, { width: progressBarWidth }]}
          />
        </View>

        <View style={styles.instructionRow}>
          <View style={styles.instructionIcon}>
            <Ionicons
              name={distanceLeft === 0 ? "checkmark" : "navigate"}
              size={28}
              color={COLORS.white}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.instructionLabel}>LIVE DIRECTIONS</Text>
            <Animated.Text
              style={[styles.instructionText, { opacity: textFadeAnim }]}
            >
              {instruction}
            </Animated.Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.manualBtnWrapper, isParked && { opacity: 0.7 }]}
          onPress={handleParkSuccess}
          disabled={isParked}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={
              isParked
                ? [COLORS.success, "#1B5E20"]
                : [COLORS.primary, COLORS.primaryDark]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.manualBtn}
          >
            <Text style={styles.manualBtnText}>
              {isParked ? "Secured" : "I have parked here"}
            </Text>
            {!isParked && (
              <MaterialCommunityIcons
                name="steering"
                size={20}
                color={COLORS.white}
                style={{ marginLeft: 8 }}
              />
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default NavigationScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.gray600,
    fontWeight: "600",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: "#F9FAFB",
    zIndex: 20,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    ...SHADOWS.light,
  },
  headerTitleBox: { flex: 1 },
  hudSub: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.primary,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  hudTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.gray900,
    letterSpacing: -0.5,
  },

  muteBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  muteBtnActive: { backgroundColor: COLORS.gray200 },

  mapContainer: {
    width: SCREEN_WIDTH,
    position: "relative",
    overflow: "hidden",
  },
  slot: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    overflow: "hidden",
  },
  slotContentWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  slotText: { fontSize: 13, fontWeight: "900", letterSpacing: 1 },
  zoneAnchor: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
    backgroundColor: "rgba(249, 250, 251, 0.8)",
  },
  zoneText: {
    fontSize: 11,
    fontWeight: "900",
    color: COLORS.gray500,
    letterSpacing: 4,
  },

  navigatorIconWrap: {
    position: "absolute",
    marginLeft: -14,
    marginTop: -14,
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  navigatorHalo: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(66, 133, 244, 0.3)",
  },
  navigatorShadow: {
    ...SHADOWS.large,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  navigatorPuck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    borderWidth: 3,
    borderColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
  },

  bottomCard: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    paddingHorizontal: 24,
    paddingTop: 20,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    ...SHADOWS.dark,
    shadowOffset: { width: 0, height: -10 },
  },

  progressHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 8,
  },
  etaText: { fontSize: 14, fontWeight: "800", color: COLORS.primary },
  progressTrack: {
    height: 6,
    width: "100%",
    backgroundColor: "#F0F4F8",
    marginBottom: 24,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },

  instructionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  instructionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    ...SHADOWS.small,
    shadowColor: COLORS.primary,
  },
  instructionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.gray500,
    letterSpacing: 1,
    marginBottom: 4,
  },
  instructionText: { fontSize: 18, fontWeight: "800", color: COLORS.gray900 },

  manualBtnWrapper: { borderRadius: 16, overflow: "hidden", ...SHADOWS.medium },
  manualBtn: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 16,
    alignItems: "center",
  },
  manualBtnText: { color: COLORS.white, fontSize: 16, fontWeight: "900" },

  successOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    zIndex: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  successCard: { alignItems: "center" },
  successTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: COLORS.gray900,
    marginTop: 10,
  },
});
