const Payment = require('../models/Payments');

const getTransactionsByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const transactions = await Payment.find({ userId }).sort({ timestamp: -1 });

    if (!transactions.length) {
      return res.status(404).json({ message: 'No transactions found.' });
    }

    res.status(200).json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  getTransactionsByUser,
};