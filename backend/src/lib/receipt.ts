/**
 * Donation receipt PDF generator (pdfkit → Buffer).
 * Produces a single-page branded receipt suitable for emailing as an attachment
 * and/or storing for the admin to re-download.
 */
import PDFDocument from "pdfkit";
import { env } from "../config/env.js";

export interface ReceiptData {
  receiptNo: string;
  donorName: string;
  donorEmail?: string | null;
  amount: number; // rupees
  currency: string;
  paymentId?: string | null;
  orderId?: string | null;
  method?: string | null;
  paidAt: Date;
  message?: string | null;
}

const BRAND = "#1e3a5f";
const ACCENT = "#2d8a6e";
const MUTED = "#6c757d";

const inr = (n: number) => `INR ${n.toLocaleString("en-IN")}`;

export const generateReceiptPdf = (data: ReceiptData): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // ── Header band ──
    doc.rect(0, 0, doc.page.width, 110).fill(BRAND);
    doc.fillColor("#ffffff").fontSize(20).font("Helvetica-Bold").text("ADCET Alumni Portal", 50, 36);
    doc.fontSize(10).font("Helvetica").fillColor("#dbe4ee").text(env.ORG_NAME, 50, 64, { width: 400 });
    doc.fontSize(18).font("Helvetica-Bold").fillColor("#ffffff").text("DONATION RECEIPT", 50, 40, {
      align: "right",
      width: doc.page.width - 100,
    });

    doc.moveDown(4);
    let y = 140;

    // ── Receipt meta ──
    doc.fontSize(10).fillColor(MUTED).font("Helvetica");
    doc.text(`Receipt No: ${data.receiptNo}`, 50, y);
    doc.text(`Date: ${data.paidAt.toLocaleString("en-IN")}`, 50, y, {
      align: "right",
      width: doc.page.width - 100,
    });
    y += 30;

    // ── Amount highlight ──
    doc.rect(50, y, doc.page.width - 100, 60).fill("#f4f8f6").stroke();
    doc.fillColor(MUTED).fontSize(10).font("Helvetica").text("Amount Received", 66, y + 12);
    doc.fillColor(ACCENT).fontSize(24).font("Helvetica-Bold").text(inr(data.amount), 66, y + 26);
    y += 90;

    // ── Details table ──
    const row = (label: string, value: string) => {
      doc.fillColor(MUTED).fontSize(10).font("Helvetica").text(label, 50, y, { width: 160 });
      doc.fillColor("#2c3e50").fontSize(11).font("Helvetica-Bold").text(value, 210, y, {
        width: doc.page.width - 260,
      });
      y += 24;
    };

    row("Received From", data.donorName || "Anonymous");
    if (data.donorEmail) row("Email", data.donorEmail);
    row("Payment Method", (data.method || "online").toUpperCase());
    if (data.paymentId) row("Payment ID", data.paymentId);
    if (data.orderId) row("Order ID", data.orderId);
    row("Status", "SUCCESSFUL");
    if (data.message) row("Message", data.message);

    y += 16;
    doc
      .moveTo(50, y)
      .lineTo(doc.page.width - 50, y)
      .strokeColor("#e0e0e0")
      .stroke();
    y += 20;

    doc
      .fillColor(MUTED)
      .fontSize(9)
      .font("Helvetica")
      .text(
        "This is a computer-generated receipt acknowledging the donation received via the ADCET Alumni Portal. " +
          "Thank you for your generous contribution towards the growth of our institution.",
        50,
        y,
        { width: doc.page.width - 100 },
      );

    // ── Footer ──
    doc
      .fontSize(9)
      .fillColor(MUTED)
      .text(env.ORG_ADDRESS, 50, doc.page.height - 70, {
        width: doc.page.width - 100,
        align: "center",
      });

    doc.end();
  });
