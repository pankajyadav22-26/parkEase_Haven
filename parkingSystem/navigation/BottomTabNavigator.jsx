import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { Home, Profile, Reservation } from "../screen/index";

const Tab = createBottomTabNavigator();

const screenOptions = {
  tabBarShowLabel: false,
  tabBarHideOnKeyboard: true,
  headerShown: false,
  gestureEnabled: true,
  animationEnabled: true,
  tabBarStyle: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 34,
    backgroundColor: '#fff',
    elevation: 10,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    overflow: 'hidden',
  },
};

const BottomTabNavigation = () => {
  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen
        name="Home"
        component={Home}
        options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={25}
            color={focused ? "red" : "goldenrod"}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Reservation"
        component={Reservation}
        options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? "car-sport" : "car-sport-outline"}
              size={25}
              color={focused ? "red" : "green"}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={Profile}
        options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={25}
              color={focused ? "red" : "blue"}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default BottomTabNavigation;