const axios = require('axios');
const { MI_PAQUETE_URL } = require('../config/envs');

const miPaqueteInstance = axios.create({
  baseURL: MI_PAQUETE_URL,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'session-tracker': 'a0c96ea6-b22d-4fb7-a278-850678d5429c',
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NTZmOTE1NDY1ZjkzNGY3YjYxMGUzYzEiLCJuYW1lIjoiSnVsaWFuIiwic3VybmFtZSI6Ik1leGljbyIsImVtYWlsIjoianVsaW1leGljb0B5b3BtYWlsLmNvbSIsImNlbGxQaG9uZSI6IjMwMDc3ODI4NzciLCJjcmVhdGVkQXQiOiIyMDIzLTEyLTA1VDIxOjA4OjM2LjExNFoiLCJkYXRlIjoiMjAyMy0xMi0wNiAxMTozNTozOSIsImlhdCI6MTcwMTg4MDUzOX0.w2jw43sJaU4kH1z54J2JWV-wgcAwgACUyQtSdVknCxU'
  }
});

module.exports = miPaqueteInstance;