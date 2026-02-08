import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from "react-native";
import React from "react";
import { COLORS, SIZES, SHADOWS } from "../constants/theme";

const Button = ({ title, onPress, isValid = true, loader = false }) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!isValid || loader}
      activeOpacity={0.7}
      style={[
        styles.btnStyle,
        { 
          backgroundColor: isValid ? COLORS.primary : COLORS.gray400,
          ...(isValid ? SHADOWS.light : {}) 
        }
      ]}
    >
      {loader ? (
        <ActivityIndicator size="small" color={COLORS.white} />
      ) : (
        <Text style={styles.btnTxt}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

export default Button;

const styles = StyleSheet.create({
  btnStyle: {
    height: 52,
    width: "100%",
    marginVertical: 20,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: SIZES.radius,
  },
  btnTxt: {
    fontWeight: "bold", 
    color: COLORS.white,
    fontSize: 16,
    letterSpacing: 0.5,
  },
});