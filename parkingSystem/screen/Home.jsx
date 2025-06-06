import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  Animated,
  Easing,
  Image,
  ScrollView,
  RefreshControl,
} from "react-native";
import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useIsFocused } from "@react-navigation/native";
import { backendUrl } from "../constants";

const { width } = Dimensions.get("window");
const slotSize = width / 2.5;
const slotImageSize = slotSize / 1.3;

const Home = () => {
  const [slots, setSlots] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const carAnim = useRef([]);
  const isFocused = useIsFocused();

  const fetchSlots = async () => {
    try {
      setRefreshing(true);
      const res = await axios.get(`${backendUrl}/api/slotoperations/fetchSlot`);
      const fetchedSlots = res.data.slots;
      setSlots(fetchedSlots);

      carAnim.current = [];
      fetchedSlots.forEach((_, index) => {
        carAnim.current[index] = new Animated.Value(150);
      });

      fetchedSlots.forEach((slot, index) => {
        if (slot.currentStatus === "occupied") {
          Animated.timing(carAnim.current[index], {
            toValue: 0,
            duration: 1000,
            delay: 200,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }).start();
        }
      });
    } catch (error) {
      console.error("Failed to fetch slots:", error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      fetchSlots();
    }
  }, [isFocused]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <Text style={styles.title}>ParkEase Haven</Text>
        <Text style={styles.subtitle}>
          A Smart Valley of Hassle-Free Parking
        </Text>
      </View>

      <ScrollView
        style={{ width: "100%", marginBottom: 10, marginTop: -25 }}
        contentContainerStyle={styles.slotsContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchSlots} />
        }
        showsVerticalScrollIndicator={false}
      >
        {slots.map((slot, index) => (
          <Animated.View
            key={slot._id}
            style={[styles.slot, { transform: [{ scale: fadeAnim }] }]}
          >
            <Text style={styles.slotText}>{slot.slotName}</Text>

            {slot.currentStatus === "available" && (
              <Image
                source={require("../assets/images/available.png")}
                style={styles.slotImageavailable}
                resizeMode="contain"
              />
            )}

            {slot.currentStatus === "reserved" && (
              <Image
                source={require("../assets/images/reserved.png")}
                style={styles.slotImagereserved}
                resizeMode="contain"
              />
            )}

            {slot.currentStatus === "occupied" && carAnim.current[index] && (
              <Animated.Image
                source={require("../assets/images/car.png")}
                style={[
                  styles.slotImage,
                  { transform: [{ translateX: carAnim.current[index] }] },
                ]}
                resizeMode="contain"
              />
            )}
          </Animated.View>
        ))}
      </ScrollView>
    </Animated.View>
  );
};

export default Home;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E1F5FE",
    padding: 20,
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 50,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#01579B",
    textAlign: "center",
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 18,
    color: "#0277BD",
    textAlign: "center",
    fontStyle: "italic",
  },
  slotsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    rowGap: 20,
  },
  slot: {
    width: slotSize,
    height: slotSize,
    backgroundColor: "#0288D1",
    justifyContent: "flex-start",
    alignItems: "center",
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
    paddingTop: 10,
    overflow: "hidden",
    marginBottom: 10,
  },
  slotText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
  slotImage: {
    width: slotImageSize,
    height: slotImageSize,
  },
  slotImageavailable: {
    width: slotImageSize,
    height: slotImageSize - 15,
  },
  slotImagereserved: {
    marginTop: -13,
    width: slotImageSize + 7,
    height: slotImageSize + 13,
  },
});