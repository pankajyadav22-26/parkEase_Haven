import React, { useState } from "react";
import { StyleSheet } from "react-native";
import { AuthProvider } from "../contexts/AuthContext";
import { Esp32Provider } from "../contexts/Esp32Context";
import AppNavigator from "../navigation/AppNavigator";
import CustomSplash from "../components/CustomSplash";
import Esp32StatusBar from "../components/Esp32StatusBar";
import { StripeProvider } from "@stripe/stripe-react-native";

export default function Page() {
  const [isSplashDone, setIsSplashDone] = useState(false);

  if (!isSplashDone) {
    return <CustomSplash onFinish={() => setIsSplashDone(true)} />;
  }

  return (
    <StripeProvider publishableKey="pk_test_51Pk7TjDNxCaue7GcjYIcYlFNXHCFMsuZ5pgdNaTmt22EDVRSA6JRCjkx4n9IZvGnYHJVNdy9TcqykyxxQlfNdAlW00F7jRNbta">
      <AuthProvider>
        <Esp32Provider>
          <Esp32StatusBar />
          <AppNavigator />
        </Esp32Provider>
      </AuthProvider>
    </StripeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
