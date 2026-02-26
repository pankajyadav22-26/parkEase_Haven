const mqtt = require('mqtt');
const { client: redisClient, setAsync } = require('./redisClient'); 

const options = {
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
  protocol: 'mqtts',
};

const client = mqtt.connect(`mqtts://${process.env.MQTT_HOST}:${process.env.MQTT_PORT}`, options);

client.on('connect', () => {
  console.log('Connected to HiveMQ MQTT Broker');
  
  client.subscribe(['/esp32/status/+', '/esp32/gate/ack/+'], (err) => {
    if (err) {
      console.error('Failed to subscribe:', err);
    } else {
      console.log('Subscribed to /esp32/status/+ and /esp32/gate/ack/+');
    }
  });
});

client.on('message', async (topic, message) => {
  const payload = message.toString();

  if (topic.startsWith('/esp32/status/')) {
    const parts = topic.split('/'); 
    const lotPrefix = parts[3]; 

    const statusKey = `esp32_status_${lotPrefix}`;
    
    try {
        if (setAsync) {
            await setAsync(statusKey, payload, 'EX', 10);
        } else {
            await redisClient.setEx(statusKey, 10, payload);
        }
    } catch (err) {
        console.error("Redis set error:", err);
    }
    return;
  }

  if (topic.startsWith('/esp32/gate/ack/')) {
    const reservationId = topic.split('/').pop();
    try {
      await redisClient.publish(reservationId, payload);
    } catch (e) {
      console.error('Failed to publish ack to Redis:', e);
    }
  }
});

client.on('error', (err) => {
  console.error('MQTT connection error:', err);
});

module.exports = {
  client
};