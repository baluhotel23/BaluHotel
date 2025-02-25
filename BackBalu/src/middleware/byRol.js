const isOwner = (req, res, next) => {
    if (req.user.role !== 'Owner') {
      return res.status(403).json({
        error: true,
        message: 'Acceso permitido solo para administradores'
      });
    }
    next();
  };
  
  const isAdmin = (req, res, next) => {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({
        error: true,
        message: 'Acceso permitido solo para cajeros'
      });
    }
    next();
  };
  
  const isRecept = (req, res, next) => {
    if (req.user.role !== 'Recept') {
      return res.status(403).json({
        error: true,
        message: 'Acceso permitido solo para distribuidores'
      });
    }
    next();
  };
  
  module.exports = {
    isOwner,
    isAdmin,
    isRecept
  };