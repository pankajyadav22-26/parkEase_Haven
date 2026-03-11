import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
  Alert,
  ScrollView,
} from "react-native";
import React, { useContext, useEffect, useState, useCallback } from "react";
import { AuthContext } from "../contexts/AuthContext";
import axios from "axios";
import { backendUrl } from "../constants";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import MapModal from "../components/MapModal";
import { LinearGradient } from "expo-linear-gradient";
import LottieView from "lottie-react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { format, differenceInMinutes, differenceInHours } from "date-fns";

import { COLORS, SHADOWS, SPACING } from "../constants/theme";

const FilterChip = ({ label, active, onPress }) => (
  <TouchableOpacity
    style={[styles.filterChip, active && styles.activeFilterChip]}
    onPress={() => {
      Haptics.selectionAsync();
      onPress();
    }}
    activeOpacity={0.8}
  >
    <Text style={[styles.filterText, active && styles.activeFilterText]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const UserReservations = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useContext(AuthContext);

  const [reservations, setReservations] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all");

  const [isGateOpening, setIsGateOpening] = useState(false);
  const [showSuccessAnim, setShowSuccessAnim] = useState(false);
  const [isMapVisible, setIsMapVisible] = useState(false);
  const [targetGateCoords, setTargetGateCoords] = useState(null);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const openMap = async (parkingLot) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (
      !parkingLot ||
      !parkingLot.location ||
      !parkingLot.location.coordinates
    ) {
      Alert.alert("Error", "Location data missing for this reservation.");
      return;
    }
    setTargetGateCoords({
      latitude: parkingLot.location.coordinates[0],
      longitude: parkingLot.location.coordinates[1],
      name: parkingLot.name,
    });
    setIsMapVisible(true);
  };

  const fetchReservations = async () => {
    try {
      const response = await axios.get(
        `${backendUrl}/api/booking/fetch/${user._id}`,
      );
      setReservations(response.data);
    } catch (error) {
      console.error("Error fetching reservations:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    fetchReservations();
  }, [user]);

  useEffect(() => {
    if (user && user._id) fetchReservations();
  }, [user]);

  useEffect(() => {
    filterReservations(filter);
  }, [reservations, filter]);

  const filterReservations = (option) => {
    const now = new Date();
    let filteredData = [];

    if (option === "all") {
      filteredData = [...reservations];
    } else if (option === "active") {
      filteredData = reservations.filter((res) => {
        const start = new Date(res.startTime);
        const end = new Date(res.endTime);
        return start <= now && now <= end;
      });
    } else if (option === "upcoming") {
      filteredData = reservations.filter(
        (res) => new Date(res.startTime) > now,
      );
    } else if (option === "past") {
      filteredData = reservations.filter((res) => new Date(res.endTime) < now);
    }

    filteredData.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    setFiltered(filteredData);
  };

  const getStatus = (start, end) => {
    const now = new Date();
    if (end < now) return "Past";
    if (start <= now && now <= end) return "Active";
    if (start > now) return "Upcoming";
    return "";
  };

  const handleOpenGate = async (reservationId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      setIsGateOpening(true);
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location is required to open gate.");
        setIsGateOpening(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const payload = {
        reservationId,
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
      };

      const res = await axios.post(`${backendUrl}/api/gate/open`, payload);

      if (res.data.success) {
        setIsGateOpening(false);
        setShowSuccessAnim(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        setTimeout(() => {
          setShowSuccessAnim(false);
          fetchReservations();
        }, 3000);
      } else {
        Alert.alert("Failed", res.data.message || "Failed to open gate.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setIsGateOpening(false);
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Something went wrong";
      Alert.alert("Error", msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setIsGateOpening(false);
    }
  };

  const renderItem = ({ item }) => {
    const start = new Date(item.startTime);
    const end = new Date(item.endTime);
    const status = getStatus(start, end);
    const now = new Date();

    const isGateButtonEnabled =
      !item.gateOpened &&
      (status === "Active" ||
        (status === "Upcoming" &&
          start.getTime() - now.getTime() < 15 * 60 * 1000));
          
    const locationName = item.parkingLotId?.name || "ParkEase Location";

    let statusColor = COLORS.gray500;
    let statusBg = COLORS.gray200;
    if (status === "Active") {
      statusColor = COLORS.success;
      statusBg = "#E8F5E9";
    } else if (status === "Upcoming") {
      statusColor = COLORS.primary;
      statusBg = COLORS.primaryLight;
    }

    let timeRemainingStr = null;
    if (status === "Active") {
      const minsLeft = differenceInMinutes(end, now);
      const hrsLeft = differenceInHours(end, now);
      if (hrsLeft > 0) {
        timeRemainingStr = `${hrsLeft}h ${minsLeft % 60}m left`;
      } else {
        timeRemainingStr = `${minsLeft}m left`;
      }
    }

    return (
      <View style={[styles.ticketCard, status === "Past" && styles.pastTicket]}>
        <View style={styles.ticketHeader}>
          <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
            <View
              style={[styles.statusDot, { backgroundColor: statusColor }]}
            />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {status === "Active" ? "ACTIVE NOW" : status.toUpperCase()}
            </Text>
          </View>
          <View style={styles.slotBadge}>
            <Text style={styles.slotBadgeText}>Spot : {item.slot}</Text>
          </View>
        </View>

        <View style={styles.locationContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="business" size={18} color={COLORS.primary} />
          </View>
          <Text style={styles.locationText} numberOfLines={1}>
            {locationName}
          </Text>
        </View>

        <View style={styles.separatorContainer}>
          <View style={styles.separatorNotchLeft} />
          <View style={styles.dashedLine} />
          <View style={styles.separatorNotchRight} />
        </View>

        <View style={styles.ticketBody}>
          <View style={styles.timeRow}>
            <View style={styles.timeBlock}>
              <Text style={styles.timeLabel}>ARRIVAL</Text>
              <Text style={styles.timeValue}>{format(start, "hh:mm a")}</Text>
              <Text style={styles.dateValue}>{format(start, "MMM dd, yyyy")}</Text>
            </View>

            <View style={styles.durationIndicator}>
              <MaterialCommunityIcons
                name="arrow-right-thin"
                size={32}
                color={COLORS.gray400}
              />
              {status === "Active" && timeRemainingStr && (
                <Text style={styles.timeLeftText}>{timeRemainingStr}</Text>
              )}
            </View>

            <View style={[styles.timeBlock, { alignItems: "flex-end" }]}>
              <Text style={styles.timeLabel}>DEPARTURE</Text>
              <Text style={styles.timeValue}>{format(end, "hh:mm a")}</Text>
              <Text style={styles.dateValue}>{format(end, "MMM dd, yyyy")}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View>
              <Text style={styles.metaLabel}>VEHICLE</Text>
              <Text style={styles.metaValue}>{item.carNumber}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.metaLabel}>TOTAL PAID</Text>
              <Text style={[styles.metaValue, { color: COLORS.primary }]}>
                ₹{item.amount}
              </Text>
            </View>
          </View>

          {(status === "Active" || status === "Upcoming") && (
            <View style={styles.actionRow}>
              {!item.gateOpened ? (
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    !isGateButtonEnabled && styles.disabledBtn,
                  ]}
                  onPress={() => handleOpenGate(item._id)}
                  disabled={!isGateButtonEnabled}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={
                      isGateButtonEnabled
                        ? [COLORS.primary, COLORS.primaryDark]
                        : [COLORS.gray400, COLORS.gray500]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradientBtn}
                  >
                    <MaterialCommunityIcons
                      name="boom-gate-up"
                      size={20}
                      color={COLORS.white}
                    />
                    <Text style={styles.btnText}>Open Gate</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <View style={styles.openedBadge}>
                  <MaterialCommunityIcons
                    name="check-decagram"
                    size={20}
                    color={COLORS.success}
                  />
                  <Text style={styles.openedText}>Access Granted</Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.mapBtn}
                onPress={() => openMap(item.parkingLotId)}
                activeOpacity={0.7}
              >
                <Ionicons name="navigate" size={22} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

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
          <Text style={styles.headerTitle}>My Tickets</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <View style={styles.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScroll}
        >
          {["all", "active", "upcoming", "past"].map((f) => (
            <FilterChip
              key={f}
              label={
                f === "all"
                  ? "All Tickets"
                  : f.charAt(0).toUpperCase() + f.slice(1)
              }
              active={filter === f}
              onPress={() => setFilter(f)}
            />
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons
                name="ticket-confirmation-outline"
                size={64}
                color={COLORS.gray300}
              />
              <Text style={styles.emptyTitle}>No tickets found</Text>
              <Text style={styles.emptySub}>
                You don't have any reservations in this category.
              </Text>
            </View>
          )
        }
      />

      {(isGateOpening || showSuccessAnim) && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            {showSuccessAnim ? (
              <>
                <LottieView
                  source={require("../assets/gateAnimation.json")}
                  autoPlay
                  loop={false}
                  style={{ width: 140, height: 140 }}
                />
                <Text style={styles.successText}>Access Granted</Text>
              </>
            ) : (
              <>
                <ActivityIndicator
                  size="large"
                  color={COLORS.primary}
                  style={{ marginBottom: 16 }}
                />
                <Text style={styles.loadingTitle}>Connecting to Gate...</Text>
                <Text style={styles.loadingSub}>
                  Please remain near the entrance
                </Text>
              </>
            )}
          </View>
        </View>
      )}

      <MapModal
        visible={isMapVisible}
        onClose={() => setIsMapVisible(false)}
        targetCoords={targetGateCoords}
      />
    </View>
  );
};

export default UserReservations;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6F8",
  },
  headerGradient: {
    paddingBottom: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    ...SHADOWS.medium,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  backBtn: {
    width: 40,
    height: 40,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  filterWrapper: {
    marginTop: 16,
    marginBottom: 8,
  },
  chipScroll: {
    paddingHorizontal: 20,
    gap: 10,
  },
  filterChip: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    ...SHADOWS.light,
  },
  activeFilterChip: {
    backgroundColor: COLORS.gray900,
    borderColor: COLORS.gray900,
  },
  filterText: {
    fontSize: 13,
    color: COLORS.gray600,
    fontWeight: "700",
  },
  activeFilterText: {
    color: COLORS.white,
  },
  listContent: {
    padding: 20,
    paddingBottom: 80,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.gray700,
    marginTop: 16,
  },
  emptySub: {
    fontSize: 14,
    color: COLORS.gray500,
    marginTop: 8,
    textAlign: "center",
  },
  ticketCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    marginBottom: 20,
    ...SHADOWS.medium,
  },
  pastTicket: {
    opacity: 0.65,
  },
  ticketHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  slotBadge: {
    backgroundColor: COLORS.gray100,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  slotBadgeText: {
    color: COLORS.gray900,
    fontWeight: "800",
    fontSize: 14,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  locationText: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.gray900,
  },
  separatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 20,
    overflow: "hidden",
  },
  separatorNotchLeft: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#F4F6F8",
    marginLeft: -10,
  },
  dashedLine: {
    flex: 1,
    height: 1,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderStyle: "dashed",
    marginHorizontal: 4,
  },
  separatorNotchRight: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#F4F6F8",
    marginRight: -10,
  },
  ticketBody: {
    padding: 20,
    paddingTop: 10,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  timeBlock: {
    flex: 1,
  },
  durationIndicator: {
    paddingHorizontal: 10,
    alignItems: "center",
  },
  timeLeftText: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.primary,
    marginTop: -4,
  },
  timeLabel: {
    fontSize: 10,
    color: COLORS.gray500,
    fontWeight: "800",
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.gray900,
  },
  dateValue: {
    fontSize: 13,
    color: COLORS.gray500,
    fontWeight: "500",
    marginTop: 2,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: COLORS.gray50,
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  metaLabel: {
    fontSize: 10,
    color: COLORS.gray500,
    fontWeight: "800",
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.gray900,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 4,
    ...SHADOWS.small,
  },
  disabledBtn: {
    opacity: 0.9,
  },
  gradientBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 14,
    gap: 8,
  },
  btnText: {
    color: COLORS.white,
    fontWeight: "800",
    fontSize: 15,
  },
  mapBtn: {
    width: 52,
    height: 52,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 16,
  },
  openedBadge: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#E8F5E9",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  openedText: {
    color: COLORS.success,
    fontWeight: "800",
    fontSize: 15,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  loadingBox: {
    backgroundColor: COLORS.white,
    padding: 30,
    borderRadius: 24,
    alignItems: "center",
    ...SHADOWS.dark,
    minWidth: 220,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.gray900,
  },
  loadingSub: {
    fontSize: 13,
    color: COLORS.gray500,
    marginTop: 4,
  },
  successText: {
    color: COLORS.success,
    fontSize: 20,
    fontWeight: "900",
    marginTop: -10,
  },
});