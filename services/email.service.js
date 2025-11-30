const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config();


if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.warn(
    "EMAIL_USER or EMAIL_PASS not set — email sending will fail until configured"
  );
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const debugLog = (...args) => {
  if (process.env.DEBUG_EMAIL === "true") console.log(...args);
};

transporter.verify((err, success) => {
  if (err) {
    console.error(
      "SMTP verify failed — email sending not ready:",
      err.message || err
    );
  } else {
    debugLog("SMTP verify OK — email sending is ready");
  }
});

const sendMail = async ({ to, subject, html }) => {
  const mailOptions = {
    from: `${process.env.EMAIL_FROM_NAME || "PharmaPlus"} <${
      process.env.EMAIL_USER
    }>`,
    to,
    subject,
    html,
  };

  debugLog(`email.service: sending email to ${to} subject=${subject}`);
  try {
    const info = await transporter.sendMail(mailOptions);
    debugLog(`email.service: sent email to ${to}, messageId=${info.messageId}`);
    return info;
  } catch (err) {
    console.error(
      `email.service: failed to send email to ${to}`,
      err && err.message ? err.message : err
    );
    throw err;
  }
};

const isGmailAddress = (email) => {
  if (!email) return false;
  return (
    typeof email === "string" &&
    (email.toLowerCase().endsWith("@gmail.com") ||
      email.toLowerCase().endsWith("@googlemail.com"))
  );
};

// ========== Email Verification Template ==========
const buildEmailVerificationHTML = (user, verificationToken) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
  const logoUrl = process.env.EMAIL_LOGO_URL || "";

  return `
  <div style="font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; color: #333; max-width: 700px; margin: auto; padding: 24px; background: #f9fafb;">
    <div style="background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #e6e6e6;">
      <div style="display:flex; align-items:center; gap:12px;">
        ${
          logoUrl
            ? `<img src='${logoUrl}' alt='logo' style='width:72px; height:auto; object-fit:cover; border-radius:8px;'/>`
            : ""
        }
        <h1 style="margin:0; color:#2f855a; font-size:20px;">Welcome to PharmaPlus! 🎉</h1>
      </div>
      <p style="color:#666;">Hello ${user.firstname || user.fullName || ""},</p>
      <p style="color:#444">Thank you for signing up with us. Please confirm your email address by clicking the button below:</p>
      
      <div style="margin: 24px 0; text-align: center;">
        <a href="${verificationUrl}" style="background:#2f855a; color:#fff; padding:12px 24px; border-radius:6px; text-decoration:none; display:inline-block; font-weight:bold;">
          Confirm Email Address ✓
        </a>
      </div>
      
      <p style="color:#777; font-size:13px">Or copy the following link to your browser:</p>
      <p style="background:#f5f5f5; padding:10px; border-radius:4px; word-break:break-all; font-size:12px;">${verificationUrl}</p>
      
      <hr style="margin:18px 0; border-color:#eee;" />
      <p style="color:#999; font-size:12px;">This link is valid for 24 hours only. If you didn't sign up, you can safely ignore this email.</p>
    </div>
  </div>
  `;
};

// ========== Password Reset Template ==========
const buildPasswordResetHTML = (user, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  const logoUrl = process.env.EMAIL_LOGO_URL || "";

  return `
  <div style="font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; color: #333; max-width: 700px; margin: auto; padding: 24px; background: #f9fafb;">
    <div style="background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #e6e6e6;">
      <div style="display:flex; align-items:center; gap:12px;">
        ${
          logoUrl
            ? `<img src='${logoUrl}' alt='logo' style='width:72px; height:auto; object-fit:cover; border-radius:8px;'/>`
            : ""
        }
        <h1 style="margin:0; color:#2f855a; font-size:20px;">Password Reset 🔐</h1>
      </div>
      <p style="color:#666;">Hello ${user.firstname || user.fullName || ""},</p>
      <p style="color:#444">We received a request to reset the password for your account.</p>
      
      <div style="margin: 24px 0; text-align: center;">
        <a href="${resetUrl}" style="background:#2196F3; color:#fff; padding:12px 24px; border-radius:6px; text-decoration:none; display:inline-block; font-weight:bold;">
          Reset Password 🔑
        </a>
      </div>
      
      <p style="color:#777; font-size:13px">Or copy the following link to your browser:</p>
      <p style="background:#f5f5f5; padding:10px; border-radius:4px; word-break:break-all; font-size:12px;">${resetUrl}</p>
      
      <hr style="margin:18px 0; border-color:#eee;" />
      <p style="color:#999; font-size:12px;">This link is valid for 1 hour only. If you did not request a password reset, you can safely ignore this email.</p>
    </div>
  </div>
  `;
};

