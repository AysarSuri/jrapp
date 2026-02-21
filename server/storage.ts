import { db } from "./db";
import {
  addresses, units, categories, transferOffices, banks, customsClearances, warehouses, representatives,
  users, products, clients, accounts, invoices, transactions, purchaseInvoices, purchaseInvoiceItems,
  supplierPayments,
  type Address, type InsertAddress,
  type Unit, type InsertUnit,
  type Category, type InsertCategory,
  type TransferOffice, type InsertTransferOffice,
  type Bank, type InsertBank,
  type CustomsClearance, type InsertCustomsClearance,
  type Warehouse, type InsertWarehouse,
  type Representative, type InsertRepresentative,
  type User, type InsertUser,
  type Product, type InsertProduct,
  type Client, type InsertClient,
  type Account, type InsertAccount,
  type Invoice, type InsertInvoice,
  type Transaction, type InsertTransaction,
  type PurchaseInvoice, type InsertPurchaseInvoice,
  type PurchaseInvoiceItem, type InsertPurchaseInvoiceItem,
  type SupplierPayment, type InsertSupplierPayment
} from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  getAddresses(): Promise<Address[]>;
  createAddress(address: InsertAddress): Promise<Address>;
  updateAddress(id: number, address: InsertAddress): Promise<Address>;
  deleteAddress(id: number): Promise<void>;

  getUnits(): Promise<Unit[]>;
  createUnit(unit: InsertUnit): Promise<Unit>;
  updateUnit(id: number, unit: InsertUnit): Promise<Unit>;
  deleteUnit(id: number): Promise<void>;

  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, category: InsertCategory): Promise<Category>;
  deleteCategory(id: number): Promise<void>;

  getTransferOffices(): Promise<TransferOffice[]>;
  createTransferOffice(office: InsertTransferOffice): Promise<TransferOffice>;
  updateTransferOffice(id: number, office: InsertTransferOffice): Promise<TransferOffice>;
  deleteTransferOffice(id: number): Promise<void>;

  getBanks(): Promise<Bank[]>;
  createBank(bank: InsertBank): Promise<Bank>;
  updateBank(id: number, bank: InsertBank): Promise<Bank>;
  deleteBank(id: number): Promise<void>;

  getCustomsClearances(): Promise<CustomsClearance[]>;
  createCustomsClearance(cc: InsertCustomsClearance): Promise<CustomsClearance>;
  updateCustomsClearance(id: number, cc: InsertCustomsClearance): Promise<CustomsClearance>;
  deleteCustomsClearance(id: number): Promise<void>;

  getWarehouses(): Promise<Warehouse[]>;
  createWarehouse(wh: InsertWarehouse): Promise<Warehouse>;
  updateWarehouse(id: number, wh: InsertWarehouse): Promise<Warehouse>;
  deleteWarehouse(id: number): Promise<void>;

  getRepresentatives(): Promise<Representative[]>;
  createRepresentative(rep: InsertRepresentative): Promise<Representative>;
  updateRepresentative(id: number, rep: InsertRepresentative): Promise<Representative>;
  deleteRepresentative(id: number): Promise<void>;

  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getProducts(): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: number): Promise<void>;
  
  getClients(): Promise<Client[]>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<InsertClient>): Promise<Client>;
  deleteClient(id: number): Promise<void>;
  
  getAccounts(): Promise<Account[]>;
  createAccount(account: InsertAccount): Promise<Account>;
  
  getInvoices(): Promise<Invoice[]>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  
  getTransactions(): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;



  getPurchaseInvoices(): Promise<PurchaseInvoice[]>;
  getPurchaseInvoice(id: number): Promise<PurchaseInvoice | undefined>;
  createPurchaseInvoice(invoice: InsertPurchaseInvoice): Promise<PurchaseInvoice>;
  getPurchaseInvoiceItems(invoiceId: number): Promise<PurchaseInvoiceItem[]>;
  createPurchaseInvoiceItems(items: InsertPurchaseInvoiceItem[]): Promise<PurchaseInvoiceItem[]>;
  getNextPurchaseInvoiceNumber(): Promise<string>;

  getSupplierPayments(): Promise<SupplierPayment[]>;
  createSupplierPayment(payment: InsertSupplierPayment): Promise<SupplierPayment>;
}

