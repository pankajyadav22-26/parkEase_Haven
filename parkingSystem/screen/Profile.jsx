import {
  Text,
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import React, { useContext } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

import { COLORS, SHADOWS, SIZES } from "../constants/theme";
import { backendUrl } from "../constants";
import { AuthContext } from "../contexts/AuthContext";

const ProfileItem = ({ icon, title, subtitle, onPress, danger }) => (
  <TouchableOpacity 
    style={styles.itemContainer} 
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={[styles.iconBox, danger && styles.dangerIconBox]}>
      <MaterialCommunityIcons 
        name={icon} 
        size={24} 
        color={danger ? COLORS.error : COLORS.primary} 
      />
    </View>
    <View style={styles.itemContent}>
      <Text style={[styles.itemTitle, danger && styles.dangerText]}>{title}</Text>
      {subtitle && <Text style={styles.itemSubtitle}>{subtitle}</Text>}
    </View>
    <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.gray400} />
  </TouchableOpacity>
);

const Profile = ({ navigation }) => {
  const { user, logout, loading } = useContext(AuthContext);

  const deleteAccount = async () => {
    Alert.alert(
      "Delete Account",
      "This action cannot be undone. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const id = await AsyncStorage.getItem("id");
              const userId = JSON.parse(id);
              if (userId) {
                await axios.delete(`${backendUrl}/api/useroperations/delete/${userId}`);
                await AsyncStorage.multiRemove([`user${userId}`, "id"]);
                logout();
              }
            } catch (error) {
              console.error("Error deleting account:", error);
              Alert.alert("Error", "Could not delete account.");
            }
          },
        },
      ]
    );
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
       <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View>
          <View style={styles.profileSection}>
            <View style={styles.imageContainer}>
              <Image
                source={require("../assets/images/profile.jpeg")}
                style={styles.profileImage}
              />
              <View style={styles.editBadge}>
                 <MaterialCommunityIcons name="pencil" size={14} color={COLORS.white} />
              </View>
            </View>
            <Text style={styles.name}>
              {user?.username || "Guest User"}
            </Text>
            <Text style={styles.email}>
              {user?.email || "Sign in to view profile"}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!user ? (
           <View style={styles.section}>
             <ProfileItem 
                icon="login" 
                title="Log In / Sign Up" 
                subtitle="Access your reservations"
                onPress={() => navigation.navigate("Login")} 
             />
           </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>My Activity</Text>
            <View style={styles.section}>
              <ProfileItem 
                icon="ticket-confirmation-outline" 
                title="My Reservations" 
                subtitle="View upcoming and past spots"
                onPress={() => navigation.navigate("reserve")} 
              />
              <View style={styles.divider} />
              <ProfileItem 
                icon="wallet-outline" 
                title="Transactions" 
                subtitle="Payment history"
                onPress={() => navigation.navigate("transactions")} 
              />
            </View>

            <Text style={styles.sectionTitle}>Account Settings</Text>
            <View style={styles.section}>
              <ProfileItem 
                icon="bell-outline" 
                title="Notifications" 
                onPress={() => {}} 
              />
              <View style={styles.divider} />
              <ProfileItem 
                icon="shield-check-outline" 
                title="Privacy & Security" 
                onPress={() => {}} 
              />
            </View>

            <View style={styles.section}>
              <ProfileItem 
                icon="logout" 
                title="Log Out" 
                onPress={() => {
                  Alert.alert("Logout", "Are you sure?", [
                    { text: "Cancel" },
                    { text: "Logout", onPress: logout },
                  ]);
                }} 
              />
              <View style={styles.divider} />
              <ProfileItem 
                icon="delete-outline" 
                title="Delete Account" 
                danger
                onPress={deleteAccount} 
              />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

export default Profile;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray100,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    paddingBottom: SIZES.height * 0.05,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    ...SHADOWS.medium,
  },
  profileSection: {
    alignItems: "center",
    marginTop: 10,
    height: SIZES.height * 0.23,
  },
  imageContainer: {
    position: "relative",
    marginBottom: 15,
  },
  profileImage: {
    width: SIZES.width * 0.3,
    height: SIZES.width * 0.3,
    borderRadius: (SIZES.width * 0.3) / 2,
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.secondary,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  name: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.white,
    marginBottom: 5,
  },
  email: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: SIZES.height * 0.12,
    paddingTop: SIZES.height * 0.01,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.gray600,
    marginTop: 20,
    marginBottom: 10,
    marginLeft: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: "hidden",
    ...SHADOWS.light,
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  dangerIconBox: {
    backgroundColor: "#FFEBEE",
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },
  dangerText: {
    color: COLORS.error,
  },
  itemSubtitle: {
    fontSize: 12,
    color: COLORS.gray500,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.gray100,
    marginLeft: 70,
  },
});