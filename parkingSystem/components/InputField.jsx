import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS, SIZES, FONTS } from "../constants/theme";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const InputField = ({
  label,
  iconName,
  error,
  password,
  onFocus = () => {},
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [hidePassword, setHidePassword] = useState(password);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <View
        style={[
          styles.inputContainer,
          {
            borderColor: error
              ? COLORS.error
              : isFocused
              ? COLORS.primary
              : COLORS.border,
            backgroundColor: COLORS.surface,
          },
        ]}
      >
        <MaterialCommunityIcons
          name={iconName}
          size={20}
          color={isFocused ? COLORS.primary : COLORS.gray500}
          style={styles.icon}
        />
        
        <TextInput
          style={styles.input}
          secureTextEntry={hidePassword}
          autoCorrect={false}
          onFocus={() => {
            setIsFocused(true);
            onFocus();
          }}
          onBlur={() => setIsFocused(false)}
          placeholderTextColor={COLORS.gray400}
          {...props}
        />

        {password && (
          <TouchableOpacity onPress={() => setHidePassword(!hidePassword)}>
            <MaterialCommunityIcons
              name={hidePassword ? "eye-outline" : "eye-off-outline"}
              size={20}
              color={COLORS.gray500}
            />
          </TouchableOpacity>
        )}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    marginVertical: 5,
    fontSize: 14,
    color: COLORS.gray700,
    fontWeight: "600",
  },
  inputContainer: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    borderWidth: 1.5,
    borderRadius: SIZES.radius,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    color: COLORS.text,
    flex: 1,
    height: "100%",
    fontSize: 16,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});

export default InputField;