const Payment = require('../models/Payments');

const saveTransaction = async (req, res) => {
    const { userId, transactionId, status, timestamp, amount } = req.body;

    try {
        const payment = await Payment.create({
            userId,
            transactionId,
            amount,
            status,
            timestamp,
        });

        res.status(200).json({ message: "Transaction saved", payment });
    } catch (error) {
        console.error("Error saving payment:", error);
        res.status(500).json({ message: "Failed to save transaction" });
    }
};

module.exports = {
    saveTransaction,
};