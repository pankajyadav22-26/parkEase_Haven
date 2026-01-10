# ParkEase Haven 🚗✨

> **"A Smart Valley of Hassle-Free Parking"**

ParkEase Haven is a comprehensive smart parking solution that integrates a mobile application, a robust backend, IoT device management, and machine learning for dynamic pricing. It allows users to view real-time parking availability, book slots, and pay seamlessly, while automating physical gate controls and optimizing pricing based on demand.

## 📋 Table of Contents
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [System Architecture](#-system-architecture)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [1. Backend Setup](#1-backend-setup)
  - [2. ML Service Setup](#2-ml-service-setup)
  - [3. Mobile App Setup](#3-mobile-app-setup)
- [Environment Variables](#-environment-variables)
- [API Overview](#-api-overview)

## ✨ Features

### 📱 Mobile Application (User)
* **Real-Time Availability**: View live status of parking slots (Available, Reserved, Occupied) with visual indicators.
* **Secure Authentication**: User Sign Up/Login and Profile management.
* **Reservations**: Book parking spots in advance.
* **Payments**: Integrated **Stripe** payment gateway for secure transactions.
* **Navigation**: Map integration to locate the parking lot.

### 🛠 Backend & IoT
* **Slot Management**: CRUD operations for parking slots and status updates.
* **IoT Integration**: Real-time communication with **ESP32** devices via **MQTT** (HiveMQ) for gate control and sensor data.
* **Caching**: Uses **Redis** for fast data retrieval and pub/sub messaging.
* **Automated Scheduling**: Cron jobs for cleaning past reservations and scheduling ML tasks.

### 🧠 Machine Learning Service
* **Dynamic Pricing**: A Python/Flask service that predicts parking prices based on hour, day, weekend status, and occupancy rate.
* **Automated Retraining**: Pipeline to retrain the Random Forest model using combined synthetic and real booking data.

## 💻 Tech Stack

| Component | Technologies |
| :--- | :--- |
| **Frontend** | React Native, Expo, Expo Router, Axios, Stripe SDK |
| **Backend** | Node.js, Express.js, Mongoose, JWT, Node-Cron |
| **Database** | MongoDB (Primary DB), Redis (Caching/PubSub) |
| **IoT & Messaging** | MQTT (HiveMQ), WebSocket |
| **ML Service** | Python, Flask, Scikit-Learn, Pandas, Joblib |

## 🏗 System Architecture

1.  **Mobile App** communicates with the **Node.js Backend** via REST APIs.
2.  **Backend** connects to **MongoDB** for persistent storage (users, bookings, slots).
3.  **Backend** publishes/subscribes to **MQTT Topics** to talk to **ESP32** controllers (Gate Open/Close).
4.  **ML Service** is a separate microservice that the Backend queries to calculate dynamic prices before booking.
5.  **Redis** is used for caching active states and handling high-frequency IoT messages.

## 🚀 Getting Started

### Prerequisites
* Node.js & npm
* Python 3.8+
* MongoDB (Local or Atlas)
* Redis server
* MQTT Broker credentials (e.g., HiveMQ)

### 1. Backend Setup
Navigate to the `backend` folder and install dependencies.

```bash
cd backend
npm install
```

Start the server:

```bash
npm start
```
> The backend runs on port **3000** by default.

### 2. ML Service Setup
Navigate to the `ml_service` folder.

```bash
cd ml_service
pip install -r requirements.txt
```

Run the Flask app:

```bash
python app.py
```
> The ML service runs on port **5001**.

### 3. Mobile App Setup
Navigate to the `parkingSystem` folder.

```bash
cd parkingSystem
npm install
```

Start the Expo development server:

```bash
npx expo start
```
> Use the **Expo Go** app on your phone or an emulator to run the app.

## 🔐 Environment Variables

You need to configure `.env` files for both the Backend and ML Service.

**Backend** (`backend/.env`)

```env
PORT=3000
MONGO_URL=your_mongodb_connection_string
MQTT_HOST=your_mqtt_host
MQTT_PORT=8883
MQTT_USERNAME=your_username
MQTT_PASSWORD=your_password
REDIS_URL=your_redis_url
STRIPE_SECRET_KEY=your_stripe_key
```

**ML Service** (`ml_service/.env`)

```env
mongo_url=your_mongodb_connection_string
PORT=5001
```

## 📡 API Overview

### Backend Routes
* `POST /api/user/register` - Register a new user
* `POST /api/user/login` - User login
* `GET /api/slotoperations/fetchSlot` - Get all parking slots
* `POST /api/booking/calculate-price` - Get dynamic price from ML service
* `POST /api/makePayment` - Initiate Stripe payment
* `POST /api/gate/open` - Trigger ESP32 to open gate

### ML Service Routes
* `POST /predict_price` - Predicts parking price based on features.
    * *Payload:* `{ "hour": 14, "day_of_week": 2, "is_weekend": 0, "occupancy": 0.5 }`
* `POST /retrain` - Triggers the model retraining pipeline.