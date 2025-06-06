const cron = require("node-cron");
const Slot = require("../models/Slot");

cron.schedule("26 15 * * *", async () => {
  const now = new Date();
  console.log("🧹 Running daily reservation cleanup at", now.toISOString());

  try {
    const result = await Slot.updateMany(
      {},
      { $pull: { reservations: { endTime: { $lt: now } } } }
    );

    console.log(`Expired reservations cleaned. Modified slots: ${result.modifiedCount}`);
  } catch (err) {
    console.error("Reservation cleanup failed:", err);
  }
});