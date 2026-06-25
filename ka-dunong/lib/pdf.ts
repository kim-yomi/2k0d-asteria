export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfjsLib = await import("pdfjs-dist");

  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const maxPages = Math.min(pdf.numPages, 10); // cap at 10 pages for context window
  const textParts: string[] = [];

  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: unknown) => (item as { str: string }).str)
      .join(" ");
    textParts.push(`[Page ${i}]\n${pageText}`);
  }

  return textParts.join("\n\n");
}