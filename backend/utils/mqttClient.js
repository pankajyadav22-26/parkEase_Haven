const mqtt = require('mqtt');
const redisClient = require('./redisClient');

const options = {
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
  protocol: 'mqtts',
};

const client = mqtt.connect(`mqtts://${process.env.MQTT_HOST}:${process.env.MQTT_PORT}`, options);

const esp32LastSeenMap = {};

client.on('connect', () => {
  console.log('Connected to HiveMQ MQTT Broker');
  client.subscribe(['/esp32/status/+', '/esp32/gate/ack/#'], (err) => {
    if (err) {
      console.error('Failed to subscribe:', err);
    } else {
      console.log('Subscribed to /esp32/status/+ and /esp32/gate/ack/#');
    }
  });
});

client.on('message', async (topic, message) => {
  const msg = message.toString();
  if (topic.startsWith('/esp32/status/')) {
    const lotPrefix = topic.split('/').pop();
    
    if (msg === 'online') {
      esp32LastSeenMap[lotPrefix] = new Date();
    }
    return;
  }

  if (topic.startsWith('/esp32/gate/ack/')) {
    const reservationId = topic.split('/').pop();
    try {
      await redisClient.publish(reservationId, msg);
    } catch (e) {
      console.error('Failed to publish ack to Redis:', e);
    }
  }
});

client.on('error', (err) => {
  console.error('MQTT connection error:', err);
});

function isEsp32Online(prefix) {
  const lastSeen = esp32LastSeenMap[prefix];
  if (!lastSeen) return false;

  const now = new Date();
  const diff = now - lastSeen;
  return diff < 10000;
}

module.exports = {
  client,
  isEsp32Online
};