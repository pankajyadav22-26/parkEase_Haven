import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { AuthProvider } from "../contexts/AuthContext";
import { Esp32Provider } from "../contexts/Esp32Context";
import AppNavigator from "../navigation/AppNavigator";
import CustomSplash from "../components/CustomSplash";
import Esp32StatusBar from "../components/Esp32StatusBar";
import { StripeProvider } from "@stripe/stripe-react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { COLORS } from "../constants/theme";

const SafeStatusBarWrapper = ({ children }: { children: React.ReactNode }) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top, zIndex: 100 }}>
      {children}
    </View>
  );
};

export default function Page() {
  const [isSplashDone, setIsSplashDone] = useState(false);

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: COLORS.primary }}>
        
        <StatusBar style="light" backgroundColor="transparent" translucent={true} />

        <StripeProvider publishableKey="pk_test_51Pk7TjDNxCaue7GcjYIcYlFNXHCFMsuZ5pgdNaTmt22EDVRSA6JRCjkx4n9IZvGnYHJVNdy9TcqykyxxQlfNdAlW00F7jRNbta">
          <AuthProvider>
            <Esp32Provider>
              <SafeStatusBarWrapper>
                <Esp32StatusBar />
              </SafeStatusBarWrapper>

              <AppNavigator />
            </Esp32Provider>
          </AuthProvider>
        </StripeProvider>

        {!isSplashDone && (
          <View style={StyleSheet.absoluteFill}>
            <CustomSplash onFinish={() => setIsSplashDone(true)} />
          </View>
        )}
      </View>
    </SafeAreaProvider>
  );
}