const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifyToken = (req, res, next) => {
  try {
    const authorization = req.headers.authorization;

    if (!authorization) {
      return res.status(401).json({ 
        error: true, 
        message: 'Token no proporcionado' 
      });
    }

    const token = authorization.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    
    req.user = decoded;
    next();
    
  } catch (error) {
    console.error('Error de autenticación:', error);
    return res.status(401).json({ 
      error: true, 
      message: 'Token inválido o expirado'
    });
  }
};

const generateToken = (userData) => {
  return jwt.sign(
    {
      n_document: userData.n_document, // Usar el PK n_document
      role: userData.role,
      email: userData.email
    },
    process.env.JWT_SECRET_KEY,
    { expiresIn: '24h' }
  );
};

module.exports = { verifyToken, generateToken };


