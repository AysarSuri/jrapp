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
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/png"));
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
  for (const img of Array.from(imgs)) {
    if (img.src && !img.src.startsWith("data:")) {
      const dataUri = await imageToDataUri(img.src);
      img.src = dataUri;
    }
  }
}

function deepCopyComputedStyles(source: HTMLElement, target: HTMLElement): void {
  const computed = window.getComputedStyle(source);
  for (let i = 0; i < computed.length; i++) {
    const prop = computed[i];
    try {
      (target.style as any)[prop] = computed.getPropertyValue(prop);
    } catch {}
  }

  const sourceChildren = source.children;
  const targetChildren = target.children;
  for (let i = 0; i < sourceChildren.length && i < targetChildren.length; i++) {
    if (sourceChildren[i] instanceof HTMLElement && targetChildren[i] instanceof HTMLElement) {
      deepCopyComputedStyles(sourceChildren[i] as HTMLElement, targetChildren[i] as HTMLElement);
    }
  }
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

function generatePdfFromCanvas(
  canvas: HTMLCanvasElement,
  orientation: "p" | "l"
): Blob {
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

  const clone = element.cloneNode(true) as HTMLElement;

  deepCopyComputedStyles(element, clone);

  clone.style.position = "fixed";
  clone.style.left = "0px";
  clone.style.top = "0px";
  clone.style.width = A4_WIDTH_PX + "px";
  clone.style.minWidth = A4_WIDTH_PX + "px";
  clone.style.maxWidth = A4_WIDTH_PX + "px";
  clone.style.background = "white";
  clone.style.zIndex = "2147483647";
  clone.style.overflow = "visible";
  clone.style.pointerEvents = "none";
  clone.style.opacity = "1";

  const dir = window.getComputedStyle(element).direction;
  if (dir) clone.style.direction = dir;

  const origFontFamily = element.style.fontFamily;
  if (origFontFamily) clone.style.fontFamily = origFontFamily;
  else clone.style.fontFamily = FONT_FAMILY;

  document.body.appendChild(clone);

  await convertAllImages(clone);
  await waitForImages(clone);
  await new Promise(resolve => setTimeout(resolve, 250));

  try {
    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      width: A4_WIDTH_PX,
      windowWidth: A4_WIDTH_PX,
      logging: false,
      onclone: (doc: Document) => {
        const allEls = doc.querySelectorAll("*");
        allEls.forEach(el => {
          if (el instanceof HTMLElement) {
            const cs = window.getComputedStyle(el);
            if (cs.display === "grid") {
              el.style.display = "flex";
              el.style.flexWrap = "wrap";
            }
          }
        });
      },
    });

    return generatePdfFromCanvas(canvas, orientation);
  } finally {
    document.body.removeChild(clone);
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
