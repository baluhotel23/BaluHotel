const fs = require('fs');
const path = require('path');

const logApiCommunication = async (config, response, error) => {
  const debugInfo = {
    timestamp: new Date().toISOString(),
    request: {
      url: config.url,
      method: config.method,
      headers: {
        ...config.headers,
        apikey: 'HIDDEN',
      },
      data: config.data
    },
    response: error ? {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    } : {
      status: response.status,
      data: response.data
    }
  };

  const logPath = path.join(__dirname, '../logs/mipaquete_api.log');
  await fs.promises.appendFile(
    logPath, 
    JSON.stringify(debugInfo, null, 2) + '\n---\n'
  );
};

module.exports = { logApiCommunication };