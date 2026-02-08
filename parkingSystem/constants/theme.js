import { Dimensions } from "react-native";
const { height, width } = Dimensions.get("window");

const PALETTE = {
  primary: "#006D77",
  primaryLight: "#E0F2F1",
  primaryDark: "#004D40",

  secondary: "#83C5BE", 
  tertiary: "#FFDDD2",

  success: "#2E7D32", 
  warning: "#ED6C02", 
  error: "#D32F2F", 
  info: "#0288D1",

  white: "#FFFFFF",
  offWhite: "#F8F9FA",
  gray100: "#F5F5F5",
  gray200: "#EEEEEE",
  gray300: "#E0E0E0",
  gray400: "#BDBDBD",
  gray500: "#9E9E9E",
  gray600: "#757575",
  gray700: "#616161",
  gray800: "#424242",
  gray900: "#212121",
  black: "#000000",
};

const THEME_COLORS = {
  light: {
    background: PALETTE.offWhite,
    surface: PALETTE.white,
    primary: PALETTE.primary,
    onPrimary: PALETTE.white,
    secondary: PALETTE.secondary,
    text: PALETTE.gray900,
    textSecondary: PALETTE.gray600,
    border: PALETTE.gray300,
    icon: PALETTE.gray600,
    error: PALETTE.error,
    success: PALETTE.success,
    tint: PALETTE.primary,
    tabIconDefault: PALETTE.gray500,
    tabIconSelected: PALETTE.primary,
    cardShadow: "#000000",
  },
  dark: {
    background: "#121212",
    surface: "#1E1E1E",
    primary: "#4DB6AC",
    onPrimary: "#000000",
    secondary: "#26A69A",
    text: "#E0E0E0",
    textSecondary: "#B0B0B0",
    border: "#333333",
    icon: "#B0B0B0",
    error: "#EF5350",
    success: "#66BB6A",
    tint: PALETTE.white,
    tabIconDefault: "#B0B0B0",
    tabIconSelected: PALETTE.white,
    cardShadow: "#000000",
  },
};

const SIZES = {
  base: 8,
  small: 12,
  font: 14,
  medium: 16,
  large: 18,
  extraLarge: 24,
  xxLarge: 32,

  width,
  height,
  
  padding: 24,
  radius: 16,
};

const SHADOWS = {
  light: {
    shadowColor: PALETTE.gray500,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  medium: {
    shadowColor: PALETTE.gray900,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  dark: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
};

const FONTS = {
  regular: "SpaceMono-Regular",
  bold: "SpaceMono-Regular",
};

export { THEME_COLORS, SIZES, SHADOWS, FONTS, PALETTE };

export const COLORS = {
  ...PALETTE,
  ...THEME_COLORS.light,
};