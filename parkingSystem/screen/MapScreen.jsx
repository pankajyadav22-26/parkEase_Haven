import React, { useContext, useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Animated,
  TextInput,
  Keyboard,
  Linking,
  Platform,
} from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ParkingContext } from "../contexts/ParkingContext";
import { useEsp32 } from "../contexts/Esp32Context";
import { COLORS, SHADOWS } from "../constants/theme";
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

const getDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;

  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance.toFixed(1);
};

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

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const syncPulse = useRef(new Animated.Value(0.3)).current;

  const filteredLots = parkingLots.filter(
    (lot) =>
      lot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lot.location?.address &&
        lot.location.address.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () => setKeyboardVisible(true),
    );
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => setKeyboardVisible(false),
    );

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

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
    Keyboard.dismiss();

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

  const handleSearchSelect = (lot) => {
    Keyboard.dismiss();
    setSearchQuery("");
    setIsSearching(false);
    handleMarkerPress(lot);
  };

  const handleMapPress = () => {
    Keyboard.dismiss();
    setIsSearching(false);
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

  const handleGetDirections = () => {
    if (!displayLot) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const lat = displayLot.location.coordinates[0];
    const lng = displayLot.location.coordinates[1];
    const label = encodeURIComponent(displayLot.name);

    const url = Platform.select({
      ios: `maps://app?daddr=${lat},${lng}&q=${label}`,
      android: `google.navigation:q=${lat},${lng}`,
    });

    const fallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Linking.openURL(fallbackUrl);
      }
    });
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
      <View style={[styles.searchWrapper, { top: insets.top + 10 }]}>
        <View style={styles.searchInputContainer}>
          <Ionicons
            name="search"
            size={20}
            color={COLORS.gray500}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search parking lots..."
            placeholderTextColor={COLORS.gray400}
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              setIsSearching(true);
            }}
            onFocus={() => {
              setIsSearching(true);
              setActiveLot(null);
            }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              style={styles.clearBtn}
            >
              <Ionicons name="close-circle" size={20} color={COLORS.gray400} />
            </TouchableOpacity>
          )}
        </View>

        {}
        {isSearching && searchQuery.length > 0 && (
          <View style={styles.suggestionsContainer}>
            {filteredLots.length > 0 ? (
              filteredLots.map((lot, index) => (
                <TouchableOpacity
                  key={lot._id}
                  style={[
                    styles.suggestionItem,
                    index < filteredLots.length - 1 && styles.suggestionBorder,
                  ]}
                  onPress={() => handleSearchSelect(lot)}
                >
                  <Ionicons
                    name="location-outline"
                    size={20}
                    color={COLORS.primary}
                  />
                  <View style={styles.suggestionTextWrapper}>
                    <Text style={styles.suggestionTitle} numberOfLines={1}>
                      {lot.name}
                    </Text>
                    <Text style={styles.suggestionAddress} numberOfLines={1}>
                      {lot.location?.address}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.noResultContainer}>
                <Text style={styles.noResultText}>No parking lots found</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {}
      {!isKeyboardVisible && (
        <TouchableOpacity
          style={[styles.recenterBtn, { top: insets.top + 75 }]}
          onPress={centerOnUser}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="crosshairs-gps"
            size={24}
            color={COLORS.gray800}
          />
        </TouchableOpacity>
      )}

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

            <View style={styles.infoRow}>
              {}
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
                      ? "ONLINE"
                      : "OFFLINE"}
                </Text>
              </View>

              {}
              <View style={styles.infoBadge}>
                <MaterialCommunityIcons
                  name="car-multiple"
                  size={14}
                  color={COLORS.gray600}
                />
                <Text style={styles.infoBadgeText}>
                  {displayLot.totalSlots} Slots
                </Text>
              </View>

              {}
              {userLocation && (
                <View style={styles.infoBadge}>
                  <MaterialCommunityIcons
                    name="map-marker-distance"
                    size={14}
                    color={COLORS.gray600}
                  />
                  <Text style={styles.infoBadgeText}>
                    {getDistance(
                      userLocation.latitude,
                      userLocation.longitude,
                      displayLot.location.coordinates[0],
                      displayLot.location.coordinates[1],
                    )}{" "}
                    km
                  </Text>
                </View>
              )}
            </View>

            {}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.directionBtn}
                activeOpacity={0.8}
                onPress={handleGetDirections}
              >
                <Ionicons name="navigate" size={24} color={COLORS.primary} />
              </TouchableOpacity>

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
                  colors={[COLORS.primary, COLORS.primaryDark || "#000"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientFill}
                >
                  <Text style={styles.ctaText}>Proceed to Layout</Text>
                  <Ionicons
                    name="arrow-forward"
                    size={20}
                    color={COLORS.white}
                  />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },

  searchWrapper: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 50,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 16,
    height: 52,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    ...SHADOWS.medium,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.gray900,
    height: "100%",
  },
  clearBtn: {
    padding: 4,
  },
  suggestionsContainer: {
    marginTop: 8,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    ...SHADOWS.medium,
    maxHeight: 250,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: COLORS.white,
  },
  suggestionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  suggestionTextWrapper: {
    marginLeft: 12,
    flex: 1,
  },
  suggestionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.gray900,
    marginBottom: 2,
  },
  suggestionAddress: {
    fontSize: 12,
    color: COLORS.gray500,
  },
  noResultContainer: {
    padding: 20,
    alignItems: "center",
  },
  noResultText: {
    color: COLORS.gray500,
    fontSize: 14,
  },

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
    flexWrap: "wrap",
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

  infoBadge: {
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
  infoBadgeText: { fontSize: 12, fontWeight: "800", color: COLORS.gray700 },

  actionRow: {
    flexDirection: "row",
    gap: 12,
  },
  directionBtn: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: COLORS.gray50,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  ctaButton: {
    flex: 1,
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
