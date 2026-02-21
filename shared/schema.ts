import { sql } from "drizzle-orm";
import { pgTable, text, serial, integer, timestamp, numeric, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const addresses = pgTable("addresses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const units = pgTable("units", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const transferOffices = pgTable("transfer_offices", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  oldDebtUsd: numeric("old_debt_usd").notNull().default("0"),
  oldDebtIqd: numeric("old_debt_iqd").notNull().default("0"),
});

export const banks = pgTable("banks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  oldDebtUsd: numeric("old_debt_usd").notNull().default("0"),
  oldDebtIqd: numeric("old_debt_iqd").notNull().default("0"),
});

export const customsClearances = pgTable("customs_clearances", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  oldDebtUsd: numeric("old_debt_usd").notNull().default("0"),
  oldDebtIqd: numeric("old_debt_iqd").notNull().default("0"),
});

export const warehouses = pgTable("warehouses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const representatives = pgTable("representatives", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  mobile: text("mobile"),
  agreementType: text("agreement_type").notNull().default("commission"),
});

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull(), // 'admin', 'accountant', 'purchasing', 'warehouse', 'sales_rep'
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  barcode: text("barcode").notNull().unique(),
  name: text("name").notNull().unique(),
  category: text("category").notNull(),
  bigUnitPriceUsd: numeric("big_unit_price_usd").notNull(),
  bigUnitPriceIqd: numeric("big_unit_price_iqd").notNull(),
  smallUnitPriceUsd: numeric("small_unit_price_usd").notNull(),
  smallUnitPriceIqd: numeric("small_unit_price_iqd").notNull(),
  minStock: integer("min_stock").notNull().default(0),
  weight: numeric("weight").notNull().default("0"), // weight per big unit in KG
  bigUnit: text("big_unit").notNull(), // e.g. Box
  smallUnit: text("small_unit").notNull(), // e.g. Piece
  conversionFactor: integer("conversion_factor").notNull(), // e.g. 24
});

export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  quantity: integer("quantity").notNull().default(0), // in small units
});

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  type: text("type").notNull(), // 'supplier' | 'customer'
  contact: text("contact"),
  address: text("address"),
  balance: numeric("balance").notNull().default('0'),
  oldDebtUsd: numeric("old_debt_usd").notNull().default('0'),
  oldDebtIqd: numeric("old_debt_iqd").notNull().default('0'),
});

export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'bank' | 'transfer_office' | 'cash'
  currency: text("currency").notNull(), // 'USD' | 'IQD'
  balance: numeric("balance").notNull().default('0'),
});

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull(),
  type: text("type").notNull(), // 'purchase' | 'sale'
  date: timestamp("date").defaultNow().notNull(),
  total: numeric("total").notNull(),
  currency: text("currency").notNull(),
  status: text("status").notNull().default('draft'), // 'draft' | 'approved'
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  fromAccountId: integer("from_account_id"),
  toAccountId: integer("to_account_id"),
  amount: numeric("amount").notNull(),
  currency: text("currency").notNull(),
  type: text("type").notNull(), // 'deposit' | 'withdrawal' | 'transfer' | 'payment' | 'receipt'
  reference: text("reference"),
  date: timestamp("date").defaultNow().notNull(),
});

export const purchaseInvoices = pgTable("purchase_invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull(),
  date: text("date").notNull(),
  time: text("time").notNull(),
  supplierId: integer("supplier_id"),
  supplierName: text("supplier_name").notNull(),
  address: text("address"),
  note: text("note"),
  customsClearance: text("customs_clearance"),
  carNumber: text("car_number"),
  manifest: text("manifest"),
  invoiceType: text("invoice_type").notNull().default("cash"),
  carExpense: numeric("car_expense").notNull().default("0"),
  customsExpense: numeric("customs_expense").notNull().default("0"),
  otherExpenses: numeric("other_expenses").notNull().default("0"),
  totalExpenses: numeric("total_expenses").notNull().default("0"),
  subtotal: numeric("subtotal").notNull().default("0"),
  discount: numeric("discount").notNull().default("0"),
  amountPaid: numeric("amount_paid").notNull().default("0"),
  remaining: numeric("remaining").notNull().default("0"),
  totalItems: integer("total_items").notNull().default(0),
  totalQuantity: numeric("total_quantity").notNull().default("0"),
  currency: text("currency").notNull().default("USD"),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const purchaseInvoiceItems = pgTable("purchase_invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull(),
  productId: integer("product_id"),
  productCode: text("product_code").notNull(),
  productName: text("product_name").notNull(),
  quantity: numeric("quantity").notNull(),
  unit: text("unit").notNull(),
  price: numeric("price").notNull(),
  amount: numeric("amount").notNull(),
  productionDate: text("production_date"),
  expiryDate: text("expiry_date"),
});

