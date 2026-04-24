const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const sendOTPEmail = async (to, name, otp) => {
  const transporter = createTransporter();
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'AutoParts Pro <noreply@autoparts.com>',
    to,
    subject: 'Password Reset OTP - AutoParts Pro',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Inter, Arial, sans-serif; background: #0f0f0f; color: #fff; margin: 0; padding: 20px; }
          .container { max-width: 500px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e, #16213e); border-radius: 16px; padding: 40px; border: 1px solid rgba(37, 99, 235, 0.3); }
          .logo { text-align: center; font-size: 28px; font-weight: 900; color: #2563EB; letter-spacing: -1px; margin-bottom: 24px; }
          .logo span { color: #F59E0B; }
          h2 { color: #fff; text-align: center; font-size: 22px; margin-bottom: 8px; }
          p { color: #94a3b8; line-height: 1.6; }
          .otp-box { background: linear-gradient(135deg, #2563EB, #1d4ed8); border-radius: 12px; text-align: center; padding: 28px; margin: 24px 0; }
          .otp { font-size: 48px; font-weight: 900; letter-spacing: 12px; color: #fff; font-family: monospace; }
          .expiry { color: #94a3b8; font-size: 13px; text-align: center; margin-top: 8px; }
          .footer { text-align: center; color: #475569; font-size: 12px; margin-top: 24px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">Auto<span>Parts</span> Pro</div>
          <h2>Password Reset Request</h2>
          <p>Hello ${name}, we received a request to reset your password. Use the OTP below to reset your password:</p>
          <div class="otp-box">
            <div class="otp">${otp}</div>
          </div>
          <p class="expiry">⏰ This OTP is valid for <strong>10 minutes</strong> only.</p>
          <p>If you didn't request this, please ignore this email. Your password will remain unchanged.</p>
          <div class="footer">© 2024 AutoParts Pro. All rights reserved.</div>
        </div>
      </body>
      </html>
    `,
  };

  if (process.env.NODE_ENV === 'development') {
    console.log(`📧 OTP for ${to}: ${otp}`);
    return; // Skip actual sending in development
  }

  await transporter.sendMail(mailOptions);
};

const sendOrderConfirmationEmail = async (to, name, order) => {
  const transporter = createTransporter();
  const itemsHtml = order.items.map((item) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.1);">${item.name}</td>
      <td style="padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.1); text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.1); text-align: right;">Rs. ${(item.price * item.quantity).toLocaleString()}</td>
    </tr>
  `).join('');

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'AutoParts Pro <noreply@autoparts.com>',
    to,
    subject: `Order Confirmed #${order.orderNumber} - AutoParts Pro`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Inter, Arial, sans-serif; background: #0f0f0f; color: #fff; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e, #16213e); border-radius: 16px; padding: 40px; border: 1px solid rgba(37, 99, 235, 0.3); }
          .logo { text-align: center; font-size: 28px; font-weight: 900; color: #2563EB; letter-spacing: -1px; margin-bottom: 24px; }
          .logo span { color: #F59E0B; }
          .badge { background: linear-gradient(135deg, #059669, #047857); color: white; padding: 8px 20px; border-radius: 20px; display: inline-block; font-weight: 700; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; }
          th { background: rgba(37, 99, 235, 0.2); padding: 10px 8px; text-align: left; color: #93c5fd; }
          .total-row td { font-weight: 700; font-size: 18px; color: #F59E0B; padding-top: 12px; }
          .footer { text-align: center; color: #475569; font-size: 12px; margin-top: 24px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">Auto<span>Parts</span> Pro</div>
          <div style="text-align:center"><div class="badge">✓ Order Confirmed!</div></div>
          <p>Hello ${name}, your order <strong>#${order.orderNumber}</strong> has been placed successfully.</p>
          <table>
            <tr><th>Product</th><th>Qty</th><th>Price</th></tr>
            ${itemsHtml}
            <tr><td colspan="2" style="padding:8px;color:#94a3b8;">Delivery Charges</td><td style="padding:8px;text-align:right;">Rs. ${order.deliveryCharges.toLocaleString()}</td></tr>
            <tr class="total-row"><td colspan="2">Total Amount</td><td style="text-align:right;">Rs. ${order.totalAmount.toLocaleString()}</td></tr>
          </table>
          <p style="color:#94a3b8;margin-top:20px;">Payment Method: <strong>Cash on Delivery (COD)</strong></p>
          <div class="footer">© 2024 AutoParts Pro. Thank you for shopping with us!</div>
        </div>
      </body>
      </html>
    `,
  };

  if (process.env.NODE_ENV === 'development') {
    console.log(`📧 Order confirmation email sent to ${to} for order ${order.orderNumber}`);
    return;
  }

  await transporter.sendMail(mailOptions);
};

module.exports = { sendOTPEmail, sendOrderConfirmationEmail };
