import React, { createContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const id = await AsyncStorage.getItem("id");
      if (id) {
        const userId = `user${JSON.parse(id)}`;
        const userData = await AsyncStorage.getItem(userId);
        if (userData) {
          setUser(JSON.parse(userData));
          setIsLoggedIn(true);
        }
      }
      setLoading(false);
    };
    loadUser();
  }, []);

  const login = async (userData) => {
    const id = userData._id;
    await AsyncStorage.setItem(`user${id}`, JSON.stringify(userData));
    await AsyncStorage.setItem("id", JSON.stringify(id));
    setUser(userData);
    setIsLoggedIn(true);
  };

  const logout = async () => {
    const id = await AsyncStorage.getItem("id");
    const useId = `user${JSON.parse(id)}`;
    await AsyncStorage.multiRemove([useId, "id"]);
    setUser(null);
    setIsLoggedIn(false);
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoggedIn, loading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};