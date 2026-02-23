import i18n from "./i18n";

type ProductLike = {
  name: string;
  nameEn?: string | null;
};

type UnitLike = {
  name: string;
  nameEn?: string | null;
  nameKu?: string | null;
  nameTr?: string | null;
};

export function getProductName(product: ProductLike): string {
  const lang = i18n.language;
  if (lang === "en" || lang === "tr") {
    return product.nameEn || product.name;
  }
  return product.name;
}

export function getUnitName(unit: UnitLike): string {
  const lang = i18n.language;
  if (lang === "en") {
    return unit.nameEn || unit.name;
  }
  if (lang === "ckb") {
    return unit.nameKu || unit.name;
  }
  if (lang === "tr") {
    return unit.nameTr || unit.name;
  }
  return unit.name;
}

export function resolveUnitName(unitArabicName: string, unitsList: UnitLike[]): string {
  const unit = unitsList.find(u => u.name === unitArabicName);
  if (unit) {
    return getUnitName(unit);
  }
  return unitArabicName;
}

export function getProductNameByLang(name: string, nameEn?: string | null): string {
  const lang = i18n.language;
  if (lang === "en" || lang === "tr") {
    return nameEn || name;
  }
  return name;
}

export function getUnitNameByLang(name: string, nameEn?: string | null, nameKu?: string | null, nameTr?: string | null): string {
  const lang = i18n.language;
  if (lang === "en") {
    return nameEn || name;
  }
  if (lang === "ckb") {
    return nameKu || name;
  }
  if (lang === "tr") {
    return nameTr || name;
  }
  return name;
}
