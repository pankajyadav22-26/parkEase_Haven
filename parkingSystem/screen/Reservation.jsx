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
} from "react-native";
import React, { useState, useContext } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import { AuthContext } from "../contexts/AuthContext";
import { format } from "date-fns";
import { backendUrl } from "@/constants";
import { useStripe } from "@stripe/stripe-react-native";

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

  const { initPaymentSheet, presentPaymentSheet } = useStripe();

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

  const calculatePayment = () => {
    const durationHours = (endTime - startTime) / (1000 * 60 * 60);
    const total = durationHours * 50;
    setPayment(total.toFixed(2));
  };

  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot);
    calculatePayment();
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
            amount : payment,
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
                  amount : payment,
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

                // Save booking
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
      console.log(err);
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
                  !isFormComplete && styles.disabledButton,
                ]}
                onPress={validateAndPay}
                disabled={!isFormComplete}
              >
                <Text style={styles.payText}>Pay ₹{payment}</Text>
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
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 10,
  },
  slotsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  slot: {
    padding: 15,
    borderRadius: 10,
    backgroundColor: "#e0e0e0",
    marginBottom: 10,
    width: "48%",
    alignItems: "center",
  },
  selectedSlot: {
    backgroundColor: "#4caf50",
  },
  slotText: {
    color: "#000",
    fontWeight: "600",
  },
  form: {
    marginTop: 10,
  },
  selectedSlotText: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 10,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginBottom: 12,
    borderRadius: 8,
  },
  payButton: {
    backgroundColor: "#2196f3",
    padding: 15,
    alignItems: "center",
    borderRadius: 8,
    marginBottom: 15,
  },
  disabledButton: {
    backgroundColor: "#a0a0a0",
  },
  payText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  lockedContainer: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    paddingTop: 10,
  },
  title1: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  lockedImage: {
    width: "100%",
    height: "70%",
    resizeMode: "contain",
    marginTop: 10,
  },
  lockedText: {
    fontSize: 20,
    textAlign: "center",
    color: "#252F40",
    marginTop: 12,
    paddingHorizontal: 12,
    fontWeight: "700",
  },
  loginButton: {
    marginTop: 20,
    backgroundColor: "midnightblue",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  checkButton: {
    backgroundColor: "#0066cc",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 20,
  },
  checkButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  noSlotsText: {
    fontSize: 16,
    color: "#f44336", // red color
    fontWeight: "600",
    textAlign: "center",
    marginVertical: 10,
  },
});