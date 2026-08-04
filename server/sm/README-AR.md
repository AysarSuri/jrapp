# ميزات السوبرماركت المنقولة (SM)

تم نقل 7 ميزات من نظام السوبرماركت إلى هذا المشروع مع الإبقاء على نفس مسارات الـ API
التي يستدعيها واجهة السوبرماركت:

- `/api/branches` — الفروع
- `/api/shifts` — الورديات (الشِفتات) وتقاريرها
- `/api/productions` — التحويل والإنتاج (تحويل مادة جملة إلى مواد مفرد)
- `/api/cashier` — تقرير صندوق الكاشير (نقدي)
- `/api/cashier-cards` — تقرير صندوق الكاشير موزّعاً على كروت الدفع
- `/api/capital` — رأس المال (جرد المواد + ديون الزبائن − ديون الموردين)
- `/api/payment-cards` — كروت الدفع وربطها بالفروع وتقاريرها

## لا يوجد تعارض في المسارات
تم فحص `server/routes.ts` و `shared/routes.ts`، ولا يوجد أي مسار من المسارات السبعة
موجوداً مسبقاً في نظام JR، لذلك **لم نُضِف بادئة `/api/sm-`** لأي مسار.

## الجداول المُضافة
أُضيفت الجداول التالية إلى `shared/schema.ts`. جميعها بأسماء فيزيائية تبدأ بالبادئة
`sm_` لتفادي التعارض مع جداول JR الموجودة أصلاً (products / expenses / suppliers /
customers / supplier_payments … وهي بأعمدة مختلفة تماماً). لم نُعدّل أي جدول من جداول JR.

الجداول الأساسية للميزات السبع:
- `sm_branches` (branchesTable)
- `sm_shifts` (shiftsTable)
- `sm_productions` (productionsTable) و `sm_production_items` (productionItemsTable)
- `sm_product_stocks` (productStocksTable)
- `sm_payment_cards` (paymentCardsTable) و `sm_payment_card_branches` (paymentCardBranchesTable)

جداول المصادر التي تعتمد عليها تقارير الكاشير/الكروت/رأس المال/الورديات
(أُنشئت كنسخ بأسماء `sm_` كي تُملأ لاحقاً عند إكمال النقل، وحتى تعمل التجميعات):
- `sm_products` (productsSmTable), `sm_customers` (customersSmTable), `sm_suppliers` (suppliersSmTable)
- `sm_sales` + `sm_sale_items`, `sm_purchases` + `sm_purchase_items`
- `sm_supplier_returns` + `sm_supplier_return_items`
- `sm_expenses`, `sm_customer_transactions`, `sm_supplier_payments`
- `sm_owner_returns`, `sm_owner_withdrawals`
- جداول حركة المخزون التي يستعملها إعادة حساب الكميات/التكلفة:
  `sm_damages`, `sm_stock_transfers` + `sm_stock_transfer_items`, `sm_inventory_adjustments`

## المصادقة (Authentication)
استُبدلت مصادقة JWT الخاصة بنظام السوبرماركت بمصادقة الجلسة (session) الخاصة بنظام JR.
انظر `server/sm/lib/smAuth.ts`: الدالة `requireAuth` تتحقق من `req.session.userId`
ثم تُحمّل المستخدم من قاعدة البيانات وتضع `req.user` بالشكل الذي تتوقعه المسارات المنقولة.
بما أن JR لا يملك مفهوم "الفرع" على مستوى المستخدم، فإن `branchId`/`branchName`
يأتيان `null`؛ وعليه يُعامَل مدير النظام (admin) كـ "كل الفروع"، وبقية الأدوار كـ "بدون فرع".

> ملاحظة: عمود `user_id` في `sm_shifts` و `sm_sales` من نوع `text` (وليس رقمياً)
> ليتوافق مع معرّف مستخدم JR الذي هو UUID نصّي.

## التسجيل (Registration)
تُسجَّل المسارات عبر `registerSmRoutes(app)` في `server/sm-routes.ts`، وتُستدعى من
داخل `registerRoutes` في `server/routes.ts` قبل `return httpServer`.

## قاعدة البيانات
**لم يتم تشغيل أي أمر على قاعدة البيانات.** بعد المراجعة، يجب تشغيل:

```bash
npm run db:push
```

لإنشاء جداول `sm_*` الجديدة في قاعدة البيانات (drizzle-kit).
