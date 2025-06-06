import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  StyleSheet,
} from "react-native";
import React, { useState, useContext } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Formik } from "formik";
import * as Yup from "yup";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import BackBtn from "../components/BackBtn";
import Button from "../components/Button";
import { backendUrl, COLORS, SIZES } from "@/constants";
import { AuthContext } from "../contexts/AuthContext";

const validationSchema = Yup.object().shape({
  password: Yup.string()
    .min(8, "Must be at least 8 characters")
    .required("Required"),
  email: Yup.string().email("Invalid email address").required("Required"),
});

const LoginPage = ({ navigation }) => {
  const [loader, setLoader] = useState(false);
  const [obsecureText, setObsecureText] = useState(false);

  const { login } = useContext(AuthContext); 

  const invalidForm = () => {
    Alert.alert("Invalid Form", "Please provide all required fields", [
      { text: "Cancel" },
      { text: "Continue" },
    ]);
  };

  const loginHandler = async (values) => {
    setLoader(true);
    try {
      const response = await axios.post(`${backendUrl}/api/user/login`, values);
      const userData = response.data;

      await login(userData);
      navigation.replace("Bottom Navigation");
    } catch (error) {
      const errorMessage = error?.response?.data?.message || "An error occurred";
      if (error?.response?.status === 401) {
        Alert.alert("Invalid Credentials", errorMessage, [{ text: "Try Again" }]);
      } else {
        Alert.alert("Error", errorMessage);
      }
    } finally {
      setLoader(false);
    }
  };

  return (
    <ScrollView>
      <SafeAreaView style={{ marginHorizontal: 9 }}>
        <View style={{ marginBottom: 1 }}>
          <BackBtn onPress={() => navigation.goBack()} />
          <Image
            source={require("../assets/images/bk.png")}
            style={styles.loginCover}
          />
          <Text style={styles.title}>ParkEase Haven</Text>
          <Text style={styles.subtitle}>A Smart Valley of Hassle-Free Parking</Text>

          <Formik
            initialValues={{ email: "", password: "" }}
            validationSchema={validationSchema}
            onSubmit={(values) => loginHandler(values)}
          >
            {({
              handleChange,
              handleBlur,
              touched,
              handleSubmit,
              values,
              errors,
              isValid,
              setFieldTouched,
            }) => (
              <View>
                {/* Email Input */}
                <View style={styles.wrapper}>
                  <Text style={styles.label}>Email</Text>
                  <View
                    style={styles.inputWrapper(
                      touched.email ? COLORS.secondary : COLORS.offwhite
                    )}
                  >
                    <MaterialCommunityIcons
                      name="email-outline"
                      size={20}
                      color={COLORS.gray}
                      style={styles.iconStyle}
                    />
                    <TextInput
                      placeholder="Email"
                      onFocus={() => setFieldTouched("email", true)}
                      onBlur={() => setFieldTouched("email", true)}
                      value={values.email}
                      onChangeText={handleChange("email")}
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={{ flex: 1 }}
                    />
                  </View>
                  {touched.email && errors.email && (
                    <Text style={styles.errorMessage}>{errors.email}</Text>
                  )}
                </View>

                {/* Password Input */}
                <View style={styles.wrapper}>
                  <Text style={styles.label}>Password</Text>
                  <View
                    style={styles.inputWrapper(
                      touched.password ? COLORS.secondary : COLORS.offwhite
                    )}
                  >
                    <MaterialCommunityIcons
                      name="lock-outline"
                      size={20}
                      color={COLORS.gray}
                      style={styles.iconStyle}
                    />
                    <TextInput
                      secureTextEntry={!obsecureText}
                      placeholder="Password"
                      onFocus={() => setFieldTouched("password", true)}
                      onBlur={() => setFieldTouched("password", true)}
                      value={values.password}
                      onChangeText={handleChange("password")}
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={{ flex: 1 }}
                    />
                    <TouchableOpacity onPress={() => setObsecureText(!obsecureText)}>
                      <MaterialCommunityIcons
                        name={obsecureText ? "eye-outline" : "eye-off-outline"}
                        size={18}
                      />
                    </TouchableOpacity>
                  </View>
                  {touched.password && errors.password && (
                    <Text style={styles.errorMessage}>{errors.password}</Text>
                  )}
                </View>

                <Button
                  loader={loader}
                  title={"Log In"}
                  onPress={isValid ? handleSubmit : invalidForm}
                  isValid={isValid}
                />
                <Text style={styles.registration}>Don't have an account?</Text>
                <Text
                  style={styles.registration2}
                  onPress={() => navigation.navigate("SignUp")}
                >
                  Create an Account
                </Text>
              </View>
            )}
          </Formik>
        </View>
      </SafeAreaView>
    </ScrollView>
  );
};

export default LoginPage;

const styles = StyleSheet.create({
  loginCover: {
    height: SIZES.height / 2.1,
    width: SIZES.width - 60,
    resizeMode: "contain",
    marginBottom: SIZES.large,
    marginTop: -40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#01579B',
    textAlign: 'center',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 18,
    color: '#0277BD',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  wrapper: {
    marginBottom: 20,
    // marginHorizontal: 20,
  },
  label: {
    fontFamily: "regular",
    fontSize: SIZES.xSmall,
    marginBottom: 5,
    marginEnd: 5,
    textAlign: "right",
  },
  inputWrapper: (borderColor) => ({
    borderColor: borderColor,
    backgroundColor: COLORS.lightWhite,
    borderWidth: 1,
    height: 50,
    borderRadius: 12,
    flexDirection: "row",
    paddingHorizontal: 15,
    alignItems: "center",
  }),
  iconStyle: {
    marginRight: 10,
  },
  errorMessage: {
    color: COLORS.red,
    fontSize: SIZES.xSmall,
    fontFamily: "regular",
    marginTop: 5,
    marginLeft: 5,
  },
  registration: {
    marginTop: 20,
    textAlign: "center",
  },
  registration2: {
    textAlign: "center",
    marginTop: 5,
    textDecorationLine: "underline",
    color: COLORS.tertiary,
  },
});
