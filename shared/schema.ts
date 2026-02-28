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
  nameEn: text("name_en").notNull().default(""),
  nameKu: text("name_ku").notNull().default(""),
  nameTr: text("name_tr").notNull().default(""),
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
  debtUsd: numeric("debt_usd").notNull().default("0"),
  debtIqd: numeric("debt_iqd").notNull().default("0"),
});

export type Representative = typeof representatives.$inferSelect;

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull().default(""),
  mobile: text("mobile").default(""),
  role: text("role").notNull(), // 'admin', 'user', 'sales_rep'
  isActive: integer("is_active").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  barcode: text("barcode").notNull().unique(),
  name: text("name").notNull().unique(),
  nameEn: text("name_en").notNull().default(""),
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
  image: text("image"),
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
  driverName: text("driver_name"),
  driverMobile: text("driver_mobile"),
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
  payTo: text("pay_to"),
  payToName: text("pay_to_name"),
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

export type User = typeof users.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type PurchaseInvoice = typeof purchaseInvoices.$inferSelect;
export type PurchaseReturn = typeof purchaseReturns.$inferSelect;
export type SalesInvoice = typeof salesInvoices.$inferSelect;
export type SalesReturn = typeof salesReturns.$inferSelect;
export type SupplierAdjustment = typeof supplierAdjustments.$inferSelect;
export type Bank = typeof banks.$inferSelect;
export type TransferOffice = typeof transferOffices.$inferSelect;
export type CustomsClearance = typeof customsClearances.$inferSelect;

