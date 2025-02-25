const bcrypt = require('bcrypt');
const { User } = require('../../data');
const response = require('../../utils/response');

exports.resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    const user = await User.findOne({
      where: {
        passwordResetToken: { [Op.ne]: null },
        passwordResetExpires: { [Op.gt]: Date.now() },
      },
    });

    if (!user) {
      return response(res, 400, "Token no válido o ha expirado");
    }

    const isTokenValid = await bcrypt.compare(token, user.passwordResetToken);

    if (!isTokenValid) {
      return response(res, 400, "Token no válido o ha expirado");
    }

    user.password = await bcrypt.hash(password, 10);
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    response(res, 200, "Contraseña restablecida con éxito");
  } catch (error) {
    console.error(error);
    response(res, 500, "Error al restablecer la contraseña");
  }
};