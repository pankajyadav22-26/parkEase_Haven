import {
  ScrollView,
  Text,
  View,
  Image,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import React, { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import axios from "axios";
import { Formik } from "formik";
import * as Yup from "yup";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import Button from "../components/Button";
import InputField from "../components/InputField";
import { backendUrl } from "../constants";
import { COLORS, SIZES, SHADOWS, SPACING } from "../constants/theme";

const validationSchema = Yup.object().shape({
  username: Yup.string().min(3, "Too Short!").required("Username is required"),
  email: Yup.string().email("Invalid email").required("Email is required"),
  location: Yup.string()
    .min(3, "Invalid location")
    .required("Location is required"),
  password: Yup.string()
    .min(8, "Must be at least 8 characters")
    .required("Password is required"),
});

const SignUp = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [loader, setLoader] = useState(false);

  const registerUser = async (values) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoader(true);
    try {
      const response = await axios.post(
        `${backendUrl}/api/user/register`,
        values,
      );
      if (response.status === 201) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Welcome!", "Your account has been created successfully.", [
          { text: "Log In", onPress: () => navigation.replace("Login") },
        ]);
      }
    } catch (error) {
      console.log(error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Registration Failed",
        "Something went wrong. Please try again.",
      );
    } finally {
      setLoader(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        style={styles.absoluteHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <TouchableOpacity
        style={[styles.backBtn, { top: insets.top + SPACING.s }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          navigation.goBack();
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="chevron-back" size={24} color={COLORS.white} />
      </TouchableOpacity>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 60 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headerContainer}>
            <Image
              source={require("../assets/images/bk.png")}
              style={styles.loginCover}
            />
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join ParkEase Haven today</Text>
          </View>

          <View style={styles.formCard}>
            <Formik
              initialValues={{
                username: "",
                email: "",
                password: "",
                location: "",
              }}
              validationSchema={validationSchema}
              onSubmit={(values) => registerUser(values)}
            >
              {({
                handleChange,
                handleBlur,
                handleSubmit,
                values,
                errors,
                touched,
                isValid,
              }) => (
                <View>
                  <InputField
                    label="Username"
                    iconName="account-outline"
                    placeholder="Choose a username"
                    value={values.username}
                    onChangeText={handleChange("username")}
                    onBlur={handleBlur("username")}
                    error={touched.username && errors.username}
                  />

                  <InputField
                    label="Email Address"
                    iconName="email-outline"
                    placeholder="Enter your email"
                    value={values.email}
                    onChangeText={handleChange("email")}
                    onBlur={handleBlur("email")}
                    error={touched.email && errors.email}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />

                  <InputField
                    label="City / Location"
                    iconName="map-marker-outline"
                    placeholder="Where are you parking?"
                    value={values.location}
                    onChangeText={handleChange("location")}
                    onBlur={handleBlur("location")}
                    error={touched.location && errors.location}
                  />

                  <InputField
                    label="Password"
                    iconName="lock-outline"
                    placeholder="Create a password"
                    value={values.password}
                    onChangeText={handleChange("password")}
                    onBlur={handleBlur("password")}
                    error={touched.password && errors.password}
                    password
                  />

                  <View style={{ marginTop: SPACING.m }}>
                    <Button
                      loader={loader}
                      title="Create Account"
                      onPress={() => {
                        if (!isValid) {
                          Haptics.notificationAsync(
                            Haptics.NotificationFeedbackType.Warning,
                          );
                        }
                        handleSubmit();
                      }}
                      isValid={isValid && values.email !== ""}
                    />
                  </View>

                  <View style={styles.footer}>
                    <Text style={styles.footerText}>
                      Already have an account?{" "}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.selectionAsync();
                        navigation.navigate("Login");
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.link}>Log In</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </Formik>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default SignUp;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6F8",
  },
  absoluteHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: SIZES.height * 0.45,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  backBtn: {
    position: "absolute",
    left: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  loginCover: {
    height: 120,
    width: 180,
    resizeMode: "contain",
    marginBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    color: COLORS.white,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.85)",
    fontWeight: "500",
  },
  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    ...SHADOWS.medium,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    paddingVertical: 10,
  },
  footerText: {
    color: COLORS.gray600,
    fontSize: 14,
    fontWeight: "500",
  },
  link: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "800",
  },
});
