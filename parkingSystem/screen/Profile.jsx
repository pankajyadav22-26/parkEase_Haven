import React, { useContext } from "react";
import {
  Text,
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS, SHADOWS, SPACING } from "../constants/theme";
import { backendUrl } from "../constants";
import { AuthContext } from "../contexts/AuthContext";

const ListItem = ({ icon, title, onPress, danger, isLast }) => (
  <>
    <TouchableOpacity
      style={styles.listRow}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      activeOpacity={0.7}
    >
      <View style={[styles.listIconBox, danger && styles.dangerIconBox]}>
        <Ionicons
          name={icon}
          size={20}
          color={danger ? COLORS.error : COLORS.gray700}
        />
      </View>
      <Text style={[styles.listTitle, danger && styles.dangerText]}>
        {title}
      </Text>
      <Ionicons name="chevron-forward" size={18} color={COLORS.gray300} />
    </TouchableOpacity>
    {!isLast && <View style={styles.listDivider} />}
  </>
);

const Profile = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, logout, loading } = useContext(AuthContext);

  const deleteAccount = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "Delete Account",
      "This action is permanent and cannot be undone. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: async () => {
            try {
              const id = await AsyncStorage.getItem("id");
              const userId = JSON.parse(id);
              if (userId) {
                await axios.delete(
                  `${backendUrl}/api/useroperations/delete/${userId}`,
                );
                await AsyncStorage.multiRemove([`user${userId}`, "id"]);
                logout();
              }
            } catch (error) {
              Alert.alert("Error", "Could not delete account.");
            }
          },
        },
      ],
    );
  };

  const confirmLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log Out", style: "destructive", onPress: logout },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      <View style={[styles.header, { paddingTop: insets.top + SPACING.m }]}>
        <Text style={styles.headerTitle}>Account</Text>
        <TouchableOpacity
          onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
        >
          <Ionicons name="settings-outline" size={24} color={COLORS.gray900} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {user ? (
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.vipCard}
          >
            <View style={styles.vipHeader}>
              <View>
                <Text style={styles.vipGreeting}>Welcome back,</Text>
                <Text style={styles.vipName}>{user?.username || "Driver"}</Text>
              </View>
              <View style={styles.avatarWrapper}>
                <Image
                  source={require("../assets/images/profile.jpeg")}
                  style={styles.avatar}
                />
              </View>
            </View>
            <View style={styles.vipFooter}>
              <Text style={styles.vipEmail}>{user?.email}</Text>
              <TouchableOpacity style={styles.editBtn} activeOpacity={0.8}>
                <Text style={styles.editBtnText}>Edit Profile</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        ) : (
          <View style={styles.guestCard}>
            <View style={styles.guestIconBox}>
              <MaterialCommunityIcons
                name="steering"
                size={40}
                color={COLORS.primary}
              />
            </View>
            <Text style={styles.guestTitle}>Your Parking Hub</Text>
            <Text style={styles.guestSub}>
              Log in to manage your vehicles, reservations, and wallet.
            </Text>
            <TouchableOpacity
              style={styles.loginBtn}
              activeOpacity={0.8}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                navigation.navigate("Login");
              }}
            >
              <Text style={styles.loginBtnText}>Log In or Sign Up</Text>
            </TouchableOpacity>
          </View>
        )}

        {user && (
          <>
            <View style={styles.actionGrid}>
              <TouchableOpacity
                style={styles.actionSquare}
                activeOpacity={0.7}
                onPress={() => {
                  Haptics.selectionAsync();
                  navigation.navigate("reserve");
                }}
              >
                <View
                  style={[styles.actionIconBg, { backgroundColor: "#E3F2FD" }]}
                >
                  <Ionicons name="ticket" size={24} color="#1976D2" />
                </View>
                <Text style={styles.actionLabel}>My Spots</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionSquare}
                activeOpacity={0.7}
                onPress={() => {
                  Haptics.selectionAsync();
                  navigation.navigate("transactions");
                }}
              >
                <View
                  style={[styles.actionIconBg, { backgroundColor: "#E8F5E9" }]}
                >
                  <Ionicons name="wallet" size={24} color="#388E3C" />
                </View>
                <Text style={styles.actionLabel}>Wallet</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionSquare}
                activeOpacity={0.7}
                onPress={() => Haptics.selectionAsync()}
              >
                <View
                  style={[styles.actionIconBg, { backgroundColor: "#FFF3E0" }]}
                >
                  <Ionicons name="car" size={24} color="#F57C00" />
                </View>
                <Text style={styles.actionLabel}>Vehicles</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionHeader}>General</Text>
            <View style={styles.listContainer}>
              <ListItem
                icon="notifications-outline"
                title="Notifications"
                onPress={() => {}}
              />
              <ListItem
                icon="shield-checkmark-outline"
                title="Privacy & Security"
                onPress={() => {}}
              />
              <ListItem
                icon="help-buoy-outline"
                title="Help & Support"
                onPress={() => {}}
                isLast
              />
            </View>

            <Text style={[styles.sectionHeader, { marginTop: SPACING.l }]}>
              Account
            </Text>
            <View style={[styles.listContainer, { marginBottom: 40 }]}>
              <ListItem
                icon="log-out-outline"
                title="Log Out"
                onPress={confirmLogout}
              />
              <ListItem
                icon="trash-outline"
                title="Delete Account"
                danger
                onPress={deleteAccount}
                isLast
              />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: "#F9FAFB",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: COLORS.gray900,
    letterSpacing: -0.5,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  vipCard: {
    borderRadius: 24,
    padding: 24,
    marginTop: 10,
    marginBottom: 24,
    ...SHADOWS.medium,
  },
  vipHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  vipGreeting: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "600",
  },
  vipName: {
    fontSize: 26,
    fontWeight: "900",
    color: COLORS.white,
    marginTop: 2,
    letterSpacing: -0.5,
  },
  avatarWrapper: {
    position: "relative",
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  vipFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  vipEmail: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
  },
  editBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "700",
  },
  guestCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 30,
    alignItems: "center",
    marginTop: 20,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    ...SHADOWS.light,
  },
  guestIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  guestTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.gray900,
    marginBottom: 8,
  },
  guestSub: {
    fontSize: 14,
    color: COLORS.gray500,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  loginBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    width: "100%",
    alignItems: "center",
    ...SHADOWS.medium,
  },
  loginBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "800",
  },
  actionGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 32,
    gap: 12,
  },
  actionSquare: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
    ...SHADOWS.light,
  },
  actionIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.gray800,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.gray900,
    marginBottom: 12,
    marginLeft: 8,
  },
  listContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
    overflow: "hidden",
    ...SHADOWS.light,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: COLORS.white,
  },
  listIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.gray100,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  dangerIconBox: {
    backgroundColor: "#FFEBEE",
  },
  listTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.gray800,
  },
  dangerText: {
    color: COLORS.error,
  },
  listDivider: {
    height: 1,
    backgroundColor: COLORS.gray100,
    marginLeft: 62,
  },
});

export default Profile;
