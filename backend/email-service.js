// ════════════════════════════════════════════════════════════════════════
//  email-service.js
//  Servicio de envío de emails transaccionales vía Gmail SMTP.
//  Utilizado para enviar códigos de verificación al registrarse.
// ════════════════════════════════════════════════════════════════════════

require('dotenv').config();
const nodemailer = require('nodemailer');

// ── Transporter SMTP (Gmail) ──
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// ── Enviar código de verificación ──
async function sendVerificationCode(email, code, nombre) {
  const mailOptions = {
    from: `"InnovaTec" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Código de verificación — InnovaTec',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin:0;padding:0;background:#f4f5f7;font-family:'DM Sans',Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 20px;">
          <tr>
            <td align="center">
              <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

                <!-- Header -->
                <tr>
                  <td style="background:#1a1a2e;padding:28px 32px;text-align:center;">
                    <span style="font-family:'Playfair Display',Georgia,serif;font-size:22px;font-weight:700;color:#ffffff;">
                      Innova<em style="color:#4ecdc4;font-style:normal;">Tec</em>
                    </span>
                    <div style="color:#a0aec0;font-size:12px;margin-top:4px;">Cooperativa Escolar de Servicios Técnicos</div>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding:36px 32px;">
                    <p style="font-size:16px;color:#1a1a2e;margin:0 0 8px;">Hola <strong>${nombre}</strong>,</p>
                    <p style="font-size:15px;color:#555;margin:0 0 28px;">Tu código de verificación es:</p>

                    <!-- Código -->
                    <div style="text-align:center;margin:0 0 28px;">
                      <span style="display:inline-block;font-size:36px;font-weight:700;letter-spacing:10px;color:#1a1a2e;background:#f0f4f8;padding:16px 28px;border-radius:10px;font-family:'Courier New',monospace;">
                        ${code}
                      </span>
                    </div>

                    <p style="font-size:14px;color:#888;margin:0 0 8px;">Este código expira en <strong>10 minutos</strong>.</p>
                    <p style="font-size:14px;color:#888;margin:0;">Si no solicitaste esta verificación, podés ignorar este mensaje.</p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background:#f8f9fa;padding:20px 32px;text-align:center;border-top:1px solid #eee;">
                    <p style="font-size:12px;color:#aaa;margin:0;">
                      InnovaTec — Cooperativa Escolar de Servicios Técnicos<br>
                      Escuela Técnica de la Universidad de Mendoza
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
}

module.exports = { sendVerificationCode };
