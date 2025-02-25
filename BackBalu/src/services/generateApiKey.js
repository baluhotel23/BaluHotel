const axios = require('axios');
require('dotenv').config();

const generateApiKey = async (email, password) => {
  try {
    const config = {
      method: 'post',
      url: `${process.env.MI_PAQUETE_URL}/generateapikey`,
      headers: {
        'Content-Type': 'application/json',
        'session-tracker': process.env.MI_PAQUETE_SESSION_TRACKER
      },
      data: {
        email,
        password
      }
    };

    const { data } = await axios(config);
    
    // Save new API key to .env file
    if (data?.token) {
      require('fs').writeFileSync(
        '.env',
        require('fs')
          .readFileSync('.env', 'utf8')
          .replace(
            /MI_PAQUETE_API_KEY=.*/,
            `MI_PAQUETE_API_KEY=${data.token}`
          )
      );
    }

    return data;

  } catch (error) {
    console.error('Generate API Key Error:', {
      status: error.response?.status,
      message: error.response?.data
    });
    throw error;
  }
};

module.exports = generateApiKey;