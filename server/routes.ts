import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import bcrypt from "bcryptjs";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const PgStore = connectPgSimple(session);
  app.use(
    session({
      store: new PgStore({ pool, createTableIfMissing: true }),
      secret: process.env.SESSION_SECRET || "erp-secret-key-2026",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 },
    })
  );

  app.post(api.auth.login.path, async (req, res) => {
    try {
      const input = api.auth.login.input.parse(req.body);
      const user = await storage.getUserByUsername(input.username);
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      const valid = await bcrypt.compare(input.password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      req.session.userId = user.id;
      const { password, ...safeUser } = user;
      res.status(200).json(safeUser);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.auth.logout.path, (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });

  app.get(api.auth.me.path, async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const { password, ...safeUser } = user;
    res.json(safeUser);
  });

  const requireAuth: import("express").RequestHandler = (req, res, next) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    next();
  };

  app.get(api.addresses.list.path, requireAuth, async (_req, res) => {
    const data = await storage.getAddresses();
    res.json(data);
  });

  app.post(api.addresses.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.addresses.create.input.parse(req.body);
      const data = await storage.createAddress(input);
      res.status(201).json(data);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      if (err?.code === '23505') {
        return res.status(400).json({ message: "Address already exists" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch(api.addresses.update.path, requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const input = api.addresses.update.input.parse(req.body);
      const data = await storage.updateAddress(id, input);
      res.json(data);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      if (err?.code === '23505') {
        return res.status(400).json({ message: "Address already exists" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete(api.addresses.delete.path, requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      await storage.deleteAddress(id);
      res.json({ message: "Deleted" });
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Units CRUD
  app.get(api.units.list.path, requireAuth, async (_req, res) => {
    const data = await storage.getUnits();
    res.json(data);
  });

  app.post(api.units.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.units.create.input.parse(req.body);
      const data = await storage.createUnit(input);
      res.status(201).json(data);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      if (err?.code === '23505') {
        return res.status(400).json({ message: "Unit already exists" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch(api.units.update.path, requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const input = api.units.update.input.parse(req.body);
      const data = await storage.updateUnit(id, input);
      res.json(data);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      if (err?.code === '23505') {
        return res.status(400).json({ message: "Unit already exists" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete(api.units.delete.path, requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      await storage.deleteUnit(id);
      res.json({ message: "Deleted" });
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Categories CRUD
  app.get(api.categories.list.path, requireAuth, async (_req, res) => {
    const data = await storage.getCategories();
    res.json(data);
  });

  app.post(api.categories.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.categories.create.input.parse(req.body);
      const data = await storage.createCategory(input);
      res.status(201).json(data);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      if (err?.code === '23505') {
        return res.status(400).json({ message: "Category already exists" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch(api.categories.update.path, requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const input = api.categories.update.input.parse(req.body);
      const data = await storage.updateCategory(id, input);
      res.json(data);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      if (err?.code === '23505') {
        return res.status(400).json({ message: "Category already exists" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete(api.categories.delete.path, requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      await storage.deleteCategory(id);
      res.json({ message: "Deleted" });
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Transfer Offices CRUD
  app.get(api.transferOffices.list.path, requireAuth, async (_req, res) => {
    const data = await storage.getTransferOffices();
    res.json(data);
  });
  app.post(api.transferOffices.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.transferOffices.create.input.parse(req.body);
      const data = await storage.createTransferOffice(input);
      res.status(201).json(data);
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      if (err?.code === '23505') return res.status(400).json({ message: "Transfer office already exists" });
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app.patch(api.transferOffices.update.path, requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const input = api.transferOffices.update.input.parse(req.body);
      const data = await storage.updateTransferOffice(id, input);
      res.json(data);
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      if (err?.code === '23505') return res.status(400).json({ message: "Transfer office already exists" });
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app.delete(api.transferOffices.delete.path, requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      await storage.deleteTransferOffice(id);
      res.json({ message: "Deleted" });
    } catch { res.status(500).json({ message: "Internal server error" }); }
  });

  // Banks CRUD
  app.get(api.banks.list.path, requireAuth, async (_req, res) => {
    const data = await storage.getBanks();
    res.json(data);
  });
  app.post(api.banks.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.banks.create.input.parse(req.body);
      const data = await storage.createBank(input);
      res.status(201).json(data);
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      if (err?.code === '23505') return res.status(400).json({ message: "Bank already exists" });
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app.patch(api.banks.update.path, requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const input = api.banks.update.input.parse(req.body);
      const data = await storage.updateBank(id, input);
      res.json(data);
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      if (err?.code === '23505') return res.status(400).json({ message: "Bank already exists" });
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app.delete(api.banks.delete.path, requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      await storage.deleteBank(id);
      res.json({ message: "Deleted" });
    } catch { res.status(500).json({ message: "Internal server error" }); }
  });

  // Customs Clearances CRUD
  app.get(api.customsClearances.list.path, requireAuth, async (_req, res) => {
    const data = await storage.getCustomsClearances();
    res.json(data);
  });
  app.post(api.customsClearances.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.customsClearances.create.input.parse(req.body);
      const data = await storage.createCustomsClearance(input);
      res.status(201).json(data);
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      if (err?.code === '23505') return res.status(400).json({ message: "Customs clearance already exists" });
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app.patch(api.customsClearances.update.path, requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const input = api.customsClearances.update.input.parse(req.body);
      const data = await storage.updateCustomsClearance(id, input);
      res.json(data);
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      if (err?.code === '23505') return res.status(400).json({ message: "Customs clearance already exists" });
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app.delete(api.customsClearances.delete.path, requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      await storage.deleteCustomsClearance(id);
      res.json({ message: "Deleted" });
    } catch { res.status(500).json({ message: "Internal server error" }); }
  });

  // Representatives CRUD
  app.get(api.representatives.list.path, requireAuth, async (_req, res) => {
    const data = await storage.getRepresentatives();
    res.json(data);
  });
  app.post(api.representatives.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.representatives.create.input.parse(req.body);
      const data = await storage.createRepresentative(input);
      res.status(201).json(data);
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      if (err?.code === '23505') return res.status(400).json({ message: "Representative already exists" });
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app.patch(api.representatives.update.path, requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const input = api.representatives.update.input.parse(req.body);
      const data = await storage.updateRepresentative(id, input);
      res.json(data);
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      if (err?.code === '23505') return res.status(400).json({ message: "Representative already exists" });
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app.delete(api.representatives.delete.path, requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      await storage.deleteRepresentative(id);
      res.json({ message: "Deleted" });
    } catch { res.status(500).json({ message: "Internal server error" }); }
  });

  app.get(api.products.list.path, requireAuth, async (_req, res) => {
    const data = await storage.getProducts();
    res.json(data);
  });

  app.post(api.products.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.products.create.input.parse(req.body);
      const data = await storage.createProduct(input);
      res.status(201).json(data);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      if (err?.code === '23505') {
        const detail = err?.detail || '';
        if (detail.includes('barcode')) {
          return res.status(400).json({ message: "Barcode already exists" });
        }
        return res.status(400).json({ message: "Product name already exists" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch('/api/products/:id', requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const input = api.products.update.input.parse(req.body);
      const data = await storage.updateProduct(id, input);
      res.json(data);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      if (err?.code === '23505') {
        const detail = err?.detail || '';
        if (detail.includes('barcode')) {
          return res.status(400).json({ message: "Barcode already exists" });
        }
        return res.status(400).json({ message: "Product name already exists" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete('/api/products/:id', requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteProduct(id);
      res.json({ message: "Product deleted" });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.clients.list.path, requireAuth, async (_req, res) => {
    const data = await storage.getClients();
    res.json(data);
  });

  app.post(api.clients.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.clients.create.input.parse(req.body);
      const data = await storage.createClient(input);
      res.status(201).json(data);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      if (err?.code === '23505') {
        return res.status(400).json({ message: "Client name already exists" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch(api.clients.update.path, requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const input = api.clients.update.input.parse(req.body);
      const data = await storage.updateClient(id, input);
      res.json(data);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      if (err?.code === '23505') {
        return res.status(400).json({ message: "Client name already exists" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete(api.clients.delete.path, requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      await storage.deleteClient(id);
      res.json({ message: "Deleted" });
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.accounts.list.path, requireAuth, async (_req, res) => {
    const data = await storage.getAccounts();
    res.json(data);
  });

  app.post(api.accounts.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.accounts.create.input.parse(req.body);
      const data = await storage.createAccount(input);
      res.status(201).json(data);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.invoices.list.path, requireAuth, async (_req, res) => {
    const data = await storage.getInvoices();
    res.json(data);
  });

  app.post(api.invoices.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.invoices.create.input.parse(req.body);
      const data = await storage.createInvoice(input);
      res.status(201).json(data);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.transactions.list.path, requireAuth, async (_req, res) => {
    const data = await storage.getTransactions();
    res.json(data);
  });

  app.post(api.transactions.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.transactions.create.input.parse(req.body);
      const data = await storage.createTransaction(input);
      res.status(201).json(data);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const addressList = await storage.getAddresses();
  if (addressList.length === 0) {
    const defaultAddresses = [
      "بغداد", "أربيل", "السليمانية", "دهوك", "البصرة", "الموصل",
      "كركوك", "النجف", "كربلاء", "الحلة", "الديوانية", "الناصرية",
      "العمارة", "الكوت", "الرمادي", "بعقوبة", "تكريت", "السماوة",
      "حلبجة", "زاخو",
    ];
    for (const name of defaultAddresses) {
      await storage.createAddress({ name });
    }
  }

  const unitsList = await storage.getUnits();
  if (unitsList.length === 0) {
    const defaultUnits = [
      "قطعة", "صندوق", "كرتون", "باكيت", "كيلو", "طن",
      "لتر", "متر", "دزينة", "علبة", "كيس", "رول",
    ];
    for (const name of defaultUnits) {
      await storage.createUnit({ name });
    }
  }

  const categoriesList = await storage.getCategories();
  if (categoriesList.length === 0) {
    const defaultCategories = [
      "إلكترونيات", "مواد غذائية", "مشروبات", "قرطاسية",
      "أدوات منزلية", "ملابس", "مواد بناء", "أدوية",
      "مواد تنظيف", "عطور ومستحضرات",
    ];
    for (const name of defaultCategories) {
      await storage.createCategory({ name });
    }
  }

  const existing = await storage.getUserByUsername("admin");
  if (!existing) {
    const hashed = await bcrypt.hash("admin123", 12);
    await storage.createUser({ username: "admin", password: hashed, role: "admin" });
  }

  const productsList = await storage.getProducts();
  if (productsList.length === 0) {
    await storage.createProduct({ barcode: "PRD-001", name: "Samsung Galaxy A15", category: "Electronics", bigUnitPriceUsd: "1500", bigUnitPriceIqd: "2200000", smallUnitPriceUsd: "150", smallUnitPriceIqd: "220000", minStock: 5, bigUnit: "Box", smallUnit: "Piece", conversionFactor: 10 });
    await storage.createProduct({ barcode: "PRD-002", name: "Pepsi Cola 330ml", category: "Beverages", bigUnitPriceUsd: "12", bigUnitPriceIqd: "18000", smallUnitPriceUsd: "0.50", smallUnitPriceIqd: "750", minStock: 100, bigUnit: "Carton", smallUnit: "Can", conversionFactor: 24 });
    await storage.createProduct({ barcode: "PRD-003", name: "Notebook A4", category: "Stationery", bigUnitPriceUsd: "24", bigUnitPriceIqd: "36000", smallUnitPriceUsd: "2", smallUnitPriceIqd: "3000", minStock: 50, bigUnit: "Pack", smallUnit: "Piece", conversionFactor: 12 });
  }

  const clientsList = await storage.getClients();
  if (clientsList.length === 0) {
    await storage.createClient({ name: "Ali Hassan", type: "customer", contact: "0770-123-4567", address: "بغداد", oldDebtUsd: "500", oldDebtIqd: "750000" });
    await storage.createClient({ name: "Baghdad Electronics", type: "supplier", contact: "0780-987-6543", address: "بغداد", oldDebtUsd: "1200", oldDebtIqd: "1800000" });
    await storage.createClient({ name: "Mohammed Store", type: "customer", contact: "0750-111-2222", address: "أربيل", oldDebtUsd: "0", oldDebtIqd: "0" });
    await storage.createClient({ name: "Gulf Trading Co.", type: "supplier", contact: "0790-333-4444", address: "البصرة", oldDebtUsd: "750", oldDebtIqd: "1100000" });
  }

  const accountsList = await storage.getAccounts();
  if (accountsList.length === 0) {
    await storage.createAccount({ name: "Main Cash Box", type: "cash", currency: "IQD" });
    await storage.createAccount({ name: "USD Cash Box", type: "cash", currency: "USD" });
    await storage.createAccount({ name: "Rafidain Bank", type: "bank", currency: "IQD" });
    await storage.createAccount({ name: "Al-Amal Transfer Office", type: "transfer_office", currency: "USD" });
  }
}
