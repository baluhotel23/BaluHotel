const axios = require('axios');
const dotenv = require('dotenv');
const { Token } = require('../../data');

dotenv.config();

const TAXXA_API_URL = process.env.TAXXA_API_URL;
console.log('TAXXA_API_URL:', TAXXA_API_URL); // Verificar la URL de la API

const axiosInstance = axios.create({
  baseURL: TAXXA_API_URL,
  timeout: 10000, // 10 segundos de timeout
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para logging
axiosInstance.interceptors.request.use(request => {
  console.log('Request:', {
    url: request.url,
    method: request.method,
    data: request.data
  });
  return request;
});

async function generateToken() {
  try {
    console.log('Generating new token...');
    const payload = {
      jApi: {
        sMethod: 'classTAXXA.fjTokenGenerate',
        jParams: {
          sEmail: process.env.TAXXA_EMAIL,
          sPass: process.env.TAXXA_PASSWORD,
        },
      },
    };

    console.log('Token generation payload:', JSON.stringify(payload, null, 2));
    const response = await axiosInstance.post('', payload);
    console.log('Token generation response:', JSON.stringify(response.data, null, 2));

    if (response.data && response.data.rerror === 0) {
      const newToken = response.data.jret.stoken;
      console.log('New token generated successfully:', newToken);

      await Token.create({
        token: newToken,
        created_at: new Date()
      });

      return newToken;
    } else {
      console.error('Error en la respuesta de generación de token:', response.data);
      return null;
    }
  } catch (error) {
    console.error('Error generating token:', error);
    console.error('Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    return null;
  }
}

async function sendDocument(payload) {
  try {
    console.log('Preparing to send document...');
    console.log('Document payload:', JSON.stringify(payload, null, 2));

    if (!payload.stoken) {
      console.error('No token provided in payload');
      throw new Error('Token no proporcionado');
    }

    const response = await axiosInstance.post('', payload);
    console.log('Document submission response:', JSON.stringify(response.data, null, 2));

    if (response.data && typeof response.data === 'object') {
      if (response.data.rerror === 9) {
        console.log('Token expired, generating new token...');
        const newToken = await generateToken();
        if (newToken) {
          payload.stoken = newToken;
          return sendDocument(payload);
        }
        throw new Error('No se pudo generar un nuevo token');
      }

      if (response.data.rerror !== 0) {
        const error = new Error('Error en la respuesta de Taxxa');
        error.response = { 
          data: response.data,
          status: response.status
        };
        throw error;
      }

      console.log('Document sent successfully');
      return response.data;
    }

    throw new Error('Respuesta inválida de la API');
  } catch (error) {
    console.error('Error sending document:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    throw error;
  }
}

module.exports = {
  generateToken,
  sendDocument,
};