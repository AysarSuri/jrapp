const onesAr = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة",
  "عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
const tensAr = ["", "", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
const onesEn = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const tensEn = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const onesKu = ["", "یەک", "دوو", "سێ", "چوار", "پێنج", "شەش", "حەوت", "هەشت", "نۆ",
  "دە", "یازدە", "دوازدە", "سێزدە", "چواردە", "پازدە", "شازدە", "حەڤدە", "هەژدە", "نۆزدە"];
const tensKu = ["", "", "بیست", "سی", "چل", "پەنجا", "شەست", "حەفتا", "هەشتا", "نەوەد"];
const onesTr = ["", "bir", "iki", "üç", "dört", "beş", "altı", "yedi", "sekiz", "dokuz",
  "on", "on bir", "on iki", "on üç", "on dört", "on beş", "on altı", "on yedi", "on sekiz", "on dokuz"];
const tensTr = ["", "", "yirmi", "otuz", "kırk", "elli", "altmış", "yetmiş", "seksen", "doksan"];

function convertHundreds(n: number, lang: string): string {
  if (n === 0) return "";
  const ones = lang === "ar" ? onesAr : lang === "ckb" ? onesKu : lang === "tr" ? onesTr : onesEn;
  const tens = lang === "ar" ? tensAr : lang === "ckb" ? tensKu : lang === "tr" ? tensTr : tensEn;
  const hundred = lang === "ar" ? "مئة" : lang === "ckb" ? "سەد" : lang === "tr" ? "yüz" : "hundred";
  const and = lang === "ar" ? " و" : lang === "ckb" ? " و " : lang === "tr" ? " " : " and ";

  let result = "";
  if (n >= 100) {
    const h = Math.floor(n / 100);
    if (h === 1) {
      result = hundred;
    } else if (h === 2 && lang === "ar") {
      result = "مئتان";
    } else {
      result = ones[h] + " " + hundred;
    }
    n %= 100;
    if (n > 0) result += and;
  }
  if (n >= 20) {
    const t = Math.floor(n / 10);
    const o = n % 10;
    if (lang === "ar") {
      result += o > 0 ? ones[o] + " و" + tens[t] : tens[t];
    } else {
      result += tens[t] + (o > 0 ? (lang === "en" ? "-" : " و ") + ones[o] : "");
    }
  } else if (n > 0) {
    result += ones[n];
  }
  return result;
}

function getScaleWords(lang: string) {
  if (lang === "ar") return { billion: "مليار", million: "مليون", thousand: "ألف" };
  if (lang === "ckb") return { billion: "ملیار", million: "ملیۆن", thousand: "هەزار" };
  if (lang === "tr") return { billion: "milyar", million: "milyon", thousand: "bin" };
  return { billion: "billion", million: "million", thousand: "thousand" };
}

export function numberToWords(amount: number, lang: string, currency?: string): string {
  if (amount === 0) {
    const zero = lang === "ar" ? "صفر" : lang === "ckb" ? "سفر" : lang === "tr" ? "sıfır" : "zero";
    return zero;
  }

  const isNegative = amount < 0;
  amount = Math.abs(amount);

  const intPart = Math.floor(amount);
  const decPart = Math.round((amount - intPart) * 100);

  const scale = getScaleWords(lang);
  const and = lang === "ar" ? " و" : lang === "ckb" ? " و " : lang === "tr" ? " " : " and ";

  let parts: string[] = [];

  const billions = Math.floor(intPart / 1000000000);
  const millions = Math.floor((intPart % 1000000000) / 1000000);
  const thousands = Math.floor((intPart % 1000000) / 1000);
  const remainder = intPart % 1000;

  if (billions > 0) {
    parts.push(convertHundreds(billions, lang) + " " + scale.billion);
  }
  if (millions > 0) {
    parts.push(convertHundreds(millions, lang) + " " + scale.million);
  }
  if (thousands > 0) {
    if (thousands === 1 && lang === "tr") {
      parts.push(scale.thousand);
    } else {
      parts.push(convertHundreds(thousands, lang) + " " + scale.thousand);
    }
  }
  if (remainder > 0) {
    parts.push(convertHundreds(remainder, lang));
  }

  let result = parts.join(and);

  if (decPart > 0) {
    const centWord = lang === "ar" ? "سنت" : lang === "ckb" ? "سەنت" : lang === "tr" ? "sent" : "cents";
    result += and + convertHundreds(decPart, lang) + " " + centWord;
  }

  if (currency) {
    const currencyNames: Record<string, Record<string, string>> = {
      USD: { ar: "دولار", ckb: "دۆلار", tr: "dolar", en: "USD" },
      IQD: { ar: "دينار عراقي", ckb: "دیناری عێراقی", tr: "Irak dinarı", en: "IQD" },
    };
    const name = currencyNames[currency]?.[lang] || currency;
    result += " " + name;
  }

  if (isNegative) {
    const neg = lang === "ar" ? "سالب " : lang === "ckb" ? "نێگەتیڤ " : lang === "tr" ? "eksi " : "negative ";
    result = neg + result;
  }

  return result;
}
