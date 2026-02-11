import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
  Image,
  Alert,
} from "react-native";
import React, { useContext, useEffect, useState, useCallback } from "react";
import { AuthContext } from "../contexts/AuthContext";
import axios from "axios";
import { backendUrl } from "../constants";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import MapModal from "../components/MapModal";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import LottieView from "lottie-react-native";

import { COLORS, SIZES, SHADOWS } from "../constants/theme";

const FilterChip = ({ label, active, onPress }) => (
  <TouchableOpacity
    style={[styles.filterChip, active && styles.activeFilterChip]}
    onPress={onPress}
  >
    <Text style={[styles.filterText, active && styles.activeFilterText]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const UserReservations = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [reservations, setReservations] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all");

  const [isGateOpening, setIsGateOpening] = useState(false);
  const [showSuccessAnim, setShowSuccessAnim] = useState(false);
  const [isMapVisible, setIsMapVisible] = useState(false);
  const [userCoords, setUserCoords] = useState(null);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const openMap = async () => {
    setIsMapVisible(true);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Allow location access to view map.");
      return;
    }

    const location = await Location.getCurrentPositionAsync({});
    setUserCoords({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });
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
    setRefreshing(true);
    fetchReservations();
  }, []);

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
    } else if (option === "today") {
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

        setTimeout(() => {
          setShowSuccessAnim(false);
          fetchReservations();
        }, 3000);
      } else {
        Alert.alert("Failed", res.data.message || "Failed to open gate.");
        setIsGateOpening(false);
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Something went wrong";
      Alert.alert("Error", msg);
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

    return (
      <View style={[styles.ticketCard, status === "Past" && styles.pastTicket]}>
        <View
          style={[
            styles.ticketHeader,
            {
              backgroundColor:
                status === "Active"
                  ? COLORS.success
                  : status === "Upcoming"
                    ? COLORS.primary
                    : COLORS.gray400,
            },
          ]}
        >
          <Text style={styles.ticketTitle}>
            {status === "Active" ? "Active Parking" : status}
          </Text>
          <Text style={styles.ticketSlot}>Slot {item.slot}</Text>
        </View>

        <View style={styles.ticketBody}>
          <View style={styles.row}>
            <View style={styles.infoBlock}>
              <Text style={styles.label}>START</Text>
              <Text style={styles.value}>
                {start.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
              <Text style={styles.date}>{start.toLocaleDateString()}</Text>
            </View>
            <MaterialCommunityIcons
              name="arrow-right"
              size={20}
              color={COLORS.gray400}
            />
            <View style={styles.infoBlock}>
              <Text style={styles.label}>END</Text>
              <Text style={styles.value}>
                {end.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
              <Text style={styles.date}>{end.toLocaleDateString()}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View>
              <Text style={styles.label}>VEHICLE</Text>
              <Text style={styles.value}>{item.carNumber}</Text>
            </View>
            <View>
              <Text style={styles.label}>TOTAL</Text>
              <Text style={[styles.value, { color: COLORS.primary }]}>
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
                >
                  <MaterialCommunityIcons
                    name="gate"
                    size={20}
                    color={COLORS.white}
                  />
                  <Text style={styles.btnText}>Open Gate</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.openedBadge}>
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={18}
                    color={COLORS.success}
                  />
                  <Text style={styles.openedText}>Gate Opened</Text>
                </View>
              )}

              <TouchableOpacity style={styles.mapBtn} onPress={openMap}>
                <MaterialCommunityIcons
                  name="map-marker-radius"
                  size={24}
                  color={COLORS.primary}
                />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View>
          <View style={styles.headerContent}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backBtn}
            >
              <MaterialCommunityIcons
                name="arrow-left"
                size={24}
                color={COLORS.white}
              />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>My Reservations</Text>
            <View style={{ width: 40}} />
          </View>
        </View>
      </LinearGradient>

      <View style={styles.filterContainer}>
        <View style={styles.chipRow}>
          {["all", "today", "upcoming", "past"].map((f) => (
            <FilterChip
              key={f}
              label={f.charAt(0).toUpperCase() + f.slice(1)}
              active={filter === f}
              onPress={() => setFilter(f)}
            />
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
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
            <ActivityIndicator
              size="large"
              color={COLORS.primary}
              style={{ marginTop: 50 }}
            />
          ) : (
            <Text style={styles.emptyText}>No tickets found.</Text>
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
                  style={{ width: 150, height: 150 }}
                />
                <Text
                  style={[
                    styles.loadingText,
                    { color: COLORS.success, fontSize: 18, marginTop: 0 },
                  ]}
                >
                  Gate Opened!
                </Text>
              </>
            ) : (
              <>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Connecting to Gate...</Text>
              </>
            )}
          </View>
        </View>
      )}

      <MapModal
        visible={isMapVisible}
        onClose={() => setIsMapVisible(false)}
        userCoords={userCoords}
      />
    </View>
  );
};

export default UserReservations;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray100,
  },
  header: {
    paddingTop: 9,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
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
    fontWeight: "bold",
    color: COLORS.white,
  },
  backBtn: {
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
  },
  filterContainer: {
    marginTop: 15,
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: "row",
    gap: 10,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  activeFilterChip: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 12,
    color: COLORS.gray600,
    fontWeight: "600",
  },
  activeFilterText: {
    color: COLORS.white,
  },
  listContent: {
    padding: 20,
    paddingBottom: 50,
  },
  ticketCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: 20,
    overflow: "hidden",
    ...SHADOWS.small,
  },
  pastTicket: {
    opacity: 0.7,
  },
  ticketHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    paddingHorizontal: 20,
  },
  ticketTitle: {
    color: COLORS.white,
    fontWeight: "bold",
    fontSize: 14,
    textTransform: "uppercase",
  },
  ticketSlot: {
    color: COLORS.white,
    fontWeight: "bold",
  },
  ticketBody: {
    padding: 20,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoBlock: {
    alignItems: "flex-start",
  },
  label: {
    fontSize: 10,
    color: COLORS.gray500,
    marginBottom: 4,
    fontWeight: "bold",
  },
  value: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text,
  },
  date: {
    fontSize: 12,
    color: COLORS.gray500,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.gray200,
    marginVertical: 15,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  actionRow: {
    marginTop: 20,
    flexDirection: "row",
    gap: 15,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  disabledBtn: {
    backgroundColor: COLORS.gray400,
  },
  btnText: {
    color: COLORS.white,
    fontWeight: "bold",
    fontSize: 14,
  },
  mapBtn: {
    width: 48,
    height: 48,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
  },
  openedBadge: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "#E8F5E9",
    borderRadius: 10,
    paddingVertical: 12,
  },
  openedText: {
    color: COLORS.success,
    fontWeight: "bold",
  },
  emptyText: {
    textAlign: "center",
    marginTop: 50,
    color: COLORS.gray500,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
  },
  loadingBox: {
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    ...SHADOWS.medium,
    minWidth: 150,
    minHeight: 150,
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.gray700,
    fontWeight: "600",
  },
});
