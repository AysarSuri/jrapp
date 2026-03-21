import { toCanvas } from "html-to-image";
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
  await new Promise(resolve => setTimeout(resolve, 200));
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

function removeOverflowConstraints(element: HTMLElement): Array<{ el: HTMLElement; overflow: string; overflowX: string; overflowY: string; maxHeight: string; clipPath: string }> {
  const saved: Array<{ el: HTMLElement; overflow: string; overflowX: string; overflowY: string; maxHeight: string; clipPath: string }> = [];
  let parent = element.parentElement;
  while (parent && parent !== document.body) {
    const cs = getComputedStyle(parent);
    if (cs.overflow !== "visible" || cs.overflowX !== "visible" || cs.overflowY !== "visible" || cs.maxHeight !== "none" || cs.clipPath !== "none") {
      saved.push({
        el: parent,
        overflow: parent.style.overflow,
        overflowX: parent.style.overflowX,
        overflowY: parent.style.overflowY,
        maxHeight: parent.style.maxHeight,
        clipPath: parent.style.clipPath,
      });
      parent.style.overflow = "visible";
      parent.style.overflowX = "visible";
      parent.style.overflowY = "visible";
      parent.style.maxHeight = "none";
      parent.style.clipPath = "none";
    }
    parent = parent.parentElement;
  }
  return saved;
}

function restoreOverflowConstraints(saved: Array<{ el: HTMLElement; overflow: string; overflowX: string; overflowY: string; maxHeight: string; clipPath: string }>) {
  saved.forEach(({ el, overflow, overflowX, overflowY, maxHeight, clipPath }) => {
    el.style.overflow = overflow;
    el.style.overflowX = overflowX;
    el.style.overflowY = overflowY;
    el.style.maxHeight = maxHeight;
    el.style.clipPath = clipPath;
  });
}

export async function captureElementAsPdf(
  element: HTMLElement,
  orientation: "p" | "l" = "p"
): Promise<Blob | null> {
  await ensureFontsLoaded();

  const saved = removeOverflowConstraints(element);

  try {
    const canvas = await toCanvas(element, {
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      width: element.scrollWidth || A4_WIDTH_PX,
      height: element.scrollHeight,
      cacheBust: true,
      skipAutoScale: true,
      filter: (node: HTMLElement) => {
        if (node.tagName === "NOSCRIPT") return false;
        return true;
      },
    });

    if (!canvas || canvas.width < 10 || canvas.height < 10) {
      console.error("html-to-image produced empty canvas, falling back to html2canvas");
      const html2canvas = (await import("html2canvas")).default;
      const fallbackCanvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        width: A4_WIDTH_PX,
        windowWidth: A4_WIDTH_PX + 100,
        logging: false,
      });
      return generatePdfFromCanvas(fallbackCanvas, orientation);
    }

    return generatePdfFromCanvas(canvas, orientation);
  } catch (err) {
    console.error("html-to-image error:", err);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const fallbackCanvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        width: A4_WIDTH_PX,
        windowWidth: A4_WIDTH_PX + 100,
        logging: false,
      });
      return generatePdfFromCanvas(fallbackCanvas, orientation);
    } catch (err2) {
      console.error("html2canvas also failed:", err2);
      return null;
    }
  } finally {
    restoreOverflowConstraints(saved);
  }
}

async function imageToDataUri(src: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = img.naturalWidth || 200;
        c.height = img.naturalHeight || 200;
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
    setTimeout(() => resolve(src), 5000);
    img.src = src;
  });
}

export async function captureHtmlAsPdf(
  htmlContent: string,
  isRtl: boolean = false,
  orientation: "p" | "l" = "p"
): Promise<Blob | null> {
  await ensureFontsLoaded();

  const wrapper = document.createElement("div");
  wrapper.style.cssText = "position:fixed;left:0;top:0;z-index:99999;opacity:0.01;pointer-events:none;overflow:visible;";

  const tempDiv = document.createElement("div");
  tempDiv.style.cssText = `position:relative;width:${A4_WIDTH_PX}px;background:white;padding:20px 25px;box-sizing:border-box;font-size:10pt;font-family:${FONT_FAMILY};direction:${isRtl ? "rtl" : "ltr"};overflow:visible;color:#000;`;
  tempDiv.innerHTML = htmlContent;

  wrapper.appendChild(tempDiv);
  document.body.appendChild(wrapper);

  const imgs = tempDiv.querySelectorAll("img");
  const promises = Array.from(imgs).map(async (img) => {
    if (img.src && !img.src.startsWith("data:")) {
      const dataUri = await imageToDataUri(img.src);
      if (dataUri.startsWith("data:")) img.src = dataUri;
    }
  });
  await Promise.all(promises);

  await new Promise(resolve => setTimeout(resolve, 500));

  try {
    const canvas = await toCanvas(tempDiv, {
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      width: A4_WIDTH_PX,
      cacheBust: true,
    });

    return generatePdfFromCanvas(canvas, orientation);
  } catch (err) {
    console.error("captureHtmlAsPdf error:", err);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        width: A4_WIDTH_PX,
        windowWidth: A4_WIDTH_PX + 100,
        logging: false,
      });
      return generatePdfFromCanvas(canvas, orientation);
    } catch {
      return null;
    }
  } finally {
    document.body.removeChild(wrapper);
  }
}

export { FONT_FAMILY };
