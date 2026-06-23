import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env["JWT_SECRET"] || "frege-ai-dev-secret-change-in-prod";

export interface JwtPayload {
  farmerId: number;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      farmerId?: number;
      farmerEmail?: string;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.farmerId = payload.farmerId;
    req.farmerEmail = payload.email;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
      req.farmerId = payload.farmerId;
      req.farmerEmail = payload.email;
    } catch {
      // ignore invalid token for optional auth
    }
  }
  next();
}

export function signToken(farmerId: number, email: string): string {
  return jwt.sign({ farmerId, email }, JWT_SECRET, { expiresIn: "30d" });
}
