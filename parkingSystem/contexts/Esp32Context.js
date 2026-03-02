import React, { createContext, useContext, useState } from "react";
import axios from "axios";
import { backendUrl } from "../constants";

const Esp32Context = createContext();

export const useEsp32 = () => useContext(Esp32Context);

export const Esp32Provider = ({ children }) => {
    const [esp32Statuses, setEsp32Statuses] = useState({});
    const [checking, setChecking] = useState(false);

    const checkESP32Status = async (parkingLotId) => {
        if (!parkingLotId) return false;

        setChecking(true);
        try {
            const res = await axios.get(`${backendUrl}/api/esp32/ping-esp32?parkingLotId=${parkingLotId}`);
            const isOnline = res.data.status === "online";

            setEsp32Statuses((prev) => ({
                ...prev,
                [parkingLotId]: isOnline
            }));

            return isOnline;
        } catch (error) {
            console.error(`ESP32 status check error for lot ${parkingLotId}:`, error.message);
            
            setEsp32Statuses((prev) => ({
                ...prev,
                [parkingLotId]: false
            }));
            return false;
        } finally {
            setChecking(false);
        }
    };

    return (
        <Esp32Context.Provider
            value={{ esp32Statuses, checking, checkESP32Status }}
        >
            {children}
        </Esp32Context.Provider>
    );
};