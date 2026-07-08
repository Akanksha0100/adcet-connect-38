/**
 * Razorpay integration — thin, dependency-free wrapper over the Razorpay REST
 * API plus HMAC signature verification helpers.
 *
 * We deliberately avoid the `razorpay` SDK: order creation is a single REST
 * call and every "did this really succeed?" decision is an HMAC check we run
 * ourselves, so payments are verified entirely on the backend and never trust
 * amounts/status coming from the browser.
 *
 * Configuration is optional. When keys are absent, `isConfigured()` is false
 * and callers surface a 501 (matching the OAuth pattern).
 */
import crypto from "node:crypto";
import { env } from "../config/env.js";
import { logger } from "./logger.js";
import { NotImplemented, BadRequest } from "./errors.js";

const API_BASE = "https://api.razorpay.com/v1";

export const isConfigured = (): boolean =>
  !!(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);

/** Public key id — safe to hand to the browser for Checkout. */
export const getPublicKeyId = (): string => env.RAZORPAY_KEY_ID ?? "";

const authHeader = (): string =>
  "Basic " +
  Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64");

export interface RazorpayOrder {
  id: string;
  amount: number; // paise
  currency: string;
  status: string;
  receipt?: string;
}

/**
 * Create a Razorpay order. `amountPaise` must already be in the smallest
 * currency unit (INR paise = rupees × 100).
 */
export const createOrder = async (input: {
  amountPaise: number;
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrder> => {
  if (!isConfigured()) throw NotImplemented("Payments are not configured");

  const res = await fetch(`${API_BASE}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authHeader() },
    body: JSON.stringify({
      amount: input.amountPaise,
      currency: input.currency ?? "INR",
      receipt: input.receipt,
      notes: input.notes,
      payment_capture: 1,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    logger.error({ status: res.status, text }, "razorpay order creation failed");
    throw BadRequest("Could not initiate payment. Please try again.");
  }
  return (await res.json()) as RazorpayOrder;
};

/**
 * Verify the signature returned by Razorpay Checkout after a payment.
 * signature = HMAC_SHA256(`${orderId}|${paymentId}`, key_secret).
 */
export const verifyPaymentSignature = (
  orderId: string,
  paymentId: string,
  signature: string,
): boolean => {
  if (!env.RAZORPAY_KEY_SECRET) return false;
  const expected = crypto
    .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return safeEqualHex(expected, signature);
};

/**
 * Verify a Razorpay webhook payload. signature = HMAC_SHA256(rawBody, webhook_secret).
 */
export const verifyWebhookSignature = (rawBody: Buffer | string, signature: string): boolean => {
  if (!env.RAZORPAY_WEBHOOK_SECRET) return false;
  const expected = crypto
    .createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  return safeEqualHex(expected, signature);
};

export interface RazorpayPayment {
  id: string;
  status: string;
  method?: string;
  email?: string;
  contact?: string;
  amount?: number;
}

/** Fetch payment details (best-effort — used to record the method/email). */
export const fetchPayment = async (paymentId: string): Promise<RazorpayPayment | null> => {
  if (!isConfigured()) return null;
  try {
    const res = await fetch(`${API_BASE}/payments/${paymentId}`, {
      headers: { Authorization: authHeader() },
    });
    if (!res.ok) return null;
    return (await res.json()) as RazorpayPayment;
  } catch (e) {
    logger.warn({ err: e, paymentId }, "razorpay fetchPayment failed");
    return null;
  }
};

/** Constant-time compare of two hex strings (guards against length mismatch). */
const safeEqualHex = (a: string, b: string): boolean => {
  try {
    const ab = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ab.length !== bb.length || ab.length === 0) return false;
    return crypto.timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
};
