import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Simple translation resources
const resources = {
  en: {
    translation: {
      nav: {
        dashboard: "Dashboard",
        products: "Products",
        clients: "Clients",
        accounts: "Accounts",
        invoices: "Invoices",
        transactions: "Transactions"
      },
      dashboard: {
        totalSales: "Total Sales",
        totalPurchases: "Total Purchases",
        cashBalance: "Cash Balance",
        activeProducts: "Active Products"
      },
      common: {
        add: "Add New",
        save: "Save",
        cancel: "Cancel",
        delete: "Delete",
        edit: "Edit",
        actions: "Actions",
        search: "Search..."
      }
    }
  },
  ar: {
    translation: {
      nav: {
        dashboard: "لوحة التحكم",
        products: "المنتجات",
        clients: "العملاء",
        accounts: "الحسابات",
        invoices: "الفواتير",
        transactions: "المعاملات"
      },
      dashboard: {
        totalSales: "إجمالي المبيعات",
        totalPurchases: "إجمالي المشتريات",
        cashBalance: "الرصيد النقدي",
        activeProducts: "المنتجات النشطة"
      },
      common: {
        add: "إضافة جديد",
        save: "حفظ",
        cancel: "إلغاء",
        delete: "حذف",
        edit: "تعديل",
        actions: "إجراءات",
        search: "بحث..."
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en", 
    interpolation: {
      escapeValue: false 
    }
  });

export default i18n;
