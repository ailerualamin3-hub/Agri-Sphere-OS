import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { db, farmersTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { signToken } from "../middleware/auth.js";
import {
  sendOtpSms,
  sendOtpEmail,
  sendPasswordResetEmail,
  sendPasswordResetSms,
} from "../lib/notifications.js";

const JWT_SECRET = process.env["JWT_SECRET"] || "frege-ai-dev-secret-change-in-prod";

const router = Router();

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, phone } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      phone?: string;
    };

    if (!name || !email || !password || !phone) {
      res.status(400).json({ error: "Name, email, phone and password are required" });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
      return;
    }

    const existing = await db
      .select({ id: farmersTable.id })
      .from(farmersTable)
      .where(or(eq(farmersTable.email, email.toLowerCase()), eq(farmersTable.phone, phone)))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: "An account with this email or phone already exists" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [farmer] = await db
      .insert(farmersTable)
      .values({
        name,
        email: email.toLowerCase(),
        phone,
        passwordHash,
        verificationStatus: "verified",
      })
      .returning();

    const token = signToken(farmer.id, farmer.email!);
    res.status(201).json({
      token,
      farmer: {
        id: farmer.id,
        name: farmer.name,
        email: farmer.email,
        phone: farmer.phone,
        state: farmer.state,
        neuroScore: farmer.neuroScore,
        communityReputation: farmer.communityReputation,
        onboardingComplete: farmer.onboardingComplete,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Register failed");
    res.status(500).json({ error: "Registration failed. Please try again." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const [farmer] = await db
      .select()
      .from(farmersTable)
      .where(eq(farmersTable.email, email.toLowerCase()))
      .limit(1);

    if (!farmer) {
      res.status(401).json({ error: "No account found with this email address" });
      return;
    }

    if (!farmer.passwordHash) {
      res.status(401).json({ error: "Please reset your password to continue" });
      return;
    }

    const valid = await bcrypt.compare(password, farmer.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Incorrect password. Please try again." });
      return;
    }

    const token = signToken(farmer.id, farmer.email!);
    res.json({
      token,
      farmer: {
        id: farmer.id,
        name: farmer.name,
        email: farmer.email,
        phone: farmer.phone,
        state: farmer.state,
        neuroScore: farmer.neuroScore,
        avatarUrl: farmer.avatarUrl,
        communityReputation: farmer.communityReputation,
        onboardingComplete: farmer.onboardingComplete,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Login failed");
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    let payload: { farmerId: number; email: string };
    try {
      payload = jwt.verify(token, JWT_SECRET) as { farmerId: number; email: string };
    } catch {
      res.status(401).json({ error: "Invalid or expired session" });
      return;
    }

    const [farmer] = await db
      .select()
      .from(farmersTable)
      .where(eq(farmersTable.id, payload.farmerId))
      .limit(1);

    if (!farmer) {
      res.status(404).json({ error: "Account not found" });
      return;
    }

    res.json({
      id: farmer.id,
      name: farmer.name,
      email: farmer.email,
      phone: farmer.phone,
      state: farmer.state,
      lga: farmer.lga,
      farmingType: farmer.farmingType,
      neuroScore: farmer.neuroScore,
      avatarUrl: farmer.avatarUrl,
      communityReputation: farmer.communityReputation,
      verificationStatus: farmer.verificationStatus,
      onboardingComplete: farmer.onboardingComplete,
    });
  } catch (err) {
    req.log.error({ err }, "Me failed");
    res.status(500).json({ error: "Failed to get profile" });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body as { email?: string };
    if (!email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    const [farmer] = await db
      .select({ id: farmersTable.id, name: farmersTable.name })
      .from(farmersTable)
      .where(eq(farmersTable.email, email.toLowerCase()))
      .limit(1);

    if (!farmer) {
      res.json({ message: "If an account with this email exists, a reset code has been sent." });
      return;
    }

    const resetToken = crypto.randomInt(100000, 999999).toString();
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

    await db
      .update(farmersTable)
      .set({ resetToken, resetTokenExpiry })
      .where(eq(farmersTable.id, farmer.id));

    const [farmerFull] = await db
      .select({ email: farmersTable.email, phone: farmersTable.phone })
      .from(farmersTable)
      .where(eq(farmersTable.id, farmer.id))
      .limit(1);

    const emailSent = farmerFull?.email
      ? await sendPasswordResetEmail(farmerFull.email, farmer.name, resetToken)
      : false;
    const smsSent = farmerFull?.phone
      ? await sendPasswordResetSms(farmerFull.phone, resetToken)
      : false;

    res.json({
      message: emailSent || smsSent
        ? "Password reset code sent. Check your email or phone."
        : "Password reset code generated.",
      ...(emailSent || smsSent
        ? {}
        : { resetCode: resetToken, note: "Notifications not configured – use this code to reset your password." }),
    });
  } catch (err) {
    req.log.error({ err }, "Forgot password failed");
    res.status(500).json({ error: "Failed to process request" });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { email, resetCode, password } = req.body as {
      email?: string;
      resetCode?: string;
      password?: string;
    };

    if (!email || !resetCode || !password) {
      res.status(400).json({ error: "Email, reset code and new password are required" });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
      return;
    }

    const [farmer] = await db
      .select()
      .from(farmersTable)
      .where(eq(farmersTable.email, email.toLowerCase()))
      .limit(1);

    if (
      !farmer ||
      farmer.resetToken !== resetCode ||
      !farmer.resetTokenExpiry ||
      farmer.resetTokenExpiry < new Date()
    ) {
      res.status(400).json({ error: "Invalid or expired reset code" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await db
      .update(farmersTable)
      .set({ passwordHash, resetToken: null, resetTokenExpiry: null })
      .where(eq(farmersTable.id, farmer.id));

    const token = signToken(farmer.id, farmer.email!);
    res.json({
      token,
      farmer: { id: farmer.id, name: farmer.name, email: farmer.email },
      message: "Password reset successful",
    });
  } catch (err) {
    req.log.error({ err }, "Reset password failed");
    res.status(500).json({ error: "Failed to reset password" });
  }
});

router.post("/logout", (_req, res) => {
  res.json({ message: "Logged out successfully" });
});

// ─── Phone OTP ─────────────────────────────────────────────────────────────

router.post("/phone/send-otp", async (req, res) => {
  try {
    const { phone } = req.body as { phone?: string };
    if (!phone?.trim()) {
      res.status(400).json({ error: "Phone number is required" });
      return;
    }
    const normalized = phone.trim().replace(/\s+/g, "");

    const [existing] = await db
      .select({ id: farmersTable.id, name: farmersTable.name })
      .from(farmersTable)
      .where(eq(farmersTable.phone, normalized))
      .limit(1);

    const otp = crypto.randomInt(100000, 999999).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    if (existing) {
      await db
        .update(farmersTable)
        .set({ phoneOtp: otp, phoneOtpExpiry: expiry })
        .where(eq(farmersTable.id, existing.id));
    } else {
      await db
        .insert(farmersTable)
        .values({
          name: "Farmer",
          phone: normalized,
          phoneOtp: otp,
          phoneOtpExpiry: expiry,
        });
    }

    const smsSent = await sendOtpSms(normalized, otp);

    res.json({
      isNewUser: !existing,
      smsSent,
      message: smsSent
        ? `Verification code sent to ${normalized}`
        : `OTP sent to ${normalized}`,
      ...(smsSent ? {} : { otp, note: "SMS not configured – use this code to sign in." }),
    });
  } catch (err) {
    req.log.error({ err }, "Send phone OTP failed");
    res.status(500).json({ error: "Failed to send OTP. Please try again." });
  }
});

router.post("/phone/verify-otp", async (req, res) => {
  try {
    const { phone, otp, name } = req.body as {
      phone?: string;
      otp?: string;
      name?: string;
    };

    if (!phone?.trim() || !otp?.trim()) {
      res.status(400).json({ error: "Phone number and OTP are required" });
      return;
    }
    const normalized = phone.trim().replace(/\s+/g, "");

    const [farmer] = await db
      .select()
      .from(farmersTable)
      .where(eq(farmersTable.phone, normalized))
      .limit(1);

    if (!farmer) {
      res.status(400).json({ error: "No OTP request found for this number. Please request a new code." });
      return;
    }

    if (farmer.phoneOtp !== otp.trim()) {
      res.status(400).json({ error: "Incorrect code. Please check and try again." });
      return;
    }

    if (!farmer.phoneOtpExpiry || farmer.phoneOtpExpiry < new Date()) {
      res.status(400).json({ error: "This code has expired. Please request a new one." });
      return;
    }

    const isNewUser = !farmer.passwordHash && !farmer.email;
    const finalName = isNewUser && name?.trim() ? name.trim() : farmer.name;

    const [updated] = await db
      .update(farmersTable)
      .set({ phoneOtp: null, phoneOtpExpiry: null, name: finalName, verificationStatus: "verified" })
      .where(eq(farmersTable.id, farmer.id))
      .returning();

    const email = updated.email ?? `phone_${updated.id}@frege.ai`;
    const token = signToken(updated.id, email);

    res.json({
      token,
      isNewUser,
      farmer: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        state: updated.state,
        neuroScore: updated.neuroScore,
        communityReputation: updated.communityReputation,
        onboardingComplete: updated.onboardingComplete,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Verify phone OTP failed");
    res.status(500).json({ error: "Verification failed. Please try again." });
  }
});

export default router;
