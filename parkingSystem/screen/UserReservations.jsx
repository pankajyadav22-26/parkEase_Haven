import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Button,
} from "react-native";
import React, { useContext, useEffect, useState, useCallback } from "react";
import { AuthContext } from "../contexts/AuthContext";
import axios from "axios";
import { backendUrl } from "@/constants";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { Picker } from "@react-native-picker/picker";
import * as Location from "expo-location";
import MapModal from "../components/MapModal";

const UserReservations = () => {
  const { user } = useContext(AuthContext);
  const [reservations, setReservations] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all");
  const [isGateOpening, setIsGateOpening] = useState(false);
  const [isMapVisible, setIsMapVisible] = useState(false);
  const [userCoords, setUserCoords] = useState(null);

  const openMap = async () => {
    setIsMapVisible(true);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      alert("Permission to access location was denied");
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
        `${backendUrl}/api/booking/fetch/${user._id}`
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
    if (user && user._id) {
      fetchReservations();
    }
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
    } else if (option === "week") {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);

      filteredData = reservations.filter((res) => {
        const start = new Date(res.startTime);
        return start >= startOfWeek && start <= endOfWeek;
      });
    } else if (option === "past") {
      filteredData = reservations.filter((res) => {
        const end = new Date(res.endTime);
        return end < now;
      });
    }

    filteredData.sort((a, b) => {
      const now = new Date();
      const aStart = new Date(a.startTime);
      const aEnd = new Date(a.endTime);
      const bStart = new Date(b.startTime);
      const bEnd = new Date(b.endTime);

      const getStatusValue = (start, end) => {
        if (end < now) return 2; // Past
        if (start <= now && now <= end) return 0; // Today
        if (start > now) return 1; // Upcoming
        return 3; // Fallback
      };

      return getStatusValue(aStart, aEnd) - getStatusValue(bStart, bEnd);
    });

    setFiltered(filteredData);
  };

  const getStatus = (start, end) => {
    const now = new Date();
    if (end < now) return "Past";
    if (start <= now && now <= end) return "Today";
    if (start > now) return "Upcoming";
    return "";
  };

  const handleOpenGate = async (reservationId) => {
    try {
      setIsGateOpening(true); // disable everything

      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        alert("Location permission denied.");
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
        alert("Gate opened successfully!");
        fetchReservations();
      } else {
        alert(res.data.message || "Failed to open gate.");
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong while opening the gate.");
    } finally {
      setIsGateOpening(false);
    }
  };

  if (loading) {
    return (
      <ActivityIndicator size="large" style={styles.loader} color="#007bff" />
    );
  }

  return (
    <View
      style={styles.container}
      pointerEvents={isGateOpening ? "none" : "auto"}
    >
      <Picker
        selectedValue={filter}
        onValueChange={(itemValue) => setFilter(itemValue)}
        style={styles.picker}
      >
        <Picker.Item label="All" value="all" />
        <Picker.Item label="Today" value="today" />
        <Picker.Item label="This Week" value="week" />
        <Picker.Item label="Past" value="past" />
      </Picker>

      {filtered.length === 0 ? (
        <Text style={styles.emptyText}>No reservations found.</Text>
      ) : (
        <FlatList
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          data={filtered}
          keyExtractor={(item) => item._id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const start = new Date(item.startTime);
            const end = new Date(item.endTime);
            const status = getStatus(start, end);
            const now = new Date();

            const isGateButtonDisabled =
              item.gateOpened ||
              (status === "Upcoming" &&
                start.getTime() - now.getTime() > 5 * 60 * 1000);

            return (
              <View style={styles.card}>
                <Text style={styles.statusBadge(status)}>{status}</Text>
                <Text style={styles.title}>{item.name}</Text>
                <Text style={styles.detail}>
                  <Icon name="car" size={16} color="#333" /> Car:{" "}
                  <Text style={styles.value}>{item.carNumber}</Text>
                </Text>
                <Text style={styles.detail}>
                  <Icon name="parking" size={16} color="#333" /> Slot:{" "}
                  <Text style={styles.value}>{item.slot}</Text>
                </Text>
                <Text style={styles.detail}>
                  <Icon name="currency-inr" size={16} color="#333" /> Amount:{" "}
                  <Text style={styles.value}>₹ {item.amount}</Text>
                </Text>
                <Text style={styles.detail}>
                  <Icon name="clock-start" size={16} color="#333" /> Start:{" "}
                  <Text style={styles.value}>{start.toLocaleString()}</Text>
                </Text>
                <Text style={styles.detail}>
                  <Icon name="clock-end" size={16} color="#333" /> End:{" "}
                  <Text style={styles.value}>{end.toLocaleString()}</Text>
                </Text>

                {(status === "Today" || status === "Upcoming") && (
                  <View style={{ marginTop: 10 }}>
                    <Button
                      title={
                        item.gateOpened ? "Gate Already Opened" : "Open Gate"
                      }
                      onPress={() => handleOpenGate(item._id)}
                      disabled={isGateButtonDisabled}
                      color={item.gateOpened ? "#6c757d" : "#007bff"}
                    />
                    {!item.gateOpened && (
                      <View style={{ marginTop: 8 }}>
                        <Button
                          title="View Map"
                          onPress={openMap}
                          color="#17a2b8"
                        />
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          }}
        />
      )}
      {isGateOpening && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>Opening gate...</Text>
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
    backgroundColor: "#f0f4f8",
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    textAlign: "center",
    marginTop: 50,
    fontSize: 18,
    color: "#888",
  },
  listContent: {
    paddingBottom: 16,
  },
  card: {
    backgroundColor: "#ffffff",
    padding: 18,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
    color: "#333",
  },
  detail: {
    fontSize: 14,
    color: "#555",
    marginBottom: 4,
  },
  value: {
    color: "#000",
    fontWeight: "500",
  },
  picker: {
    marginBottom: 16,
    backgroundColor: "#fff",
    borderRadius: 8,
    elevation: 2,
  },
  statusBadge: (status) => ({
    alignSelf: "flex-start",
    backgroundColor:
      status === "Upcoming"
        ? "#007bff"
        : status === "Today"
        ? "#28a745"
        : "#6c757d",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
    overflow: "hidden",
    marginBottom: 8,
  }),
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  loadingText: {
    color: "#fff",
    marginTop: 10,
    fontSize: 16,
  },
});
