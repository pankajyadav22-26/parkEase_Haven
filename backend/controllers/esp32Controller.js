const { isEsp32Online } = require("../utils/mqttClient");

module.exports = {
  esp32Check: async (req, res) => {
    const online = isEsp32Online();
    console.log("ESP32 MQTT Online Check:", online);
    res.json({ online });
  }
};