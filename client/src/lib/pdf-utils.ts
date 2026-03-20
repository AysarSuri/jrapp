import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

const FONT_FAMILY = "'Noto Naskh Arabic','Tajawal','Noto Sans Arabic','Noto Kufi Arabic','Segoe UI',sans-serif";

const A4_WIDTH_PX = 794;

async function ensureFontsLoaded(): Promise<void> {
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }
  const testChars = "پچڤگڵڕێۆژ فاتورة مبيعات فرۆشتن لیستی حسابی دۆلار";
  const fontFaces = [
    '400 16px "Noto Naskh Arabic"',
    '700 16px "Noto Naskh Arabic"',
    '400 16px "Tajawal"',
    '700 16px "Tajawal"',
  ];
  try {
    await Promise.all(fontFaces.map(f => document.fonts.load(f, testChars).catch(() => {})));
    await document.fonts.ready;
  } catch {}
  await new Promise(resolve => setTimeout(resolve, 150));
}

async function imageToDataUri(src: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(c.toDataURL("image/png"));
          return;
        }
      } catch {}
      resolve(src);
    };
    img.onerror = () => resolve(src);
    setTimeout(() => resolve(src), 3000);
    img.src = src;
  });
}

async function convertAllImages(container: HTMLElement): Promise<void> {
  const imgs = container.querySelectorAll("img");
  const promises = Array.from(imgs).map(async (img) => {
    if (img.src && !img.src.startsWith("data:")) {
      img.src = await imageToDataUri(img.src);
    }
  });
  await Promise.all(promises);
}

async function waitForImages(container: HTMLElement, timeout = 3000): Promise<void> {
  const imgs = container.querySelectorAll("img");
  if (imgs.length === 0) return;
  const promises = Array.from(imgs).map(img => {
    if (img.complete && img.naturalWidth > 0) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, timeout);
      img.onload = () => { clearTimeout(timer); resolve(); };
      img.onerror = () => { clearTimeout(timer); resolve(); };
    });
  });
  await Promise.all(promises);
}

function generatePdfFromCanvas(canvas: HTMLCanvasElement, orientation: "p" | "l"): Blob {
  const imgWidth = orientation === "p" ? 210 : 297;
  const pageHeight = orientation === "p" ? 297 : 210;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  const pdf = new jsPDF(orientation, "mm", "a4");
  const imgData = canvas.toDataURL("image/png");

  if (imgHeight <= pageHeight) {
    pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
  } else {
    let yOffset = 0;
    let page = 0;
    while (yOffset < imgHeight) {
      if (page > 0) pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, -yOffset, imgWidth, imgHeight);
      yOffset += pageHeight;
      page++;
    }
  }
  return pdf.output("blob") as unknown as Blob;
}

export async function captureElementAsPdf(
  element: HTMLElement,
  orientation: "p" | "l" = "p"
): Promise<Blob | null> {
  await ensureFontsLoaded();

  await convertAllImages(element);
  await waitForImages(element);
  await new Promise(r => setTimeout(r, 200));

  const rect = element.getBoundingClientRect();

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      width: A4_WIDTH_PX,
      height: element.scrollHeight,
      windowWidth: A4_WIDTH_PX,
      scrollX: -rect.left,
      scrollY: -rect.top,
      x: rect.left,
      y: rect.top,
      logging: false,
      onclone: (_doc: Document, clonedEl: HTMLElement) => {
        let parent = clonedEl.parentElement;
        while (parent && parent !== _doc.documentElement) {
          parent.style.overflow = "visible";
          parent.style.overflowX = "visible";
          parent.style.overflowY = "visible";
          parent.style.maxHeight = "none";
          parent.style.maxWidth = "none";
          parent.style.height = "auto";
          parent.style.transform = "none";
          parent.style.position = "static";
          parent.style.clipPath = "none";
          parent.style.clip = "auto";
          parent = parent.parentElement;
        }
        _doc.body.style.overflow = "visible";
        _doc.documentElement.style.overflow = "visible";

        clonedEl.style.width = A4_WIDTH_PX + "px";
        clonedEl.style.minWidth = A4_WIDTH_PX + "px";
        clonedEl.style.maxWidth = A4_WIDTH_PX + "px";
        clonedEl.style.overflow = "visible";
        clonedEl.style.position = "relative";
        clonedEl.style.left = "0";
        clonedEl.style.top = "0";
        clonedEl.style.transform = "none";
      },
    });

    return generatePdfFromCanvas(canvas, orientation);
  } catch (err) {
    console.error("PDF capture error:", err);
    return null;
  }
}

export async function captureHtmlAsPdf(
  htmlContent: string,
  isRtl: boolean = false,
  orientation: "p" | "l" = "p"
): Promise<Blob | null> {
  await ensureFontsLoaded();

  const tempDiv = document.createElement("div");
  tempDiv.style.cssText = `position:fixed;left:0;top:0;width:${A4_WIDTH_PX}px;background:white;padding:20px 25px;box-sizing:border-box;font-size:10pt;font-family:${FONT_FAMILY};direction:${isRtl ? "rtl" : "ltr"};overflow:visible;z-index:2147483647;pointer-events:none;`;
  tempDiv.innerHTML = htmlContent;
  document.body.appendChild(tempDiv);

  await convertAllImages(tempDiv);
  await waitForImages(tempDiv);
  await new Promise(resolve => setTimeout(resolve, 250));

  try {
    const canvas = await html2canvas(tempDiv, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      width: A4_WIDTH_PX,
      windowWidth: A4_WIDTH_PX,
      logging: false,
    });

    return generatePdfFromCanvas(canvas, orientation);
  } finally {
    document.body.removeChild(tempDiv);
  }
}

export { FONT_FAMILY };
