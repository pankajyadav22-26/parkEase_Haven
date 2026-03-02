import React, { createContext, useState, useEffect } from 'react';
import * as Location from 'expo-location';
import axios from 'axios';
import { backendUrl } from "../constants";

export const ParkingContext = createContext();

export const ParkingProvider = ({ children }) => {
    const [parkingLots, setParkingLots] = useState([]);
    const [selectedLot, setSelectedLot] = useState(null);
    const [userLocation, setUserLocation] = useState(null);
    const [loadingLots, setLoadingLots] = useState(true);

    const fetchUserLocation = async () => {
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                console.warn('Permission to access location was denied');
                setUserLocation({ latitude: 28.7041, longitude: 77.1025 }); 
                return;
            }

            let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            setUserLocation({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            });
        } catch (error) {
            console.error("Error fetching location:", error);
        }
    };

    const fetchParkingLots = async () => {
        setLoadingLots(true);
        try {
            const response = await axios.get(`${backendUrl}/api/parkinglot/fetchall`);
            
            if (response.data && response.data.success) {
                setParkingLots(response.data.lots);
            }
        } catch (error) {
            console.error("Error fetching parking lots:", error);
        } finally {
            setLoadingLots(false);
        }
    };

    useEffect(() => {
        fetchUserLocation();
        fetchParkingLots();
    }, []);

    return (
        <ParkingContext.Provider value={{
            parkingLots,
            selectedLot,
            setSelectedLot,
            userLocation,
            loadingLots,
            fetchParkingLots
        }}>
            {children}
        </ParkingContext.Provider>
    );
};