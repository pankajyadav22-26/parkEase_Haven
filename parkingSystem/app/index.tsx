import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { AuthProvider } from "../contexts/AuthContext";
import { Esp32Provider } from "../contexts/Esp32Context";
import AppNavigator from "../navigation/AppNavigator";
import CustomSplash from "../components/CustomSplash";
import Esp32StatusBar from "../components/Esp32StatusBar";
import { StripeProvider } from "@stripe/stripe-react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { COLORS } from "../constants/theme";

export default function Page() {
  const [isSplashDone, setIsSplashDone] = useState(false);

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: COLORS.offWhite }}>
        <StatusBar
          style="dark"
          backgroundColor="transparent"
          translucent={true}
        />
        <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
          <StripeProvider publishableKey="pk_test_51Pk7TjDNxCaue7GcjYIcYlFNXHCFMsuZ5pgdNaTmt22EDVRSA6JRCjkx4n9IZvGnYHJVNdy9TcqykyxxQlfNdAlW00F7jRNbta">
            <AuthProvider>
              <Esp32Provider>
                <Esp32StatusBar />
                <AppNavigator />
              </Esp32Provider>
            </AuthProvider>
          </StripeProvider>
        </SafeAreaView>
        {!isSplashDone && (
          <View style={StyleSheet.absoluteFill}>
            <CustomSplash onFinish={() => setIsSplashDone(true)} />
          </View>
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.offWhite,
  },
});
