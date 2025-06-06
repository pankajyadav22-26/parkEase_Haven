const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.createPaymentIntent = async (req, res) => {
  const { amount, currency = "inr" } = req.body;

  if (!amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ message: "Invalid amount" });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      payment_method_types: ['card'],
    });

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      transactionId: paymentIntent.id
    });
  } catch (error) {
    console.error("Stripe Error:", error);
    res.status(500).json({ message: "Payment initialization failed" });
  }
};