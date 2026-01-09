import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  Image,
  Platform,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  ActivityIndicator,
} from "react-native";
import React, { useState, useContext, useEffect } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import { AuthContext } from "../contexts/AuthContext";
import { format } from "date-fns";
import { backendUrl } from "@/constants";
import { useStripe } from "@stripe/stripe-react-native";
import axios from "axios";

const Reservation = ({ navigation }) => {
  const { user, isLoggedIn } = useContext(AuthContext);

  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState("start");
  const [step, setStep] = useState("date");

  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [name, setName] = useState("");
  const [carNumber, setCarNumber] = useState("");
  const [payment, setPayment] = useState(0);
  const [slotsChecked, setSlotsChecked] = useState(false);

  const [isCalculating, setIsCalculating] = useState(false);

  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  useEffect(() => {
    if (startTime && endTime) {
      fetchDynamicPrice(startTime, endTime);
    }
  }, [startTime, endTime]);

  const resetForm = () => {
    setStartTime(null);
    setEndTime(null);
    setAvailableSlots([]);
    setSelectedSlot(null);
    setName("");
    setCarNumber("");
    setPayment(0);
  };

  const showDateTimePicker = (type) => {
    setPickerMode(type);
    setStep("date");
    setShowPicker(true);
  };

  const handleDateTimeChange = (event, selectedDate) => {
    if (event?.type === "dismissed") {
      setShowPicker(false);
      return;
    }

    if (step === "date") {
      const currentDate = selectedDate || new Date();
      const tempDate = new Date(currentDate);
      setStep("time");

      if (Platform.OS === "android") {
        if (pickerMode === "start") setStartTime(tempDate);
        else setEndTime(tempDate);
      }
    } else {
      const tempTime = selectedDate || new Date();
      const prevDate = pickerMode === "start" ? startTime : endTime;

      const finalDateTime = new Date(
        prevDate.getFullYear(),
        prevDate.getMonth(),
        prevDate.getDate(),
        tempTime.getHours(),
        tempTime.getMinutes()
      );

      if (pickerMode === "start") setStartTime(finalDateTime);
      else setEndTime(finalDateTime);

      setShowPicker(false);
    }

    if (Platform.OS === "ios") {
      if (pickerMode === "start") setStartTime(selectedDate);
      else setEndTime(selectedDate);
    }
  };

  const validateAndFetchSlots = async () => {
    if (!startTime || !endTime) {
      Alert.alert("Validation Error", "Start and End time are required.");
      return;
    }

    if (endTime <= startTime) {
      Alert.alert("Validation Error", "End time must be after Start time.");
      return;
    }

    try {
      const response = await fetch(
        `${backendUrl}/api/slotoperations/fetchAvailableSlot`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ startTime, endTime }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch slots");
      }

      const data = await response.json();
      const slotsFromBackend = data.availableSlots || [];

      setAvailableSlots(slotsFromBackend);
      setSlotsChecked(true);

      if (!slotsFromBackend.includes(selectedSlot)) {
        setSelectedSlot(null);
        if (selectedSlot !== null) {
          Alert.alert(
            "Slot Unavailable",
            "Previously selected slot is no longer available."
          );
        }
      }
    } catch (error) {
      console.error(error);
      Alert.alert(
        "Error",
        "Could not fetch available slots. Please try again."
      );
    }
  };

  const fetchDynamicPrice = async (start, end) => {
    if (!start || !end) return;

    if (end <= start) return;

    setIsCalculating(true);
    try {
      const response = await axios.post(
        `${backendUrl}/api/booking/calculate-price`,
        {
          startTime: start,
          endTime: end,
        }
      );

      if (response.data) {
        setPayment(response.data.totalAmount);
      }
    } catch (error) {
      console.error("Failed to fetch price:", error);
      Alert.alert(
        "Error",
        "Could not calculate dynamic price. Please check connection."
      );
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot);
  };

  const validateAndPay = async () => {
    if (!name.trim()) {
      Alert.alert("Validation Error", "Name is required.");
      return;
    }
    if (!carNumber.trim()) {
      Alert.alert("Validation Error", "Car Number is required.");
      return;
    }

    try {
      const response = await fetch(`${backendUrl}/api/makePayment/payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount: Math.round(payment * 100) }),
      });

      const { clientSecret, transactionId, error } = await response.json();

      if (error) {
        Alert.alert("Error", error);
        return;
      }

      const initSheet = await initPaymentSheet({
        merchantDisplayName: "SlotReserve",
        customerEmail: "user@example.com",
        allowsDelayedPaymentMethods: false,
        paymentIntentClientSecret: clientSecret,
      });

      if (initSheet.error) {
        Alert.alert("Error", initSheet.error.message);
        return;
      }

      const paymentResult = await presentPaymentSheet();

      if (paymentResult.error) {
        Alert.alert("Payment Failed", paymentResult.error.message);
        await fetch(`${backendUrl}/api/payment/savePayment`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: user._id,
            transactionId,
            amount: payment,
            status: "failed",
            timestamp: new Date().toISOString(),
          }),
        });
      } else {
        Alert.alert("Success", "Payment completed!", [
          {
            text: "OK",
            onPress: async () => {
              await fetch(`${backendUrl}/api/payment/savePayment`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  userId: user._id,
                  transactionId,
                  amount: payment,
                  status: "success",
                  timestamp: new Date().toISOString(),
                }),
              });

              try {
                const bookingDetails = {
                  userId: user._id,
                  name,
                  carNumber,
                  slot: selectedSlot,
                  amount: payment,
                  startTime,
                  endTime,
                };

                await fetch(`${backendUrl}/api/booking/save`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify(bookingDetails),
                });

                await fetch(
                  `${backendUrl}/api/slotoperations/addReservationToSlot`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      slotName: selectedSlot,
                      userId: user._id,
                      startTime,
                      endTime,
                    }),
                  }
                );

                resetForm();
                setSlotsChecked(false);
              } catch (err) {
                console.error("Reservation update failed", err);
                Alert.alert(
                  "Error",
                  "Payment was successful but reservation update failed."
                );
              }
            },
          },
        ]);
      }
    } catch (err) {
      Alert.alert("Error", "Payment could not be processed.");
    }
  };

  const isFormComplete = name.trim() && carNumber.trim();

  if (!isLoggedIn) {
    return (
      <View style={styles.lockedContainer}>
        <Text style={styles.title1}>Slot Reservation</Text>
        <Image
          source={require("../assets/images/parking-lot.png")}
          style={styles.lockedImage}
        />
        <Text style={styles.lockedText}>Sign In to reserve your slot</Text>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => navigation.navigate("Login")}
        >
          <Text style={styles.loginButtonText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <Text style={styles.title}>Reserve your slot</Text>

          <TouchableOpacity
            style={styles.input}
            onPress={() => showDateTimePicker("start")}
          >
            <Text>
              {startTime
                ? `Start: ${format(startTime, "PPpp")}`
                : "Select Start Date & Time"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.input}
            onPress={() => showDateTimePicker("end")}
          >
            <Text>
              {endTime
                ? `End: ${format(endTime, "PPpp")}`
                : "Select End Date & Time"}
            </Text>
          </TouchableOpacity>

          {showPicker && (
            <DateTimePicker
              mode={step}
              value={
                pickerMode === "start"
                  ? startTime || new Date()
                  : endTime || new Date()
              }
              is24Hour={false}
              display={Platform.OS === "android" ? "default" : "inline"}
              onChange={handleDateTimeChange}
              minimumDate={
                pickerMode === "start" ? new Date() : startTime || new Date()
              }
              maximumDate={
                pickerMode === "start"
                  ? new Date(new Date().getTime() + 1 * 24 * 60 * 60 * 1000) // Today + 1 day = Tomorrow
                  : startTime
                  ? new Date(startTime.getTime() + 2 * 24 * 60 * 60 * 1000)
                  : undefined
              }
            />
          )}

          <TouchableOpacity
            style={styles.checkButton}
            onPress={validateAndFetchSlots}
          >
            <Text style={styles.checkButtonText}>
              {availableSlots.length > 0
                ? "Re-check Slots"
                : "Check Available Slots"}
            </Text>
          </TouchableOpacity>

          {slotsChecked &&
            (availableSlots.length > 0 ? (
              <>
                <Text style={styles.label}>Available Slots</Text>
                <View style={styles.slotsContainer}>
                  {availableSlots.map((slot) => (
                    <TouchableOpacity
                      key={slot}
                      style={[
                        styles.slot,
                        selectedSlot === slot && styles.selectedSlot,
                      ]}
                      onPress={() => handleSlotSelect(slot)}
                    >
                      <Text style={styles.slotText}>{slot}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : (
              <Text style={styles.noSlotsText}>
                No slots available for the selected time.
              </Text>
            ))}

          {selectedSlot && (
            <View style={styles.form}>
              <Text style={styles.selectedSlotText}>
                Selected Slot: {selectedSlot}
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Name"
                value={name}
                onChangeText={setName}
              />
              <TextInput
                style={styles.input}
                placeholder="Car Number"
                value={carNumber}
                onChangeText={setCarNumber}
              />

              <TouchableOpacity
                style={[
                  styles.payButton,
                  (!isFormComplete || isCalculating) && styles.disabledButton,
                ]}
                onPress={validateAndPay}
                disabled={!isFormComplete || isCalculating}
              >
                {isCalculating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.payText}>Pay ₹{payment}</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default Reservation;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  scrollContainer: {
    flexGrow: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  checkButton: {
    backgroundColor: "#007BFF",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 20,
  },
  checkButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  label: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  slotsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  slot: {
    width: "30%",
    backgroundColor: "#e0e0e0",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  selectedSlot: {
    backgroundColor: "#28a745",
  },
  slotText: {
    fontWeight: "bold",
  },
  noSlotsText: {
    textAlign: "center",
    color: "red",
    marginTop: 10,
  },
  form: {
    marginTop: 20,
  },
  selectedSlotText: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  payButton: {
    backgroundColor: "#28a745",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
  payText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
  },
  lockedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  title1: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 30,
    color: "#333",
  },
  lockedImage: {
    width: 200,
    height: 200,
    marginBottom: 20,
    resizeMode: "contain",
  },
  lockedText: {
    fontSize: 18,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
  },
  loginButton: {
    backgroundColor: "#007BFF",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
