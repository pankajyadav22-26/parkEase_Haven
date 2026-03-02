import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  LayoutAnimation,
  UIManager,
  StatusBar,
  ScrollView,
} from "react-native";
import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { AuthContext } from "../contexts/AuthContext";
import { backendUrl } from "../constants";
import DateTimePicker from "@react-native-community/datetimepicker";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { COLORS, SHADOWS, SPACING } from "../constants/theme";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

const Transaction = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useContext(AuthContext);

  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const [statusFilter, setStatusFilter] = useState("all");
  const [dateMode, setDateMode] = useState("month");

  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    fetchTransactions();
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [
    transactions,
    statusFilter,
    dateMode,
    selectedDate,
    selectedMonth,
    selectedYear,
  ]);

  const fetchTransactions = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await axios.get(`${backendUrl}/api/transaction/${user._id}`);
      const sortedData = res.data.sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
      );
      setTransactions(sortedData);
    } catch (err) {
      console.log("Error fetching transactions", err);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let data = [...transactions];
    if (statusFilter !== "all") {
      data = data.filter((txn) => txn.status.toLowerCase() === statusFilter);
    }

    if (dateMode === "exact" && selectedDate) {
      data = data.filter((txn) => {
        const txnDate = new Date(txn.timestamp);
        return txnDate.toDateString() === selectedDate.toDateString();
      });
    } else if (dateMode === "month") {
      data = data.filter((txn) => {
        const txnDate = new Date(txn.timestamp);
        return (
          txnDate.getMonth() === selectedMonth &&
          txnDate.getFullYear() === selectedYear
        );
      });
    } else if (dateMode === "year") {
      data = data.filter((txn) => {
        const txnDate = new Date(txn.timestamp);
        return txnDate.getFullYear() === selectedYear;
      });
    }

    setFilteredTransactions(data);
  };

  const toggleFilters = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowFilters(!showFilters);
  };

  const totalSpent = filteredTransactions
    .filter((txn) => txn.status === "success")
    .reduce((sum, txn) => sum + txn.amount, 0);

  const renderItem = ({ item }) => {
    const isSuccess = item.status === "success";
    const dateObj = new Date(item.timestamp);

    return (
      <View style={styles.card}>
        <View style={styles.cardLeft}>
          <View
            style={[
              styles.iconBox,
              {
                backgroundColor: isSuccess
                  ? COLORS.primary + "15"
                  : COLORS.error + "15",
              },
            ]}
          >
            <Ionicons
              name={isSuccess ? "car-sport" : "alert-circle"}
              size={20}
              color={isSuccess ? COLORS.primary : COLORS.error}
            />
          </View>
          <View>
            <Text style={styles.cardTitle}>Parking Reservation</Text>
            <Text style={styles.cardDate}>
              {dateObj.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}{" "}
              •{" "}
              {dateObj.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
        </View>

        <View style={styles.cardRight}>
          <Text
            style={[
              styles.amount,
              { color: isSuccess ? COLORS.gray900 : COLORS.gray500 },
            ]}
          >
            -₹{item.amount}
          </Text>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: isSuccess
                  ? COLORS.success + "15"
                  : COLORS.error + "15",
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: isSuccess ? COLORS.success : COLORS.error },
              ]}
            >
              {isSuccess ? "PAID" : "FAILED"}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const years = Array.from(
    { length: 6 },
    (_, i) => new Date().getFullYear() - i,
  );
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        style={styles.absoluteBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <View
        style={[styles.headerContent, { paddingTop: insets.top + SPACING.s }]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wallet</Text>
        <TouchableOpacity
          onPress={toggleFilters}
          style={styles.filterBtn}
          activeOpacity={0.8}
        >
          <Ionicons
            name={showFilters ? "options" : "options-outline"}
            size={22}
            color={COLORS.white}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={showFilters ? [] : []}
      >
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryLabel}>Total Spent</Text>
            <View style={styles.periodBadge}>
              <Text style={styles.periodText}>
                {dateMode === "all"
                  ? "All Time"
                  : dateMode === "month"
                    ? months[selectedMonth]
                    : selectedYear}
              </Text>
            </View>
          </View>
          <Text style={styles.summaryAmount}>
            ₹{totalSpent.toLocaleString()}
          </Text>
          <Text style={styles.summarySub}>
            Based on {filteredTransactions.length} transactions
          </Text>
        </View>

        {showFilters && (
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Filters</Text>

            <Text style={styles.filterLabel}>Transaction Status</Text>
            <View style={styles.chipRow}>
              {["all", "success", "failed"].map((status) => (
                <FilterChip
                  key={status}
                  label={
                    status === "success"
                      ? "Successful"
                      : status.charAt(0).toUpperCase() + status.slice(1)
                  }
                  active={statusFilter === status}
                  onPress={() => setStatusFilter(status)}
                />
              ))}
            </View>

            <Text style={styles.filterLabel}>Time Period</Text>
            <View style={styles.chipRow}>
              {[
                { id: "month", label: "By Month" },
                { id: "year", label: "By Year" },
                { id: "exact", label: "Custom Date" },
              ].map((mode) => (
                <FilterChip
                  key={mode.id}
                  label={mode.label}
                  active={dateMode === mode.id}
                  onPress={() => {
                    setDateMode(mode.id);
                    if (mode.id === "exact" && !selectedDate)
                      setSelectedDate(new Date());
                  }}
                />
              ))}
            </View>

            <View style={styles.selectorContainer}>
              {dateMode === "exact" && (
                <TouchableOpacity
                  style={styles.dateBtn}
                  onPress={() => setShowDatePicker(true)}
                  activeOpacity={0.7}
                >
                  <View style={styles.dateBtnLeft}>
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color={COLORS.gray600}
                    />
                    <Text style={styles.dateText}>
                      {selectedDate
                        ? selectedDate.toLocaleDateString(undefined, {
                            weekday: "short",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        : "Select Date"}
                    </Text>
                  </View>
                  {selectedDate && (
                    <TouchableOpacity
                      onPress={() => setSelectedDate(null)}
                      style={{ padding: 4 }}
                    >
                      <Ionicons
                        name="close-circle"
                        size={20}
                        color={COLORS.gray400}
                      />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              )}

              {dateMode === "month" && (
                <View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.scrollSelect}
                  >
                    {years.map((year) => (
                      <TouchableOpacity
                        key={year}
                        style={[
                          styles.miniChip,
                          selectedYear === year && styles.activeMiniChip,
                        ]}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setSelectedYear(year);
                        }}
                      >
                        <Text
                          style={[
                            styles.miniChipText,
                            selectedYear === year && styles.activeMiniChipText,
                          ]}
                        >
                          {year}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.scrollSelect}
                  >
                    {months.map((m, index) => (
                      <TouchableOpacity
                        key={m}
                        style={[
                          styles.miniChip,
                          selectedMonth === index && styles.activeMiniChip,
                        ]}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setSelectedMonth(index);
                        }}
                      >
                        <Text
                          style={[
                            styles.miniChipText,
                            selectedMonth === index &&
                              styles.activeMiniChipText,
                          ]}
                        >
                          {m}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {dateMode === "year" && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.scrollSelect}
                >
                  {years.map((year) => (
                    <TouchableOpacity
                      key={year}
                      style={[
                        styles.miniChip,
                        selectedYear === year && styles.activeMiniChip,
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setSelectedYear(year);
                      }}
                    >
                      <Text
                        style={[
                          styles.miniChipText,
                          selectedYear === year && styles.activeMiniChipText,
                        ]}
                      >
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>
        )}

        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Recent Activity</Text>
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color={COLORS.primary}
            style={{ marginTop: 40 }}
          />
        ) : filteredTransactions.length > 0 ? (
          filteredTransactions.map((item) => (
            <React.Fragment key={item._id}>
              {renderItem({ item })}
            </React.Fragment>
          ))
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Ionicons
                name="receipt-outline"
                size={40}
                color={COLORS.gray400}
              />
            </View>
            <Text style={styles.emptyTitle}>No Transactions</Text>
            <Text style={styles.emptySub}>
              You haven't made any reservations for this period.
            </Text>
          </View>
        )}
      </ScrollView>

      {showDatePicker && (
        <DateTimePicker
          value={selectedDate || new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (date) setSelectedDate(date);
          }}
          maximumDate={new Date()}
        />
      )}
    </View>
  );
};

export default Transaction;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6F8",
  },
  absoluteBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 240,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 20,
    zIndex: 10,
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
  filterBtn: {
    width: 40,
    height: 40,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.m,
    paddingTop: 10,
    paddingBottom: 100,
  },
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    ...SHADOWS.medium,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.gray600,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  periodBadge: {
    backgroundColor: COLORS.gray100,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  periodText: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.gray700,
  },
  summaryAmount: {
    fontSize: 36,
    fontWeight: "900",
    color: COLORS.gray900,
    letterSpacing: -1,
  },
  summarySub: {
    fontSize: 13,
    color: COLORS.gray500,
    marginTop: 6,
    fontWeight: "500",
  },
  filterSection: {
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
    ...SHADOWS.light,
  },
  filterSectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.gray900,
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.gray500,
    marginBottom: 10,
    marginTop: 10,
    textTransform: "uppercase",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
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
  selectorContainer: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
  },
  dateBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.gray50,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    justifyContent: "space-between",
  },
  dateBtnLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateText: {
    marginLeft: 12,
    color: COLORS.gray800,
    fontSize: 15,
    fontWeight: "600",
  },
  scrollSelect: {
    marginBottom: 12,
  },
  miniChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: COLORS.gray50,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  activeMiniChip: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  miniChipText: {
    fontSize: 14,
    color: COLORS.gray600,
    fontWeight: "600",
  },
  activeMiniChipText: {
    color: COLORS.primaryDark,
    fontWeight: "800",
  },
  /* List Rendering */
  listHeader: {
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.gray900,
  },
  card: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.02)",
    ...SHADOWS.light,
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.gray900,
  },
  cardDate: {
    fontSize: 12,
    color: COLORS.gray500,
    fontWeight: "500",
    marginTop: 4,
  },
  cardRight: {
    alignItems: "flex-end",
  },
  amount: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  statusBadge: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  /* Empty State */
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.gray200,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.gray800,
  },
  emptySub: {
    color: COLORS.gray500,
    marginTop: 8,
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 40,
  },
});
