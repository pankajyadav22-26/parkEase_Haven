import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { backendUrl } from "../constants";

const Esp32Context = createContext();

export const useEsp32 = () => useContext(Esp32Context);

export const Esp32Provider = ({ children }) => {
    const [esp32Online, setEsp32Online] = useState(null);
    const [checking, setChecking] = useState(false);

    const checkESP32Status = async () => {
        setChecking(true);
        try {
            const res = await axios.get(`${backendUrl}/api/esp32/ping-esp32`);
            setEsp32Online(res.data.online);
        } catch (error) {
            console.error("ESP32 status check error:", error.message);
            setEsp32Online(false);
        } finally {
            setChecking(false);
        }
    };

    useEffect(() => {
        checkESP32Status();
    }, []);

    return (
        <Esp32Context.Provider
            value={{ esp32Online, checking, checkESP32Status }}
        >
            {children}
        </Esp32Context.Provider>
    );
};