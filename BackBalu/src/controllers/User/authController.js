const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../../data');
const { generateToken } = require('../../middleware/isAuth');



const register = async (req, res) => {
  try {
    const { email, password, ...userData } = req.body;

    // Verificar si el correo ya existe
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: true, message: 'El correo ya está registrado' });
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario
    const newUser = await User.create({
      ...userData,
      email,
      password: hashedPassword
    });

    // Generar token JWT
    const token = generateToken(newUser);

    res.status(201).json({
      error: false,
      message: 'Usuario registrado exitosamente',
      data: { token, user: newUser }
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: true, message: 'Error en el servidor' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Verificar si el usuario existe
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: true, message: 'Credenciales inválidas' });
    }

    // Verificar la contraseña
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: true, message: 'Credenciales inválidas' });
    }

    // Generar token JWT
    const token = generateToken(user);

    res.json({
      error: false,
      message: 'Login exitoso',
      data: { token, user }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: true, message: 'Error en el servidor' });
  }
};



module.exports = {
  register,
  login,
  
};