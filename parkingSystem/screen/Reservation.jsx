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
  Animated,
  Dimensions
} from "react-native";
import React, { useState, useContext, useRef } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import { AuthContext } from "../contexts/AuthContext";
import { format, differenceInHours, differenceInMinutes } from "date-fns";
import { backendUrl } from "../constants";
import { useStripe } from "@stripe/stripe-react-native";
import axios from "axios";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS, SIZES, SHADOWS } from "../constants/theme";
import Button from "../components/Button";
import BackBtn from "../components/BackBtn";
import InputField from "../components/InputField";

const { width } = Dimensions.get("window");

const Reservation = ({ navigation }) => {
  const { user, isLoggedIn } = useContext(AuthContext);
  
  const [currentStep, setCurrentStep] = useState(1);

  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date(Date.now() + 2 * 60 * 60 * 1000)); // Default 2 hours later
  
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

  const initiatePicker = (field) => {
    setActiveField(field);
    
    if (Platform.OS === 'ios') {
      setPickerMode('datetime');
    } else {
      setPickerMode('date');
    }
    setShowPicker(true);
  };

  const handleDateChange = (event, selectedDate) => {
    if (event.type === 'dismissed') {
      setShowPicker(false);
      return;
    }

    const currentDate = selectedDate || (activeField === 'start' ? startTime : endTime);

    if (Platform.OS === 'android') {
      if (pickerMode === 'date') {
        setShowPicker(false);
        applyDateChange(currentDate);
        setTimeout(() => {
          setPickerMode('time');
          setShowPicker(true);
        }, 100);
      } else {
        setShowPicker(false);
        applyDateChange(currentDate);
      }
    } else {
      setShowPicker(false);
      applyDateChange(currentDate);
    }
  };

  const applyDateChange = (date) => {
    if (activeField === 'start') {
      setStartTime(date);
      if (date > endTime) {
        setEndTime(new Date(date.getTime() + 2 * 60 * 60 * 1000));
      }
    } else {
      setEndTime(date);
    }
  };

  const proceedToSlots = async () => {
    if (endTime <= startTime) {
      Alert.alert("Invalid Time", "End time must be after Start time.");
      return;
    }

    setIsLoading(true);
    try {
      const priceRes = await axios.post(`${backendUrl}/api/booking/calculate-price`, {
        startTime,
        endTime,
      });
      setPayment(priceRes.data.totalAmount || 0);

      const slotRes = await fetch(`${backendUrl}/api/slotoperations/fetchAvailableSlot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startTime, endTime }),
      });
      const slotData = await slotRes.json();
      
      setAvailableSlots(slotData.availableSlots || []);
      setCurrentStep(2);
      
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not check availability. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const selectSlot = (slot) => {
    setSelectedSlot(slot);
  };

  const proceedToPayment = () => {
    if (!selectedSlot) {
      Alert.alert("Selection Required", "Please select a parking spot.");
      return;
    }
    setCurrentStep(3);
  };

  const handlePayment = async () => {
     if (!name.trim() || !carNumber.trim()) return;

    try {
      setIsLoading(true);
      const response = await fetch(`${backendUrl}/api/makePayment/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Math.round(payment * 100) }),
      });

      const { clientSecret, transactionId, error } = await response.json();

      if (error) {
        Alert.alert("Error", error);
        return;
      }

      const initSheet = await initPaymentSheet({
        merchantDisplayName: "ParkEase Haven",
        paymentIntentClientSecret: clientSecret,
      });

      if (initSheet.error) {
        Alert.alert("Error", initSheet.error.message);
        return;
      }

      const paymentResult = await presentPaymentSheet();

      if (paymentResult.error) {
        Alert.alert("Payment Failed", paymentResult.error.message);
      } else {
        await finalizeBooking(transactionId);
      }
    } catch (err) {
      Alert.alert("Error", "Payment could not be processed.");
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
              name,
              carNumber,
              slot: selectedSlot,
              amount: payment,
              startTime,
              endTime,
            }),
        });

        await fetch(`${backendUrl}/api/slotoperations/addReservationToSlot`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              slotName: selectedSlot,
              userId: user._id,
              startTime,
              endTime,
            }),
        });

        Alert.alert("Success!", "Your parking spot is reserved.", [
            { text: "View Ticket", onPress: () => navigation.navigate("Profile") }
        ]);

    } catch (err) {
        console.error("Booking Finalization Failed", err);
        Alert.alert("Error", "Payment successful, but booking failed. Contact support.");
    }
  };

  if (!isLoggedIn) {
    return (
      <View style={styles.centerContainer}>
        <MaterialCommunityIcons name="lock-alert" size={60} color={COLORS.gray500} />
        <Text style={styles.authMessage}>Please Login to Reserve</Text>
        <Button title="Go to Login" onPress={() => navigation.navigate("Login")} />
      </View>
    );
  }

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(currentStep / 3) * 100}%` }]} />
        </View>
        <View style={styles.stepsRow}>
            <Text style={[styles.stepLabel, currentStep >= 1 && styles.activeStep]}>Time</Text>
            <Text style={[styles.stepLabel, currentStep >= 2 && styles.activeStep]}>Slot</Text>
            <Text style={[styles.stepLabel, currentStep >= 3 && styles.activeStep]}>Pay</Text>
        </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <BackBtn onPress={() => {
            if(currentStep > 1) setCurrentStep(currentStep - 1);
            else navigation.goBack();
        }} />
        <Text style={styles.headerTitle}>
            {currentStep === 1 ? "Schedule" : currentStep === 2 ? "Pick a Spot" : "Confirm"}
        </Text>
        <View style={{ width: 44 }} /> 
      </View>

      {renderProgressBar()}

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {currentStep === 1 && (
            <View style={styles.stepContainer}>
                <Text style={styles.sectionTitle}>Select Duration</Text>
                
                <View style={styles.timeCard}>
                    <TouchableOpacity style={styles.timeRow} onPress={() => initiatePicker("start")}>
                        <View style={styles.iconBox}>
                            <MaterialCommunityIcons name="clock-start" size={24} color={COLORS.primary} />
                        </View>
                        <View>
                            <Text style={styles.label}>Start Time</Text>
                            <Text style={styles.timeValue}>{format(startTime, "MMM dd, hh:mm a")}</Text>
                        </View>
                        <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.gray400} style={{ marginLeft: "auto" }} />
                    </TouchableOpacity>
                    
                    <View style={styles.divider} />

                    <TouchableOpacity style={styles.timeRow} onPress={() => initiatePicker("end")}>
                        <View style={styles.iconBox}>
                            <MaterialCommunityIcons name="clock-end" size={24} color={COLORS.secondary} />
                        </View>
                        <View>
                            <Text style={styles.label}>End Time</Text>
                            <Text style={styles.timeValue}>{format(endTime, "MMM dd, hh:mm a")}</Text>
                        </View>
                         <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.gray400} style={{ marginLeft: "auto" }} />
                    </TouchableOpacity>
                </View>

                <View style={styles.infoBox}>
                     <MaterialCommunityIcons name="information-outline" size={20} color={COLORS.gray600} />
                     <Text style={styles.infoText}>
                        Total Duration: <Text style={{fontWeight: 'bold'}}>{differenceInHours(endTime, startTime)}h {differenceInMinutes(endTime, startTime) % 60}m</Text>
                     </Text>
                </View>

                <View style={{ flex: 1 }} />
                <Button title="Find Spots" onPress={proceedToSlots} loader={isLoading} />
            </View>
          )}
          {currentStep === 2 && (
            <View style={styles.stepContainer}>
                <Text style={styles.sectionTitle}>Available Slots</Text>
                
                <View style={styles.slotsGrid}>
                    {availableSlots.length > 0 ? (
                        availableSlots.map((slot) => (
                            <TouchableOpacity
                                key={slot}
                                style={[
                                    styles.slotItem,
                                    selectedSlot === slot && styles.selectedSlotItem
                                ]}
                                onPress={() => selectSlot(slot)}
                            >
                                <Text style={[
                                    styles.slotText, 
                                    selectedSlot === slot && styles.selectedSlotText
                                ]}>{slot}</Text>
                                {selectedSlot === slot && (
                                    <View style={styles.checkIcon}>
                                        <MaterialCommunityIcons name="check" size={12} color={COLORS.white} />
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))
                    ) : (
                        <View style={styles.emptyContainer}>
                             <MaterialCommunityIcons name="emoticon-sad-outline" size={50} color={COLORS.gray400} />
                             <Text style={styles.emptyText}>No slots available for this time.</Text>
                        </View>
                    )}
                </View>

                <View style={{ flex: 1 }} />
                <Button 
                    title={selectedSlot ? `Book ${selectedSlot}` : "Select a Slot"} 
                    onPress={proceedToPayment} 
                    isValid={!!selectedSlot}
                />
            </View>
          )}
          {currentStep === 3 && (
            <View style={styles.stepContainer}>
                 
                 <View style={styles.billCard}>
                    <Text style={styles.billTitle}>Reservation Summary</Text>
                    <View style={styles.billRow}>
                        <Text style={styles.billLabel}>Spot</Text>
                        <Text style={styles.billValue}>{selectedSlot}</Text>
                    </View>
                    <View style={styles.billRow}>
                        <Text style={styles.billLabel}>Date</Text>
                        <Text style={styles.billValue}>{format(startTime, "MMM dd")}</Text>
                    </View>
                    <View style={styles.billRow}>
                        <Text style={styles.billLabel}>Time</Text>
                        <Text style={styles.billValue}>{format(startTime, "hh:mm a")} - {format(endTime, "hh:mm a")}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.billRow}>
                        <Text style={styles.totalLabel}>Total to Pay</Text>
                        <Text style={styles.totalValue}>₹{payment}</Text>
                    </View>
                 </View>

                 <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Driver Details</Text>
                 
                 <InputField
                    label="Full Name"
                    iconName="account-outline"
                    placeholder="e.g. John Doe"
                    value={name}
                    onChangeText={setName}
                 />

                 <InputField
                    label="Car Number"
                    iconName="car-outline"
                    placeholder="e.g. KA-01-AB-1234"
                    value={carNumber}
                    onChangeText={setCarNumber}
                 />

                 <View style={{ flex: 1 }} />
                 <Button 
                    title={`Pay ₹${payment}`} 
                    onPress={handlePayment} 
                    loader={isLoading}
                    isValid={name.length > 0 && carNumber.length > 0}
                 />
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {showPicker && (
        <DateTimePicker
          value={activeField === 'start' ? startTime : endTime}
          mode={pickerMode}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}
    </SafeAreaView>
  );
};

export default Reservation;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  authMessage: {
    fontSize: 18,
    color: COLORS.gray600,
    marginVertical: 20,
    textAlign: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
  },
  progressContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.gray200,
    borderRadius: 2,
    marginBottom: 8,
    overflow: 'hidden'
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.primary,
  },
  stepsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  stepLabel: {
    fontSize: 12,
    color: COLORS.gray400,
    fontWeight: "600",
  },
  activeStep: {
    color: COLORS.primary,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  stepContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 15,
  },
  timeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    padding: 5,
    ...SHADOWS.light,
    marginBottom: 20,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.gray100,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  label: {
    fontSize: 12,
    color: COLORS.gray500,
    marginBottom: 2,
  },
  timeValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.text,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.gray200,
    marginLeft: 70,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primaryLight,
    padding: 12,
    borderRadius: 8,
  },
  infoText: {
    marginLeft: 8,
    color: COLORS.primaryDark,
    fontSize: 14,
  },
  slotsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "flex-start",
  },
  slotItem: {
    width: (width - 60) / 3,
    height: 50,
    borderRadius: 10,
    backgroundColor: COLORS.gray200,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  selectedSlotItem: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    ...SHADOWS.medium
  },
  slotText: {
    fontWeight: "bold",
    color: COLORS.gray600,
  },
  selectedSlotText: {
    color: COLORS.white,
  },
  checkIcon: {
    position: "absolute",
    top: 2,
    right: 2,
  },
  emptyContainer: {
    width: "100%",
    alignItems: "center",
    padding: 30,
  },
  emptyText: {
    marginTop: 10,
    color: COLORS.gray500,
  },
  billCard: {
    backgroundColor: COLORS.surface,
    padding: 20,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    marginBottom: 20,
  },
  billTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.gray500,
    marginBottom: 15,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  billRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  billLabel: {
    color: COLORS.gray600,
    fontSize: 16,
  },
  billValue: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "600",
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.primary,
  },
});