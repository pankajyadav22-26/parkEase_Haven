import React, { useContext } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AuthContext } from "../contexts/AuthContext";
import BottomTabNavigation from "../navigation/BottomTabNavigator";
import {
  LoginPage,
  SignUp,
  UserReservations,
  Transaction,
} from "../screen/index";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { loading } = useContext(AuthContext);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Bottom Navigation"
        component={BottomTabNavigation}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Login"
        component={LoginPage}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SignUp"
        component={SignUp}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="reserve"
        component={UserReservations}
        options={{ title: "Your Reservations" }}
      />
      <Stack.Screen
        name="transactions"
        component={Transaction}
        options={{ title: "Your Transactions" }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});