import { ActivityIndicator, StyleSheet, Text, Pressable, Animated } from "react-native";
import React, { useRef } from "react";
import { COLORS, SIZES, SHADOWS, SPACING } from "../constants/theme";

const Button = ({ title, onPress, isValid = true, loader = false }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={!isValid || loader}
        style={({ pressed }) => [
          styles.btnStyle,
          { 
            backgroundColor: isValid ? COLORS.primary : COLORS.gray400,
            opacity: pressed ? 0.9 : 1
          },
          isValid && SHADOWS.medium
        ]}
      >
        {loader ? (
          <ActivityIndicator size="small" color={COLORS.white} />
        ) : (
          <Text style={styles.btnTxt}>{title}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
};

export default Button;

const styles = StyleSheet.create({
  btnStyle: {
    height: 56,
    width: "100%",
    marginVertical: SPACING.m,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: SIZES.radius,
  },
  btnTxt: {
    fontWeight: "700", 
    color: COLORS.white,
    fontSize: 16,
    letterSpacing: 0.5,
  },
});