import React, { useContext, useRef, useEffect, useState } from "react";
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

const mapStyle = [
  { elementType: "geometry", stylers: [{ color: "#f4f6f8" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#e8eaed" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#d1e8ff" }],
  },
];

const MapScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const mapRef = useRef(null);

  const { user } = useContext(AuthContext);
  const { parkingLots, setSelectedLot, userLocation } =
    useContext(ParkingContext);
  const { esp32Statuses, checking, checkESP32Status } = useEsp32();

  const [activeLot, setActiveLot] = useState(null);
  const [displayLot, setDisplayLot] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
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

  useEffect(() => {
    if (activeLot) {
      setDisplayLot(activeLot);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 7,
          tension: 50,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => setDisplayLot(null));
    }
  }, [activeLot]);

  const handleMarkerPress = (lot) => {
    Haptics.selectionAsync();
    setActiveLot(lot);
    setSelectedLot(lot);

    checkESP32Status(lot._id);

    mapRef.current?.animateToRegion(
      {
        latitude: lot.location.coordinates[0] - 0.003,
        longitude: lot.location.coordinates[1],
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      },
      600,
    );
  };

  const handleMapPress = () => {
    if (activeLot) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setActiveLot(null);
    }
  };

  const centerOnUser = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (userLocation) {
      setActiveLot(null);
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

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        translucent
        backgroundColor="transparent"
      />

      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={{
          latitude: userLocation?.latitude || 28.7041,
          longitude: userLocation?.longitude || 77.1025,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        customMapStyle={mapStyle}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsMapToolbar={false}
        provider={PROVIDER_DEFAULT}
        pitchEnabled={false}
        onPress={handleMapPress}
      >
        {parkingLots.map((lot) => {
          const isSelected = activeLot?._id === lot._id;
          return (
            <Marker
              key={lot._id}
              coordinate={{
                latitude: lot.location.coordinates[0],
                longitude: lot.location.coordinates[1],
              }}
              onPress={(e) => {
                e.stopPropagation();
                handleMarkerPress(lot);
              }}
              pinColor={isSelected ? COLORS.primaryDark : COLORS.primary}
              zIndex={isSelected ? 10 : 1}
            />
          );
        })}
      </MapView>

      {}
      <TouchableOpacity
        style={[styles.recenterBtn, { top: insets.top + 80 }]}
        onPress={centerOnUser}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons
          name="crosshairs-gps"
          size={24}
          color={COLORS.gray800}
        />
      </TouchableOpacity>

      {}
      <Animated.View
        style={[
          styles.islandCard,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
            bottom: Math.max(insets.bottom, 90),
          },
        ]}
        pointerEvents={activeLot ? "auto" : "none"}
      >
        {displayLot && (
          <View style={styles.islandInner}>
            {}
            <View style={styles.cardHeader}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.titleText} numberOfLines={1}>
                  {displayLot.name}
                </Text>
                <Text style={styles.addressText} numberOfLines={1}>
                  {displayLot.location?.address}
                </Text>
              </View>
              <View style={styles.priceBadge}>
                <Text style={styles.priceBadgeText}>
                  ₹{displayLot.basePrice}
                  <Text style={styles.priceSub}>/hr</Text>
                </Text>
              </View>
            </View>

            {}
            <View style={styles.infoRow}>
              <View
                style={[
                  styles.statusPill,
                  {
                    backgroundColor: checking
                      ? COLORS.gray100
                      : esp32Statuses[displayLot._id]
                        ? "#E8F5E9"
                        : "#FFEBEE",
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
                        : esp32Statuses[displayLot._id]
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
                        : esp32Statuses[displayLot._id]
                          ? COLORS.success
                          : COLORS.error,
                    },
                  ]}
                >
                  {checking
                    ? "SYNCING..."
                    : esp32Statuses[displayLot._id]
                      ? "SENSORS ONLINE"
                      : "OFFLINE"}
                </Text>
              </View>

              <View style={styles.capacityPill}>
                <MaterialCommunityIcons
                  name="car-multiple"
                  size={14}
                  color={COLORS.gray600}
                />
                <Text style={styles.capacityText}>
                  {displayLot.totalSlots} Slots
                </Text>
              </View>
            </View>

            {}
            <TouchableOpacity
              style={styles.ctaButton}
              activeOpacity={0.9}
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
                <Text style={styles.ctaText}>Proceed to Layout</Text>
                <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },

  recenterBtn: {
    position: "absolute",
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    ...SHADOWS.medium,
    zIndex: 10,
  },

  islandCard: {
    position: "absolute",
    left: 16,
    right: 16,
    backgroundColor: COLORS.white,
    borderRadius: 28,
    ...SHADOWS.dark,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    zIndex: 20,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  islandInner: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  titleText: {
    fontSize: 20,
    fontWeight: "900",
    color: COLORS.gray900,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  addressText: { fontSize: 13, color: COLORS.gray500, fontWeight: "600" },

  priceBadge: {
    backgroundColor: COLORS.gray50,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  priceBadgeText: { fontSize: 16, fontWeight: "900", color: COLORS.primary },
  priceSub: { fontSize: 11, color: COLORS.gray500 },

  infoRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 8 },
  statusText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },

  capacityPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  capacityText: { fontSize: 12, fontWeight: "800", color: COLORS.gray700 },

  ctaButton: {
    height: 56,
    borderRadius: 16,
    overflow: "hidden",
  },
  gradientFill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  ctaText: { color: COLORS.white, fontSize: 16, fontWeight: "800" },
});

export default MapScreen;