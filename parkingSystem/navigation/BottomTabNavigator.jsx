import React from "react";
import { Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { Home, Profile, Reservation } from "../screen/index";
import { COLORS, SHADOWS } from "../constants/theme";

const Tab = createBottomTabNavigator();

const screenOptions = {
  tabBarShowLabel: false,
  tabBarHideOnKeyboard: true,
  headerShown: false,
  tabBarActiveTintColor: COLORS.primary,
  tabBarInactiveTintColor: COLORS.gray500,
  tabBarStyle: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 50 : 45,
    backgroundColor: '#ffffff',
    borderTopWidth: 0,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    paddingTop: 0,
  },
};

const BottomTabNavigation = () => {
  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen
        name="Home"
        component={Home}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={26}
              color={color}
            />
          ),
        }}
      />
      
      <Tab.Screen
        name="Reservation"
        component={Reservation}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? "car-sport" : "car-sport-outline"} 
              size={32}
              color={focused ? COLORS.primary : COLORS.gray400}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Profile"
        component={Profile}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={26}
              color={color}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default BottomTabNavigation;