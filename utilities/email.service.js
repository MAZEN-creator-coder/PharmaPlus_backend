const nodemailer = require("nodemailer");

// A minimal email service using Gmail SMTP + app password.
// For production, consider OAuth2 or a transactional email provider.

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

// debug logger: print only when DEBUG_EMAIL=true to avoid noisy logs (internal only)
const debugLog = (...args) => {
  if (process.env.DEBUG_EMAIL === "true") console.log(...args);
};

// Minimal startup logging (errors always shown, success only if debug enabled)
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
    // success is silent in normal mode; if debug enabled, log it
    debugLog(`email.service: sent email to ${to}, messageId=${info.messageId}`);
    return info;
  } catch (err) {
    console.error(
      `email.service: failed to send email to ${to}`,
      err && err.message ? err.message : err
    );
    throw err; // re-throw so callers see the error if they handle it
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
      <div style="display:flex; align-items:center; gap:12px;">
        ${
          logoUrl
            ? `<img src='${logoUrl}' alt='logo' style='width:72px; height:auto; object-fit:cover; border-radius:8px;'/>`
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
  isGmailAddress,
  verifyTransporter: () =>
    new Promise((resolve, reject) => {
      transporter.verify((err, success) => {
        if (err) return reject(err);
        resolve(success);
      });
    }),
  // do not export debugLog by default (internal only)
};
