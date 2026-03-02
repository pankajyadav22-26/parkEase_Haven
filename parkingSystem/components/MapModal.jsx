import React, { useEffect, useState, useRef } from "react";
import { 
  Modal, 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  Dimensions, 
  StatusBar 
} from "react-native";
import MapView, { Marker, Circle, PROVIDER_DEFAULT } from "react-native-maps";
import * as Location from "expo-location";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { COLORS, SHADOWS, SIZES } from "../constants/theme";

const { width, height } = Dimensions.get("window");
const MAX_DISTANCE_METERS = 200;

const silverMapStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#f5f5f5" }] },
  { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#f5f5f5" }] },
  { "featureType": "administrative.land_parcel", "elementType": "labels.text.fill", "stylers": [{ "color": "#bdbdbd" }] },
  { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#eeeeee" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#ffffff" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#c9c9c9" }] }
];

const getDistanceInMeters = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
  const R = 6371000;
  const toRad = (value) => (value * Math.PI) / 180;
  
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const MapModal = ({ visible, onClose, targetCoords }) => {
  const insets = useSafeAreaInsets();
  const [userCoords, setUserCoords] = useState(null);
  const [distance, setDistance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasNotifiedEntry, setHasNotifiedEntry] = useState(false);

  const intervalRef = useRef(null);
  const mapRef = useRef(null);

  const fetchLocationAndUpdateDistance = async () => {
    if (!targetCoords) return;

    try {
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const userLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setUserCoords(userLocation);

      const dist = getDistanceInMeters(
        userLocation.latitude,
        userLocation.longitude,
        targetCoords.latitude,
        targetCoords.longitude
      );
      setDistance(dist.toFixed(0));

      if (dist <= MAX_DISTANCE_METERS && !hasNotifiedEntry) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setHasNotifiedEntry(true);
      } else if (dist > MAX_DISTANCE_METERS && hasNotifiedEntry) {
        setHasNotifiedEntry(false);
      }
      
      if (mapRef.current && visible) {
          mapRef.current.fitToCoordinates([userLocation, targetCoords], {
            edgePadding: { top: 120, right: 60, bottom: 250, left: 60 },
            animated: true,
          });
      }

    } catch (error) {
      console.error("Error fetching live location:", error);
    }
  };

  useEffect(() => {
    if (visible) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (targetCoords) {
        (async () => {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== "granted") {
            alert("Location permission denied. Cannot verify gate distance.");
            setLoading(false);
            return;
          }

          setLoading(true);
          await fetchLocationAndUpdateDistance();
          setLoading(false);

          intervalRef.current = setInterval(() => {
            fetchLocationAndUpdateDistance();
          }, 3000);
        })();
      }
    } else {
      setHasNotifiedEntry(false);
      setDistance(null);
    }

    return () => clearInterval(intervalRef.current);
  }, [visible, targetCoords]);

  const isInside = distance && parseFloat(distance) <= MAX_DISTANCE_METERS;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        
        <TouchableOpacity 
            style={[styles.closeBtn, { top: insets.top-20 }]} 
            onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onClose();
            }} 
            activeOpacity={0.8}
        >
           <Ionicons name="close" size={24} color={COLORS.gray800} />
        </TouchableOpacity>

        {loading || !targetCoords ? (
          <View style={styles.loaderWrapper}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Locating nearest gate...</Text>
          </View>
        ) : (
          <>
            <MapView
              ref={mapRef}
              style={styles.map}
              provider={PROVIDER_DEFAULT}
              customMapStyle={silverMapStyle}
              initialRegion={{
                latitude: targetCoords.latitude,
                longitude: targetCoords.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }}
              showsUserLocation={true}
              showsMyLocationButton={false}
              pitchEnabled={false}
            >
              <Marker coordinate={targetCoords} title={targetCoords.name || "Parking Gate"}>
                 <View style={styles.markerWrapper}>
                    <View style={styles.gateMarker}>
                        <MaterialCommunityIcons name="boom-gate-up" size={22} color={COLORS.white} />
                    </View>
                    <View style={styles.markerTriangle} />
                 </View>
              </Marker>
              
              <Circle
                center={targetCoords}
                radius={MAX_DISTANCE_METERS}
                strokeColor={isInside ? "rgba(46, 125, 50, 0.6)" : "rgba(0, 109, 119, 0.4)"}
                fillColor={isInside ? "rgba(46, 125, 50, 0.15)" : "rgba(0, 109, 119, 0.08)"}
                strokeWidth={2}
              />
            </MapView>

            <View style={[styles.statusCardWrapper, { bottom: Math.max(insets.bottom, 20) }]}>
              {isInside ? (
                <LinearGradient
                    colors={[COLORS.success, '#1B5E20']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.statusCard}
                >
                    <View style={styles.statusHeader}>
                        <View style={[styles.statusIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                            <MaterialCommunityIcons name="check-decagram" size={28} color={COLORS.white} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.statusTitle, { color: COLORS.white }]}>You are in range</Text>
                            <Text style={[styles.statusSubtitle, { color: 'rgba(255,255,255,0.8)' }]}>
                                You can now open the gate
                            </Text>
                        </View>
                    </View>
                    <View style={[styles.divider, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
                    <View style={styles.distanceRow}>
                        <Text style={[styles.distanceLabel, { color: 'rgba(255,255,255,0.9)' }]}>Distance to Gate</Text>
                        <Text style={[styles.distanceValue, { color: COLORS.white }]}>{distance}m</Text>
                    </View>
                </LinearGradient>
              ) : (
                <View style={[styles.statusCard, { backgroundColor: COLORS.white }]}>
                    <View style={styles.statusHeader}>
                        <View style={[styles.statusIcon, { backgroundColor: COLORS.primaryLight }]}>
                            <MaterialCommunityIcons name="map-marker-distance" size={24} color={COLORS.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.statusTitle}>Move closer to gate</Text>
                            <Text style={styles.statusSubtitle}>
                                Must be within {MAX_DISTANCE_METERS}m to open
                            </Text>
                        </View>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.distanceRow}>
                        <Text style={styles.distanceLabel}>Distance to Gate</Text>
                        <Text style={[styles.distanceValue, { color: COLORS.gray900 }]}>{distance || '---'}m</Text>
                    </View>
                </View>
              )}
            </View>
          </>
        )}
      </View>
    </Modal>
  );
};

export default MapModal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  map: {
    width: width,
    height: height,
  },
  closeBtn: {
    position: 'absolute',
    left: 20,
    zIndex: 10,
    backgroundColor: COLORS.white,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    ...SHADOWS.medium,
  },
  loaderWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.white,
  },
  loadingText: {
    marginTop: 16,
    color: COLORS.gray600,
    fontSize: 16,
    fontWeight: "600",
  },
  /* Gate Marker */
  markerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gateMarker: {
    backgroundColor: COLORS.gray900,
    padding: 10,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.white,
    ...SHADOWS.small,
  },
  markerTriangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: COLORS.gray900,
    marginTop: -2,
  },
  /* Bottom Status Card */
  statusCardWrapper: {
    position: 'absolute',
    left: 20,
    right: 20,
  },
  statusCard: {
    borderRadius: 24,
    padding: 24,
    ...SHADOWS.medium,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.gray900,
    marginBottom: 4,
  },
  statusSubtitle: {
    fontSize: 13,
    color: COLORS.gray500,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.gray100,
    marginBottom: 20,
  },
  distanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  distanceLabel: {
    fontSize: 15,
    color: COLORS.gray600,
    fontWeight: '700',
  },
  distanceValue: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -1,
  },
});