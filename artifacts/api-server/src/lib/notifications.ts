import { Resend } from "resend";
import twilio from "twilio";

const FROM_EMAIL = "FREGE AI <noreply@fregeai.com>";
const FROM_PHONE = process.env["TWILIO_PHONE_NUMBER"] || "";
const APP_NAME = "FREGE AI";

function getResend() {
  const key = process.env["RESEND_API_KEY"];
  if (!key) return null;
  return new Resend(key);
}

function getTwilio() {
  const sid = process.env["TWILIO_ACCOUNT_SID"];
  const token = process.env["TWILIO_AUTH_TOKEN"];
  if (!sid || !token) return null;
  return twilio(sid, token);
}

export async function sendOtpSms(phone: string, otp: string): Promise<boolean> {
  const client = getTwilio();
  if (!client || !FROM_PHONE) return false;
  try {
    await client.messages.create({
      body: `Your ${APP_NAME} verification code is: ${otp}\n\nThis code expires in 10 minutes. Do not share it with anyone.`,
      from: FROM_PHONE,
      to: phone,
    });
    return true;
  } catch (err) {
    console.error("[notifications] SMS failed:", err);
    return false;
  }
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
            <p style="color:#6b7280;margin:4px 0 0">Your AI farming companion</p>
          </div>
          <p style="color:#374151">Hi ${name || "Farmer"},</p>
          <p style="color:#374151">We received a request to reset your password. Use the code below to set a new password:</p>
          <div style="background:#f9fafb;border-radius:12px;padding:24px;text-align:center;margin:20px 0">
            <div style="font-size:36px;font-weight:900;letter-spacing:0.2em;color:#16A34A;margin:8px 0">${resetCode}</div>
            <p style="color:#6b7280;font-size:13px;margin:0">This code expires in <strong>1 hour</strong>.</p>
          </div>
          <p style="color:#9ca3af;font-size:12px;text-align:center">If you didn't request a password reset, ignore this email. Your password will remain unchanged.</p>
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
  const client = getTwilio();
  if (!client || !FROM_PHONE) return false;
  try {
    await client.messages.create({
      body: `Your ${APP_NAME} password reset code is: ${resetCode}\n\nThis code expires in 1 hour. Do not share it with anyone.`,
      from: FROM_PHONE,
      to: phone,
    });
    return true;
  } catch (err) {
    console.error("[notifications] Password reset SMS failed:", err);
    return false;
  }
}
