const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { User } = require('../../data');
const response = require('../../utils/response');
const sendMail = require('../../utils/transporter');

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return response(res, 404, "Usuario no encontrado");
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(resetToken, 10);

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    const resetUrl = `${req.protocol}://${req.get('host')}/resetPassword/${resetToken}`;

    const message = `Recibió este correo electrónico porque usted (o alguien más) solicitó restablecer la contraseña. Haga clic en el siguiente enlace para restablecer su contraseña: \n\n ${resetUrl}`;

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: user.email,
      subject: 'Restablecimiento de contraseña',
      text: message,
    };

    await transporter.sendMail(mailOptions);

    response(res, 200, "Correo electrónico de restablecimiento de contraseña enviado");
  } catch (error) {
    console.error(error);
    response(res, 500, "Error al solicitar el restablecimiento de contraseña");
  }
};