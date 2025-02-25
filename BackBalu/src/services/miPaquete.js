const axios = require('axios');
const { MI_PAQUETE_URL, MI_PAQUETE_API_KEY } = process.env;

const SESSION_TRACKER = 'b0c6d2aa-4d53-11eb-ae93-0242ac130002';

const createWebhook = async () => {
  try {
    const response = await axios.post(
      `${MI_PAQUETE_URL}/createWebHook`,
      {
        urlForGuides: {
          urlClient: "urlClient6",
          enabled: true,
        },
        urlForStates: {
          urlClient: 'urlClient6',
          enabled: true,
        },
      },
      {
        headers: {
          'session-tracker': SESSION_TRACKER,
          'apikey': MI_PAQUETE_API_KEY,
        },
      }
    );
    console.log('Webhook created:', response.data);
  } catch (error) {
    console.error('Error creating webhook:', error);
  }
};

module.exports = {
  createWebhook,
};