export const supplierPayments = pgTable("supplier_payments", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id").notNull(),
  supplierName: text("supplier_name").notNull(),
  paymentSource: text("payment_source").notNull(), // 'bank' | 'transfer_office'
  paymentSourceName: text("payment_source_name").notNull(),
  amountUsd: numeric("amount_usd").notNull().default("0"),
  amountIqd: numeric("amount_iqd").notNull().default("0"),
  commissionUsd: numeric("commission_usd").notNull().default("0"),
  commissionIqd: numeric("commission_iqd").notNull().default("0"),
  oldDebtUsd: numeric("old_debt_usd").notNull().default("0"),
  oldDebtIqd: numeric("old_debt_iqd").notNull().default("0"),
  remainingUsd: numeric("remaining_usd").notNull().default("0"),
  remainingIqd: numeric("remaining_iqd").notNull().default("0"),
  note: text("note"),
  reference: text("reference"),
  date: text("date").notNull(),
  time: text("time").notNull().default("00:00"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const supplierAdjustments = pgTable("supplier_adjustments", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id").notNull(),
  supplierName: text("supplier_name").notNull(),
  type: text("type").notNull(), // 'received' | 'discount'
  amountUsd: numeric("amount_usd").notNull().default("0"),
  amountIqd: numeric("amount_iqd").notNull().default("0"),
  oldDebtUsd: numeric("old_debt_usd").notNull().default("0"),
  oldDebtIqd: numeric("old_debt_iqd").notNull().default("0"),
  remainingUsd: numeric("remaining_usd").notNull().default("0"),
  remainingIqd: numeric("remaining_iqd").notNull().default("0"),
  note: text("note"),
  date: text("date").notNull(),
  time: text("time").notNull().default("00:00"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bankTransactions = pgTable("bank_transactions", {
  id: serial("id").primaryKey(),
  bankId: integer("bank_id").notNull(),
  bankName: text("bank_name").notNull(),
  type: text("type").notNull(), // 'receipt' | 'payment'
  amountUsd: numeric("amount_usd").notNull().default("0"),
  amountIqd: numeric("amount_iqd").notNull().default("0"),
  description: text("description"),
  reference: text("reference"),
  date: text("date").notNull(),
  time: text("time").notNull().default("00:00"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const customsClearanceTransactions = pgTable("customs_clearance_transactions", {
  id: serial("id").primaryKey(),
  clearanceId: integer("clearance_id").notNull(),
  clearanceName: text("clearance_name").notNull(),
  type: text("type").notNull(),
  amountUsd: numeric("amount_usd").notNull().default("0"),
  amountIqd: numeric("amount_iqd").notNull().default("0"),
  description: text("description"),
  reference: text("reference"),
  date: text("date").notNull(),
  time: text("time").notNull().default("00:00"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const transferOfficeTransactions = pgTable("transfer_office_transactions", {
  id: serial("id").primaryKey(),
  officeId: integer("office_id").notNull(),
  officeName: text("office_name").notNull(),
  type: text("type").notNull(),
  amountUsd: numeric("amount_usd").notNull().default("0"),
  amountIqd: numeric("amount_iqd").notNull().default("0"),
  description: text("description"),
  reference: text("reference"),
  date: text("date").notNull(),
  time: text("time").notNull().default("00:00"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const externalDebts = pgTable("external_debts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  oldDebtUsd: numeric("old_debt_usd").notNull().default("0"),
  oldDebtIqd: numeric("old_debt_iqd").notNull().default("0"),
});

export const externalDebtTransactions = pgTable("external_debt_transactions", {
  id: serial("id").primaryKey(),
  debtId: integer("debt_id").notNull(),
  debtName: text("debt_name").notNull(),
  type: text("type").notNull(), // 'receipt' | 'payment'
  amountUsd: numeric("amount_usd").notNull().default("0"),
  amountIqd: numeric("amount_iqd").notNull().default("0"),
  description: text("description"),
  reference: text("reference"),
  date: text("date").notNull(),
  time: text("time").notNull().default("00:00"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const owners = pgTable("owners", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  oldDebtUsd: numeric("old_debt_usd").notNull().default("0"),
  oldDebtIqd: numeric("old_debt_iqd").notNull().default("0"),
});

export const ownerTransactions = pgTable("owner_transactions", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").notNull(),
  ownerName: text("owner_name").notNull(),
  type: text("type").notNull(), // 'withdrawal' | 'return'
  amountUsd: numeric("amount_usd").notNull().default("0"),
  amountIqd: numeric("amount_iqd").notNull().default("0"),
  description: text("description"),
  reference: text("reference"),
  date: text("date").notNull(),
  time: text("time").notNull().default("00:00"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const expenseTypes = pgTable("expense_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  expenseTypeId: integer("expense_type_id").notNull(),
  expenseTypeName: text("expense_type_name").notNull(),
  amountUsd: numeric("amount_usd").notNull().default("0"),
  amountIqd: numeric("amount_iqd").notNull().default("0"),
  description: text("description"),
  reference: text("reference"),
  date: text("date").notNull(),
  time: text("time").notNull().default("00:00"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const salesInvoices = pgTable("sales_invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull(),
  date: text("date").notNull(),
  time: text("time").notNull(),
  customerId: integer("customer_id"),
  customerName: text("customer_name").notNull(),
  address: text("address"),
  mobile: text("mobile"),
  representativeId: integer("representative_id"),
  representativeName: text("representative_name"),
  representativeMobile: text("representative_mobile"),
  note: text("note"),
  invoiceType: text("invoice_type").notNull().default("cash"),
  subtotal: numeric("subtotal").notNull().default("0"),
  discount: numeric("discount").notNull().default("0"),
  amountPaid: numeric("amount_paid").notNull().default("0"),
  remaining: numeric("remaining").notNull().default("0"),
  totalItems: integer("total_items").notNull().default(0),
  totalQuantity: numeric("total_quantity").notNull().default("0"),
  currency: text("currency").notNull().default("USD"),
  status: text("status").notNull().default("approved"),
  driverName: text("driver_name"),
  driverMobile: text("driver_mobile"),
  vehicleNumber: text("vehicle_number"),
  createdBy: text("created_by"),
  createdByRole: text("created_by_role"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const salesInvoiceItems = pgTable("sales_invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull(),
  productId: integer("product_id"),
  productCode: text("product_code").notNull(),
  productName: text("product_name").notNull(),
  quantity: numeric("quantity").notNull(),
  unit: text("unit").notNull(),
  price: numeric("price").notNull(),
  amount: numeric("amount").notNull(),
});

export const salesReturns = pgTable("sales_returns", {
  id: serial("id").primaryKey(),
  returnNumber: text("return_number").notNull(),
  date: text("date").notNull(),
  time: text("time").notNull(),
  customerId: integer("customer_id"),
  customerName: text("customer_name").notNull(),
  address: text("address"),
  mobile: text("mobile"),
  representativeId: integer("representative_id"),
  representativeName: text("representative_name"),
  representativeMobile: text("representative_mobile"),
  note: text("note"),
  returnType: text("return_type").notNull().default("cash"),
  subtotal: numeric("subtotal").notNull().default("0"),
  discount: numeric("discount").notNull().default("0"),
  amountPaid: numeric("amount_paid").notNull().default("0"),
  remaining: numeric("remaining").notNull().default("0"),
  totalItems: integer("total_items").notNull().default(0),
  totalQuantity: numeric("total_quantity").notNull().default("0"),
  currency: text("currency").notNull().default("USD"),
  status: text("status").notNull().default("approved"),
  driverName: text("driver_name"),
  driverMobile: text("driver_mobile"),
  vehicleNumber: text("vehicle_number"),
  originalInvoiceId: integer("original_invoice_id"),
  originalInvoiceNumber: text("original_invoice_number"),
  createdBy: text("created_by"),
  createdByRole: text("created_by_role"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const salesReturnItems = pgTable("sales_return_items", {
  id: serial("id").primaryKey(),
  returnId: integer("return_id").notNull(),
  productId: integer("product_id"),
  productCode: text("product_code").notNull(),
  productName: text("product_name").notNull(),
  quantity: numeric("quantity").notNull(),
  unit: text("unit").notNull(),
  price: numeric("price").notNull(),
  amount: numeric("amount").notNull(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  referenceId: integer("reference_id"),
  referenceType: text("reference_type"),
  targetRole: text("target_role"),
  isRead: integer("is_read").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAddressSchema = createInsertSchema(addresses).omit({ id: true });
export const insertUnitSchema = createInsertSchema(units).omit({ id: true });
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export const insertTransferOfficeSchema = createInsertSchema(transferOffices).omit({ id: true });
export const insertBankSchema = createInsertSchema(banks).omit({ id: true });
export const insertCustomsClearanceSchema = createInsertSchema(customsClearances).omit({ id: true });
export const insertWarehouseSchema = createInsertSchema(warehouses).omit({ id: true });
export const insertRepresentativeSchema = createInsertSchema(representatives).omit({ id: true });
export const insertPurchaseInvoiceSchema = createInsertSchema(purchaseInvoices).omit({ id: true, createdAt: true });
export const insertPurchaseInvoiceItemSchema = createInsertSchema(purchaseInvoiceItems).omit({ id: true });
export const insertSupplierPaymentSchema = createInsertSchema(supplierPayments).omit({ id: true, createdAt: true });
export const insertSupplierAdjustmentSchema = createInsertSchema(supplierAdjustments).omit({ id: true, createdAt: true });
export const insertBankTransactionSchema = createInsertSchema(bankTransactions).omit({ id: true, createdAt: true });
export const insertCustomsClearanceTransactionSchema = createInsertSchema(customsClearanceTransactions).omit({ id: true, createdAt: true });
export const insertTransferOfficeTransactionSchema = createInsertSchema(transferOfficeTransactions).omit({ id: true, createdAt: true });
export const insertExternalDebtSchema = createInsertSchema(externalDebts).omit({ id: true });
export const insertExternalDebtTransactionSchema = createInsertSchema(externalDebtTransactions).omit({ id: true, createdAt: true });
export const insertOwnerSchema = createInsertSchema(owners).omit({ id: true });
export const insertOwnerTransactionSchema = createInsertSchema(ownerTransactions).omit({ id: true, createdAt: true });
export const insertExpenseTypeSchema = createInsertSchema(expenseTypes).omit({ id: true });
export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true, createdAt: true });
export const insertSalesInvoiceSchema = createInsertSchema(salesInvoices).omit({ id: true, createdAt: true });
export const insertSalesInvoiceItemSchema = createInsertSchema(salesInvoiceItems).omit({ id: true });
export const insertSalesReturnSchema = createInsertSchema(salesReturns).omit({ id: true, createdAt: true });
export const insertSalesReturnItemSchema = createInsertSchema(salesReturnItems).omit({ id: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true }).extend({
  barcode: z.string().min(1, "Barcode is required"),
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required"),
  bigUnit: z.string().min(1, "Big unit is required"),
  smallUnit: z.string().min(1, "Small unit is required"),
});
export const insertClientSchema = createInsertSchema(clients).omit({ id: true, balance: true }).extend({
  oldDebtUsd: z.string().optional().default('0'),
  oldDebtIqd: z.string().optional().default('0'),
});
export const insertAccountSchema = createInsertSchema(accounts).omit({ id: true, balance: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, date: true });
export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true, date: true });

// Types
export type Address = typeof addresses.$inferSelect;
export type InsertAddress = z.infer<typeof insertAddressSchema>;
export type Unit = typeof units.$inferSelect;
export type InsertUnit = z.infer<typeof insertUnitSchema>;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type TransferOffice = typeof transferOffices.$inferSelect;
export type InsertTransferOffice = z.infer<typeof insertTransferOfficeSchema>;
export type Bank = typeof banks.$inferSelect;
export type InsertBank = z.infer<typeof insertBankSchema>;
export type CustomsClearance = typeof customsClearances.$inferSelect;
export type InsertCustomsClearance = z.infer<typeof insertCustomsClearanceSchema>;
export type Warehouse = typeof warehouses.$inferSelect;
export type InsertWarehouse = z.infer<typeof insertWarehouseSchema>;
export type Representative = typeof representatives.$inferSelect;
export type InsertRepresentative = z.infer<typeof insertRepresentativeSchema>;
export type PurchaseInvoice = typeof purchaseInvoices.$inferSelect;
export type InsertPurchaseInvoice = z.infer<typeof insertPurchaseInvoiceSchema>;
export type PurchaseInvoiceItem = typeof purchaseInvoiceItems.$inferSelect;
export type InsertPurchaseInvoiceItem = z.infer<typeof insertPurchaseInvoiceItemSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Account = typeof accounts.$inferSelect;
export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type SupplierPayment = typeof supplierPayments.$inferSelect;
export type InsertSupplierPayment = z.infer<typeof insertSupplierPaymentSchema>;
export type SupplierAdjustment = typeof supplierAdjustments.$inferSelect;
export type InsertSupplierAdjustment = z.infer<typeof insertSupplierAdjustmentSchema>;
export type BankTransaction = typeof bankTransactions.$inferSelect;
export type InsertBankTransaction = z.infer<typeof insertBankTransactionSchema>;
export type CustomsClearanceTransaction = typeof customsClearanceTransactions.$inferSelect;
export type InsertCustomsClearanceTransaction = z.infer<typeof insertCustomsClearanceTransactionSchema>;
export type TransferOfficeTransaction = typeof transferOfficeTransactions.$inferSelect;
export type InsertTransferOfficeTransaction = z.infer<typeof insertTransferOfficeTransactionSchema>;
export type ExternalDebt = typeof externalDebts.$inferSelect;
export type InsertExternalDebt = z.infer<typeof insertExternalDebtSchema>;
export type ExternalDebtTransaction = typeof externalDebtTransactions.$inferSelect;
export type InsertExternalDebtTransaction = z.infer<typeof insertExternalDebtTransactionSchema>;
export type Owner = typeof owners.$inferSelect;
export type InsertOwner = z.infer<typeof insertOwnerSchema>;
export type OwnerTransaction = typeof ownerTransactions.$inferSelect;
export type InsertOwnerTransaction = z.infer<typeof insertOwnerTransactionSchema>;
export type ExpenseType = typeof expenseTypes.$inferSelect;
export type InsertExpenseType = z.infer<typeof insertExpenseTypeSchema>;
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type SalesInvoice = typeof salesInvoices.$inferSelect;
export type InsertSalesInvoice = z.infer<typeof insertSalesInvoiceSchema>;
export type SalesInvoiceItem = typeof salesInvoiceItems.$inferSelect;
export type InsertSalesInvoiceItem = z.infer<typeof insertSalesInvoiceItemSchema>;
export type SalesReturn = typeof salesReturns.$inferSelect;
export type InsertSalesReturn = z.infer<typeof insertSalesReturnSchema>;
export type SalesReturnItem = typeof salesReturnItems.$inferSelect;
export type InsertSalesReturnItem = z.infer<typeof insertSalesReturnItemSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// Auth types
export const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});
