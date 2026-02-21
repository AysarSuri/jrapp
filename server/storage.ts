import { db } from "./db";
import {
  addresses, units, categories, transferOffices, banks, customsClearances, warehouses, representatives,
  users, products, clients, accounts, invoices, transactions, purchaseInvoices, purchaseInvoiceItems,
  supplierPayments, supplierAdjustments, bankTransactions, customsClearanceTransactions, transferOfficeTransactions,
  externalDebts, externalDebtTransactions, owners, ownerTransactions, expenseTypes, expenses,
  salesInvoices, salesInvoiceItems, salesReturns, salesReturnItems, notifications,
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
  type SupplierPayment, type InsertSupplierPayment,
  type SupplierAdjustment, type InsertSupplierAdjustment,
  type BankTransaction, type InsertBankTransaction,
  type CustomsClearanceTransaction, type InsertCustomsClearanceTransaction,
  type TransferOfficeTransaction, type InsertTransferOfficeTransaction,
  type ExternalDebt, type InsertExternalDebt,
  type ExternalDebtTransaction, type InsertExternalDebtTransaction,
  type Owner, type InsertOwner,
  type SalesInvoice, type InsertSalesInvoice,
  type SalesInvoiceItem, type InsertSalesInvoiceItem,
  type SalesReturn, type InsertSalesReturn,
  type SalesReturnItem, type InsertSalesReturnItem,
  type Notification, type InsertNotification,
  type OwnerTransaction, type InsertOwnerTransaction,
  type ExpenseType, type InsertExpenseType,
  type Expense, type InsertExpense
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
  getUserByRole(role: string): Promise<User | undefined>;
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

  getSupplierAdjustments(): Promise<SupplierAdjustment[]>;
  createSupplierAdjustment(adj: InsertSupplierAdjustment): Promise<SupplierAdjustment>;

  getBankTransactions(): Promise<BankTransaction[]>;
  getBankTransactionsByBankId(bankId: number): Promise<BankTransaction[]>;
  createBankTransaction(txn: InsertBankTransaction): Promise<BankTransaction>;

  getCustomsClearanceTransactions(): Promise<CustomsClearanceTransaction[]>;
  getCustomsClearanceTransactionsByClearanceId(clearanceId: number): Promise<CustomsClearanceTransaction[]>;
  createCustomsClearanceTransaction(txn: InsertCustomsClearanceTransaction): Promise<CustomsClearanceTransaction>;

  getTransferOfficeTransactions(): Promise<TransferOfficeTransaction[]>;
  getTransferOfficeTransactionsByOfficeId(officeId: number): Promise<TransferOfficeTransaction[]>;
  createTransferOfficeTransaction(txn: InsertTransferOfficeTransaction): Promise<TransferOfficeTransaction>;

  getExternalDebts(): Promise<ExternalDebt[]>;
  createExternalDebt(debt: InsertExternalDebt): Promise<ExternalDebt>;
  updateExternalDebt(id: number, debt: InsertExternalDebt): Promise<ExternalDebt>;
  deleteExternalDebt(id: number): Promise<void>;

  getExternalDebtTransactions(): Promise<ExternalDebtTransaction[]>;
  getExternalDebtTransactionsByDebtId(debtId: number): Promise<ExternalDebtTransaction[]>;
  createExternalDebtTransaction(txn: InsertExternalDebtTransaction): Promise<ExternalDebtTransaction>;

  getOwners(): Promise<Owner[]>;
  createOwner(owner: InsertOwner): Promise<Owner>;
  updateOwner(id: number, owner: InsertOwner): Promise<Owner>;
  deleteOwner(id: number): Promise<void>;

  getOwnerTransactions(): Promise<OwnerTransaction[]>;
  getOwnerTransactionsByOwnerId(ownerId: number): Promise<OwnerTransaction[]>;
  createOwnerTransaction(txn: InsertOwnerTransaction): Promise<OwnerTransaction>;

  getExpenseTypes(): Promise<ExpenseType[]>;
  createExpenseType(et: InsertExpenseType): Promise<ExpenseType>;
  updateExpenseType(id: number, et: InsertExpenseType): Promise<ExpenseType>;
  deleteExpenseType(id: number): Promise<void>;

  getExpenses(): Promise<Expense[]>;
  createExpense(exp: InsertExpense): Promise<Expense>;

  getSalesInvoices(): Promise<SalesInvoice[]>;
  getSalesInvoice(id: number): Promise<SalesInvoice | undefined>;
  createSalesInvoice(invoice: InsertSalesInvoice): Promise<SalesInvoice>;
  updateSalesInvoiceStatus(id: number, status: string): Promise<SalesInvoice>;
  getSalesInvoiceItems(invoiceId: number): Promise<SalesInvoiceItem[]>;
  createSalesInvoiceItems(items: InsertSalesInvoiceItem[]): Promise<SalesInvoiceItem[]>;
  getNextSalesInvoiceNumber(): Promise<string>;

  getSalesReturns(): Promise<SalesReturn[]>;
  getSalesReturn(id: number): Promise<SalesReturn | undefined>;
  createSalesReturn(ret: InsertSalesReturn): Promise<SalesReturn>;
  updateSalesReturnStatus(id: number, status: string): Promise<SalesReturn>;
  getSalesReturnItems(returnId: number): Promise<SalesReturnItem[]>;
  createSalesReturnItems(items: InsertSalesReturnItem[]): Promise<SalesReturnItem[]>;
  getNextSalesReturnNumber(): Promise<string>;

  getNotifications(targetRole?: string): Promise<Notification[]>;
  createNotification(notif: InsertNotification): Promise<Notification>;
  markNotificationRead(id: number): Promise<void>;
  getUnreadNotificationCount(targetRole?: string): Promise<number>;
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

  async getUserByRole(role: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.role, role));
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

  async getSupplierAdjustments(): Promise<SupplierAdjustment[]> {
    return await db.select().from(supplierAdjustments).orderBy(sql`${supplierAdjustments.createdAt} DESC`);
  }

  async createSupplierAdjustment(adj: InsertSupplierAdjustment): Promise<SupplierAdjustment> {
    const [created] = await db.insert(supplierAdjustments).values(adj).returning();
    return created;
  }

  async getBankTransactions(): Promise<BankTransaction[]> {
    return await db.select().from(bankTransactions).orderBy(sql`${bankTransactions.createdAt} DESC`);
  }

  async getBankTransactionsByBankId(bankId: number): Promise<BankTransaction[]> {
    return await db.select().from(bankTransactions).where(eq(bankTransactions.bankId, bankId)).orderBy(sql`${bankTransactions.date} ASC, ${bankTransactions.time} ASC`);
  }

  async createBankTransaction(txn: InsertBankTransaction): Promise<BankTransaction> {
    const [created] = await db.insert(bankTransactions).values(txn).returning();
    return created;
  }

  async getCustomsClearanceTransactions(): Promise<CustomsClearanceTransaction[]> {
    return await db.select().from(customsClearanceTransactions).orderBy(sql`${customsClearanceTransactions.createdAt} DESC`);
  }

  async getCustomsClearanceTransactionsByClearanceId(clearanceId: number): Promise<CustomsClearanceTransaction[]> {
    return await db.select().from(customsClearanceTransactions).where(eq(customsClearanceTransactions.clearanceId, clearanceId)).orderBy(sql`${customsClearanceTransactions.date} ASC, ${customsClearanceTransactions.time} ASC`);
  }

  async createCustomsClearanceTransaction(txn: InsertCustomsClearanceTransaction): Promise<CustomsClearanceTransaction> {
    const [created] = await db.insert(customsClearanceTransactions).values(txn).returning();
    return created;
  }

  async getTransferOfficeTransactions(): Promise<TransferOfficeTransaction[]> {
    return await db.select().from(transferOfficeTransactions).orderBy(sql`${transferOfficeTransactions.createdAt} DESC`);
  }

  async getTransferOfficeTransactionsByOfficeId(officeId: number): Promise<TransferOfficeTransaction[]> {
    return await db.select().from(transferOfficeTransactions).where(eq(transferOfficeTransactions.officeId, officeId)).orderBy(sql`${transferOfficeTransactions.date} ASC, ${transferOfficeTransactions.time} ASC`);
  }

  async createTransferOfficeTransaction(txn: InsertTransferOfficeTransaction): Promise<TransferOfficeTransaction> {
    const [created] = await db.insert(transferOfficeTransactions).values(txn).returning();
    return created;
  }

  async getExternalDebts(): Promise<ExternalDebt[]> {
    return await db.select().from(externalDebts);
  }
  async createExternalDebt(debt: InsertExternalDebt): Promise<ExternalDebt> {
    const [created] = await db.insert(externalDebts).values(debt).returning();
    return created;
  }
  async updateExternalDebt(id: number, debt: InsertExternalDebt): Promise<ExternalDebt> {
    const [updated] = await db.update(externalDebts).set(debt).where(eq(externalDebts.id, id)).returning();
    return updated;
  }
  async deleteExternalDebt(id: number): Promise<void> {
    await db.delete(externalDebts).where(eq(externalDebts.id, id));
  }

  async getExternalDebtTransactions(): Promise<ExternalDebtTransaction[]> {
    return await db.select().from(externalDebtTransactions).orderBy(sql`${externalDebtTransactions.createdAt} DESC`);
  }
  async getExternalDebtTransactionsByDebtId(debtId: number): Promise<ExternalDebtTransaction[]> {
    return await db.select().from(externalDebtTransactions).where(eq(externalDebtTransactions.debtId, debtId)).orderBy(sql`${externalDebtTransactions.date} ASC, ${externalDebtTransactions.time} ASC`);
  }
  async createExternalDebtTransaction(txn: InsertExternalDebtTransaction): Promise<ExternalDebtTransaction> {
    const [created] = await db.insert(externalDebtTransactions).values(txn).returning();
    return created;
  }

  async getOwners(): Promise<Owner[]> {
    return await db.select().from(owners);
  }
  async createOwner(owner: InsertOwner): Promise<Owner> {
    const [created] = await db.insert(owners).values(owner).returning();
    return created;
  }
  async updateOwner(id: number, owner: InsertOwner): Promise<Owner> {
    const [updated] = await db.update(owners).set(owner).where(eq(owners.id, id)).returning();
    return updated;
  }
  async deleteOwner(id: number): Promise<void> {
    await db.delete(owners).where(eq(owners.id, id));
  }

  async getOwnerTransactions(): Promise<OwnerTransaction[]> {
    return await db.select().from(ownerTransactions).orderBy(sql`${ownerTransactions.createdAt} DESC`);
  }
  async getOwnerTransactionsByOwnerId(ownerId: number): Promise<OwnerTransaction[]> {
    return await db.select().from(ownerTransactions).where(eq(ownerTransactions.ownerId, ownerId)).orderBy(sql`${ownerTransactions.date} ASC, ${ownerTransactions.time} ASC`);
  }
  async createOwnerTransaction(txn: InsertOwnerTransaction): Promise<OwnerTransaction> {
    const [created] = await db.insert(ownerTransactions).values(txn).returning();
    return created;
  }

  async getExpenseTypes(): Promise<ExpenseType[]> {
    return await db.select().from(expenseTypes);
  }
  async createExpenseType(et: InsertExpenseType): Promise<ExpenseType> {
    const [created] = await db.insert(expenseTypes).values(et).returning();
    return created;
  }
  async updateExpenseType(id: number, et: InsertExpenseType): Promise<ExpenseType> {
    const [updated] = await db.update(expenseTypes).set(et).where(eq(expenseTypes.id, id)).returning();
    return updated;
  }
  async deleteExpenseType(id: number): Promise<void> {
    await db.delete(expenseTypes).where(eq(expenseTypes.id, id));
  }

  async getExpenses(): Promise<Expense[]> {
    return await db.select().from(expenses).orderBy(sql`${expenses.createdAt} DESC`);
  }
  async createExpense(exp: InsertExpense): Promise<Expense> {
    const [created] = await db.insert(expenses).values(exp).returning();
    return created;
  }

  async getSalesInvoices(): Promise<SalesInvoice[]> {
    return await db.select().from(salesInvoices).orderBy(sql`${salesInvoices.createdAt} DESC`);
  }

  async getSalesInvoice(id: number): Promise<SalesInvoice | undefined> {
    const [inv] = await db.select().from(salesInvoices).where(eq(salesInvoices.id, id));
    return inv;
  }

  async createSalesInvoice(invoice: InsertSalesInvoice): Promise<SalesInvoice> {
    const [created] = await db.insert(salesInvoices).values(invoice).returning();
    return created;
  }

  async updateSalesInvoiceStatus(id: number, status: string): Promise<SalesInvoice> {
    const [updated] = await db.update(salesInvoices).set({ status }).where(eq(salesInvoices.id, id)).returning();
    return updated;
  }

  async getSalesInvoiceItems(invoiceId: number): Promise<SalesInvoiceItem[]> {
    return await db.select().from(salesInvoiceItems).where(eq(salesInvoiceItems.invoiceId, invoiceId));
  }

  async createSalesInvoiceItems(items: InsertSalesInvoiceItem[]): Promise<SalesInvoiceItem[]> {
    if (items.length === 0) return [];
    const created = await db.insert(salesInvoiceItems).values(items).returning();
    return created;
  }

  async getNextSalesInvoiceNumber(): Promise<string> {
    const [result] = await db.select({ maxNum: sql<number>`COALESCE(MAX(CAST(${salesInvoices.invoiceNumber} AS INTEGER)), 0)` }).from(salesInvoices);
    return String((result?.maxNum || 0) + 1).padStart(6, '0');
  }

  async getSalesReturns(): Promise<SalesReturn[]> {
    return await db.select().from(salesReturns).orderBy(sql`${salesReturns.createdAt} DESC`);
  }

  async getSalesReturn(id: number): Promise<SalesReturn | undefined> {
    const [ret] = await db.select().from(salesReturns).where(eq(salesReturns.id, id));
    return ret;
  }

  async createSalesReturn(ret: InsertSalesReturn): Promise<SalesReturn> {
    const [created] = await db.insert(salesReturns).values(ret).returning();
    return created;
  }

  async updateSalesReturnStatus(id: number, status: string): Promise<SalesReturn> {
    const [updated] = await db.update(salesReturns).set({ status }).where(eq(salesReturns.id, id)).returning();
    return updated;
  }

  async getSalesReturnItems(returnId: number): Promise<SalesReturnItem[]> {
    return await db.select().from(salesReturnItems).where(eq(salesReturnItems.returnId, returnId));
  }

  async createSalesReturnItems(items: InsertSalesReturnItem[]): Promise<SalesReturnItem[]> {
    if (items.length === 0) return [];
    const created = await db.insert(salesReturnItems).values(items).returning();
    return created;
  }

  async getNextSalesReturnNumber(): Promise<string> {
    const [result] = await db.select({ maxNum: sql<number>`COALESCE(MAX(CAST(${salesReturns.returnNumber} AS INTEGER)), 0)` }).from(salesReturns);
    return String((result?.maxNum || 0) + 1).padStart(6, '0');
  }

  async getNotifications(targetRole?: string): Promise<Notification[]> {
    if (targetRole) {
      return await db.select().from(notifications)
        .where(sql`${notifications.targetRole} = ${targetRole} OR ${notifications.targetRole} = 'admin_user'`)
        .orderBy(sql`${notifications.createdAt} DESC`);
    }
    return await db.select().from(notifications).orderBy(sql`${notifications.createdAt} DESC`);
  }

  async createNotification(notif: InsertNotification): Promise<Notification> {
    const [created] = await db.insert(notifications).values(notif).returning();
    return created;
  }

  async markNotificationRead(id: number): Promise<void> {
    await db.update(notifications).set({ isRead: 1 }).where(eq(notifications.id, id));
  }

  async getUnreadNotificationCount(targetRole?: string): Promise<number> {
    if (targetRole) {
      const [result] = await db.select({ count: sql<number>`COUNT(*)` }).from(notifications)
        .where(sql`${notifications.isRead} = 0 AND (${notifications.targetRole} = ${targetRole} OR ${notifications.targetRole} = 'admin_user')`);
      return result?.count || 0;
    }
    const [result] = await db.select({ count: sql<number>`COUNT(*)` }).from(notifications).where(eq(notifications.isRead, 0));
    return result?.count || 0;
  }
}

export const storage = new DatabaseStorage();