export class DatabaseStorage implements IStorage {
  async getAddresses(): Promise<Address[]> {
    return await db.select().from(addresses);
  }

  async createAddress(address: InsertAddress): Promise<Address> {
    const [created] = await db.insert(addresses).values(address).returning();
    return created;
  }

  async updateAddress(id: number, address: InsertAddress): Promise<Address> {
    const [updated] = await db.update(addresses).set(address).where(eq(addresses.id, id)).returning();
    return updated;
  }

  async deleteAddress(id: number): Promise<void> {
    await db.delete(addresses).where(eq(addresses.id, id));
  }

  async getUnits(): Promise<Unit[]> {
    return await db.select().from(units);
  }

  async createUnit(unit: InsertUnit): Promise<Unit> {
    const [created] = await db.insert(units).values(unit).returning();
    return created;
  }

  async updateUnit(id: number, unit: InsertUnit): Promise<Unit> {
    const [updated] = await db.update(units).set(unit).where(eq(units.id, id)).returning();
    return updated;
  }

  async deleteUnit(id: number): Promise<void> {
    await db.delete(units).where(eq(units.id, id));
  }

  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [created] = await db.insert(categories).values(category).returning();
    return created;
  }

  async updateCategory(id: number, category: InsertCategory): Promise<Category> {
    const [updated] = await db.update(categories).set(category).where(eq(categories.id, id)).returning();
    return updated;
  }

  async deleteCategory(id: number): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  async getTransferOffices(): Promise<TransferOffice[]> {
    return await db.select().from(transferOffices);
  }
  async createTransferOffice(office: InsertTransferOffice): Promise<TransferOffice> {
    const [created] = await db.insert(transferOffices).values(office).returning();
    return created;
  }
  async updateTransferOffice(id: number, office: InsertTransferOffice): Promise<TransferOffice> {
    const [updated] = await db.update(transferOffices).set(office).where(eq(transferOffices.id, id)).returning();
    return updated;
  }
  async deleteTransferOffice(id: number): Promise<void> {
    await db.delete(transferOffices).where(eq(transferOffices.id, id));
  }

  async getBanks(): Promise<Bank[]> {
    return await db.select().from(banks);
  }
  async createBank(bank: InsertBank): Promise<Bank> {
    const [created] = await db.insert(banks).values(bank).returning();
    return created;
  }
  async updateBank(id: number, bank: InsertBank): Promise<Bank> {
    const [updated] = await db.update(banks).set(bank).where(eq(banks.id, id)).returning();
    return updated;
  }
  async deleteBank(id: number): Promise<void> {
    await db.delete(banks).where(eq(banks.id, id));
  }

  async getCustomsClearances(): Promise<CustomsClearance[]> {
    return await db.select().from(customsClearances);
  }
  async createCustomsClearance(cc: InsertCustomsClearance): Promise<CustomsClearance> {
    const [created] = await db.insert(customsClearances).values(cc).returning();
    return created;
  }
  async updateCustomsClearance(id: number, cc: InsertCustomsClearance): Promise<CustomsClearance> {
    const [updated] = await db.update(customsClearances).set(cc).where(eq(customsClearances.id, id)).returning();
    return updated;
  }
  async deleteCustomsClearance(id: number): Promise<void> {
    await db.delete(customsClearances).where(eq(customsClearances.id, id));
  }

  async getWarehouses(): Promise<Warehouse[]> {
    return await db.select().from(warehouses);
  }
  async createWarehouse(wh: InsertWarehouse): Promise<Warehouse> {
    const [created] = await db.insert(warehouses).values(wh).returning();
    return created;
  }
  async updateWarehouse(id: number, wh: InsertWarehouse): Promise<Warehouse> {
    const [updated] = await db.update(warehouses).set(wh).where(eq(warehouses.id, id)).returning();
    return updated;
  }
  async deleteWarehouse(id: number): Promise<void> {
    await db.delete(warehouses).where(eq(warehouses.id, id));
  }

  async getRepresentatives(): Promise<Representative[]> {
    return await db.select().from(representatives);
  }
  async createRepresentative(rep: InsertRepresentative): Promise<Representative> {
    const [created] = await db.insert(representatives).values(rep).returning();
    return created;
  }
  async updateRepresentative(id: number, rep: InsertRepresentative): Promise<Representative> {
    const [updated] = await db.update(representatives).set(rep).where(eq(representatives.id, id)).returning();
    return updated;
  }
  async deleteRepresentative(id: number): Promise<void> {
    await db.delete(representatives).where(eq(representatives.id, id));
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getProducts(): Promise<Product[]> {
    return await db.select().from(products);
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [created] = await db.insert(products).values(product).returning();
    return created;
  }

  async updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product> {
    const [updated] = await db.update(products).set(product).where(eq(products.id, id)).returning();
    return updated;
  }

  async deleteProduct(id: number): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  async getClients(): Promise<Client[]> {
    return await db.select().from(clients);
  }

  async createClient(client: InsertClient): Promise<Client> {
    const [created] = await db.insert(clients).values(client).returning();
    return created;
  }

  async updateClient(id: number, client: Partial<InsertClient>): Promise<Client> {
    const [updated] = await db.update(clients).set(client).where(eq(clients.id, id)).returning();
    return updated;
  }

  async deleteClient(id: number): Promise<void> {
    await db.delete(clients).where(eq(clients.id, id));
  }

  async getAccounts(): Promise<Account[]> {
    return await db.select().from(accounts);
  }

  async createAccount(account: InsertAccount): Promise<Account> {
    const [created] = await db.insert(accounts).values(account).returning();
    return created;
  }

  async getInvoices(): Promise<Invoice[]> {
    return await db.select().from(invoices);
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const [created] = await db.insert(invoices).values(invoice).returning();
    return created;
  }

  async getTransactions(): Promise<Transaction[]> {
    return await db.select().from(transactions);
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [created] = await db.insert(transactions).values(transaction).returning();
    return created;
  }
  async getPurchaseInvoices(): Promise<PurchaseInvoice[]> {
    return await db.select().from(purchaseInvoices).orderBy(purchaseInvoices.id);
  }

  async getPurchaseInvoice(id: number): Promise<PurchaseInvoice | undefined> {
    const [inv] = await db.select().from(purchaseInvoices).where(eq(purchaseInvoices.id, id));
    return inv;
  }

  async createPurchaseInvoice(invoice: InsertPurchaseInvoice): Promise<PurchaseInvoice> {
    const [created] = await db.insert(purchaseInvoices).values(invoice).returning();
    return created;
  }

  async getPurchaseInvoiceItems(invoiceId: number): Promise<PurchaseInvoiceItem[]> {
    return await db.select().from(purchaseInvoiceItems).where(eq(purchaseInvoiceItems.invoiceId, invoiceId));
  }

  async createPurchaseInvoiceItems(items: InsertPurchaseInvoiceItem[]): Promise<PurchaseInvoiceItem[]> {
    if (items.length === 0) return [];
    const created = await db.insert(purchaseInvoiceItems).values(items).returning();
    return created;
  }

  async getNextPurchaseInvoiceNumber(): Promise<string> {
    const [result] = await db.select({ maxNum: sql<number>`COALESCE(MAX(CAST(${purchaseInvoices.invoiceNumber} AS INTEGER)), 0)` }).from(purchaseInvoices);
    return String((result?.maxNum || 0) + 1).padStart(6, '0');
  }

  async getSupplierPayments(): Promise<SupplierPayment[]> {
    return await db.select().from(supplierPayments).orderBy(sql`${supplierPayments.createdAt} DESC`);
  }

  async createSupplierPayment(payment: InsertSupplierPayment): Promise<SupplierPayment> {
    const [created] = await db.insert(supplierPayments).values(payment).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();