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
  Modal
} from "react-native";
import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { AuthContext } from "../contexts/AuthContext";
import { backendUrl } from "../constants";
import DateTimePicker from "@react-native-community/datetimepicker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS, SIZES, SHADOWS } from "../constants/theme";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FilterChip = ({ label, active, onPress }) => (
  <TouchableOpacity
    style={[styles.filterChip, active && styles.activeFilterChip]}
    onPress={onPress}
  >
    <Text style={[styles.filterText, active && styles.activeFilterText]}>{label}</Text>
  </TouchableOpacity>
);

const Transaction = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateMode, setDateMode] = useState("exact");
  
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
  }, [transactions, statusFilter, dateMode, selectedDate, selectedMonth, selectedYear]);

  const fetchTransactions = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await axios.get(`${backendUrl}/api/transaction/${user._id}`);
      const sortedData = res.data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
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
      data = data.filter(txn => txn.status.toLowerCase() === statusFilter);
    }

    if (dateMode === 'exact' && selectedDate) {
      data = data.filter(txn => {
         const txnDate = new Date(txn.timestamp);
         return txnDate.toDateString() === selectedDate.toDateString();
      });
    } else if (dateMode === 'month') {
       data = data.filter(txn => {
         const txnDate = new Date(txn.timestamp);
         return txnDate.getMonth() === selectedMonth && txnDate.getFullYear() === selectedYear;
       });
    } else if (dateMode === 'year') {
       data = data.filter(txn => {
         const txnDate = new Date(txn.timestamp);
         return txnDate.getFullYear() === selectedYear;
       });
    }

    setFilteredTransactions(data);
  };

  const toggleFilters = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowFilters(!showFilters);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <View style={[
            styles.iconBox, 
            { backgroundColor: item.status === 'success' ? '#E8F5E9' : '#FFEBEE' }
        ]}>
            <MaterialCommunityIcons 
                name={item.status === 'success' ? "check-circle" : "alert-circle"} 
                size={24} 
                color={item.status === 'success' ? COLORS.success : COLORS.error} 
            />
        </View>
        <View>
            <Text style={styles.cardTitle}>Parking Reservation</Text>
            <Text style={styles.cardDate}>{new Date(item.timestamp).toLocaleString()}</Text>
        </View>
      </View>
      
      <View style={styles.cardRight}>
        <Text style={styles.amount}>- ₹{item.amount}</Text>
        <Text style={[
            styles.statusText, 
            { color: item.status === 'success' ? COLORS.success : COLORS.error }
        ]}>
            {item.status}
        </Text>
      </View>
    </View>
  );

  const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
               <MaterialCommunityIcons name="arrow-left" size={24} color={COLORS.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Transactions</Text>
            <TouchableOpacity onPress={toggleFilters} style={styles.filterBtn}>
               <MaterialCommunityIcons name={showFilters ? "filter-off" : "filter-variant"} size={24} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {showFilters && (
        <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Status</Text>
            <View style={styles.chipRow}>
                {['all', 'success', 'failed'].map((status) => (
                    <FilterChip 
                        key={status} 
                        label={status.charAt(0).toUpperCase() + status.slice(1)} 
                        active={statusFilter === status}
                        onPress={() => setStatusFilter(status)}
                    />
                ))}
            </View>

            <Text style={styles.filterLabel}>Filter By</Text>
            <View style={styles.chipRow}>
                {[
                  { id: 'exact', label: 'Exact Date' },
                  { id: 'month', label: 'Month' },
                  { id: 'year', label: 'Year' }
                ].map((mode) => (
                    <FilterChip 
                        key={mode.id} 
                        label={mode.label} 
                        active={dateMode === mode.id}
                        onPress={() => {
                          setDateMode(mode.id);
                          if(mode.id === 'exact' && !selectedDate) setSelectedDate(new Date());
                        }}
                    />
                ))}
            </View>

            <View style={styles.selectorContainer}>
                {dateMode === 'exact' && (
                    <TouchableOpacity 
                        style={styles.dateBtn}
                        onPress={() => setShowDatePicker(true)}
                    >
                        <MaterialCommunityIcons name="calendar" size={20} color={COLORS.gray600} />
                        <Text style={styles.dateText}>
                            {selectedDate ? selectedDate.toDateString() : "Select Date"}
                        </Text>
                        {selectedDate && (
                           <TouchableOpacity onPress={() => setSelectedDate(null)}>
                              <MaterialCommunityIcons name="close-circle" size={20} color={COLORS.gray400} />
                           </TouchableOpacity>
                        )}
                    </TouchableOpacity>
                )}

                {dateMode === 'month' && (
                   <View>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollSelect}>
                          {years.map(year => (
                              <TouchableOpacity 
                                key={year} 
                                style={[styles.miniChip, selectedYear === year && styles.activeMiniChip]}
                                onPress={() => setSelectedYear(year)}
                              >
                                  <Text style={[styles.miniChipText, selectedYear === year && styles.activeMiniChipText]}>{year}</Text>
                              </TouchableOpacity>
                          ))}
                      </ScrollView>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollSelect}>
                          {months.map((m, index) => (
                              <TouchableOpacity 
                                key={m} 
                                style={[styles.miniChip, selectedMonth === index && styles.activeMiniChip]}
                                onPress={() => setSelectedMonth(index)}
                              >
                                  <Text style={[styles.miniChipText, selectedMonth === index && styles.activeMiniChipText]}>{m}</Text>
                              </TouchableOpacity>
                          ))}
                      </ScrollView>
                   </View>
                )}

                {dateMode === 'year' && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollSelect}>
                        {years.map(year => (
                            <TouchableOpacity 
                              key={year} 
                              style={[styles.miniChip, selectedYear === year && styles.activeMiniChip]}
                              onPress={() => setSelectedYear(year)}
                            >
                                <Text style={[styles.miniChipText, selectedYear === year && styles.activeMiniChipText]}>{year}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}
            </View>
        </View>
      )}

      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
            loading ? (
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
            ) : (
                <View style={styles.emptyState}>
                    <MaterialCommunityIcons name="receipt" size={80} color={COLORS.gray300} />
                    <Text style={styles.emptyText}>No transactions found</Text>
                </View>
            )
        }
      />

      {showDatePicker && (
        <DateTimePicker
          value={selectedDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
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
    backgroundColor: COLORS.gray100,
  },
  header: {
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...SHADOWS.medium,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  backBtn: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
  },
  filterBtn: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
  },
  filterSection: {
    backgroundColor: COLORS.white,
    padding: 15,
    marginHorizontal: 15,
    marginTop: -15,
    borderRadius: 16,
    ...SHADOWS.small,
    marginBottom: 10,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.gray500,
    marginBottom: 8,
    marginTop: 10,
    textTransform: 'uppercase',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: COLORS.gray100,
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
    fontWeight: '600',
  },
  activeFilterText: {
    color: COLORS.white,
  },
  selectorContainer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
  },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray50,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    justifyContent: 'space-between'
  },
  dateText: {
    marginLeft: 10,
    color: COLORS.gray700,
    fontSize: 14,
    flex: 1,
  },
  scrollSelect: {
    marginBottom: 10,
  },
  miniChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: COLORS.gray50,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  activeMiniChip: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  miniChipText: {
    fontSize: 12,
    color: COLORS.gray600,
  },
  activeMiniChipText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 20,
    paddingTop: 10,
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 15,
    borderRadius: 16,
    marginBottom: 12,
    ...SHADOWS.small,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  cardDate: {
    fontSize: 12,
    color: COLORS.gray500,
    marginTop: 2,
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    color: COLORS.gray400,
    marginTop: 10,
    fontSize: 16,
  },
});