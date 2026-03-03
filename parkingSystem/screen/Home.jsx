import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  Animated,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { backendUrl } from "../constants";
import { COLORS, SHADOWS, SPACING } from "../constants/theme";
import { ParkingContext } from "../contexts/ParkingContext";

const { width } = Dimensions.get("window");
const PADDING = 20;
const SLOT_WIDTH = (width - PADDING * 2 - 40) / 2;

const FILTER_TYPES = ["All", "Available", "Occupied", "Reserved"];

const Home = ({ navigation }) => {
  const insets = useSafeAreaInsets();
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
  const pulseAnim = useRef(new Animated.Value(0.5)).current;
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
          if (acc[slot.currentStatus] !== undefined) acc[slot.currentStatus]++;
          return acc;
        },
        { available: 0, occupied: 0, reserved: 0 },
      );

      setStats(newStats);
      setSlots(fetchedSlots);
      applyFilter(activeFilter, fetchedSlots);
    } catch (error) {
      console.error("Failed to fetch slots:", error);
    } finally {
      setRefreshing(false);
    }
  }, [activeFilter, selectedLot]);

  useEffect(() => {
    if (isFocused && selectedLot) {
      fetchSlots();

      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.5,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }
  }, [isFocused, selectedLot]);

  const handleFilterPress = (filter) => {
    Haptics.selectionAsync();
    setActiveFilter(filter);
    applyFilter(filter, slots);
  };

  if (!selectedLot) return null;

  const capacity = stats.available + stats.occupied + stats.reserved;
  const occupancyRate =
    capacity === 0 ? 0 : Math.round((stats.occupied / capacity) * 100);

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      {}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        style={[styles.headerGradient, { paddingTop: insets.top + SPACING.s }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerSubtitle}>LIVE</Text>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {selectedLot.name}
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {}
        <View style={styles.dashboardStats}>
          <View style={styles.statMain}>
            <Text style={styles.statMainLabel}>AVAILABLE SPOTS</Text>
            <Text style={styles.statMainValue}>{stats.available}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statSecondary}>
            <View style={styles.statRow}>
              <View
                style={[styles.statDot, { backgroundColor: COLORS.error }]}
              />
              <Text style={styles.statSecLabel}>Occupied</Text>
              <Text style={styles.statSecValue}>{stats.occupied}</Text>
            </View>
            <View style={[styles.statRow, { marginTop: 8 }]}>
              <View
                style={[styles.statDot, { backgroundColor: COLORS.warning }]}
              />
              <Text style={styles.statSecLabel}>Reserved</Text>
              <Text style={styles.statSecValue}>{stats.reserved}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {}
      <View style={styles.segmentedControlWrapper}>
        <View style={styles.segmentedControl}>
          {FILTER_TYPES.map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <TouchableOpacity
                key={filter}
                style={[styles.segmentBtn, isActive && styles.segmentBtnActive]}
                onPress={() => handleFilterPress(filter)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.segmentText,
                    isActive && styles.segmentTextActive,
                  ]}
                >
                  {filter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={fetchSlots}
            tintColor={COLORS.primary}
          />
        }
      >
        <Animated.View style={[styles.gridContainer, { opacity: fadeAnim }]}>
          {}
          {activeFilter === "All" && filteredSlots.length > 0 && (
            <View style={styles.drivewayAisle}>
              <View style={styles.drivewayLine} />
            </View>
          )}

          {filteredSlots.length === 0 && !refreshing ? (
            <View style={styles.emptyGrid}>
              <Ionicons
                name="car-sport-outline"
                size={48}
                color={COLORS.gray400}
              />
              <Text style={styles.emptyGridText}>
                No {activeFilter.toLowerCase()} spots found.
              </Text>
            </View>
          ) : (
            filteredSlots.map((slot, index) => {
              const isAvailable = slot.currentStatus === "available";
              const isOccupied = slot.currentStatus === "occupied";
              const isReserved = slot.currentStatus === "reserved";

              const isLeftSide = index % 2 === 0;

              return (
                <TouchableOpacity
                  key={slot._id}
                  activeOpacity={isAvailable ? 0.7 : 1}
                  style={[
                    styles.slotWrapper,
                    isLeftSide ? { paddingRight: 20 } : { paddingLeft: 20 },
                  ]}
                >
                  <View
                    style={[
                      styles.slotCard,
                      isAvailable ? styles.slotAvailable : styles.slotMuted,
                      isLeftSide ? styles.borderRight : styles.borderLeft,
                    ]}
                  >
                    {}
                    <View style={styles.slotHeader}>
                      <Text
                        style={[
                          styles.slotNameText,
                          isAvailable
                            ? { color: COLORS.gray900 }
                            : { color: COLORS.gray500 },
                        ]}
                      >
                        {slot.slotName}
                      </Text>
                    </View>

                    {}
                    <View style={styles.slotBody}>
                      {isAvailable && (
                        <>
                          <Animated.View style={{ opacity: pulseAnim }}>
                            <MaterialCommunityIcons
                              name="car-arrow-right"
                              size={32}
                              color={COLORS.success}
                            />
                          </Animated.View>
                          <Text style={styles.availableText}>AVAILABLE</Text>
                        </>
                      )}

                      {isOccupied && (
                        <>
                          <Ionicons
                            name="car-sport"
                            size={32}
                            color={COLORS.gray400}
                          />
                          <Text style={styles.mutedText}>OCCUPIED</Text>
                        </>
                      )}

                      {isReserved && (
                        <>
                          <MaterialCommunityIcons
                            name="clock-outline"
                            size={30}
                            color={COLORS.warning}
                          />
                          <Text
                            style={[
                              styles.mutedText,
                              { color: COLORS.warning },
                            ]}
                          >
                            RESERVED
                          </Text>
                        </>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
};

export default Home;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6F8",
  },

  headerGradient: {
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    ...SHADOWS.medium,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTextWrap: { alignItems: "center", flex: 1 },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 2,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.white,
    letterSpacing: -0.5,
  },

  dashboardStats: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.15)",
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
  },
  statMain: { flex: 1 },
  statMainLabel: {
    color: COLORS.success,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 4,
  },
  statMainValue: {
    color: COLORS.white,
    fontSize: 40,
    fontWeight: "900",
    letterSpacing: -1,
    lineHeight: 45,
  },
  statDivider: {
    width: 1,
    height: "80%",
    backgroundColor: "rgba(255,255,255,0.2)",
    marginHorizontal: 20,
  },
  statSecondary: { flex: 1, justifyContent: "center" },
  statRow: { flexDirection: "row", alignItems: "center" },
  statDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statSecLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  statSecValue: { color: COLORS.white, fontSize: 16, fontWeight: "800" },

  segmentedControlWrapper: {
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
    zIndex: 5,
  },
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0", 

    borderRadius: 12,
    padding: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: COLORS.white,
    ...SHADOWS.light,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.gray500,
  },
  segmentTextActive: {
    color: COLORS.gray900,
    fontWeight: "800",
  },

  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 100, paddingTop: 10 },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: PADDING,
    position: "relative",
  },

  drivewayAisle: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: width / 2,
    width: 2,
    alignItems: "center",
    zIndex: -1,
  },
  drivewayLine: {
    flex: 1,
    width: 2,
    borderWidth: 1,
    borderColor: "#CBD5E1", 
    borderStyle: "dashed",
  },

  slotWrapper: {
    width: "50%",
    marginBottom: SPACING.m,
  },
  slotCard: {
    height: 120,
    borderRadius: 16,
    padding: 12,
    justifyContent: "space-between",
  },

  slotAvailable: {
    backgroundColor: COLORS.white,
    ...SHADOWS.medium,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)", 

  },

  slotMuted: {
    backgroundColor: "#E2E8F0", 

    borderWidth: 1,
    borderColor: "#F1F5F9",
  },

  borderRight: { borderRightWidth: 4, borderRightColor: COLORS.gray300 }, 

  borderLeft: { borderLeftWidth: 4, borderLeftColor: COLORS.gray300 }, 

  slotHeader: {
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  slotNameText: {
    fontSize: 16,
    fontWeight: "900",
  },
  slotBody: {
    alignItems: "flex-end",
    justifyContent: "flex-end",
    flex: 1,
  },
  availableText: {
    color: COLORS.success,
    fontSize: 11,
    fontWeight: "900",
    marginTop: 4,
    letterSpacing: 0.5,
  },
  mutedText: {
    color: COLORS.gray500,
    fontSize: 10,
    fontWeight: "800",
    marginTop: 4,
    letterSpacing: 0.5,
  },

  emptyGrid: { width: "100%", alignItems: "center", paddingTop: 60 },
  emptyGridText: {
    marginTop: 12,
    color: COLORS.gray500,
    fontWeight: "600",
    fontSize: 15,
  },
});