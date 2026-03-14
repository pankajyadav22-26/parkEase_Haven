import React, { createContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Platform } from "react-native";
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { backendUrl } from "../constants";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  const registerForPushNotificationsAsync = async () => {
    let token;

    if (Constants.appOwnership === 'expo') {
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

    } else {
      console.log('Must use physical device for Push Notifications');
    }

    return token;
  };

  const checkLoginStatus = async () => {
    try {
      const storedUser = await AsyncStorage.getItem("userInfo");
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsLoggedIn(true);

        const token = await registerForPushNotificationsAsync();
        if (token && parsedUser._id) {
          await axios.post(`${backendUrl}/api/useroperations/save-push-token`, {
            userId: parsedUser._id,
            token: token
          });
        }

      }
    } catch (error) {
      console.error("Failed to check login status", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const login = async (userData) => {
    try {
      await AsyncStorage.setItem("userInfo", JSON.stringify(userData));
      setUser(userData);
      setIsLoggedIn(true);

      const token = await registerForPushNotificationsAsync();
      if (token && userData._id) {
        await axios.post(`${backendUrl}/api/useroperations/save-push-token`, {
          userId: userData._id,
          token: token
        });
      }

    } catch (error) {
      console.error("Error storing user data", error);
    }
  };

  const logout = async () => {
    try {

      await AsyncStorage.removeItem("userInfo");
      setUser(null);
      setIsLoggedIn(false);
    } catch (error) {
      console.error("Error removing user data", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoggedIn, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};