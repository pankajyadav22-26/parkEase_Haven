import React, { useContext, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useNavigation } from "@react-navigation/native";
import { ParkingContext } from "../contexts/ParkingContext";
import { useEsp32 } from "../contexts/Esp32Context";

const { width, height } = Dimensions.get("window");

const MapScreen = () => {
  const navigation = useNavigation();
  const { parkingLots, selectedLot, setSelectedLot, userLocation } =
    useContext(ParkingContext);

  const { esp32Statuses, checking, checkESP32Status } = useEsp32();

  const bottomSheetRef = useRef(null);
  const snapPoints = useMemo(() => ["30%", "40%"], []);

  const defaultRegion = {
    latitude: userLocation ? userLocation.latitude : 28.7041,
    longitude: userLocation ? userLocation.longitude : 77.1025,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  const handleMarkerPress = (lot) => {
    setSelectedLot(lot);
    bottomSheetRef.current?.snapToIndex(0);
    checkESP32Status(lot._id);
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={defaultRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
        provider={PROVIDER_DEFAULT}
      >
        {parkingLots.map((lot) => (
          <Marker
            key={lot._id}
            coordinate={{
              latitude: lot.location.coordinates[0],
              longitude: lot.location.coordinates[1],
            }}
            title={lot.name}
            onPress={() => handleMarkerPress(lot)}
          />
        ))}
      </MapView>

      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose={true}
        backgroundStyle={styles.sheetBackground}
        animationType="fade"
      >
        <BottomSheetView style={styles.sheetContent}>
          {selectedLot ? (
            <>
              <Text style={styles.lotTitle}>{selectedLot.name}</Text>
              <Text style={styles.lotAddress}>
                {selectedLot.location?.address}
              </Text>

              <View style={styles.statusContainer}>
                {checking ? (
                  <>
                    <ActivityIndicator size="small" color="#aaa" />
                    <Text style={styles.statusTextChecking}>
                      Checking Gate Status...
                    </Text>
                  </>
                ) : (
                  <>
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor: esp32Statuses[selectedLot._id]
                            ? "#4CAF50"
                            : "#F44336",
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color: esp32Statuses[selectedLot._id]
                            ? "#4CAF50"
                            : "#F44336",
                        },
                      ]}
                    >
                      {esp32Statuses[selectedLot._id]
                        ? "Gate Online"
                        : "Gate Offline"}
                    </Text>
                  </>
                )}
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoBox}>
                  <Text style={styles.infoLabel}>Base Rate</Text>
                  <Text style={styles.infoValue}>
                    ₹{selectedLot.basePrice}/hr
                  </Text>
                </View>
                <View style={styles.infoBox}>
                  <Text style={styles.infoLabel}>Total Slots</Text>
                  <Text style={styles.infoValue}>{selectedLot.totalSlots}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.bookButton,
                  esp32Statuses[selectedLot._id] === false &&
                    styles.bookButtonOffline,
                ]}
                onPress={() => navigation.navigate("SlotGrid")}
              >
                <Text style={styles.bookButtonText}>
                  {esp32Statuses[selectedLot._id] === false
                    ? "View Slots (Gate Offline)"
                    : "View Available Slots"}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.promptText}>Tap a parking pin on the map</Text>
          )}
        </BottomSheetView>
      </BottomSheet>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: width, height: height },
  sheetBackground: {
    backgroundColor: "#1E1E1E",
    borderRadius: 24,
  },
  sheetContent: {
    flex: 1,
    padding: 15,
    alignItems: "center",
  },
  lotTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 5,
  },
  lotAddress: {
    fontSize: 14,
    color: "#aaa",
    marginBottom: 10,
    textAlign: "center",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2A2A2A",
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 20,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  statusTextChecking: {
    fontSize: 12,
    color: "#aaa",
    marginLeft: 8,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginBottom: 20,
  },
  infoBox: {
    alignItems: "center",
    backgroundColor: "#2A2A2A",
    padding: 15,
    borderRadius: 12,
    width: "45%",
  },
  infoLabel: {
    color: "#888",
    fontSize: 12,
    marginBottom: 5,
  },
  infoValue: {
    color: "#4CAF50",
    fontSize: 18,
    fontWeight: "bold",
  },
  bookButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 15,
    width: "100%",
    borderRadius: 12,
    alignItems: "center",
  },
  bookButtonOffline: {
    backgroundColor: "#D32F2F",
  },
  bookButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  promptText: {
    color: "#888",
    fontSize: 16,
    marginTop: 20,
  },
});

export default MapScreen;