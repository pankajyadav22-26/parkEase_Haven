import React, {
  useState,
  useContext,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Dimensions,
  Animated,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useStripe } from "@stripe/stripe-react-native";
import axios from "axios";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { format, differenceInHours, differenceInMinutes } from "date-fns";

import { AuthContext } from "../contexts/AuthContext";
import { ParkingContext } from "../contexts/ParkingContext";
import { backendUrl } from "../constants";
import { COLORS, SHADOWS, SPACING } from "../constants/theme";

import InputField from "../components/InputField";

const { width } = Dimensions.get("window");

const getDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
  const R = 6371;
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

const Reservation = ({ navigation }) => {
  const { user, isLoggedIn } = useContext(AuthContext);
  const { parkingLots, selectedLot, setSelectedLot, userLocation } =
    useContext(ParkingContext);

  const [currentStep, setCurrentStep] = useState(1);
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(
    new Date(Date.now() + 2 * 60 * 60 * 1000),
  );
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [name, setName] = useState("");
  const [carNumber, setCarNumber] = useState("");
  const [payment, setPayment] = useState(0);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState("date");
  const [activeField, setActiveField] = useState("start");
  const [isLoading, setIsLoading] = useState(false);

  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const progressAnim = useRef(new Animated.Value(0.33)).current;

  useEffect(() => {
    Animated.spring(progressAnim, {
      toValue: currentStep === 1 ? 0.33 : currentStep === 2 ? 0.66 : 1,
      friction: 8,
      tension: 40,
      useNativeDriver: false,
    }).start();
  }, [currentStep]);

  const sortedLots = useMemo(() => {
    if (!parkingLots || parkingLots.length === 0) return [];
    return parkingLots
      .map((lot) => ({
        ...lot,
        distance: userLocation
          ? getDistance(
              userLocation.latitude,
              userLocation.longitude,
              lot.location.coordinates[0],
              lot.location.coordinates[1],
            )
          : Infinity,
      }))
      .sort((a, b) => a.distance - b.distance);
  }, [parkingLots, userLocation]);

  useEffect(() => {
    if (!selectedLot && sortedLots.length > 0) setSelectedLot(sortedLots[0]);
  }, [sortedLots, selectedLot]);

  const resetForm = () => {
    setCurrentStep(1);
    setStartTime(new Date());
    setEndTime(new Date(Date.now() + 2 * 60 * 60 * 1000));
    setAvailableSlots([]);
    setSelectedSlot(null);
    setName(user?.name || "");
    setCarNumber("");
    setPayment(0);
    setIsLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      resetForm();
    }, []),
  );

  const initiatePicker = (field) => {
    Haptics.selectionAsync();
    setActiveField(field);
    setPickerMode(Platform.OS === "ios" ? "datetime" : "date");
    setShowPicker(true);
  };

  const handleDateChange = (event, selectedDate) => {
    if (event.type === "dismissed") return setShowPicker(false);
    const currentDate =
      selectedDate || (activeField === "start" ? startTime : endTime);

    if (Platform.OS === "android" && pickerMode === "date") {
      setShowPicker(false);
      applyDateChange(currentDate);
      setTimeout(() => {
        setPickerMode("time");
        setShowPicker(true);
      }, 100);
    } else {
      setShowPicker(false);
      applyDateChange(currentDate);
    }
  };

  const applyDateChange = (date) => {
    if (activeField === "start") {
      setStartTime(date);
      if (date > endTime)
        setEndTime(new Date(date.getTime() + 2 * 60 * 60 * 1000));
    } else {
      setEndTime(date);
    }
  };

  const proceedToSlots = async () => {
    if (endTime <= startTime)
      return Alert.alert("Invalid Time", "End time must be after Start time.");
    if (!selectedLot)
      return Alert.alert("No Location", "Please select a parking lot.");

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);
    try {
      const priceRes = await axios.post(
        `${backendUrl}/api/booking/calculate-price`,
        { startTime, endTime, parkingLotId: selectedLot._id },
      );
      setPayment(priceRes.data.totalAmount || 0);

      const slotRes = await fetch(
        `${backendUrl}/api/slotoperations/fetchAvailableSlot`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startTime,
            endTime,
            parkingLotId: selectedLot._id,
          }),
        },
      );
      const slotData = await slotRes.json();
      setAvailableSlots(slotData.availableSlots || []);
      setCurrentStep(2);
    } catch (error) {
      Alert.alert("Error", "Could not check availability. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const selectSlot = (slot) => {
    Haptics.selectionAsync();
    setSelectedSlot(slot);
  };

  const handlePayment = async () => {
    if (!name.trim() || !carNumber.trim())
      return Alert.alert("Required", "Please fill driver details.");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsLoading(true);

    try {
      const response = await fetch(`${backendUrl}/api/makePayment/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Math.round(payment * 100) }),
      });
      const { clientSecret, transactionId, error } = await response.json();
      if (error) throw new Error(error);

      const initSheet = await initPaymentSheet({
        merchantDisplayName: "ParkEase Haven",
        paymentIntentClientSecret: clientSecret,
      });
      if (initSheet.error) throw new Error(initSheet.error.message);

      const paymentResult = await presentPaymentSheet();
      if (paymentResult.error) throw new Error(paymentResult.error.message);

      await finalizeBooking(transactionId);
    } catch (err) {
      Alert.alert(
        "Payment Error",
        err.message || "Payment could not be processed.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const finalizeBooking = async (transactionId) => {
    try {
      await fetch(`${backendUrl}/api/payment/savePayment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user._id,
          transactionId,
          amount: payment,
          status: "success",
          timestamp: new Date().toISOString(),
        }),
      });
      await fetch(`${backendUrl}/api/booking/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user._id,
          parkingLotId: selectedLot._id,
          name,
          carNumber,
          slot: selectedSlot,
          amount: payment,
          startTime,
          endTime,
        }),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success!", "Your parking spot is reserved.", [
        {
          text: "View Ticket",
          onPress: () => {
            resetForm();
            navigation.navigate("Profile");
          },
        },
      ]);
    } catch (err) {
      Alert.alert(
        "Error",
        "Payment successful, but booking failed. Contact support.",
      );
    }
  };

  if (!isLoggedIn) {
    return (
      <View style={styles.centerContainer}>
        <MaterialCommunityIcons
          name="lock-alert"
          size={60}
          color={COLORS.gray400}
        />
        <Text style={styles.authMessage}>Login to reserve your spot</Text>
        <TouchableOpacity
          style={styles.authBtn}
          onPress={() => navigation.navigate("Login")}
        >
          <Text style={styles.authBtnText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (

    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" />

      {}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() =>
            currentStep > 1
              ? setCurrentStep(currentStep - 1)
              : navigation.goBack()
          }
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.gray900} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {currentStep === 1
            ? "Plan Parking"
            : currentStep === 2
              ? "Select Space"
              : "Confirm"}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <Animated.View
            style={[styles.progressFill, { width: progressWidth }]}
          />
        </View>
        <View style={styles.progressLabels}>
          <Text
            style={[styles.pLabel, currentStep >= 1 && styles.pLabelActive]}
          >
            Time
          </Text>
          <Text
            style={[styles.pLabel, currentStep >= 2 && styles.pLabelActive]}
          >
            Spot
          </Text>
          <Text
            style={[styles.pLabel, currentStep >= 3 && styles.pLabelActive]}
          >
            Pay
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex1}
      >
        {}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {currentStep === 1 && (
            <Animated.View style={styles.stepContainer}>
              <Text style={styles.sectionTitle}>Where to?</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.locationScroll}
              >
                {sortedLots.map((lot) => {
                  const isSelected = selectedLot?._id === lot._id;
                  return (
                    <TouchableOpacity
                      key={lot._id}
                      activeOpacity={0.8}
                      style={[
                        styles.locCard,
                        isSelected && styles.locCardActive,
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setSelectedLot(lot);
                      }}
                    >
                      <MaterialCommunityIcons
                        name="map-marker-radius"
                        size={28}
                        color={isSelected ? COLORS.white : COLORS.primary}
                        style={{ marginBottom: 12 }}
                      />
                      <Text
                        style={[styles.locName, isSelected && styles.textWhite]}
                        numberOfLines={1}
                      >
                        {lot.name}
                      </Text>
                      <Text
                        style={[
                          styles.locDist,
                          isSelected && styles.textWhite70,
                        ]}
                      >
                        {lot.distance === Infinity
                          ? "..."
                          : `${lot.distance.toFixed(1)} km`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={[styles.sectionTitle, { marginTop: SPACING.xl }]}>
                When?
              </Text>

              <View style={styles.timeSelectionWrapper}>
                <TouchableOpacity
                  style={styles.timeBlock}
                  onPress={() => initiatePicker("start")}
                  activeOpacity={0.7}
                >
                  <Text style={styles.timeLabel}>Arrive</Text>
                  <Text style={styles.timeValueMain}>
                    {format(startTime, "hh:mm a")}
                  </Text>
                  <Text style={styles.timeValueSub}>
                    {format(startTime, "MMM dd, yyyy")}
                  </Text>
                </TouchableOpacity>

                <View style={styles.timeArrow}>
                  <Ionicons
                    name="arrow-forward"
                    size={24}
                    color={COLORS.gray400}
                  />
                </View>

                <TouchableOpacity
                  style={styles.timeBlock}
                  onPress={() => initiatePicker("end")}
                  activeOpacity={0.7}
                >
                  <Text style={styles.timeLabel}>Leave</Text>
                  <Text style={styles.timeValueMain}>
                    {format(endTime, "hh:mm a")}
                  </Text>
                  <Text style={styles.timeValueSub}>
                    {format(endTime, "MMM dd, yyyy")}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.durationPill}>
                <Ionicons name="time" size={16} color={COLORS.gray600} />
                <Text style={styles.durationText}>
                  Parking for{" "}
                  <Text style={styles.durationBold}>
                    {differenceInHours(endTime, startTime)}h{" "}
                    {differenceInMinutes(endTime, startTime) % 60}m
                  </Text>
                </Text>
              </View>
            </Animated.View>
          )}

          {currentStep === 2 && (
            <View style={styles.stepContainer}>
              <View style={styles.spotHeader}>
                <Text style={styles.sectionTitle}>Available Spots</Text>
                <View style={styles.spotCountBadge}>
                  <Text style={styles.spotCountText}>
                    {availableSlots.length}
                  </Text>
                </View>
              </View>

              <View style={styles.slotsGrid}>
                {availableSlots.length > 0 ? (
                  availableSlots.map((slot) => {
                    const isSelected = selectedSlot === slot;
                    return (
                      <TouchableOpacity
                        key={slot}
                        style={[
                          styles.slotItem,
                          isSelected && styles.slotItemActive,
                        ]}
                        onPress={() => selectSlot(slot)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.slotText,
                            isSelected && styles.textWhite,
                          ]}
                        >
                          {slot}
                        </Text>
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <View style={styles.emptyState}>
                    <MaterialCommunityIcons
                      name="car-off"
                      size={48}
                      color={COLORS.gray300}
                    />
                    <Text style={styles.emptyText}>
                      No availability for selected times.
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {currentStep === 3 && (
            <View style={styles.stepContainer}>
              {}
              <View style={styles.walletTicket}>
                <View style={styles.ticketTop}>
                  <View>
                    <Text style={styles.tktHeader}>PARKING PASS</Text>
                    <Text style={styles.tktLotName}>{selectedLot?.name}</Text>
                  </View>
                  <View style={styles.tktBadge}>
                    <Text style={styles.tktBadgeText}>Spot {selectedSlot}</Text>
                  </View>
                </View>

                {}
                <View style={styles.perforatedLineContainer}>
                  <View style={styles.notchLeft} />
                  <View style={styles.dashedLine} />
                  <View style={styles.notchRight} />
                </View>

                <View style={styles.ticketBottom}>
                  <View style={styles.tktDataRow}>
                    <View>
                      <Text style={styles.tktLabel}>ENTRY</Text>
                      <Text style={styles.tktValue}>
                        {format(startTime, "MMM dd, HH:mm")}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.tktLabel}>EXIT</Text>
                      <Text style={styles.tktValue}>
                        {format(endTime, "MMM dd, HH:mm")}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.tktTotalRow}>
                    <Text style={styles.tktTotalLabel}>Amount Due</Text>
                    <Text style={styles.tktTotalValue}>₹{payment}</Text>
                  </View>
                </View>
              </View>

              <Text
                style={[
                  styles.sectionTitle,
                  { marginTop: SPACING.xl, marginBottom: SPACING.m },
                ]}
              >
                Vehicle & Driver
              </Text>
              <InputField
                label="Driver Name"
                iconName="account"
                placeholder="Enter name"
                value={name}
                onChangeText={setName}
              />
              <InputField
                label="License Plate"
                iconName="car-back"
                placeholder="e.g. KA-01-AB-1234"
                value={carNumber}
                onChangeText={setCarNumber}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {}
      <View style={styles.dockedFooter}>
        <TouchableOpacity
          style={[
            styles.primaryBtn,
            (isLoading ||
              (currentStep === 2 && !selectedSlot) ||
              (currentStep === 3 && (!name || !carNumber))) &&
              styles.btnDisabled,
          ]}
          disabled={
            isLoading ||
            (currentStep === 2 && !selectedSlot) ||
            (currentStep === 3 && (!name || !carNumber))
          }
          onPress={() => {
            if (currentStep === 1) proceedToSlots();
            else if (currentStep === 2) setCurrentStep(3);
            else handlePayment();
          }}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientFill}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Text style={styles.btnText}>
                  {currentStep === 1
                    ? "Find Spots"
                    : currentStep === 2
                      ? `Confirm Spot ${selectedSlot || ""}`
                      : `Pay ₹${payment}`}
                </Text>
                <Ionicons
                  name={currentStep === 3 ? "lock-closed" : "arrow-forward"}
                  size={20}
                  color={COLORS.white}
                />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {showPicker && (
        <DateTimePicker
          value={activeField === "start" ? startTime : endTime}
          mode={pickerMode}
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}
    </SafeAreaView>
  );
};

export default Reservation;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F9FAFB" }, 

  flex1: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  authMessage: { fontSize: 16, color: COLORS.gray600, marginVertical: 20 },
  authBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 12,
  },
  authBtnText: { color: COLORS.white, fontWeight: "bold" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOWS.light,
  },
  headerTitle: { fontSize: 18, fontWeight: "900", color: COLORS.gray900 },

  progressContainer: { paddingHorizontal: 30, paddingVertical: 15 },
  progressTrack: {
    height: 6,
    backgroundColor: COLORS.gray200,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  pLabel: { fontSize: 11, fontWeight: "700", color: COLORS.gray400 },
  pLabelActive: { color: COLORS.primaryDark },

  scrollContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 },
  stepContainer: { flex: 1 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: COLORS.gray900,
    marginBottom: 16,
  },

  locationScroll: { gap: 16, paddingRight: 20, paddingVertical: 10 },
  locCard: {
    width: 140,
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    ...SHADOWS.light,
  },
  locCardActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryDark,
    ...SHADOWS.medium,
  },
  locName: {
    fontSize: 15,
    fontWeight: "900",
    color: COLORS.gray900,
    marginBottom: 4,
  },
  locDist: { fontSize: 12, color: COLORS.gray500, fontWeight: "600" },
  textWhite: { color: COLORS.white },
  textWhite70: { color: "rgba(255,255,255,0.8)" },

  timeSelectionWrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  timeBlock: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    ...SHADOWS.light,
  },
  timeArrow: { paddingHorizontal: 10 },
  timeLabel: {
    fontSize: 11,
    color: COLORS.gray500,
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  timeValueMain: { fontSize: 20, fontWeight: "900", color: COLORS.gray900 },
  timeValueSub: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "700",
    marginTop: 4,
  },

  durationPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 24,
  },
  durationText: { fontSize: 13, color: COLORS.gray700, marginLeft: 8 },
  durationBold: { fontWeight: "900", color: COLORS.gray900 },

  spotHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  spotCountBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  spotCountText: { color: COLORS.primary, fontWeight: "900", fontSize: 14 },
  slotsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  slotItem: {
    width: (width - 40 - 24) / 3,
    height: 64,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.gray200,
    ...SHADOWS.light,
  },
  slotItemActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryDark,
    ...SHADOWS.medium,
  },
  slotText: { fontSize: 16, fontWeight: "900", color: COLORS.gray700 },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    width: "100%",
  },
  emptyText: { color: COLORS.gray500, marginTop: 12, fontWeight: "600" },

  walletTicket: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    ...SHADOWS.medium,
    overflow: "hidden",
  },
  ticketTop: {
    padding: 24,
    backgroundColor: COLORS.gray900,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tktHeader: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  tktLotName: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 4,
  },
  tktBadge: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  tktBadgeText: { color: COLORS.gray900, fontWeight: "900", fontSize: 14 },

  perforatedLineContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 20,
    backgroundColor: COLORS.white,
    marginTop: -10,
  },
  notchLeft: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#F9FAFB",
    marginLeft: -10,
  },
  dashedLine: {
    flex: 1,
    height: 1,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderStyle: "dashed",
    marginHorizontal: 10,
  },
  notchRight: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#F9FAFB",
    marginRight: -10,
  },

  ticketBottom: { padding: 24, backgroundColor: COLORS.white },
  tktDataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  tktLabel: {
    fontSize: 10,
    color: COLORS.gray500,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  tktValue: { fontSize: 15, fontWeight: "900", color: COLORS.gray900 },
  tktTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: COLORS.gray100,
  },
  tktTotalLabel: { fontSize: 14, fontWeight: "800", color: COLORS.gray600 },
  tktTotalValue: {
    fontSize: 28,
    fontWeight: "900",
    color: COLORS.primary,
    letterSpacing: -1,
  },

  dockedFooter: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16, 

    borderTopWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    marginBottom: 25,
  },
  primaryBtn: { height: 60, borderRadius: 20, overflow: "hidden" },
  gradientFill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  btnText: { color: COLORS.white, fontSize: 17, fontWeight: "900" },
  btnDisabled: { opacity: 0.6 },
});