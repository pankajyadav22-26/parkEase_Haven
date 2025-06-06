import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  Button,
  Platform,
  LayoutAnimation,
  UIManager,
  TouchableOpacity,
} from "react-native";
import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { AuthContext } from "../contexts/AuthContext";
import { backendUrl } from "@/constants";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const Transaction = () => {
  const { user } = useContext(AuthContext);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilterMode, setDateFilterMode] = useState("exact");
  const [dateFilter, setDateFilter] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const res = await axios.get(
          `${backendUrl}/api/transaction/${user._id}`
        );
        let data = res.data;
    
        if (statusFilter !== "all") {
          data = data.filter(
            (txn) => txn.status.toLowerCase() === statusFilter.toLowerCase()
          );
        }
    
        if (dateFilter) {
          const selectedDate = new Date(dateFilter);
          data = data.filter((txn) => {
            const txnDate = new Date(txn.timestamp);
            if (dateFilterMode === "exact") {
              return txnDate.toDateString() === selectedDate.toDateString();
            }
            if (dateFilterMode === "month") {
              return (
                txnDate.getMonth() === selectedDate.getMonth() &&
                txnDate.getFullYear() === selectedDate.getFullYear()
              );
            }
            if (dateFilterMode === "year") {
              return txnDate.getFullYear() === selectedDate.getFullYear();
            }
            return true;
          });
        }
    
        setTransactions(data);
      } catch (err) {
        if (err.response && err.response.status === 404) {
          // Expected: No transactions
          setTransactions([]); // Still update the state
        } else {
          console.error("Unexpected error fetching transactions:", err);
        }
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchTransactions();
    }
  }, [user, statusFilter, dateFilter, dateFilterMode]);

  const renderItem = ({ item }) => (
    <View style={styles.transactionCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Transaction</Text>
        <Text
          style={[
            styles.status,
            { color: item.status === "success" ? "#4caf50" : "#f44336" },
          ]}
        >
          ● {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
        </Text>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.label}>Transaction ID</Text>
        <Text style={styles.value}>{item.transactionId}</Text>

        <Text style={styles.label}>Amount</Text>
        <Text style={styles.value}>₹{item.amount}</Text>

        <Text style={styles.label}>Time</Text>
        <Text style={styles.value}>
          {new Date(item.timestamp).toLocaleString()}
        </Text>
      </View>
    </View>
  );

  const renderFilters = () => (
    <>
      <TouchableOpacity
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setShowFilters((prev) => !prev);
        }}
        style={styles.toggleButton}
      >
        <Text style={styles.toggleButtonText}>
          {showFilters ? "Hide Filters ▲" : "Show Filters ▼"}
        </Text>
      </TouchableOpacity>

      {showFilters && (
        <View style={styles.filterCard}>
          <Text style={styles.label}>Status Filter:</Text>
          <Picker
            selectedValue={statusFilter}
            onValueChange={(value) => setStatusFilter(value)}
            style={styles.picker}
          >
            <Picker.Item label="All" value="all" />
            <Picker.Item label="Success" value="success" />
            <Picker.Item label="Failed" value="failed" />
          </Picker>

          <Text style={styles.label}>Date Filter Type:</Text>
          <Picker
            selectedValue={dateFilterMode}
            onValueChange={(val) => {
              setDateFilterMode(val);
              setDateFilter("");
              setSelectedMonth("");
              setSelectedYear("");
            }}
            style={styles.picker}
          >
            <Picker.Item label="Exact Date" value="exact" />
            <Picker.Item label="Month" value="month" />
            <Picker.Item label="Year" value="year" />
          </Picker>

          {dateFilterMode === "exact" && (
            <View style={{ marginBottom: 10 }}>
              <Button
                title={
                  dateFilter
                    ? `Selected: ${new Date(dateFilter).toDateString()}`
                    : "Select Date"
                }
                onPress={() => setShowPicker(true)}
                color="#4caf50"
              />
              {showPicker && (
                <DateTimePicker
                  value={dateFilter ? new Date(dateFilter) : new Date()}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(event, selectedDate) => {
                    setShowPicker(false);
                    if (selectedDate) {
                      setDateFilter(selectedDate.toISOString());
                    }
                  }}
                />
              )}
            </View>
          )}

          {dateFilterMode === "month" && (
            <>
              <Text style={styles.label}>Select Month:</Text>
              <Picker
                selectedValue={selectedMonth}
                onValueChange={(val) => setSelectedMonth(val)}
                style={styles.picker}
              >
                <Picker.Item label="Select Month" value="" />
                {Array.from({ length: 12 }, (_, i) => (
                  <Picker.Item
                    key={i}
                    label={new Date(0, i).toLocaleString("default", {
                      month: "long",
                    })}
                    value={i}
                  />
                ))}
              </Picker>

              <Text style={styles.label}>Select Year:</Text>
              <Picker
                selectedValue={selectedYear}
                onValueChange={(val) => setSelectedYear(val)}
                style={styles.picker}
              >
                <Picker.Item label="Select Year" value="" />
                {Array.from({ length: 20 }, (_, i) => {
                  const year = new Date().getFullYear() - i;
                  return (
                    <Picker.Item key={year} label={`${year}`} value={year} />
                  );
                })}
              </Picker>

              <Button
                title="Apply"
                onPress={() => {
                  if (selectedMonth !== "" && selectedYear !== "") {
                    const date = new Date(selectedYear, selectedMonth, 1);
                    setDateFilter(date.toISOString());
                  }
                }}
                color="#4caf50"
              />
            </>
          )}

          {dateFilterMode === "year" && (
            <>
              <Text style={styles.label}>Select Year:</Text>
              <Picker
                selectedValue={selectedYear}
                onValueChange={(val) => {
                  setSelectedYear(val);
                  if (val !== "") {
                    const date = new Date(val, 0, 1);
                    setDateFilter(date.toISOString());
                  }
                }}
                style={styles.picker}
              >
                <Picker.Item label="Select Year" value="" />
                {Array.from({ length: 20 }, (_, i) => {
                  const year = new Date().getFullYear() - i;
                  return (
                    <Picker.Item key={year} label={`${year}`} value={year} />
                  );
                })}
              </Picker>
            </>
          )}

          {dateFilter && (
            <View style={{ marginTop: 10 }}>
              <Button
                title="Clear Date Filter"
                onPress={() => setDateFilter("")}
                color="#f44336"
              />
            </View>
          )}
        </View>
      )}
    </>
  );

  return (
    <FlatList
      data={transactions}
      keyExtractor={(item) => item._id}
      renderItem={renderItem}
      contentContainerStyle={styles.container}
      ListHeaderComponent={renderFilters}
      ListEmptyComponent={
        loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4caf50" />
          </View>
        ) : (
          <Text style={styles.noTransactions}>No transactions found.</Text>
        )
      }
    />
  );
};

export default Transaction;

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  toggleButton: {
    backgroundColor: "#4caf50",
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
    alignItems: "center",
  },
  toggleButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  filterCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    elevation: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 5,
    color: "#444",
  },
  picker: {
    backgroundColor: "#f9f9f9",
    borderRadius: 6,
    marginBottom: 15,
    elevation: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  transactionCard: {
    padding: 15,
    marginVertical: 8,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderLeftWidth: 5,
    borderLeftColor: "#4caf50",
    elevation: 3,
  },
  id: {
    fontSize: 14,
    fontWeight: "bold",
  },
  amount: {
    fontSize: 16,
    marginTop: 5,
  },
  status: {
    fontSize: 14,
    marginTop: 5,
    color: "#333",
  },
  time: {
    fontSize: 12,
    marginTop: 5,
    color: "#666",
  },
  noTransactions: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
    color: "#777",
  },
  transactionCard: {
    padding: 15,
    marginVertical: 10,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  status: {
    fontSize: 14,
    fontWeight: "600",
  },
  cardBody: {
    gap: 5,
  },
  label: {
    fontSize: 13,
    color: "#888",
    marginTop: 6,
  },
  value: {
    fontSize: 15,
    color: "#444",
  },
});
