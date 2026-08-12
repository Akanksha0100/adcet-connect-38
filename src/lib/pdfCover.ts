/**
 * Render page 1 of a PDF to a PNG `File`, so an uploaded newsletter can show
 * its own cover on the public page instead of a generic download link.
 *
 * The work happens in the admin's browser at upload time: no server-side
 * rasteriser (poppler/ImageMagick) has to exist in the deployment image, and
 * the public bundle stays lean because `pdfjs-dist` is only ever reached
 * through the dynamic import below.
 */

/** Long edge of the generated cover — enough for a retina card, still small. */
const TARGET_WIDTH = 1000;

export const renderPdfCover = async (pdf: File): Promise<File> => {
  const pdfjs = await import("pdfjs-dist");
  // Vite resolves this to a hashed asset URL; pdf.js then runs off the main thread.
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const doc = await pdfjs.getDocument({ data: await pdf.arrayBuffer() }).promise;
  try {
    const page = await doc.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: TARGET_WIDTH / base.width });

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is unavailable in this browser");

    await page.render({ canvas, canvasContext: context, viewport }).promise;

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("Could not read the rendered cover");

    const name = pdf.name.replace(/\.pdf$/i, "") || "newsletter";
    return new File([blob], `${name}-cover.png`, { type: "image/png" });
  } finally {
    await doc.destroy();
  }
};
