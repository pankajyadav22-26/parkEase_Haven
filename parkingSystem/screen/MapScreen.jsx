import React, {
  useContext,
  useRef,
  useMemo,
  useCallback,
  useEffect,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Animated,
} from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import BottomSheet, {
  BottomSheetScrollView,
  BottomSheetBackdrop,
} from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ParkingContext } from "../contexts/ParkingContext";
import { useEsp32 } from "../contexts/Esp32Context";
import { COLORS, SHADOWS, SPACING } from "../constants/theme";
import { AuthContext } from "../contexts/AuthContext";

const { width, height } = Dimensions.get("window");

// Clean, high-contrast map style so markers pop clearly
const mapStyle = [
  { elementType: "geometry", stylers: [{ color: "#f4f6f8" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#e0f2fe" }],
  },
];

const getDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const toRad = (val) => (val * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(1);
};

const getETA = (distanceKm) => {
  if (!distanceKm) return null;
  const timeMins = Math.ceil((distanceKm / 30) * 60);
  return timeMins < 1 ? "<1 min" : `${timeMins} min`;
};

const MapScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const mapRef = useRef(null);

  const { user } = useContext(AuthContext);
  const { parkingLots, selectedLot, setSelectedLot, userLocation } =
    useContext(ParkingContext);
  const { esp32Statuses, checking, checkESP32Status } = useEsp32();

  const bottomSheetRef = useRef(null);
  const snapPoints = useMemo(() => ["45%", "65%"], []); // Generous sizing for all info

  // Syncing Animation for the Status Dot
  const syncPulse = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (checking) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(syncPulse, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(syncPulse, {
            toValue: 0.3,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      syncPulse.setValue(1);
    }
  }, [checking]);

  const handleMarkerPress = (lot) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedLot(lot);
    bottomSheetRef.current?.snapToIndex(0);
    checkESP32Status(lot._id);

    // Offset camera slightly so the marker sits nicely above the bottom sheet
    mapRef.current?.animateToRegion(
      {
        latitude: lot.location.coordinates[0] - 0.005,
        longitude: lot.location.coordinates[1],
        latitudeDelta: 0.012,
        longitudeDelta: 0.012,
      },
      800,
    );
  };

  const centerOnUser = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (userLocation) {
      mapRef.current?.animateToRegion(
        {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        800,
      );
    }
  };

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        disappearsAtIndex={-1}
        appearsAtIndex={0}
        opacity={0.2}
      />
    ),
    [],
  );

  const distanceToLot =
    selectedLot && userLocation
      ? getDistance(
          userLocation.latitude,
          userLocation.longitude,
          selectedLot.location.coordinates[0],
          selectedLot.location.coordinates[1],
        )
      : null;
  const eta = getETA(distanceToLot);

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        translucent
        backgroundColor="transparent"
      />

      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: userLocation?.latitude || 28.7041,
          longitude: userLocation?.longitude || 77.1025,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        customMapStyle={mapStyle}
        showsUserLocation={true}
        showsMyLocationButton={false}
        provider={PROVIDER_DEFAULT}
        pitchEnabled={false}
      >
        {parkingLots.map((lot) => {
          const isSelected = selectedLot?._id === lot._id;
          return (
            <Marker
              key={lot._id}
              coordinate={{
                latitude: lot.location.coordinates[0],
                longitude: lot.location.coordinates[1],
              }}
              onPress={() => handleMarkerPress(lot)}
              tracksViewChanges={false} // Performance boost
              zIndex={isSelected ? 10 : 1}
            >
              {/* High-Visibility Classic Marker */}
              <View style={styles.markerContainer}>
                <View
                  style={[
                    styles.markerPin,
                    isSelected && styles.markerPinActive,
                  ]}
                >
                  <MaterialCommunityIcons
                    name="parking"
                    size={isSelected ? 20 : 16}
                    color={COLORS.white}
                  />
                </View>
                <View
                  style={[
                    styles.markerTriangle,
                    isSelected && styles.markerTriangleActive,
                  ]}
                />
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Recenter Button */}
      <TouchableOpacity
        style={[styles.recenterBtn, { top: insets.top }]}
        onPress={centerOnUser}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons
          name="crosshairs-gps"
          size={24}
          color={COLORS.gray800}
        />
      </TouchableOpacity>

      {/* The Command Center Bottom Sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose={true}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={styles.sheetIndicator}
        backgroundStyle={styles.sheetBg}
      >
        <BottomSheetScrollView
          contentContainerStyle={styles.sheetInner}
          showsVerticalScrollIndicator={false}
        >
          {selectedLot ? (
            <>
              {/* 1. Header & Location Data */}
              <View style={styles.headerSection}>
                <Text style={styles.titleText}>{selectedLot.name}</Text>

                <View style={styles.addressRow}>
                  <Ionicons name="location" size={14} color={COLORS.primary} />
                  <Text style={styles.addressText} numberOfLines={2}>
                    {selectedLot.location?.address}
                  </Text>
                </View>

                {distanceToLot && (
                  <View style={styles.distanceRow}>
                    <Ionicons name="car" size={14} color={COLORS.gray500} />
                    <Text style={styles.distanceText}>
                      {distanceToLot} km away • ~{eta} driving
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.divider} />

              {/* 2. IoT System Status */}
              <View style={styles.statusSection}>
                <Text style={styles.sectionTitle}>System Status</Text>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: checking
                        ? COLORS.gray100
                        : esp32Statuses[selectedLot._id]
                          ? "#E8F5E9"
                          : "#FFEBEE",
                      borderColor: checking
                        ? COLORS.gray200
                        : esp32Statuses[selectedLot._id]
                          ? "#C8E6C9"
                          : "#FFCDD2",
                    },
                  ]}
                >
                  <Animated.View
                    style={[
                      styles.statusDot,
                      {
                        opacity: syncPulse,
                        backgroundColor: checking
                          ? COLORS.gray500
                          : esp32Statuses[selectedLot._id]
                            ? COLORS.success
                            : COLORS.error,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color: checking
                          ? COLORS.gray700
                          : esp32Statuses[selectedLot._id]
                            ? COLORS.success
                            : COLORS.error,
                      },
                    ]}
                  >
                    {checking
                      ? "Checking sensors..."
                      : esp32Statuses[selectedLot._id]
                        ? "Live Tracking Online"
                        : "Offline"}
                  </Text>
                </View>
              </View>

              {/* 3. Stats Grid */}
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>HOURLY RATE</Text>
                  <View style={styles.statValueRow}>
                    <Text style={styles.statValue}>
                      ₹{selectedLot.basePrice}
                    </Text>
                    <Text style={styles.statUnit}>/hr</Text>
                  </View>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>CAPACITY</Text>
                  <View style={styles.statValueRow}>
                    <Text style={styles.statValue}>
                      {selectedLot.totalSlots}
                    </Text>
                    <Text style={styles.statUnit}>spots</Text>
                  </View>
                </View>
              </View>

              {/* 4. Action Buttons */}
              <View style={styles.quickActionRow}>
                <TouchableOpacity
                  style={styles.quickActionBtn}
                  onPress={() => Haptics.selectionAsync()}
                >
                  <Ionicons
                    name="navigate-circle-outline"
                    size={24}
                    color={COLORS.gray700}
                  />
                  <Text style={styles.quickActionText}>Directions</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickActionBtn}
                  onPress={() => Haptics.selectionAsync()}
                >
                  <Ionicons
                    name="share-social-outline"
                    size={24}
                    color={COLORS.gray700}
                  />
                  <Text style={styles.quickActionText}>Share</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.ctaButton}
                activeOpacity={0.8}
                onPress={() => {
                  Haptics.notificationAsync(
                    Haptics.NotificationFeedbackType.Success,
                  );
                  navigation.navigate("SlotGrid");
                }}
              >
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientFill}
                >
                  <Text style={styles.ctaText}>View Layout</Text>
                  <Ionicons
                    name="arrow-forward"
                    size={22}
                    color={COLORS.white}
                  />
                </LinearGradient>
              </TouchableOpacity>
            </>
          ) : null}
        </BottomSheetScrollView>
      </BottomSheet>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  map: { width: width, height: height },

  topUiContainer: { position: "absolute", left: 16, right: 16, zIndex: 10 },

  recenterBtn: {
    position: "absolute",
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    ...SHADOWS.medium,
    zIndex: 10,
  },

  markerContainer: { alignItems: "center", justifyContent: "center" },
  markerPin: {
    backgroundColor: COLORS.primary,
    padding: 10,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.white,
    ...SHADOWS.small,
  },
  markerPinActive: {
    backgroundColor: COLORS.primaryDark,
    transform: [{ scale: 1.15 }],
    borderColor: COLORS.white,
  },
  markerTriangle: {
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: COLORS.white,
    marginTop: -1,
  },
  markerTriangleActive: {
    borderTopColor: COLORS.white,
    transform: [{ scale: 1.15 }],
  },

  /* Bottom Sheet Styling */
  sheetBg: { backgroundColor: COLORS.white, borderRadius: 32 },
  sheetIndicator: { backgroundColor: COLORS.gray300, width: 40, height: 5 },
  sheetInner: { paddingHorizontal: 24, paddingTop: 10, paddingBottom: 67 },

  headerSection: { marginBottom: 20 },
  titleText: {
    fontSize: 26,
    fontWeight: "900",
    color: COLORS.gray900,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  addressText: {
    fontSize: 14,
    color: COLORS.gray600,
    marginLeft: 6,
    fontWeight: "500",
    flex: 1,
    lineHeight: 20,
  },
  distanceRow: { flexDirection: "row", alignItems: "center" },
  distanceText: {
    fontSize: 14,
    color: COLORS.gray600,
    marginLeft: 6,
    fontWeight: "600",
  },

  divider: { height: 1, backgroundColor: COLORS.gray100, marginBottom: 20 },

  statusSection: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.gray500,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusText: { fontSize: 13, fontWeight: "800" },

  statsGrid: { flexDirection: "row", gap: 12, marginBottom: 24 },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.gray50,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.gray500,
    marginBottom: 6,
  },
  statValueRow: { flexDirection: "row", alignItems: "baseline" },
  statValue: {
    fontSize: 24,
    fontWeight: "900",
    color: COLORS.gray900,
    letterSpacing: -0.5,
  },
  statUnit: {
    fontSize: 13,
    color: COLORS.gray600,
    fontWeight: "600",
    marginLeft: 4,
  },

  quickActionRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  quickActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    gap: 8,
  },
  quickActionText: { fontSize: 14, fontWeight: "700", color: COLORS.gray700 },

  ctaButton: {
    height: 60,
    borderRadius: 20,
    overflow: "hidden",
    ...SHADOWS.medium,
  },
  gradientFill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  ctaText: { color: COLORS.white, fontSize: 17, fontWeight: "800" },
});

export default MapScreen;