// ========== Order Templates (الموجودة بالفعل) ==========
const buildOrderPlacedHTML = (order, user, pharmacy) => {
  const itemsHtml = (order.items || [])
    .map(
      (it, index) =>
        `\n            <tr>\n              <td style="padding: 8px;">${
          index + 1
        }. ${
          it.medicine?.name || it.medicine
        }</td>\n              <td style="padding: 8px; text-align:center;">${
          it.quantity
        }</td>\n            </tr>`
    )
    .join("");
  const logoUrl = process.env.EMAIL_LOGO_URL || "";
  return `
  <div style="font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; color: #333; max-width: 700px; margin: auto; padding: 24px; background: #f9fafb;">
    <div style="background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #e6e6e6;">
      <div style="display:flex; align-items:center;  gap:20px;">
        ${
          logoUrl
            ? `<img src='${logoUrl}' alt='logo' style='width:72px; height:auto; object-fit:cover; border-radius:5px;'/>`
            : ""
        }
        <h1 style="margin:0; color:#2f855a; font-size:20px;">Thanks for your order</h1>
      </div>
      <p style="color:#666;">Hi ${user.firstname || user.fullName || ""},</p>
      <p style="color:#444">We've received your order <strong>#${
        order._id
      }</strong> from <strong>${
    pharmacy.name
  }</strong>. We're processing it and will notify you when it ships or is ready for pickup.</p>
      <h3 style="margin-top:12px;">Order summary</h3>
      <table style="border-collapse: collapse; width:100%; margin-top:8px;">
        <thead>
          <tr>
            <th style="text-align:left; padding:8px; background:#f3f3f3;">Item</th>
            <th style="text-align:center; padding:8px; background:#f3f3f3;">Qty</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
      <p style="margin-top:12px;"><strong>Total:</strong> ${order.total}</p>
      <p style="color:#777; font-size:13px">Delivery address: ${
        order.address?.street || ""
      } ${order.address?.city || ""}</p>
      <div style="margin-top:18px; display:flex; gap:10px;">
        <a href="#" style="background:#2f855a; color:#fff; padding:10px 14px; border-radius:6px; text-decoration:none;">View order</a>
        <a href="mailto:${
          pharmacy.email || process.env.EMAIL_USER
        }" style="border:1px solid #e2e8f0; color:#2f855a; padding:10px 14px; border-radius:6px; text-decoration:none;">Contact support</a>
      </div>
      <hr style="margin-top:18px; border-color:#eee;" />
      <p style="color:#999; font-size:12px;">If you didn't place this order, reply to this email immediately or contact the pharmacy.</p>
    </div>
  </div>
  `;
};

const buildOrderDeliveredHTML = (order, user, pharmacy) => {
  const itemsHtml = (order.items || [])
    .map(
      (it, index) =>
        `\n            <tr>\n              <td style="padding: 8px;">${
          index + 1
        }. ${
          it.medicine?.name || it.medicine
        }</td>\n              <td style="padding: 8px; text-align:center;">${
          it.quantity
        }</td>\n            </tr>`
    )
    .join("");
  const logoUrl = process.env.EMAIL_LOGO_URL || "";
  return `
  <div style="font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; color: #333; max-width: 700px; margin: auto; padding: 24px; background: #f9fafb;">
    <div style="background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #e6e6e6;">
      <div style="display:flex; align-items:center; gap:12px;">
        ${
          logoUrl
            ? `<img src='${logoUrl}' alt='logo' style='width:72px; height:auto; object-fit:cover; border-radius:8px;'/>`
            : ""
        }
        <h1 style="margin:0; color:#2f855a; font-size:20px;">Your order is delivered! 🎉</h1>
      </div>
      <p style="color:#666;">Hi ${user.firstname || user.fullName || ""},</p>
      <p style="color:#444">Great news — your order <strong>#${
        order._id
      }</strong> from <strong>${
    pharmacy.name
  }</strong> has been <strong>delivered</strong>.</p>
      <h3 style="margin-top:12px;">Order details</h3>
      <table style="border-collapse: collapse; width:100%; margin-top:8px;">
        <thead>
          <tr>
            <th style="text-align:left; padding:8px; background:#f3f3f3;">Item</th>
            <th style="text-align:center; padding:8px; background:#f3f3f3;">Qty</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
      <p style="margin-top:12px;"><strong>Total:</strong> ${order.total}</p>
      <p style="color:#777; font-size:13px">Delivery address: ${
        order.address?.street || ""
      } ${order.address?.city || ""}</p>
      <div style="margin-top:18px;">
        <a href="#" style="background:#2f855a; color:#fff; padding:10px 14px; border-radius:6px; text-decoration:none;">View order</a>
      </div>
      <hr style="margin-top:18px; border-color:#eee;" />
      <p style="color:#999; font-size:12px;">If you need help, reply to this email or contact the pharmacy at ${
        pharmacy.email || process.env.EMAIL_USER
      }.</p>
    </div>
  </div>
  `;
};

// ========== Send Functions ==========
const sendVerificationEmail = async (user, verificationToken) => {
  if (!user?.email) throw new Error("User email is required");
  const html = buildEmailVerificationHTML(user, verificationToken);
  const subject = "Email Verification - PharmaPlus";
  return sendMail({ to: user.email, subject, html });
};

const sendPasswordResetEmail = async (user, resetToken) => {
  if (!user?.email) throw new Error("User email is required");
  const html = buildPasswordResetHTML(user, resetToken);
  const subject = "Password Reset - PharmaPlus";
  return sendMail({ to: user.email, subject, html });
};

const sendOrderPlacedEmail = async (order, user, pharmacy) => {
  if (!user?.email) throw new Error("User email is required");
  const html = buildOrderPlacedHTML(order, user, pharmacy);
  const subject = `Order received – #${order._id}`;
  return sendMail({ to: user.email, subject, html });
};

const sendOrderDeliveredEmail = async (order, user, pharmacy) => {
  if (!user?.email) throw new Error("User email is required");
  const html = buildOrderDeliveredHTML(order, user, pharmacy);
  const subject = `Order delivered – #${order._id}`;
  return sendMail({ to: user.email, subject, html });
};

module.exports = {
  sendMail,
  sendOrderPlacedEmail,
  sendOrderDeliveredEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  isGmailAddress,
  verifyTransporter: () =>
    new Promise((resolve, reject) => {
      transporter.verify((err, success) => {
        if (err) return reject(err);
        resolve(success);
      });
    }),
};
