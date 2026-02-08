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
import React, { useState, useContext } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import axios from "axios";
import { Formik } from "formik";
import * as Yup from "yup";

import BackBtn from "../components/BackBtn";
import Button from "../components/Button";
import InputField from "../components/InputField";
import { backendUrl, COLORS, SIZES } from "../constants";
import { AuthContext } from "../contexts/AuthContext";

const validationSchema = Yup.object().shape({
  password: Yup.string()
    .min(8, "Must be at least 8 characters")
    .required("Required"),
  email: Yup.string().email("Invalid email address").required("Required"),
});

const LoginPage = ({ navigation }) => {
  const [loader, setLoader] = useState(false);
  const { login } = useContext(AuthContext);

  const loginHandler = async (values) => {
    setLoader(true);
    try {
      const response = await axios.post(`${backendUrl}/api/user/login`, values);
      const userData = response.data;
      await login(userData);
      navigation.replace("Bottom Navigation");
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message || "An error occurred";
      if (error?.response?.status === 401) {
        Alert.alert("Invalid Credentials", errorMessage, [
          { text: "Try Again" },
        ]);
      } else {
        Alert.alert("Error", errorMessage);
      }
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
            <Text style={styles.title}>ParkEase Haven</Text>
            <Text style={styles.subtitle}>
              A Smart Valley of Hassle-Free Parking
            </Text>
          </View>

          <View style={styles.formContainer}>
            <Formik
              initialValues={{ email: "", password: "" }}
              validationSchema={validationSchema}
              onSubmit={(values) => loginHandler(values)}
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
                    label="Email Address"
                    iconName="email-outline"
                    placeholder="Enter your email"
                    value={values.email}
                    onChangeText={handleChange("email")}
                    onBlur={handleBlur("email")}
                    error={touched.email && errors.email}
                    keyboardType="email-address"
                  />

                  <InputField
                    label="Password"
                    iconName="lock-outline"
                    placeholder="Enter your password"
                    value={values.password}
                    onChangeText={handleChange("password")}
                    onBlur={handleBlur("password")}
                    error={touched.password && errors.password}
                    password // Enables the eye toggle feature
                  />

                  <Button
                    loader={loader}
                    title="Log In"
                    onPress={handleSubmit}
                    isValid={isValid}
                  />

                  <View style={styles.footer}>
                    <Text style={styles.registration}>
                      Don't have an account?{" "}
                    </Text>
                    <Text
                      style={styles.registrationLink}
                      onPress={() => navigation.navigate("SignUp")}
                    >
                      Create Account
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

export default LoginPage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 20,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 30,
    marginTop: 10,
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
    textAlign: "center",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: "center",
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
  registration: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  registrationLink: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "bold",
    textDecorationLine: "underline",
  },
});