const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../../data');
const { generateToken } = require('../../middleware/isAuth');
const { CustomError } = require('../../middleware/error');



const register = async (req, res, next) => {
  try {
    const { email, password, role = 'Customer', ...userData } = req.body;

    // Verificar si el correo ya existe
    const existingUser = await User.findOne({ 
      where: { 
        email,
        deletedAt: null 
      } 
    });

    if (existingUser) {
      throw new CustomError('El correo ya está registrado', 400);
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario
    const newUser = await User.create({
      ...userData,
      email,
      password: hashedPassword,
      role,
      isActive: true,
      lastLogin: new Date()
    });

    // Generar token JWT
    const token = generateToken(newUser);

    // Usar el método toJSON definido en el modelo
    const userResponse = newUser.toJSON();

    res.status(201).json({
      error: false,
      message: 'Usuario registrado exitosamente',
      data: { token, user: userResponse }
    });

  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ 
    where: { 
        email,
        isActive: true,
        deletedAt: null
      } 
    });

    if (!user) {
      throw new CustomError('Credenciales inválidas', 400);
    }

    // Verificar la contraseña
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      throw new CustomError('Credenciales inválidas', 400);
    }

    // Actualizar último login
    await user.update({ lastLogin: new Date() });

    // Generar token JWT
    const token = generateToken(user);

    // Usar el método toJSON definido en el modelo
    const userResponse = user.toJSON();

    res.json({
      error: false,
      message: 'Login exitoso',
      data: { token, user: userResponse }
    });

  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    const { n_document } = req.user; // Cambiar id por n_document
    await User.update(
      { lastLogout: new Date() },
      { where: { n_document } } // Usar n_document en la condición where
    );

    res.json({
      error: false,
      message: 'Sesión cerrada exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { id, role } = req.user;
    
    // Si el rol es Customer, se impide el cambio mediante este endpoint
    if (role === 'Customer') {
      throw new CustomError('Los clientes no pueden cambiar la contraseña desde esta sección. Utilice el proceso de recuperación de contraseña.', 403);
    }
    
    const user = await User.findByPk(id);
    
    // Verificar contraseña actual
    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      throw new CustomError('Contraseña actual incorrecta', 400);
    }
    
    // Hash y actualizar nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await user.update({ password: hashedPassword });
    
    res.json({
      error: false,
      message: 'Contraseña actualizada exitosamente'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  logout,
  changePassword
};