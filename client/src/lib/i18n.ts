import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Simple translations for MVP
const resources = {
  en: {
    translation: {
      "Dashboard": "Dashboard",
      "Products": "Products",
      "Clients": "Clients",
      "Accounts": "Accounts",
      "Invoices": "Invoices",
      "Transactions": "Transactions",
      "Login": "Login",
      "Logout": "Logout",
      "Welcome back": "Welcome back",
      "Total Sales": "Total Sales",
      "Total Purchases": "Total Purchases",
      "Net Profit": "Net Profit",
      "Active Clients": "Active Clients",
      "Add Product": "Add Product",
      "Search products...": "Search products...",
      "Barcode": "Barcode",
      "Name": "Name",
      "Category": "Category",
      "Price (USD)": "Price (USD)",
      "Price (IQD)": "Price (IQD)",
      "Stock": "Stock",
      "Actions": "Actions",
      "Save": "Save",
      "Cancel": "Cancel",
      "Delete": "Delete"
    }
  },
  ar: {
    translation: {
      "Dashboard": "لوحة التحكم",
      "Products": "المنتجات",
      "Clients": "العملاء",
      "Accounts": "الحسابات",
      "Invoices": "الفواتير",
      "Transactions": "المعاملات",
      "Login": "تسجيل الدخول",
      "Logout": "تسجيل الخروج",
      "Welcome back": "مرحباً بعودتك",
      "Total Sales": "إجمالي المبيعات",
      "Total Purchases": "إجمالي المشتريات",
      "Net Profit": "صافي الربح",
      "Active Clients": "العملاء النشطين",
      "Add Product": "إضافة منتج",
      "Search products...": "بحث عن منتج...",
      "Barcode": "الباركود",
      "Name": "الاسم",
      "Category": "الفئة",
      "Price (USD)": "السعر (دولار)",
      "Price (IQD)": "السعر (دينار)",
      "Stock": "المخزون",
      "Actions": "إجراءات",
      "Save": "حفظ",
      "Cancel": "إلغاء",
      "Delete": "حذف"
    }
  },
  ckb: {
    translation: {
      "Dashboard": "داشبۆرد",
      "Products": "بەرهەمەکان",
      "Clients": "مشتریان",
      "Accounts": "هەژمارەکان",
      "Invoices": "پسولەکان",
      "Transactions": "مامەڵەکان",
      "Login": "چوونەژوورەوە",
      "Logout": "دەرچوون",
      "Welcome back": "بەخێربێیتەوە",
      "Total Sales": "کۆی فرۆشتن",
      "Total Purchases": "کۆی کڕین",
      "Net Profit": "قازانجی پوخت",
      "Active Clients": "مشتری چالاک",
      "Add Product": "زیادکردنی بەرهەم",
      "Search products...": "گەڕان بۆ بەرهەم...",
      "Barcode": "بارکۆد",
      "Name": "ناو",
      "Category": "جۆر",
      "Price (USD)": "نرخ (دۆلار)",
      "Price (IQD)": "نرخ (دینار)",
      "Stock": "مەخزەن",
      "Actions": "کردارەکان",
      "Save": "خەزن کردن",
      "Cancel": "پاشگەزبوونەوە",
      "Delete": "سڕینەوە"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en", // default language
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
