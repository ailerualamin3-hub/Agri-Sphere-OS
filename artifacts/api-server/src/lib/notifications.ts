import { Resend } from "resend";

const FROM_EMAIL = process.env["RESEND_FROM_EMAIL"] || "FREGE AI <onboarding@resend.dev>";
const APP_NAME = "FREGE AI";

function getResend() {
  const key = process.env["RESEND_API_KEY"];
  if (!key) return null;
  return new Resend(key);
}

// ─── Termii (Nigerian SMS Gateway) ──────────────────────────────────────────
async function sendViaTwilio(to: string, body: string): Promise<boolean> {
  const accountSid = process.env["TWILIO_ACCOUNT_SID"];
  const authToken = process.env["TWILIO_AUTH_TOKEN"];
  const fromNumber = process.env["TWILIO_PHONE_NUMBER"];
  if (!accountSid || !authToken || !fromNumber) return false;
  try {
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: to, From: fromNumber, Body: body }).toString(),
      }
    );
    if (res.ok) return true;
    const err = await res.json();
    console.error("[sms:twilio] failed:", err);
    return false;
  } catch (err) {
    console.error("[sms:twilio] error:", err);
    return false;
  }
}

async function sendViaTermii(to: string, body: string): Promise<boolean> {
  const apiKey = process.env["TERMII_API_KEY"];
  const senderId = process.env["TERMII_SENDER_ID"] || "FREGE AI";
  if (!apiKey) return false;

  // Normalize Nigerian number: 080xxxxxxxx → +23480xxxxxxxx
  let normalizedTo = to.trim();
  if (normalizedTo.startsWith("0") && normalizedTo.length === 11) {
    normalizedTo = "+234" + normalizedTo.slice(1);
  } else if (!normalizedTo.startsWith("+")) {
    normalizedTo = "+" + normalizedTo;
  }

  try {
    const res = await fetch("https://api.ng.termii.com/api/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        to: normalizedTo,
        from: senderId.slice(0, 11), // Termii sender ID max 11 chars
        sms: body,
        type: "plain",
        channel: "generic",
      }),
    });
    const data = await res.json();
    if (res.ok && data.code === "ok") return true;
    console.error("[sms:termii] failed:", data);
    return false;
  } catch (err) {
    console.error("[sms:termii] error:", err);
    return false;
  }
}

// Try Termii first (better for Nigeria), fall back to Twilio
export async function sendSms(to: string, body: string): Promise<boolean> {
  const termiiOk = await sendViaTermii(to, body);
  if (termiiOk) return true;
  return sendViaTwilio(to, body);
}

export async function sendOtpSms(phone: string, otp: string): Promise<boolean> {
  return sendSms(
    phone,
    `Your ${APP_NAME} verification code is: ${otp}\n\nExpires in 10 minutes. Never share this code.`
  );
}

export async function sendReminderSms(phone: string, title: string, message: string): Promise<boolean> {
  return sendSms(phone, `${APP_NAME} Reminder\n${title}: ${message}`);
}

export async function sendOtpEmail(email: string, name: string, otp: string): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `${otp} – Your ${APP_NAME} verification code`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <div style="text-align:center;margin-bottom:24px">
            <h1 style="color:#1E3A8A;font-size:24px;margin:0">${APP_NAME}</h1>
            <p style="color:#6b7280;margin:4px 0 0">Your AI farming companion</p>
          </div>
          <div style="background:#f9fafb;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
            <p style="color:#374151;margin:0 0 12px">Hi ${name || "Farmer"}, your verification code is:</p>
            <div style="font-size:40px;font-weight:900;letter-spacing:0.2em;color:#1E3A8A;margin:12px 0">${otp}</div>
            <p style="color:#6b7280;font-size:13px;margin:0">This code expires in <strong>10 minutes</strong>.</p>
          </div>
          <p style="color:#9ca3af;font-size:12px;text-align:center">If you didn't request this, ignore this email. Never share your code with anyone.</p>
        </div>
      `,
    });
    return true;
  } catch (err) {
    console.error("[notifications] Email OTP failed:", err);
    return false;
  }
}

export async function sendPasswordResetEmail(email: string, name: string, resetCode: string): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Reset your ${APP_NAME} password`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <div style="text-align:center;margin-bottom:24px">
            <h1 style="color:#1E3A8A;font-size:24px;margin:0">${APP_NAME}</h1>
          </div>
          <p style="color:#374151">Hi ${name || "Farmer"},</p>
          <p style="color:#374151">Use the code below to reset your password:</p>
          <div style="background:#f9fafb;border-radius:12px;padding:24px;text-align:center;margin:20px 0">
            <div style="font-size:36px;font-weight:900;letter-spacing:0.2em;color:#16A34A;margin:8px 0">${resetCode}</div>
            <p style="color:#6b7280;font-size:13px;margin:0">Expires in <strong>1 hour</strong>.</p>
          </div>
          <p style="color:#9ca3af;font-size:12px;text-align:center">If you didn't request this, ignore this email.</p>
        </div>
      `,
    });
    return true;
  } catch (err) {
    console.error("[notifications] Password reset email failed:", err);
    return false;
  }
}

export async function sendPasswordResetSms(phone: string, resetCode: string): Promise<boolean> {
  return sendSms(
    phone,
    `Your ${APP_NAME} password reset code is: ${resetCode}\n\nExpires in 1 hour. Never share this code.`
  );
}
