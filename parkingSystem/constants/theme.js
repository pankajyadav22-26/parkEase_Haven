import { Dimensions, PixelRatio } from "react-native";
const { width, height } = Dimensions.get("window");

export const SPACING = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
  xxl: 48,
};

export const PALETTE = {
  primary: "#006D77",
  primaryLight: "#E0F2F1",
  primaryDark: "#004D40",
  secondary: "#83C5BE",
  success: "#2E7D32",
  warning: "#ED6C02",
  error: "#D32F2F",
  white: "#FFFFFF",
  gray100: "#F5F5F5",
  gray200: "#EEEEEE",
  gray300: "#E0E0E0",
  gray400: "#BDBDBD",
  gray500: "#9E9E9E",
  gray600: "#757575",
  gray700: "#616161",
  gray800: "#424242",
  gray900: "#212121",
  surface: "#FFFFFF", 
};

export const SIZES = {
  base: 8,
  radius: 16,
  width,
  height,
};

export const SHADOWS = {
  medium: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
};

export const COLORS = {
  ...PALETTE,
  background: PALETTE.gray100,
  text: PALETTE.gray900,
  textSecondary: "#757575",
};