export const insertUserSchema = createInsertSchema(users);
export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export const insertClientSchema = createInsertSchema(clients).omit({ id: true });
export const insertAccountSchema = createInsertSchema(accounts).omit({ id: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true });
export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true });
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
export const purchaseReturns = pgTable("purchase_returns", {
  id: serial("id").primaryKey(),
  returnNumber: text("return_number").notNull(),
  date: text("date").notNull(),
  time: text("time").notNull(),
  supplierId: integer("supplier_id"),
  supplierName: text("supplier_name").notNull(),
  address: text("address"),
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
  originalInvoiceId: integer("original_invoice_id"),
  originalInvoiceNumber: text("original_invoice_number"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const purchaseReturnItems = pgTable("purchase_return_items", {
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

export const insertPurchaseReturnSchema = createInsertSchema(purchaseReturns).omit({ id: true, createdAt: true });
export const insertPurchaseReturnItemSchema = createInsertSchema(purchaseReturnItems).omit({ id: true });

export type PurchaseReturnItem = typeof purchaseReturnItems.$inferSelect;
export type InsertPurchaseReturnItem = z.infer<typeof insertPurchaseReturnItemSchema>;

export const customerReceipts = pgTable("customer_receipts", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  customerName: text("customer_name").notNull(),
  paymentSource: text("payment_source").notNull(),
  paymentSourceName: text("payment_source_name").notNull(),
  amount: numeric("amount").notNull().default("0"),
  discount: numeric("discount").notNull().default("0"),
  currency: text("currency").notNull(),
  oldDebt: numeric("old_debt").notNull().default("0"),
  remaining: numeric("remaining").notNull().default("0"),
  note: text("note"),
  reference: text("reference"),
  date: text("date").notNull(),
  time: text("time").notNull().default("00:00"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCustomerReceiptSchema = createInsertSchema(customerReceipts).omit({ id: true, createdAt: true });
export type CustomerReceipt = typeof customerReceipts.$inferSelect;
export type InsertCustomerReceipt = z.infer<typeof insertCustomerReceiptSchema>;

export const agentPayments = pgTable("agent_payments", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").notNull(),
  agentName: text("agent_name").notNull(),
  paymentSource: text("payment_source").notNull(),
  paymentSourceName: text("payment_source_name").notNull(),
  amount: numeric("amount").notNull().default("0"),
  currency: text("currency").notNull(),
  oldDebt: numeric("old_debt").notNull().default("0"),
  remaining: numeric("remaining").notNull().default("0"),
  note: text("note"),
  reference: text("reference"),
  date: text("date").notNull(),
  time: text("time").notNull().default("00:00"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAgentPaymentSchema = createInsertSchema(agentPayments).omit({ id: true, createdAt: true });
export type AgentPayment = typeof agentPayments.$inferSelect;
export type InsertAgentPayment = z.infer<typeof insertAgentPaymentSchema>;

export const currencyExchanges = pgTable("currency_exchanges", {
  id: serial("id").primaryKey(),
  fromCurrency: text("from_currency").notNull(),
  toCurrency: text("to_currency").notNull(),
  fromAmount: numeric("from_amount").notNull().default("0"),
  exchangeRate: numeric("exchange_rate").notNull().default("0"),
  toAmount: numeric("to_amount").notNull().default("0"),
  note: text("note"),
  date: text("date").notNull(),
  time: text("time").notNull().default("00:00"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCurrencyExchangeSchema = createInsertSchema(currencyExchanges).omit({ id: true, createdAt: true });
export type CurrencyExchange = typeof currencyExchanges.$inferSelect;
export type InsertCurrencyExchange = z.infer<typeof insertCurrencyExchangeSchema>;

export const warehouseTransfers = pgTable("warehouse_transfers", {
  id: serial("id").primaryKey(),
  transferNumber: text("transfer_number").notNull(),
  fromWarehouseId: integer("from_warehouse_id").notNull(),
  fromWarehouseName: text("from_warehouse_name").notNull(),
  toWarehouseId: integer("to_warehouse_id").notNull(),
  toWarehouseName: text("to_warehouse_name").notNull(),
  note: text("note"),
  date: text("date").notNull(),
  time: text("time").notNull().default("00:00"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const warehouseTransferItems = pgTable("warehouse_transfer_items", {
  id: serial("id").primaryKey(),
  transferId: integer("transfer_id").notNull(),
  productId: integer("product_id").notNull(),
  productName: text("product_name").notNull(),
  productCode: text("product_code").notNull(),
  quantity: integer("quantity").notNull().default(0),
  unit: text("unit").notNull(),
});

export const insertWarehouseTransferSchema = createInsertSchema(warehouseTransfers).omit({ id: true, createdAt: true });
export const insertWarehouseTransferItemSchema = createInsertSchema(warehouseTransferItems).omit({ id: true });
export type WarehouseTransfer = typeof warehouseTransfers.$inferSelect;
export type InsertWarehouseTransfer = z.infer<typeof insertWarehouseTransferSchema>;
export type WarehouseTransferItem = typeof warehouseTransferItems.$inferSelect;
export type InsertWarehouseTransferItem = z.infer<typeof insertWarehouseTransferItemSchema>;

export const productDamages = pgTable("product_damages", {
  id: serial("id").primaryKey(),
  damageNumber: text("damage_number").notNull(),
  warehouseId: integer("warehouse_id"),
  warehouseName: text("warehouse_name"),
  reason: text("reason").notNull(),
  note: text("note"),
  date: text("date").notNull(),
  time: text("time").notNull().default("00:00"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const productDamageItems = pgTable("product_damage_items", {
  id: serial("id").primaryKey(),
  damageId: integer("damage_id").notNull(),
  productId: integer("product_id").notNull(),
  productName: text("product_name").notNull(),
  productCode: text("product_code").notNull(),
  quantity: integer("quantity").notNull().default(0),
  unit: text("unit").notNull(),
});

export const insertProductDamageSchema = createInsertSchema(productDamages).omit({ id: true, createdAt: true });
export const insertProductDamageItemSchema = createInsertSchema(productDamageItems).omit({ id: true });
export type ProductDamage = typeof productDamages.$inferSelect;
export type InsertProductDamage = z.infer<typeof insertProductDamageSchema>;
export type ProductDamageItem = typeof productDamageItems.$inferSelect;
export type InsertProductDamageItem = z.infer<typeof insertProductDamageItemSchema>;

export const companyProfile = pgTable("company_profile", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().default(""),
  address: text("address").notNull().default(""),
  mobile1: text("mobile1").notNull().default(""),
  mobile2: text("mobile2").notNull().default(""),
  businessType: text("business_type").notNull().default(""),
  logo: text("logo"),
  cliche: text("cliche"),
  stamp: text("stamp"),
  qrAddress: text("qr_address").notNull().default(""),
  primaryColor: text("primary_color").notNull().default("#1a1a2e"),
  secondaryColor: text("secondary_color").notNull().default("#16213e"),
  clicheColor: text("cliche_color").notNull().default("#1a1a2e"),
  addressName: text("address_name").notNull().default(""),
  mobile1Whatsapp: text("mobile1_whatsapp").notNull().default(""),
  mobile2Whatsapp: text("mobile2_whatsapp").notNull().default(""),
  gpsLocation: text("gps_location").notNull().default(""),
  facebookLink: text("facebook_link").notNull().default(""),
  instagramLink: text("instagram_link").notNull().default(""),
  tiktokLink: text("tiktok_link").notNull().default(""),
  snapchatLink: text("snapchat_link").notNull().default(""),
});

export const insertCompanyProfileSchema = createInsertSchema(companyProfile).omit({ id: true });
export type CompanyProfile = typeof companyProfile.$inferSelect;
export type InsertCompanyProfile = z.infer<typeof insertCompanyProfileSchema>;

export const exportLogs = pgTable("export_logs", {
  id: serial("id").primaryKey(),
  reportName: text("report_name").notNull(),
  supplierName: text("supplier_name").notNull().default(""),
  invoiceNumber: text("invoice_number").notNull().default(""),
  exportType: text("export_type").notNull(),
  currency: text("currency").notNull().default(""),
  exportedAt: timestamp("exported_at").defaultNow().notNull(),
  exportedBy: text("exported_by").notNull().default(""),
});

export const insertExportLogSchema = createInsertSchema(exportLogs).omit({ id: true, exportedAt: true });
export type ExportLog = typeof exportLogs.$inferSelect;
export type InsertExportLog = z.infer<typeof insertExportLogSchema>;

export const agentProductLoads = pgTable("agent_product_loads", {
  id: serial("id").primaryKey(),
  loadNumber: text("load_number").notNull(),
  agentId: integer("agent_id").notNull(),
  agentName: text("agent_name").notNull(),
  note: text("note"),
  date: text("date").notNull(),
  time: text("time").notNull().default("00:00"),
  totalItems: integer("total_items").notNull().default(0),
  totalQuantity: numeric("total_quantity").notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const agentProductLoadItems = pgTable("agent_product_load_items", {
  id: serial("id").primaryKey(),
  loadId: integer("load_id").notNull(),
  productId: integer("product_id").notNull(),
  productName: text("product_name").notNull(),
  productCode: text("product_code").notNull(),
  quantity: integer("quantity").notNull().default(0),
  unit: text("unit").notNull(),
});

export const insertAgentProductLoadSchema = createInsertSchema(agentProductLoads).omit({ id: true, createdAt: true });
export const insertAgentProductLoadItemSchema = createInsertSchema(agentProductLoadItems).omit({ id: true });
export type AgentProductLoad = typeof agentProductLoads.$inferSelect;
export type InsertAgentProductLoad = z.infer<typeof insertAgentProductLoadSchema>;
export type AgentProductLoadItem = typeof agentProductLoadItems.$inferSelect;
export type InsertAgentProductLoadItem = z.infer<typeof insertAgentProductLoadItemSchema>;

export const agentClients = pgTable("agent_clients", {
  id: serial("id").primaryKey(),
  agentUserId: text("agent_user_id").notNull(),
  agentName: text("agent_name").notNull(),
  clientId: integer("client_id").notNull(),
  clientName: text("client_name").notNull(),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
});

export const insertAgentClientSchema = createInsertSchema(agentClients).omit({ id: true, assignedAt: true });
export type AgentClient = typeof agentClients.$inferSelect;
export type InsertAgentClient = z.infer<typeof insertAgentClientSchema>;

export const agentLocations = pgTable("agent_locations", {
  id: serial("id").primaryKey(),
  agentUserId: text("agent_user_id").notNull(),
  agentName: text("agent_name").notNull(),
  latitude: numeric("latitude").notNull(),
  longitude: numeric("longitude").notNull(),
  accuracy: numeric("accuracy"),
  deviceType: text("device_type").notNull().default("unknown"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAgentLocationSchema = createInsertSchema(agentLocations).omit({ id: true, updatedAt: true });
export type AgentLocation = typeof agentLocations.$inferSelect;
export type InsertAgentLocation = z.infer<typeof insertAgentLocationSchema>;

// Auth types
export const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});
