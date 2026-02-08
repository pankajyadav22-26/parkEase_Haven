import React from "react";
import { TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS, SIZES, SHADOWS } from "../constants/theme";

const BackBtn = ({ onPress }) => {
  return (
    <TouchableOpacity 
      onPress={onPress} 
      style={styles.container}
      activeOpacity={0.7}
    >
      <MaterialCommunityIcons 
        name="arrow-left" 
        size={24} 
        color={COLORS.text} 
      />
    </TouchableOpacity>
  );
};

export default BackBtn;

const styles = StyleSheet.create({
  container: {
    height: 44,
    width: 44,
    borderRadius: 22, 
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOWS.light,
    marginTop: -1,
    marginLeft: -3, 
    zIndex: 10,
  },
});