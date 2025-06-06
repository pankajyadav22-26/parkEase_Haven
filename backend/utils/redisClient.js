const { createClient } = require('redis');
console.log("in redis")

async function waitForAck(channel, timeoutSec = 15) {
  return new Promise(async (resolve, reject) => {
    const subscriber = createClient({
      socket: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT),
        tls: {}, 
      },
      password: process.env.REDIS_PASSWORD,
      username: 'default',
    });

    subscriber.on('error', (err) => {
      console.error('Redis Subscriber Error:', err);
    });

    await subscriber.connect();

    await new Promise((res) => {
      subscriber.subscribe(channel, (message) => {
        clearTimeout(timeoutHandle);
        subscriber.quit();
        resolve(message);
      }).then(() => {
        console.log(`[waitForAck] Subscribed to Redis channel: ${channel}`);
        res();
      });
    });

    const timeoutHandle = setTimeout(async () => {
      try {
        await subscriber.quit();
      } catch (e) {
        console.error('Error quitting Redis subscriber after timeout:', e);
      }
      reject(new Error('Timeout waiting for ack'));
    }, timeoutSec * 1000);
  });
}

module.exports = { waitForAck };