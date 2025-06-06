import React, { useEffect, useState, useRef } from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import MapView, { Marker, Circle } from "react-native-maps";
import * as Location from "expo-location";
import {GATE_COORDS} from "../constants/index"

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

  const fetchLocationAndUpdateDistance = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({});
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
      setDistance(dist.toFixed(1));
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

        // Start interval
        intervalRef.current = setInterval(() => {
          fetchLocationAndUpdateDistance();
        }, 5000); // every 5 seconds
      })();
    }

    return () => {
      clearInterval(intervalRef.current);
    };
  }, [visible]);

  const isInside = distance && parseFloat(distance) <= MAX_DISTANCE_METERS;

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalContainer}>
        {loading ? (
          <View style={styles.loaderWrapper}>
            <ActivityIndicator size="large" color="#007bff" />
            <Text style={{ marginTop: 12 }}>Fetching location...</Text>
          </View>
        ) : (
          <>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: GATE_COORDS.latitude,
                longitude: GATE_COORDS.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }}
              showsUserLocation={true}
            >
              <Marker coordinate={GATE_COORDS} title="Gate" pinColor="red" />
              <Circle
                center={GATE_COORDS}
                radius={MAX_DISTANCE_METERS}
                strokeColor="rgba(0,112,255,0.5)"
                fillColor="rgba(0,112,255,0.1)"
              />
              {userCoords && (
                <Marker coordinate={userCoords} title="You" pinColor="blue" />
              )}
            </MapView>

            <View style={[styles.distanceBanner, { backgroundColor: isInside ? "#28a745" : "#dc3545" }]}>
              <Text style={styles.distanceText}>
                Distance to gate: {distance} m — {isInside ? "Inside allowed range" : "Too far"}
              </Text>
            </View>
          </>
        )}

        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

export default MapModal;

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  map: {
    flex: 1,
  },
  closeBtn: {
    backgroundColor: "#007bff",
    paddingVertical: 14,
    alignItems: "center",
  },
  closeText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  loaderWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  distanceBanner: {
    padding: 10,
    alignItems: "center",
  },
  distanceText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});