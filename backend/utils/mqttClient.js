const mqtt = require('mqtt');
const redisClient = require('./redisClient');  // singleton redis client instance

const options = {
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
  protocol: 'mqtts',
};

const client = mqtt.connect(`mqtts://${process.env.MQTT_HOST}:${process.env.MQTT_PORT}`, options);

let esp32LastSeen = null;

client.on('connect', () => {
  console.log('Connected to HiveMQ MQTT Broker');
  client.subscribe(['/esp32/status', '/esp32/gate/ack/#'], (err) => {
    if (err) {
      console.error('Failed to subscribe:', err);
    } else {
      console.log('Subscribed to /esp32/status and /esp32/gate/ack/#');
    }
  });
});

client.on('message', async (topic, message) => {
  const msg = message.toString();

  if (topic === '/esp32/status') {
    if (msg === 'online') {
      esp32LastSeen = new Date();
      console.log(`ESP32 heartbeat received at ${esp32LastSeen.toISOString()}`);
    }
    return;
  }

  if (topic.startsWith('/esp32/gate/ack/')) {
    const reservationId = topic.split('/').pop();
    try {
      await redisClient.publish(reservationId, msg);
      console.log(`Published ack to Redis channel ${reservationId}: ${msg}`);
    } catch (e) {
      console.error('Failed to publish ack to Redis:', e);
    }
  }
});

client.on('error', (err) => {
  console.error('MQTT connection error:', err);
});

function isEsp32Online() {
  if (!esp32LastSeen) return false;

  const now = new Date();
  const diff = now - esp32LastSeen;
  return diff < 10000;
}

module.exports = {
  client,
  isEsp32Online
};