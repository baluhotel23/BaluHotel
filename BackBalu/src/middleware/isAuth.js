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
    
    // ⭐ MANEJAR ESPECÍFICAMENTE TOKEN EXPIRADO
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: true, 
        message: 'Token expirado',
        code: 'TOKEN_EXPIRED',
        expiredAt: error.expiredAt
      });
    }
    
    // ⭐ OTROS ERRORES DE TOKEN
    return res.status(401).json({ 
      error: true, 
      message: 'Token inválido o expirado',
      code: 'TOKEN_INVALID'
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
    { expiresIn: '2h' } // ⭐ Token de acceso: 2 horas
  );
};

// ⭐ NUEVO: Generar refresh token (duración más larga)
const generateRefreshToken = (userData) => {
  return jwt.sign(
    {
      n_document: userData.n_document,
      type: 'refresh' // Identificar como refresh token
    },
    process.env.JWT_REFRESH_SECRET_KEY || process.env.JWT_SECRET_KEY,
    { expiresIn: '30d' } // ⭐ Refresh token: 30 días
  );
};

// ⭐ NUEVO: Verificar refresh token
const verifyRefreshToken = (req, res, next) => {
  try {
    const authorization = req.headers.authorization;

    if (!authorization) {
      return res.status(401).json({ 
        error: true, 
        message: 'Refresh token no proporcionado' 
      });
    }

    const refreshToken = authorization.split(' ')[1];
    const decoded = jwt.verify(
      refreshToken, 
      process.env.JWT_REFRESH_SECRET_KEY || process.env.JWT_SECRET_KEY
    );
    
    // Verificar que sea un refresh token
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ 
        error: true, 
        message: 'Token inválido' 
      });
    }

    req.user = decoded;
    next();
    
  } catch (error) {
    console.error('Error verificando refresh token:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: true, 
        message: 'Refresh token expirado',
        code: 'REFRESH_TOKEN_EXPIRED'
      });
    }
    
    return res.status(401).json({ 
      error: true, 
      message: 'Refresh token inválido',
      code: 'REFRESH_TOKEN_INVALID'
    });
  }
};

module.exports = { verifyToken, generateToken, generateRefreshToken, verifyRefreshToken };


