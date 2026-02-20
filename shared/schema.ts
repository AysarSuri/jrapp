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
});

export const banks = pgTable("banks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const customsClearances = pgTable("customs_clearances", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const representatives = pgTable("representatives", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
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

export const insertAddressSchema = createInsertSchema(addresses).omit({ id: true });
export const insertUnitSchema = createInsertSchema(units).omit({ id: true });
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export const insertTransferOfficeSchema = createInsertSchema(transferOffices).omit({ id: true });
export const insertBankSchema = createInsertSchema(banks).omit({ id: true });
export const insertCustomsClearanceSchema = createInsertSchema(customsClearances).omit({ id: true });
export const insertRepresentativeSchema = createInsertSchema(representatives).omit({ id: true });
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
export type Representative = typeof representatives.$inferSelect;
export type InsertRepresentative = z.infer<typeof insertRepresentativeSchema>;
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

// Auth types
export const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});
