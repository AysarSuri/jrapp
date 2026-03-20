import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

const FONT_URL = "https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;500;600;700&family=Noto+Kufi+Arabic:wght@400;500;600;700&family=Tajawal:wght@300;400;500;700;800&family=Noto+Sans+Arabic:wght@300;400;500;600;700&display=swap";

const FONT_FAMILY = "'Noto Naskh Arabic','Tajawal','Noto Sans Arabic','Noto Kufi Arabic','Segoe UI',sans-serif";

const KURDISH_TEST_CHARS = "پچڤگڵڕێۆژ فاتورة مبيعات فرۆشتن لیستی حسابی دۆلار پسوولە";

async function ensureFontsLoaded(): Promise<void> {
  if (!document.fonts) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return;
  }

  await document.fonts.ready;

  const fontFaces = [
    '400 16px "Noto Naskh Arabic"',
    '500 16px "Noto Naskh Arabic"',
    '600 16px "Noto Naskh Arabic"',
    '700 16px "Noto Naskh Arabic"',
    '400 16px "Tajawal"',
    '500 16px "Tajawal"',
    '700 16px "Tajawal"',
    '800 16px "Tajawal"',
    '400 16px "Noto Sans Arabic"',
    '500 16px "Noto Sans Arabic"',
    '600 16px "Noto Sans Arabic"',
    '700 16px "Noto Sans Arabic"',
  ];

  const loadPromises = fontFaces.map(face => {
    return document.fonts.load(face, KURDISH_TEST_CHARS).catch(() => {});
  });

  await Promise.all(loadPromises);
  await document.fonts.ready;
  await new Promise(resolve => setTimeout(resolve, 200));
}

function preRenderFonts(): HTMLDivElement {
  const preRender = document.createElement("div");
  preRender.style.cssText = "position:fixed;left:-99999px;top:-99999px;opacity:0;pointer-events:none;font-size:16px;white-space:nowrap;";
  preRender.innerHTML = [
    `<span style="font-family:'Noto Naskh Arabic';font-weight:400">${KURDISH_TEST_CHARS}</span>`,
    `<span style="font-family:'Noto Naskh Arabic';font-weight:700">${KURDISH_TEST_CHARS}</span>`,
    `<span style="font-family:'Tajawal';font-weight:400">${KURDISH_TEST_CHARS}</span>`,
    `<span style="font-family:'Tajawal';font-weight:700">${KURDISH_TEST_CHARS}</span>`,
    `<span style="font-family:'Noto Sans Arabic';font-weight:400">${KURDISH_TEST_CHARS}</span>`,
    `<span style="font-family:'Noto Sans Arabic';font-weight:700">${KURDISH_TEST_CHARS}</span>`,
  ].join("");
  document.body.appendChild(preRender);
  return preRender;
}

export async function captureElementAsPdf(
  element: HTMLElement,
  orientation: "p" | "l" = "p"
): Promise<Blob | null> {
  const preRender = preRenderFonts();

  await ensureFontsLoaded();

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#ffffff",
      onclone: (_clonedDoc, clonedElement) => {
        clonedElement.style.fontFamily = FONT_FAMILY;
        const allEls = clonedElement.querySelectorAll("*");
        allEls.forEach((el) => {
          if (el instanceof HTMLElement) {
            el.style.fontFamily = FONT_FAMILY;
          }
        });
      },
    });

    const imgWidth = orientation === "p" ? 210 : 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pdf = new jsPDF(orientation, "mm", "a4");
    const imgData = canvas.toDataURL("image/png");
    pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);

    return pdf.output("blob");
  } finally {
    if (preRender.parentNode) {
      document.body.removeChild(preRender);
    }
  }
}

export async function captureHtmlAsPdf(
  htmlContent: string,
  isRtl: boolean = false,
  orientation: "p" | "l" = "p"
): Promise<Blob | null> {
  const preRender = preRenderFonts();

  await ensureFontsLoaded();

  const tempDiv = document.createElement("div");
  tempDiv.style.cssText = `position:absolute;left:-9999px;top:0;width:794px;background:white;padding:15px;font-size:10pt;font-family:${FONT_FAMILY};direction:${isRtl ? "rtl" : "ltr"}`;
  tempDiv.innerHTML = htmlContent;
  document.body.appendChild(tempDiv);

  try {
    const canvas = await html2canvas(tempDiv, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#ffffff",
      onclone: (_clonedDoc, clonedElement) => {
        clonedElement.style.fontFamily = FONT_FAMILY;
        const allEls = clonedElement.querySelectorAll("*");
        allEls.forEach((el) => {
          if (el instanceof HTMLElement) {
            el.style.fontFamily = FONT_FAMILY;
          }
        });
      },
    });

    const imgWidth = orientation === "p" ? 210 : 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pdf = new jsPDF(orientation, "mm", "a4");
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, imgWidth, imgHeight);
    return pdf.output("blob");
  } finally {
    document.body.removeChild(tempDiv);
    if (preRender.parentNode) {
      document.body.removeChild(preRender);
    }
  }
}

export { FONT_FAMILY, FONT_URL };
