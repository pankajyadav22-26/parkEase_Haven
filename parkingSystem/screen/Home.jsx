import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  Animated,
  Image,
  ScrollView,
  RefreshControl,
  StatusBar,
  TouchableOpacity,
} from "react-native";
import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useContext,
} from "react";
import axios from "axios";
import { useIsFocused } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { backendUrl } from "../constants";
import { COLORS, SHADOWS, SIZES } from "../constants/theme";

import { ParkingContext } from "../contexts/ParkingContext";

const { width } = Dimensions.get("window");
const COLUMN_COUNT = 2;
const SLOT_GAP = 12;
const PADDING = 20;
const SLOT_WIDTH =
  (width - PADDING * 2 - SLOT_GAP * (COLUMN_COUNT - 1)) / COLUMN_COUNT;

const FILTER_TYPES = ["All", "Available", "Occupied", "Reserved"];

const Home = ({ navigation }) => {
  const { selectedLot } = useContext(ParkingContext);

  const [slots, setSlots] = useState([]);
  const [filteredSlots, setFilteredSlots] = useState([]);
  const [activeFilter, setActiveFilter] = useState("All");
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    available: 0,
    occupied: 0,
    reserved: 0,
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const carAnim = useRef([]);
  const isFocused = useIsFocused();

  const applyFilter = (filter, data) => {
    if (filter === "All") {
      setFilteredSlots(data);
    } else {
      setFilteredSlots(
        data.filter((s) => s.currentStatus === filter.toLowerCase()),
      );
    }
  };

  const fetchSlots = useCallback(async () => {
    if (!selectedLot) return;

    try {
      setRefreshing(true);
      const res = await axios.get(
        `${backendUrl}/api/slotoperations/fetchSlot`,
        {
          params: { parkingLotId: selectedLot._id },
        },
      );

      let fetchedSlots = res.data.slots || [];

      fetchedSlots = fetchedSlots.sort((a, b) =>
        a.slotName.localeCompare(b.slotName, undefined, { numeric: true }),
      );

      const newStats = fetchedSlots.reduce(
        (acc, slot) => {
          acc[slot.currentStatus]++;
          return acc;
        },
        { available: 0, occupied: 0, reserved: 0 },
      );

      setStats(newStats);
      setSlots(fetchedSlots);
      applyFilter(activeFilter, fetchedSlots);

      fetchedSlots.forEach((slot, index) => {
        if (!carAnim.current[index]) {
          carAnim.current[index] = new Animated.Value(140);
        }

        if (slot.currentStatus === "occupied") {
          carAnim.current[index].setValue(140);
          Animated.timing(carAnim.current[index], {
            toValue: 0,
            friction: 6,
            tension: 40,
            useNativeDriver: true,
          }).start();
        } else {
          carAnim.current[index].setValue(140);
        }
      }, 500);
    } catch (error) {
      console.error("Failed to fetch slots:", error);
    } finally {
      setRefreshing(false);
    }
  }, [activeFilter, selectedLot]);

  useEffect(() => {
    if (isFocused && selectedLot) {
      fetchSlots();
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }
  }, [isFocused, selectedLot]);

  const handleFilterPress = (filter) => {
    setActiveFilter(filter);
    applyFilter(filter, slots);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "available":
        return COLORS.success;
      case "reserved":
        return COLORS.warning;
      case "occupied":
        return COLORS.error;
      default:
        return COLORS.gray500;
    }
  };

  if (!selectedLot) {
    return (
      <View style={[styles.container, styles.fallbackContainer]}>
        <MaterialCommunityIcons
          name="map-marker-off"
          size={64}
          color={COLORS.gray400}
        />
        <Text style={styles.fallbackTitle}>No Location Selected</Text>
        <Text style={styles.fallbackSub}>
          Please return to the map to select a parking lot.
        </Text>
        <TouchableOpacity
          style={styles.fallbackBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.fallbackBtnText}>Go to Map</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeftInfo}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="chevron-back" size={28} color={COLORS.white} />
            </TouchableOpacity>
            <View>
              <Text style={styles.greeting}>{selectedLot.name}</Text>
              <Text style={styles.appName}>
                Base: ₹{selectedLot.basePrice}/hr
              </Text>
            </View>
          </View>

          <TouchableOpacity onPress={() => navigation.navigate("Profile")}>
            <Image
              source={require("../assets/images/profile.jpeg")}
              style={styles.profileImg}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: COLORS.success }]}>
              {stats.available}
            </Text>
            <Text style={styles.statLabel}>Free</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: COLORS.error }]}>
              {stats.occupied}
            </Text>
            <Text style={styles.statLabel}>Busy</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: COLORS.warning }]}>
              {stats.reserved}
            </Text>
            <Text style={styles.statLabel}>Rsrvd</Text>
          </View>
        </View>
      </LinearGradient>

      {/* FILTER BAR */}
      <View style={[styles.filterContainer, { marginTop: 55 }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {FILTER_TYPES.map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.chip,
                activeFilter === filter && styles.activeChip,
              ]}
              onPress={() => handleFilterPress(filter)}
            >
              <Text
                style={[
                  styles.chipText,
                  activeFilter === filter && styles.activeChipText,
                ]}
              >
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchSlots} />
        }
        contentContainerStyle={{ paddingBottom: 50 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {filteredSlots.map((slot, index) => (
            <Animated.View
              key={slot._id}
              style={[styles.slot, { opacity: fadeAnim }]}
            >
              <View style={styles.slotHeader}>
                <Text style={styles.slotName}>{slot.slotName}</Text>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: getStatusColor(slot.currentStatus) },
                  ]}
                />
              </View>

              <View style={styles.dashedLineLeft} />
              <View style={styles.dashedLineRight} />
              <View style={styles.wheelStopper} />

              <View style={styles.slotContent}>
                {slot.currentStatus === "available" && (
                  <Text style={styles.emptyText}>OPEN</Text>
                )}

                {slot.currentStatus === "reserved" && (
                  <MaterialCommunityIcons
                    name="clock-outline"
                    size={98}
                    color={COLORS.warning}
                  />
                )}

                {slot.currentStatus === "occupied" &&
                  carAnim.current[index] && (
                    <Animated.Image
                      source={require("../assets/images/car.png")}
                      style={[
                        styles.carImage,
                        {
                          transform: [{ translateY: carAnim.current[index] }],
                        },
                      ]}
                      resizeMode="contain"
                    />
                  )}
              </View>
            </Animated.View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

export default Home;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray100,
  },
  headerGradient: {
    paddingTop: 45, // adjusted for SafeArea
    paddingBottom: 50,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    height: SIZES.height * 0.22, // slightly taller to accommodate the back button
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: PADDING,
  },
  headerLeftInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    marginRight: 10,
    padding: 5,
  },
  greeting: {
    fontSize: 16,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
  },
  appName: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  profileImg: {
    width: 45,
    height: 45,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  statsContainer: {
    position: "absolute",
    bottom: -35,
    left: PADDING,
    right: PADDING,
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderRadius: 20,
    paddingVertical: 15,
    justifyContent: "space-around",
    alignItems: "center",
    ...SHADOWS.medium,
    elevation: 10,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 22,
    fontWeight: "bold",
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.gray500,
    fontWeight: "600",
  },
  divider: {
    width: 1,
    height: "60%",
    backgroundColor: COLORS.gray200,
  },
  filterContainer: {
    marginBottom: 10,
  },
  filterScroll: {
    paddingHorizontal: PADDING,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 25,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray300,
  },
  activeChip: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    color: COLORS.gray600,
    fontWeight: "600",
  },
  activeChipText: {
    color: COLORS.white,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: PADDING,
    gap: SLOT_GAP,
    paddingBottom: 45,
  },
  slot: {
    width: SLOT_WIDTH,
    height: SLOT_WIDTH * 1.5,
    backgroundColor: "#34495E",
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    ...SHADOWS.small,
    marginBottom: SLOT_GAP,
  },
  slotHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 8,
    zIndex: 10,
  },
  slotName: {
    color: "rgba(255,255,255,0.9)",
    fontWeight: "bold",
    fontSize: 14,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dashedLineLeft: {
    position: "absolute",
    left: 12,
    top: 40,
    bottom: 12,
    width: 2,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    borderStyle: "dashed",
  },
  dashedLineRight: {
    position: "absolute",
    right: 12,
    top: 40,
    bottom: 12,
    width: 2,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    borderStyle: "dashed",
  },
  wheelStopper: {
    position: "absolute",
    bottom: 15,
    left: 25,
    right: 25,
    height: 6,
    backgroundColor: "#F1C40F",
    borderRadius: 3,
    opacity: 0.8,
  },
  slotContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: "rgba(255,255,255,0.2)",
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: 2,
  },
  carImage: {
    width: "85%",
    height: "85%",
    marginBottom: 10,
  },
  fallbackContainer: {
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  fallbackTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 20,
    color: COLORS.gray700,
  },
  fallbackSub: {
    fontSize: 14,
    color: COLORS.gray500,
    textAlign: "center",
    marginTop: 10,
    marginBottom: 30,
  },
  fallbackBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    ...SHADOWS.medium,
  },
  fallbackBtnText: {
    color: COLORS.white,
    fontWeight: "bold",
    fontSize: 16,
  },
});
