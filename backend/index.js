const dotenv = require("dotenv");
dotenv.config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const app = express();

require("./utils/cleanPastReservations");
require("./utils/mqttClient");
require("./utils/redisClient");


// Routers
const authRouter = require('./routes/authRoute');
const userRouter = require('./routes/userRoute');
const slotRouter = require('./routes/slotRoute');
const paymentRouter = require('./routes/paymentRoute');
const bookingRouter = require('./routes/bookingRoute');
const paymentSaveRouter = require('./routes/paymentSaveRoute');
const transactionRouter = require('./routes/transactionRoute');
const openGateRouter = require('./routes/gateOpenRoute');
const esp32Check = require('./routes/esp32Route');

const port = process.env.PORT || 3000;

// MongoDB connection
mongoose.connect(process.env.MONGO_URL)
    .then(() => console.log("DB Connected"))
    .catch((err) => console.error("MongoDB error:", err));

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// API routes
app.use('/api/user', authRouter);
app.use('/api/useroperations', userRouter);
app.use('/api/slotoperations', slotRouter);
app.use('/api/makePayment', paymentRouter);
app.use('/api/booking', bookingRouter);
app.use('/api/payment', paymentSaveRouter);
app.use('/api/transaction', transactionRouter);
app.use('/api/gate', openGateRouter);
app.use('/api/esp32', esp32Check);

app.listen(port, () => console.log(`Server running on port ${port}`));