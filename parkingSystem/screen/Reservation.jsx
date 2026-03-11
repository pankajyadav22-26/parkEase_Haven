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
  Modal,
  FlatList,
  TextInput,
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

const { width, height } = Dimensions.get("window");

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

  const [showLocationModal, setShowLocationModal] = useState(false);
  const [modalSearchQuery, setModalSearchQuery] = useState("");

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

  const displayLots = useMemo(() => {
    if (sortedLots.length === 0) return [];
    let topLots = sortedLots.slice(0, 4);

    if (selectedLot && !topLots.find((l) => l._id === selectedLot._id)) {
      topLots.pop();
      topLots.unshift(selectedLot);
    }
    return topLots;
  }, [sortedLots, selectedLot]);

  const filteredModalLots = useMemo(() => {
    if (!modalSearchQuery.trim()) return sortedLots;
    return sortedLots.filter(
      (lot) =>
        lot.name.toLowerCase().includes(modalSearchQuery.toLowerCase()) ||
        (lot.location?.address &&
          lot.location.address
            .toLowerCase()
            .includes(modalSearchQuery.toLowerCase())),
    );
  }, [sortedLots, modalSearchQuery]);

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

  const applyPresetDuration = (hours) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEndTime(new Date(startTime.getTime() + hours * 60 * 60 * 1000));
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
        {
          startTime,
          endTime,
          parkingLotId: selectedLot._id,
        },
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
        {
          text: "OK",
          style: "cancel",
          onPress: () => {
            resetForm();
            navigation.navigate("MapExplore");
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

  const handleCloseModal = () => {
    setShowLocationModal(false);
    setModalSearchQuery("");
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
        keyboardVerticalOffset={Platform.OS === "ios" ? 110 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {currentStep === 1 && (
            <Animated.View style={styles.stepContainer}>
              <View style={styles.rowBetween}>
                <Text style={styles.sectionTitle}>Where to?</Text>
                {sortedLots.length > 4 && (
                  <TouchableOpacity onPress={() => setShowLocationModal(true)}>
                    <Text style={styles.seeAllText}>See All</Text>
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.locationScroll}
              >
                {displayLots.map((lot) => {
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
                    {format(startTime, "MMM dd")}
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
                    {format(endTime, "MMM dd")}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.presetRow}>
                {[1, 2, 3, 4].map((hours) => (
                  <TouchableOpacity
                    key={hours}
                    style={styles.presetChip}
                    onPress={() => applyPresetDuration(hours)}
                  >
                    <Text style={styles.presetText}>
                      +{hours} Hr{hours > 1 ? "s" : ""}
                    </Text>
                  </TouchableOpacity>
                ))}
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
                      size={60}
                      color={COLORS.gray300}
                    />
                    <Text style={styles.emptyTextTitle}>No Spots Found</Text>
                    <Text style={styles.emptyTextSub}>
                      Try adjusting your arrival or departure time.
                    </Text>
                    <TouchableOpacity
                      style={styles.adjustTimeBtn}
                      onPress={() => setCurrentStep(1)}
                    >
                      <Ionicons
                        name="time-outline"
                        size={20}
                        color={COLORS.white}
                      />
                      <Text style={styles.adjustTimeText}>Adjust Time</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          )}

          {currentStep === 3 && (
            <View style={styles.stepContainer}>
              <View style={styles.walletTicket}>
                <LinearGradient
                  colors={[COLORS.gray900, COLORS.gray800]}
                  style={styles.ticketTop}
                >
                  <View style={styles.ticketHeaderRow}>
                    <View style={styles.flex1PaddingRight}>
                      <Text style={styles.tktHeader}>PARKING PASS</Text>
                      <Text style={styles.tktLotName} numberOfLines={1}>
                        {selectedLot?.name}
                      </Text>
                    </View>
                    <View style={styles.tktBadge}>
                      <Text style={styles.tktBadgeLabel}>SPOT</Text>
                      <Text style={styles.tktBadgeText}>{selectedSlot}</Text>
                    </View>
                  </View>
                </LinearGradient>

                <View style={styles.perforatedLineContainer}>
                  <View style={styles.notchLeft} />
                  <View style={styles.dashedLine} />
                  <View style={styles.notchRight} />
                </View>

                <View style={styles.ticketBottom}>
                  <View style={styles.tktDataRow}>
                    <View style={styles.tktCol}>
                      <Text style={styles.tktLabel}>ENTRY</Text>
                      <Text style={styles.tktValue}>
                        {format(startTime, "MMM dd")}
                      </Text>
                      <Text style={styles.tktTime}>
                        {format(startTime, "hh:mm a")}
                      </Text>
                    </View>

                    <View style={styles.tktDurationBadge}>
                      <Ionicons name="time" size={14} color={COLORS.primary} />
                      <Text style={styles.tktDurationText}>
                        {differenceInHours(endTime, startTime)}h{" "}
                        {differenceInMinutes(endTime, startTime) % 60}m
                      </Text>
                    </View>

                    <View style={[styles.tktCol, styles.alignEnd]}>
                      <Text style={styles.tktLabel}>EXIT</Text>
                      <Text style={styles.tktValue}>
                        {format(endTime, "MMM dd")}
                      </Text>
                      <Text style={styles.tktTime}>
                        {format(endTime, "hh:mm a")}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.tktUserRow}>
                    <View style={styles.tktCol}>
                      <Text style={styles.tktLabel}>DRIVER</Text>
                      <Text
                        style={[
                          styles.tktSubValue,
                          !name && styles.tktPlaceholder,
                        ]}
                        numberOfLines={1}
                      >
                        {name.trim() ? name : "Awaiting Info..."}
                      </Text>
                    </View>
                    <View style={[styles.tktCol, styles.alignEnd]}>
                      <Text style={styles.tktLabel}>LICENSE PLATE</Text>
                      <View
                        style={[
                          styles.plateContainer,
                          !carNumber && styles.plateContainerEmpty,
                        ]}
                      >
                        <Text
                          style={[
                            styles.plateText,
                            !carNumber && styles.plateTextEmpty,
                          ]}
                        >
                          {carNumber.trim() ? carNumber.toUpperCase() : "---"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.tktTotalRow}>
                    <View>
                      <Text style={styles.tktTotalLabel}>Amount Due</Text>
                      <Text style={styles.tktTaxLabel}>
                        Includes taxes & fees
                      </Text>
                    </View>
                    <Text style={styles.tktTotalValue}>₹{payment}</Text>
                  </View>
                </View>
              </View>

              <Text style={[styles.sectionTitle, styles.vehicleDriverTitle]}>
                Vehicle & Driver Details
              </Text>

              <InputField
                label="Driver Name"
                iconName="account"
                placeholder="Enter your full name"
                value={name}
                onChangeText={setName}
              />
              <InputField
                label="License Plate"
                iconName="car-back"
                placeholder="e.g. KA-01-AB-1234"
                value={carNumber}
                onChangeText={(text) => setCarNumber(text.toUpperCase())}
                autoCapitalize="characters"
              />
            </View>
          )}
        </ScrollView>
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
                      ? `Find Spots`
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
      </KeyboardAvoidingView>

      {showPicker && (
        <DateTimePicker
          value={activeField === "start" ? startTime : endTime}
          mode={pickerMode}
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}
      <Modal
        visible={showLocationModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>All Locations</Text>
            <TouchableOpacity
              onPress={handleCloseModal}
              style={styles.modalCloseBtn}
            >
              <Ionicons name="close" size={24} color={COLORS.gray800} />
            </TouchableOpacity>
          </View>
          <View style={styles.modalSearchContainer}>
            <Ionicons name="search" size={20} color={COLORS.gray400} />
            <TextInput
              style={styles.modalSearchInput}
              placeholder="Search by name or address..."
              placeholderTextColor={COLORS.gray400}
              value={modalSearchQuery}
              onChangeText={setModalSearchQuery}
              autoCapitalize="none"
            />
            {modalSearchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setModalSearchQuery("")}
                style={{ padding: 4 }}
              >
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={COLORS.gray400}
                />
              </TouchableOpacity>
            )}
          </View>

          {filteredModalLots.length > 0 ? (
            <FlatList
              data={filteredModalLots}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.modalList}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected = selectedLot?._id === item._id;
                return (
                  <TouchableOpacity
                    style={[
                      styles.modalListItem,
                      isSelected && styles.modalListItemActive,
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSelectedLot(item);
                      handleCloseModal();
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.modalItemLeft}>
                      <View
                        style={[
                          styles.modalItemIconBg,
                          isSelected && { backgroundColor: COLORS.white },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name="map-marker"
                          size={22}
                          color={isSelected ? COLORS.primary : COLORS.gray500}
                        />
                      </View>
                      <View style={styles.modalItemTextContainer}>
                        <Text
                          style={[
                            styles.modalItemTitle,
                            isSelected && styles.textPrimary,
                          ]}
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                        <Text style={styles.modalItemSub} numberOfLines={1}>
                          {item.location?.address}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.modalItemRight}>
                      <Text style={styles.modalItemDist}>
                        {item.distance === Infinity
                          ? ""
                          : `${item.distance.toFixed(1)} km`}
                      </Text>
                      <View style={styles.modalPriceBadge}>
                        <Text style={styles.modalPriceText}>
                          ₹{item.basePrice}/hr
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          ) : (
            <View style={styles.modalEmptyState}>
              <Ionicons
                name="search-outline"
                size={64}
                color={COLORS.gray200}
              />
              <Text style={styles.modalEmptyTitle}>No locations found</Text>
              <Text style={styles.modalEmptySub}>
                Try a different search term.
              </Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>
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

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 20, fontWeight: "900", color: COLORS.gray900 },
  seeAllText: { color: COLORS.primary, fontWeight: "700", fontSize: 14 },

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

  presetRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  presetChip: {
    flex: 1,
    backgroundColor: COLORS.white,
    marginHorizontal: 4,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.gray200,
    ...SHADOWS.light,
  },
  presetText: { fontSize: 13, fontWeight: "800", color: COLORS.gray700 },

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
    paddingVertical: 40,
    width: "100%",
  },
  emptyTextTitle: {
    color: COLORS.gray900,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 16,
  },
  emptyTextSub: {
    color: COLORS.gray500,
    marginTop: 8,
    fontWeight: "500",
    textAlign: "center",
  },
  adjustTimeBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
  },
  adjustTimeText: {
    color: COLORS.white,
    fontWeight: "800",
    fontSize: 15,
    marginLeft: 8,
  },

  walletTicket: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    ...SHADOWS.dark,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  ticketTop: {
    padding: 24,
  },
  ticketHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  flex1PaddingRight: {
    flex: 1,
    paddingRight: 10,
  },
  tktHeader: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  tktLotName: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: "900",
  },
  tktBadge: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: "center",
  },
  tktBadgeLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.gray500,
    letterSpacing: 0.5,
  },
  tktBadgeText: {
    color: COLORS.primary,
    fontWeight: "900",
    fontSize: 18,
    marginTop: -2,
  },
  perforatedLineContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 30,
    backgroundColor: COLORS.white,
    marginTop: -15,
    zIndex: 10,
  },
  notchLeft: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    marginLeft: -12,
    borderRightWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  dashedLine: {
    flex: 1,
    height: 1,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderStyle: "dashed",
    marginHorizontal: 12,
  },
  notchRight: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    marginRight: -12,
    borderLeftWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  ticketBottom: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
    backgroundColor: COLORS.white,
  },
  tktDataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  tktCol: {
    flex: 1,
  },
  alignEnd: {
    alignItems: "flex-end",
  },
  tktLabel: {
    fontSize: 10,
    color: COLORS.gray500,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  tktValue: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.gray900,
  },
  tktTime: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primary,
    marginTop: 2,
  },
  tktDurationBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  tktDurationText: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.primary,
  },
  tktUserRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
  },
  tktSubValue: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.gray800,
  },
  tktPlaceholder: {
    color: COLORS.gray400,
    fontStyle: "italic",
    fontWeight: "600",
  },
  plateContainer: {
    backgroundColor: COLORS.gray900,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray900,
  },
  plateContainerEmpty: {
    backgroundColor: COLORS.gray50,
    borderColor: COLORS.gray300,
    borderStyle: "dashed",
  },
  plateText: {
    color: COLORS.primaryDark,
    fontWeight: "900",
    fontSize: 14,
    letterSpacing: 1,
  },
  plateTextEmpty: {
    color: COLORS.gray400,
  },
  tktTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 20,
    borderTopWidth: 1,
    borderColor: COLORS.gray100,
  },
  tktTotalLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.gray900,
  },
  tktTaxLabel: {
    fontSize: 11,
    color: COLORS.gray500,
    marginTop: 2,
  },
  tktTotalValue: {
    fontSize: 32,
    fontWeight: "900",
    color: COLORS.primary,
    letterSpacing: -1,
  },
  vehicleDriverTitle: {
    marginTop: SPACING.xl,
    marginBottom: SPACING.m,
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

  modalContainer: { flex: 1, backgroundColor: "#F9FAFB" },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
  },
  modalTitle: { fontSize: 18, fontWeight: "900", color: COLORS.gray900 },
  modalCloseBtn: {
    padding: 4,
    backgroundColor: COLORS.gray50,
    borderRadius: 20,
  },

  modalSearchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    ...SHADOWS.light,
  },
  modalSearchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: COLORS.gray900,
  },

  modalList: { padding: 20, paddingBottom: 60 },
  modalListItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.white,
    padding: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    ...SHADOWS.light,
  },
  modalListItemActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
    ...SHADOWS.medium,
  },
  modalItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  modalItemIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.gray50,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  modalItemTextContainer: {
    flex: 1,
    paddingRight: 10,
  },
  modalItemTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.gray900,
    marginBottom: 4,
  },
  textPrimary: { color: COLORS.primaryDark },
  modalItemSub: { fontSize: 13, color: COLORS.gray500 },

  modalItemRight: {
    alignItems: "flex-end",
  },
  modalItemDist: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.gray500,
    marginBottom: 6,
  },
  modalPriceBadge: {
    backgroundColor: COLORS.gray50,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  modalPriceText: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.primary,
  },

  modalEmptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 100,
  },
  modalEmptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.gray800,
    marginTop: 16,
  },
  modalEmptySub: {
    fontSize: 14,
    color: COLORS.gray500,
    marginTop: 8,
  },
});
