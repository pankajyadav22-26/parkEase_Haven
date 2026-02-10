import {
  ScrollView,
  Text,
  View,
  Image,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import axios from "axios";
import { Formik } from "formik";
import * as Yup from "yup";

import BackBtn from "../components/BackBtn";
import Button from "../components/Button";
import InputField from "../components/InputField";
import { backendUrl } from "../constants";
import { COLORS, SIZES } from "../constants/theme";

const validationSchema = Yup.object().shape({
  username: Yup.string()
    .min(3, "Too Short!")
    .required("Required"),
  email: Yup.string().email("Invalid email").required("Required"),
  location: Yup.string().min(3, "Invalid location").required("Required"),
  password: Yup.string()
    .min(8, "Must be at least 8 characters")
    .required("Required"),
});

const SignUp = ({ navigation }) => {
  const [loader, setLoader] = useState(false);

  const registerUser = async (values) => {
    setLoader(true);
    try {
      const response = await axios.post(
        `${backendUrl}/api/user/register`,
        values
      );
      if (response.status === 201) {
        Alert.alert("Success", "Account created successfully", [
          { text: "Login", onPress: () => navigation.replace("Login") },
        ]);
      }
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "Registration failed. Please try again.");
    } finally {
      setLoader(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <BackBtn onPress={() => navigation.goBack()} />

          <View style={styles.headerContainer}>
            <Image
              source={require("../assets/images/bk.png")}
              style={styles.loginCover}
            />
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join ParkEase Haven today</Text>
          </View>

          <View style={styles.formContainer}>
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
                    label="Email"
                    iconName="email-outline"
                    placeholder="Enter your email"
                    value={values.email}
                    onChangeText={handleChange("email")}
                    onBlur={handleBlur("email")}
                    error={touched.email && errors.email}
                    keyboardType="email-address"
                  />

                  <InputField
                    label="Location"
                    iconName="map-marker-outline"
                    placeholder="Your city/area"
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

                  <Button
                    loader={loader}
                    title="Sign Up"
                    onPress={handleSubmit}
                    isValid={isValid}
                  />

                  <View style={styles.footer}>
                    <Text style={styles.footerText}>
                      Already have an account?{" "}
                    </Text>
                    <Text
                      style={styles.link}
                      onPress={() => navigation.navigate("Login")}
                    >
                      Log In
                    </Text>
                  </View>
                </View>
              )}
            </Formik>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SignUp;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 7,
    paddingTop: -30,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  loginCover: {
    height: SIZES.height / 3.5,
    width: SIZES.width - 60,
    resizeMode: "contain",
    marginTop: -40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  formContainer: {
    paddingBottom: 20,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10,
    marginBottom: 40,
  },
  footerText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  link: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "bold",
    textDecorationLine: "underline",
  },
});