import React, {
  useState,
  useContext,
  useCallback,
  useMemo,
  useEffect,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { format, differenceInHours, differenceInMinutes } from "date-fns";

import { AuthContext } from "../contexts/AuthContext";
import { ParkingContext } from "../contexts/ParkingContext";
import { backendUrl } from "../constants";
import { COLORS, SIZES, SHADOWS, SPACING } from "../constants/theme";

import BackBtn from "../components/BackBtn";
import InputField from "../components/InputField";

const { width } = Dimensions.get("window");

const getDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const Reservation = ({ navigation }) => {
  const insets = useSafeAreaInsets();
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

  const sortedLots = useMemo(() => {
    if (!parkingLots || parkingLots.length === 0) return [];
    const lotsWithDistance = parkingLots.map((lot) => {
      const distance = userLocation
        ? getDistance(
            userLocation.latitude,
            userLocation.longitude,
            lot.location.coordinates[0],
            lot.location.coordinates[1],
          )
        : Infinity;
      return { ...lot, distance };
    });
    return lotsWithDistance.sort((a, b) => a.distance - b.distance);
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

  const StepIndicator = () => (
    <View style={styles.stepperContainer}>
      {[1, 2, 3].map((step, index) => (
        <React.Fragment key={step}>
          <View
            style={[
              styles.stepCircle,
              currentStep >= step && styles.stepCircleActive,
            ]}
          >
            {currentStep > step ? (
              <Ionicons name="checkmark" size={14} color={COLORS.white} />
            ) : (
              <Text
                style={[
                  styles.stepText,
                  currentStep >= step && styles.stepTextActive,
                ]}
              >
                {step}
              </Text>
            )}
          </View>
          {index < 2 && (
            <View
              style={[
                styles.stepLine,
                currentStep > step && styles.stepLineActive,
              ]}
            />
          )}
        </React.Fragment>
      ))}
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() =>
            currentStep > 1
              ? setCurrentStep(currentStep - 1)
              : navigation.goBack()
          }
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.gray900} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {currentStep === 1
            ? "Schedule"
            : currentStep === 2
              ? "Pick a Spot"
              : "Checkout"}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <StepIndicator />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {currentStep === 1 && (
            <Animated.View style={styles.stepContainer}>
              <Text style={styles.sectionTitle}>Select Location</Text>
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
                      activeOpacity={0.7}
                      style={[
                        styles.locationCard,
                        isSelected && styles.locationCardActive,
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setSelectedLot(lot);
                      }}
                    >
                      <View
                        style={[
                          styles.iconWrap,
                          isSelected && styles.iconWrapActive,
                        ]}
                      >
                        <Ionicons
                          name="business"
                          size={20}
                          color={isSelected ? COLORS.white : COLORS.primary}
                        />
                      </View>
                      <View>
                        <Text
                          style={[
                            styles.locName,
                            isSelected && styles.textWhite,
                          ]}
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
                            : `${lot.distance.toFixed(1)} km away`}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={[styles.sectionTitle, { marginTop: SPACING.l }]}>
                Duration
              </Text>
              <View style={styles.timeBox}>
                <TouchableOpacity
                  style={styles.timeRow}
                  onPress={() => initiatePicker("start")}
                >
                  <View style={styles.timeIcon}>
                    <MaterialCommunityIcons
                      name="clock-in"
                      size={22}
                      color={COLORS.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.timeLabel}>Arrive After</Text>
                    <Text style={styles.timeValue}>
                      {format(startTime, "MMM dd, hh:mm a")}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-down"
                    size={20}
                    color={COLORS.gray400}
                  />
                </TouchableOpacity>
                <View style={styles.divider} />
                <TouchableOpacity
                  style={styles.timeRow}
                  onPress={() => initiatePicker("end")}
                >
                  <View
                    style={[
                      styles.timeIcon,
                      { backgroundColor: COLORS.error + "15" },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="clock-out"
                      size={22}
                      color={COLORS.error}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.timeLabel}>Leave By</Text>
                    <Text style={styles.timeValue}>
                      {format(endTime, "MMM dd, hh:mm a")}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-down"
                    size={20}
                    color={COLORS.gray400}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.infoPill}>
                <Ionicons
                  name="timer-outline"
                  size={18}
                  color={COLORS.gray600}
                />
                <Text style={styles.infoPillText}>
                  Total Duration:{" "}
                  <Text style={{ fontWeight: "800", color: COLORS.gray900 }}>
                    {differenceInHours(endTime, startTime)}h{" "}
                    {differenceInMinutes(endTime, startTime) % 60}m
                  </Text>
                </Text>
              </View>
            </Animated.View>
          )}

          {currentStep === 2 && (
            <View style={styles.stepContainer}>
              <Text style={styles.sectionTitle}>
                {availableSlots.length} Spots Available
              </Text>
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
                      >
                        <Text
                          style={[
                            styles.slotText,
                            isSelected && styles.textWhite,
                          ]}
                        >
                          {slot}
                        </Text>
                        {isSelected && (
                          <View style={styles.slotCheck}>
                            <Ionicons
                              name="checkmark"
                              size={12}
                              color={COLORS.primary}
                            />
                          </View>
                        )}
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
                      No slots available for this time.
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {currentStep === 3 && (
            <View style={styles.stepContainer}>
              <View style={styles.ticketCard}>
                <View style={styles.ticketHeader}>
                  <Text style={styles.ticketLot}>{selectedLot?.name}</Text>
                  <View style={styles.ticketBadge}>
                    <Text style={styles.ticketSlot}>{selectedSlot}</Text>
                  </View>
                </View>
                <View style={styles.ticketDashed} />
                <View style={styles.ticketRow}>
                  <View>
                    <Text style={styles.ticketLabel}>Date</Text>
                    <Text style={styles.ticketVal}>
                      {format(startTime, "MMM dd, yyyy")}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.ticketLabel}>Duration</Text>
                    <Text style={styles.ticketVal}>
                      {format(startTime, "HH:mm")} - {format(endTime, "HH:mm")}
                    </Text>
                  </View>
                </View>
                <View style={styles.ticketDashed} />
                <View style={styles.ticketRow}>
                  <Text style={styles.ticketTotalLabel}>Total Amount</Text>
                  <Text style={styles.ticketTotalVal}>₹{payment}</Text>
                </View>
              </View>

              <Text style={[styles.sectionTitle, { marginTop: SPACING.l }]}>
                Driver Details
              </Text>
              <InputField
                label="Full Name"
                iconName="account-outline"
                placeholder="Enter name"
                value={name}
                onChangeText={setName}
              />
              <InputField
                label="Vehicle Number"
                iconName="car-outline"
                placeholder="e.g. KA-01-AB-1234"
                value={carNumber}
                onChangeText={setCarNumber}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <View
        style={[
          styles.bottomSticky,
          { paddingBottom: Math.max(insets.bottom, 40) },
        ]}
      >
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
                    ? "Find Parking Spots"
                    : currentStep === 2
                      ? `Book Spot ${selectedSlot || ""}`
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
    </View>
  );
};

export default Reservation;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.white,
  },
  authMessage: {
    fontSize: 16,
    color: COLORS.gray600,
    marginTop: 16,
    marginBottom: 24,
    fontWeight: "500",
  },
  authBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 12,
  },
  authBtnText: { color: COLORS.white, fontWeight: "bold", fontSize: 16 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gray100,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: COLORS.gray900 },

  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    paddingHorizontal: 40,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.gray200,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  stepCircleActive: { backgroundColor: COLORS.primary, ...SHADOWS.small },
  stepText: { fontSize: 12, fontWeight: "700", color: COLORS.gray500 },
  stepTextActive: { color: COLORS.white },
  stepLine: {
    flex: 1,
    height: 3,
    backgroundColor: COLORS.gray200,
    marginHorizontal: -5,
    zIndex: 1,
  },
  stepLineActive: { backgroundColor: COLORS.primary },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 120 },
  stepContainer: { flex: 1, paddingTop: 10 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.gray900,
    marginBottom: 16,
  },

  /* Step 1 Styles */
  locationScroll: { gap: 12, paddingRight: 20 },
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.gray50,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    width: 220,
  },
  locationCardActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryDark,
    ...SHADOWS.medium,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    ...SHADOWS.light,
  },
  iconWrapActive: { backgroundColor: "rgba(255,255,255,0.2)" },
  locName: { fontSize: 14, fontWeight: "800", color: COLORS.gray900 },
  locDist: { fontSize: 12, color: COLORS.gray500, marginTop: 2 },
  textWhite: { color: COLORS.white },
  textWhite70: { color: "rgba(255,255,255,0.7)" },

  timeBox: {
    backgroundColor: COLORS.gray50,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    overflow: "hidden",
  },
  timeRow: { flexDirection: "row", alignItems: "center", padding: 16 },
  timeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.primary + "15",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  timeLabel: {
    fontSize: 12,
    color: COLORS.gray500,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  timeValue: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.gray900,
    marginTop: 2,
  },
  divider: { height: 1, backgroundColor: COLORS.gray200, marginLeft: 72 },
  infoPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: COLORS.gray100,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 16,
  },
  infoPillText: { fontSize: 13, color: COLORS.gray600, marginLeft: 8 },

  /* Step 2 Styles */
  slotsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  slotItem: {
    width: (width - 40 - 24) / 3,
    height: 60,
    backgroundColor: COLORS.gray50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  slotItemActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryDark,
    ...SHADOWS.medium,
  },
  slotText: { fontSize: 16, fontWeight: "800", color: COLORS.gray600 },
  slotCheck: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOWS.small,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    width: "100%",
  },
  emptyText: { color: COLORS.gray500, marginTop: 12, fontWeight: "500" },

  /* Step 3 Styles */
  ticketCard: {
    backgroundColor: COLORS.gray50,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    padding: 24,
    ...SHADOWS.small,
  },
  ticketHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  ticketLot: {
    fontSize: 20,
    fontWeight: "900",
    color: COLORS.gray900,
    flex: 1,
    paddingRight: 10,
  },
  ticketBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  ticketSlot: { color: COLORS.white, fontWeight: "800", fontSize: 14 },
  ticketDashed: {
    height: 1,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderStyle: "dashed",
    marginVertical: 20,
  },
  ticketRow: { flexDirection: "row", justifyContent: "space-between" },
  ticketLabel: {
    fontSize: 11,
    color: COLORS.gray500,
    textTransform: "uppercase",
    fontWeight: "700",
    marginBottom: 4,
  },
  ticketVal: { fontSize: 15, fontWeight: "800", color: COLORS.gray900 },
  ticketTotalLabel: { fontSize: 16, fontWeight: "800", color: COLORS.gray900 },
  ticketTotalVal: { fontSize: 24, fontWeight: "900", color: COLORS.primary },

  bottomSticky: {
    position: "relative",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: COLORS.gray200,
  },
  primaryBtn: {
    height: 56,
    borderRadius: 16,
    overflow: "hidden",
    ...SHADOWS.medium,
  },
  gradientFill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  btnText: { color: COLORS.white, fontSize: 16, fontWeight: "800" },
  btnDisabled: { opacity: 0.5 },
});
