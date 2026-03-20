import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

const FONT_URL = "https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;500;600;700&family=Noto+Kufi+Arabic:wght@400;500;600;700&family=Tajawal:wght@300;400;500;700;800&family=Noto+Sans+Arabic:wght@300;400;500;600;700&display=swap";

const FONT_FAMILY = "'Noto Naskh Arabic','Tajawal','Noto Sans Arabic','Noto Kufi Arabic','Segoe UI',sans-serif";

async function ensureFontsLoaded(): Promise<void> {
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }
  await new Promise(resolve => setTimeout(resolve, 300));
}

export async function captureElementAsPdf(
  element: HTMLElement,
  orientation: "p" | "l" = "p"
): Promise<Blob | null> {
  await ensureFontsLoaded();

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    onclone: (clonedDoc) => {
      const link = clonedDoc.createElement("link");
      link.rel = "stylesheet";
      link.href = FONT_URL;
      clonedDoc.head.appendChild(link);

      const style = clonedDoc.createElement("style");
      style.textContent = `* { font-family: ${FONT_FAMILY} !important; }`;
      clonedDoc.head.appendChild(style);
    },
  });

  const imgWidth = orientation === "p" ? 210 : 297;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  const pdf = new jsPDF(orientation, "mm", "a4");
  const imgData = canvas.toDataURL("image/png");
  pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);

  return pdf.output("blob");
}

export async function captureHtmlAsPdf(
  htmlContent: string,
  isRtl: boolean = false,
  orientation: "p" | "l" = "p"
): Promise<Blob | null> {
  await ensureFontsLoaded();

  const tempDiv = document.createElement("div");
  tempDiv.style.cssText = `position:absolute;left:-9999px;top:0;width:794px;background:white;padding:15px;font-size:10pt;font-family:${FONT_FAMILY};direction:${isRtl ? "rtl" : "ltr"}`;
  tempDiv.innerHTML = htmlContent;
  document.body.appendChild(tempDiv);

  try {
    const canvas = await html2canvas(tempDiv, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      onclone: (clonedDoc) => {
        const link = clonedDoc.createElement("link");
        link.rel = "stylesheet";
        link.href = FONT_URL;
        clonedDoc.head.appendChild(link);

        const style = clonedDoc.createElement("style");
        style.textContent = `* { font-family: ${FONT_FAMILY} !important; }`;
        clonedDoc.head.appendChild(style);
      },
    });

    const imgWidth = orientation === "p" ? 210 : 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pdf = new jsPDF(orientation, "mm", "a4");
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, imgWidth, imgHeight);
    return pdf.output("blob");
  } finally {
    document.body.removeChild(tempDiv);
  }
}

export { FONT_FAMILY, FONT_URL };
