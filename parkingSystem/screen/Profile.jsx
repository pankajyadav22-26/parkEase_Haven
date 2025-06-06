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
import React, { useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  AntDesign,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { COLORS, SIZES, backendUrl } from "../constants";
import { AuthContext } from "../contexts/AuthContext";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const Profile = ({ navigation }) => {
  const { user, logout, loading } = React.useContext(AuthContext);

  const clearCache = () => {
    Alert.alert("Clear Cache", "Are you sure you want to clear the cache", [
      { text: "Cancel" },
      {
        text: "Continue",
        onPress: () => console.log("Cache cleared (not implemented yet)"),
      },
    ]);
  };

  const deleteAccount = async () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account?",
      [
        { text: "Cancel" },
        {
          text: "Continue",
          onPress: async () => {
            try {
              const id = await AsyncStorage.getItem("id");
              const userId = JSON.parse(id);
              const response = await axios.delete(
                `${backendUrl}/api/useroperations/delete/${userId}`
              );

              if (response.status === 200) {
                await AsyncStorage.multiRemove([`user${userId}`, "id"]);
                logout();
              }
            } catch (error) {
              console.error("Error deleting account:", error);
              Alert.alert(
                "Error",
                "There was an issue deleting your account. Please try again later."
              );
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ width: "100%" }}>
        <Image
          source={require("../assets/images/space.jpg")}
          style={styles.cover}
        />
      </View>
      <View style={styles.profileContainer}>
        <Image
          source={require("../assets/images/profile.jpeg")}
          style={styles.profile}
        />
        <Text style={styles.name}>
          {user ? user.username : "Please login into your account"}
        </Text>

        {user ? (
          <View style={styles.loginBtn}>
            <Text style={styles.menuTxt}>{user.email}</Text>
          </View>
        ) : (
          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <View style={styles.loginBtn}>
              <Text style={styles.menuTxt}>Log In</Text>
            </View>
          </TouchableOpacity>
        )}

        <ScrollView>
          {user && (
            <View style={styles.menuWrapper}>
              <TouchableOpacity onPress={() => navigation.navigate("reserve")}>
                <View style={styles.menuItem(0.2)}>
                  <MaterialCommunityIcons
                    name="parking"
                    size={24}
                    color={COLORS.primary}
                  />
                  <Text style={styles.menuTxt}>Your Reservations</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => navigation.navigate("transactions")}>
                <View style={styles.menuItem(0.2)}>
                  <MaterialCommunityIcons
                    name="bank-transfer"
                    size={24}
                    color={COLORS.primary}
                  />
                  <Text style={styles.menuTxt}>Transactions</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity onPress={deleteAccount}>
                <View style={styles.menuItem(0.2)}>
                  <AntDesign
                    name="deleteuser"
                    size={24}
                    color={COLORS.primary}
                  />
                  <Text style={styles.menuTxt}>Delete Account</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  Alert.alert("Logout", "Are you sure you want to logout?", [
                    { text: "Cancel" },
                    { text: "Logout", onPress: logout },
                  ]);
                }}
              >
                <View style={styles.menuItem(0.2)}>
                  <AntDesign name="logout" size={24} color={COLORS.primary} />
                  <Text style={styles.menuTxt}>Log Out</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default Profile;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightWhite,
    marginTop : -36,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  cover: {
    height: 200,
    width: "100%",
    resizeMode: "cover",
  },
  profileContainer: {
    flex: 1,
    alignItems: "center",
    marginBottom: 25,
  },
  profile: {
    height: 155,
    width: 155,
    borderRadius: 999,
    borderColor: COLORS.primary,
    borderWidth: 2,
    resizeMode: "cover",
    marginTop: -90,
  },
  name: {
    fontFamily: "bold",
    color: COLORS.primary,
    marginVertical: 5,
  },
  loginBtn: {
    backgroundColor: COLORS.secondary,
    padding: 2,
    borderWidth: 0.4,
    borderColor: COLORS.primary,
    borderRadius: SIZES.xxLarge,
    marginBottom: 7,
  },
  menuTxt: {
    fontFamily: "regular",
    color: COLORS.gray,
    marginHorizontal: 20,
    fontWeight: "600",
    fontSize: 14,
    lineHeight: 26,
  },
  menuWrapper: {
    marginTop: SIZES.medium + 3,
    width: SIZES.width,
    backgroundColor: COLORS.lightWhite,
    borderRadius: 12,
  },
  menuItem: (borderBottomWidth) => ({
    borderBottomWidth: borderBottomWidth,
    flexDirection: "row",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderColor: COLORS.gray,
  }),
});
