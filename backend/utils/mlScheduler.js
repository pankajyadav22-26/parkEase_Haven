const cron = require('node-cron');
const axios = require('axios');

const initScheduler = () => {
  cron.schedule('0 0 * * 0', async () => {
    console.log('Triggering remote ML retraining...');

    try {
      const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:5001';
      
      const response = await axios.post(`${mlServiceUrl}/retrain`);
      
      console.log('ML Retrain Success:', response.data);
    } catch (error) {
      console.error('ML Retrain Failed:', error.message);
    }
  });

  console.log("ML Retraining Scheduler Initialized");
};

module.exports = initScheduler;