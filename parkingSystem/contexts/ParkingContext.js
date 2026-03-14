import React, { createContext, useState, useEffect, useCallback } from "react";
import axios from "axios";
import { backendUrl } from "../constants";
import * as Location from "expo-location";

export const ParkingContext = createContext();

export const ParkingProvider = ({ children }) => {
    const [parkingLots, setParkingLots] = useState([]);
    const [selectedLot, setSelectedLot] = useState(null);
    const [userLocation, setUserLocation] = useState(null);
    const [isLoadingLots, setIsLoadingLots] = useState(true);

    const fetchParkingLots = useCallback(async () => {
        try {
            const response = await axios.get(`${backendUrl}/api/parkinglot/fetchall`);
            
            const fetchedLots = response.data.lots || []; 
            
            setParkingLots(fetchedLots);

            setSelectedLot(currentSelected => {
                if (!currentSelected) return null;
                const updatedVersion = fetchedLots.find(lot => lot._id === currentSelected._id);
                return updatedVersion || currentSelected;
            });

        } catch (error) {
            console.error("Failed to fetch parking lots:", error);
        } finally {
            setIsLoadingLots(false);
        }
    }, []);

    useEffect(() => {

        fetchParkingLots();

        const intervalId = setInterval(() => {
            fetchParkingLots();
        }, 30000);

        return () => clearInterval(intervalId);
    }, [fetchParkingLots]);

    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") {
                console.log("Permission to access location was denied");
                return;
            }
            let location = await Location.getCurrentPositionAsync({});
            setUserLocation({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            });
        })();
    }, []);

    return (
        <ParkingContext.Provider
            value={{
                parkingLots,
                selectedLot,
                setSelectedLot,
                userLocation,
                isLoadingLots,
                fetchParkingLots,

            }}
        >
            {children}
        </ParkingContext.Provider>
    );
};