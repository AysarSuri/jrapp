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

  app.get(api.products.list.path, requireAuth, async (_req, res) => {
    const data = await storage.getProducts();
    res.json(data);
  });

  app.post(api.products.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.products.create.input.parse(req.body);
      const data = await storage.createProduct(input);
      res.status(201).json(data);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
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
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
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
  const existing = await storage.getUserByUsername("admin");
  if (!existing) {
    const hashed = await bcrypt.hash("admin123", 12);
    await storage.createUser({ username: "admin", password: hashed, role: "admin" });
  }

  const productsList = await storage.getProducts();
  if (productsList.length === 0) {
    await storage.createProduct({ barcode: "PRD-001", name: "Samsung Galaxy A15", category: "Electronics", priceUsd: "150", priceIqd: "220000", minStock: 5, bigUnit: "Box", smallUnit: "Piece", conversionFactor: 10 });
    await storage.createProduct({ barcode: "PRD-002", name: "Pepsi Cola 330ml", category: "Beverages", priceUsd: "0.50", priceIqd: "750", minStock: 100, bigUnit: "Carton", smallUnit: "Can", conversionFactor: 24 });
    await storage.createProduct({ barcode: "PRD-003", name: "Notebook A4", category: "Stationery", priceUsd: "2", priceIqd: "3000", minStock: 50, bigUnit: "Pack", smallUnit: "Piece", conversionFactor: 12 });
  }

  const clientsList = await storage.getClients();
  if (clientsList.length === 0) {
    await storage.createClient({ name: "Ali Hassan", type: "customer", contact: "0770-123-4567", oldDebt: "500000" });
    await storage.createClient({ name: "Baghdad Electronics", type: "supplier", contact: "0780-987-6543", oldDebt: "1200000" });
    await storage.createClient({ name: "Mohammed Store", type: "customer", contact: "0750-111-2222", oldDebt: "0" });
    await storage.createClient({ name: "Gulf Trading Co.", type: "supplier", contact: "0790-333-4444", oldDebt: "750000" });
  }

  const accountsList = await storage.getAccounts();
  if (accountsList.length === 0) {
    await storage.createAccount({ name: "Main Cash Box", type: "cash", currency: "IQD" });
    await storage.createAccount({ name: "USD Cash Box", type: "cash", currency: "USD" });
    await storage.createAccount({ name: "Rafidain Bank", type: "bank", currency: "IQD" });
    await storage.createAccount({ name: "Al-Amal Transfer Office", type: "transfer_office", currency: "USD" });
  }
}
