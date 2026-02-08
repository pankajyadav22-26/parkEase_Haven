import React, { useEffect, useState, useRef } from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Dimensions, StatusBar } from "react-native";
import MapView, { Marker, Circle, PROVIDER_DEFAULT } from "react-native-maps";
import * as Location from "expo-location";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { GATE_COORDS } from "../constants/index";
import { COLORS, SIZES, SHADOWS } from "../constants/theme";

const { width, height } = Dimensions.get("window");
const MAX_DISTANCE_METERS = 200;

const getDistanceInMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const MapModal = ({ visible, onClose }) => {
  const [userCoords, setUserCoords] = useState(null);
  const [distance, setDistance] = useState(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);
  const mapRef = useRef(null);

  const fetchLocationAndUpdateDistance = async () => {
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
        GATE_COORDS.latitude,
        GATE_COORDS.longitude
      );
      setDistance(dist.toFixed(0));
      
      if (mapRef.current && visible) {
          mapRef.current.fitToCoordinates([userLocation, GATE_COORDS], {
            edgePadding: { top: 100, right: 50, bottom: 200, left: 50 },
            animated: true,
          });
      }

    } catch (error) {
      console.error("Error fetching live location:", error);
    }
  };

  useEffect(() => {
    if (visible) {
      (async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          alert("Location permission denied");
          setLoading(false);
          return;
        }

        setLoading(true);
        await fetchLocationAndUpdateDistance();
        setLoading(false);

        intervalRef.current = setInterval(() => {
          fetchLocationAndUpdateDistance();
        }, 5000);
      })();
    }

    return () => {
      clearInterval(intervalRef.current);
    };
  }, [visible]);

  const isInside = distance && parseFloat(distance) <= MAX_DISTANCE_METERS;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        
        <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
           <MaterialCommunityIcons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>

        {loading ? (
          <View style={styles.loaderWrapper}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Locating you...</Text>
          </View>
        ) : (
          <>
            <MapView
              ref={mapRef}
              style={styles.map}
              provider={PROVIDER_DEFAULT}
              initialRegion={{
                latitude: GATE_COORDS.latitude,
                longitude: GATE_COORDS.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }}
              showsUserLocation={true}
              showsMyLocationButton={false}
            >
              <Marker coordinate={GATE_COORDS} title="Parking Gate">
                 <View style={styles.gateMarker}>
                    <MaterialCommunityIcons name="boom-gate" size={20} color={COLORS.white} />
                 </View>
              </Marker>
              
              <Circle
                center={GATE_COORDS}
                radius={MAX_DISTANCE_METERS}
                strokeColor={isInside ? "rgba(46, 125, 50, 0.5)" : "rgba(211, 47, 47, 0.5)"}
                fillColor={isInside ? "rgba(46, 125, 50, 0.1)" : "rgba(211, 47, 47, 0.1)"}
              />
            </MapView>
            <View style={styles.statusCard}>
               <View style={styles.statusHeader}>
                  <View style={[styles.statusIcon, { backgroundColor: isInside ? '#E8F5E9' : '#FFEBEE' }]}>
                     <MaterialCommunityIcons 
                        name={isInside ? "check-circle" : "map-marker-distance"} 
                        size={24} 
                        color={isInside ? COLORS.success : COLORS.error} 
                     />
                  </View>
                  <View>
                     <Text style={styles.statusTitle}>
                        {isInside ? "You are in range" : "Move closer to gate"}
                     </Text>
                     <Text style={styles.statusSubtitle}>
                        Gate access requires {MAX_DISTANCE_METERS}m range
                     </Text>
                  </View>
               </View>
               
               <View style={styles.divider} />
               
               <View style={styles.distanceRow}>
                  <Text style={styles.distanceLabel}>Current Distance</Text>
                  <Text style={[styles.distanceValue, { color: isInside ? COLORS.success : COLORS.error }]}>
                     {distance || '---'} m
                  </Text>
               </View>
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
    backgroundColor: COLORS.background,
  },
  map: {
    width: width,
    height: height,
  },
  closeBtn: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 10,
    backgroundColor: COLORS.white,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  loaderWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.gray600,
    fontSize: 14,
    fontWeight: "500"
  },
  gateMarker: {
    backgroundColor: COLORS.primary,
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  statusCard: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    ...SHADOWS.medium,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statusSubtitle: {
    fontSize: 12,
    color: COLORS.gray500,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.gray100,
    marginBottom: 15,
  },
  distanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  distanceLabel: {
    fontSize: 14,
    color: COLORS.gray600,
    fontWeight: '500',
  },
  distanceValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});