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
import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import BackBtn from "../components/BackBtn";
import Button from "../components/Button";
import { Form, Formik } from "formik";
import * as Yup from "yup";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS, SIZES } from "@/constants";
import axios from "axios";
import { backendUrl } from "@/constants";

const validationSchema = Yup.object().shape({
  password: Yup.string()
    .min(8, "Must be atleast 8 characters")
    .required("Required"),
  email: Yup.string().email("Invalid email address").required("Required"),
  location: Yup.string()
    .min(3, "Please provide a valid location")
    .required("Required"),
  username: Yup.string()
    .min(3, "Please provide a valid username")
    .required("Required"),
});

const SignUp = ({ navigation }) => {
  const [loader, setLoader] = useState(false);
  const [obsecureText, setObsecureText] = useState(false);

  const invalidForm = () => {
    Alert.alert("Invalid Form", "Please provide all required fields", [
      {
        text: "Cancel",
        onPress: () => {},
      },
      {
        text: "Continue",
        onPress: () => {},
      },
      { defaultIndex: 1 },
    ]);
  };

  const registerUser = async (values) => {
    setLoader(true);

    try {
      const response = await axios.post(
        `${backendUrl}/api/user/register`,
        values
      );
      if (response.status === 201) {
        navigation.replace("Login");
      }
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <ScrollView>
      <SafeAreaView style={{ marginHorizontal: 8 }}>
        <View style={{ marginBottom: 10 }}>
          <BackBtn onPress={() => navigation.goBack()} />
          <Image
            source={require("../assets/images/bk.png")}
            style={styles.loginCover}
          />
          <Text style={styles.title}>ParkEase Haven</Text>
          <Text style={styles.subtitle}>
            A Smart Valley of Hassle-Free Parking
          </Text>
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
              touched,
              handleSubmit,
              values,
              errors,
              isValid,
              setFieldTouched,
            }) => (
              <View>
                <View style={styles.wrapper}>
                  <Text style={styles.label}>Username</Text>
                  <View
                    style={styles.inputWrapper(
                      touched.username ? COLORS.secondary : COLORS.offwhite
                    )}
                  >
                    <MaterialCommunityIcons
                      name="face-man-profile"
                      size={20}
                      color={COLORS.gray}
                      style={styles.iconStyle}
                    />
                    <TextInput
                      placeholder="Username"
                      onFocus={() => {
                        setFieldTouched("username");
                      }}
                      onBlur={() => {
                        setFieldTouched("username", "");
                      }}
                      value={values.username}
                      onChangeText={handleChange("username")}
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={{ flex: 1 }}
                    />
                  </View>
                  {touched.username && errors.username && (
                    <Text style={styles.errorMessage}>{errors.username}</Text>
                  )}
                </View>
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
                      onFocus={() => {
                        setFieldTouched("email");
                      }}
                      onBlur={() => {
                        setFieldTouched("email", "");
                      }}
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

                <View style={styles.wrapper}>
                  <Text style={styles.label}>Location</Text>
                  <View
                    style={styles.inputWrapper(
                      touched.location ? COLORS.secondary : COLORS.offwhite
                    )}
                  >
                    <Ionicons
                      name="location-outline"
                      size={20}
                      color={COLORS.gray}
                      style={styles.iconStyle}
                    />
                    <TextInput
                      placeholder="Location"
                      onFocus={() => {
                        setFieldTouched("location");
                      }}
                      onBlur={() => {
                        setFieldTouched("location", "");
                      }}
                      value={values.location}
                      onChangeText={handleChange("location")}
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={{ flex: 1 }}
                    />
                  </View>
                  {touched.location && errors.location && (
                    <Text style={styles.errorMessage}>{errors.location}</Text>
                  )}
                </View>

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
                      onFocus={() => {
                        setFieldTouched("password");
                      }}
                      onBlur={() => {
                        setFieldTouched("password", "");
                      }}
                      value={values.password}
                      onChangeText={handleChange("password")}
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={{ flex: 1 }}
                    />
                    <TouchableOpacity
                      onPress={() => {
                        setObsecureText(!obsecureText);
                      }}
                    >
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
                  title={"SignUp"}
                  onPress={isValid ? handleSubmit : invalidForm}
                  isValid={isValid}
                />
                <Text style={styles.registration}>
                  Already have an account?
                </Text>
                <Text
                  style={styles.registration2}
                  onPress={() => {
                    navigation.navigate("Login");
                  }}
                >
                  SignIn to your Account
                </Text>
              </View>
            )}
          </Formik>
        </View>
      </SafeAreaView>
    </ScrollView>
  );
};

export default SignUp;

const styles = StyleSheet.create({
  loginCover: {
    height: SIZES.height / 3.7,
    width: SIZES.width - 60,
    resizeMode: "contain",
    marginBottom: SIZES.large,
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
    marginBottom: 11,
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
