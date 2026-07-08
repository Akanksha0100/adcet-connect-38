import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const CAPTURE_BG = "#ffffff";

const capture = (el: HTMLElement) =>
  html2canvas(el, { scale: 2, backgroundColor: CAPTURE_BG, logging: false, useCORS: true });

/** Export a single element (e.g. a chart card) as a PNG download. */
export const exportElementPng = async (el: HTMLElement, filename: string) => {
  const canvas = await capture(el);
  const link = document.createElement("a");
  link.download = filename.endsWith(".png") ? filename : `${filename}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
};

/**
 * Export multiple elements into one multi-page A4 PDF, adding page breaks as
 * needed. Used for the "Export dashboard" action.
 */
export const exportElementsPdf = async (
  elements: HTMLElement[],
  filename: string,
  title?: string,
) => {
  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 28;
  let y = margin;

  if (title) {
    pdf.setFontSize(16);
    pdf.setTextColor(30, 58, 95);
    pdf.text(title, margin, y + 10);
    pdf.setFontSize(9);
    pdf.setTextColor(120, 120, 120);
    pdf.text(`Generated ${new Date().toLocaleString()}`, margin, y + 26);
    y += 46;
  }

  for (const el of elements) {
    if (!el) continue;
    const canvas = await capture(el);
    const imgW = pageW - margin * 2;
    const imgH = (canvas.height / canvas.width) * imgW;
    if (y + imgH > pageH - margin) {
      pdf.addPage();
      y = margin;
    }
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", margin, y, imgW, imgH);
    y += imgH + 18;
  }

  pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
};
