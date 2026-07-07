// Client-only utilities. Do NOT import from a route loader.
// Extracts plain text from a PDF or DOCX file in the browser.

export async function extractResumeText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) {
    return extractPdfText(file);
  }
  if (
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  ) {
    return extractDocxText(file);
  }
  if (file.type === "text/plain" || name.endsWith(".txt")) {
    return file.text();
  }
  throw new Error("Unsupported file type. Please upload a PDF, DOCX, or TXT resume.");
}

async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  // Vite ships the worker as an asset URL.
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const chunks: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const line = content.items
      .map((it) => ("str" in it ? it.str : ""))
      .join(" ");
    chunks.push(line);
  }
  return chunks.join("\n\n").replace(/\s+\n/g, "\n").trim();
}

async function extractDocxText(file: File): Promise<string> {
  const mammoth = await import("mammoth/mammoth.browser");
  const buf = await file.arrayBuffer();
  const { value } = await mammoth.extractRawText({ arrayBuffer: buf });
  return value.trim();
}
