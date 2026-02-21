import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import bcrypt from "bcryptjs";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool, db } from "./db";
import { eq, sql } from "drizzle-orm";
import { purchaseInvoices, purchaseInvoiceItems, clients, supplierPayments, supplierAdjustments, accounts, bankTransactions, banks, customsClearanceTransactions, customsClearances, transferOfficeTransactions, transferOffices, externalDebts, externalDebtTransactions, owners, ownerTransactions, expenses, salesInvoices, salesInvoiceItems, salesReturns, salesReturnItems, purchaseReturns, purchaseReturnItems, customerReceipts, agentPayments, representatives, notifications } from "@shared/schema";

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

  app.post(api.auth.register.path, async (req, res) => {
    try {
      const input = api.auth.register.input.parse(req.body);
      const allowedRoles = ["admin", "user", "sales_rep"];
      if (!allowedRoles.includes(input.role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      const existing = await storage.getUserByUsername(input.username);
      if (existing) {
        return res.status(400).json({ message: "Username already exists" });
      }
      const hashed = await bcrypt.hash(input.password, 12);
      const user = await storage.createUser({ ...input, password: hashed });
      req.session.userId = user.id;
      const { password, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post('/api/login-by-role', async (req, res) => {
    try {
      const { role } = req.body;
      const allowedRoles = ["admin", "user", "sales_rep"];
      if (!role || !allowedRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      let user = await storage.getUserByRole(role);
      if (!user) {
        const hashed = await bcrypt.hash(role, 12);
        user = await storage.createUser({ username: role, password: hashed, role });
      }
      req.session.userId = user.id;
      const { password, ...safeUser } = user;
      res.status(200).json(safeUser);
    } catch (err) {
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

  // Warehouses CRUD
  app.get(api.warehouses.list.path, requireAuth, async (_req, res) => {
    const data = await storage.getWarehouses();
    res.json(data);
  });
  app.post(api.warehouses.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.warehouses.create.input.parse(req.body);
      const data = await storage.createWarehouse(input);
      res.status(201).json(data);
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      if (err?.code === '23505') return res.status(400).json({ message: "Warehouse already exists" });
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app.patch(api.warehouses.update.path, requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const input = api.warehouses.update.input.parse(req.body);
      const data = await storage.updateWarehouse(id, input);
      res.json(data);
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      if (err?.code === '23505') return res.status(400).json({ message: "Warehouse already exists" });
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app.delete(api.warehouses.delete.path, requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      await storage.deleteWarehouse(id);
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

  app.get('/api/purchase-invoices/next-number', requireAuth, async (_req, res) => {
    const number = await storage.getNextPurchaseInvoiceNumber();
    res.json({ number });
  });

  app.get(api.purchaseInvoices.list.path, requireAuth, async (_req, res) => {
    const data = await storage.getPurchaseInvoices();
    res.json(data);
  });

  app.get('/api/purchase-invoices/:id', requireAuth, async (req, res) => {
    const id = parseInt(req.params.id as string, 10);
    const data = await storage.getPurchaseInvoice(id);
    if (!data) return res.status(404).json({ message: "Invoice not found" });
    res.json(data);
  });

  app.get('/api/purchase-invoices/:id/items', requireAuth, async (req, res) => {
    const id = parseInt(req.params.id as string, 10);
    const data = await storage.getPurchaseInvoiceItems(id);
    res.json(data);
  });

  app.post(api.purchaseInvoices.create.path, requireAuth, async (req, res) => {
    try {
      const { invoice, items } = api.purchaseInvoices.create.input.parse(req.body);
      const result = await db.transaction(async (tx) => {
        const [created] = await tx.insert(purchaseInvoices).values(invoice).returning();
        if (items.length > 0) {
          const itemsWithInvoiceId = items.map(item => ({
            ...item,
            invoiceId: created.id,
          }));
          await tx.insert(purchaseInvoiceItems).values(itemsWithInvoiceId);
        }
        return created;
      });
      res.status(201).json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.supplierPayments.list.path, requireAuth, async (_req, res) => {
    const data = await storage.getSupplierPayments();
    res.json(data);
  });

  app.post(api.supplierPayments.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.supplierPayments.create.input.parse(req.body);
      const usdAmount = parseFloat(input.amountUsd || "0");
      const iqdAmount = parseFloat(input.amountIqd || "0");

      if (usdAmount <= 0 && iqdAmount <= 0) {
        return res.status(400).json({ message: "At least one payment amount must be greater than zero" });
      }

      const result = await db.transaction(async (tx) => {
        const [supplier] = await tx.select().from(clients).where(eq(clients.id, input.supplierId));
        const currentDebtUsd = parseFloat(supplier?.oldDebtUsd || "0");
        const currentDebtIqd = parseFloat(supplier?.oldDebtIqd || "0");
        const remainingUsd = currentDebtUsd - usdAmount;
        const remainingIqd = currentDebtIqd - iqdAmount;

        const [payment] = await tx.insert(supplierPayments).values({
          ...input,
          oldDebtUsd: String(currentDebtUsd),
          oldDebtIqd: String(currentDebtIqd),
          remainingUsd: String(remainingUsd),
          remainingIqd: String(remainingIqd),
        }).returning();

        if (usdAmount > 0) {
          await tx.update(clients)
            .set({
              oldDebtUsd: sql`CAST(${clients.oldDebtUsd} AS NUMERIC) - ${usdAmount}`,
            })
            .where(eq(clients.id, input.supplierId));
        }
        if (iqdAmount > 0) {
          await tx.update(clients)
            .set({
              oldDebtIqd: sql`CAST(${clients.oldDebtIqd} AS NUMERIC) - ${iqdAmount}`,
            })
            .where(eq(clients.id, input.supplierId));
        }

        return payment;
      });
      res.status(201).json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.supplierAdjustments.list.path, requireAuth, async (_req, res) => {
    const data = await storage.getSupplierAdjustments();
    res.json(data);
  });

  app.post(api.supplierAdjustments.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.supplierAdjustments.create.input.parse(req.body);
      const usdAmount = parseFloat(input.amountUsd || "0");
      const iqdAmount = parseFloat(input.amountIqd || "0");

      if (usdAmount <= 0 && iqdAmount <= 0) {
        return res.status(400).json({ message: "At least one amount must be greater than zero" });
      }

      const result = await db.transaction(async (tx) => {
        const [supplier] = await tx.select().from(clients).where(eq(clients.id, input.supplierId));
        const currentDebtUsd = parseFloat(supplier?.oldDebtUsd || "0");
        const currentDebtIqd = parseFloat(supplier?.oldDebtIqd || "0");

        let remainingUsd: number;
        let remainingIqd: number;

        if (input.type === "received") {
          remainingUsd = currentDebtUsd - usdAmount;
          remainingIqd = currentDebtIqd - iqdAmount;
        } else {
          remainingUsd = currentDebtUsd - usdAmount;
          remainingIqd = currentDebtIqd - iqdAmount;
        }

        const [adj] = await tx.insert(supplierAdjustments).values({
          ...input,
          oldDebtUsd: String(currentDebtUsd),
          oldDebtIqd: String(currentDebtIqd),
          remainingUsd: String(remainingUsd),
          remainingIqd: String(remainingIqd),
        }).returning();

        if (usdAmount > 0) {
          await tx.update(clients)
            .set({
              oldDebtUsd: sql`CAST(${clients.oldDebtUsd} AS NUMERIC) - ${usdAmount}`,
            })
            .where(eq(clients.id, input.supplierId));
        }
        if (iqdAmount > 0) {
          await tx.update(clients)
            .set({
              oldDebtIqd: sql`CAST(${clients.oldDebtIqd} AS NUMERIC) - ${iqdAmount}`,
            })
            .where(eq(clients.id, input.supplierId));
        }

        return adj;
      });
      res.status(201).json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get('/api/supplier-statement/:id', requireAuth, async (req, res) => {
    try {
      const supplierId = parseInt(req.params.id as string);
      const [supplier] = await db.select().from(clients).where(eq(clients.id, supplierId));
      if (!supplier) return res.status(404).json({ message: "Supplier not found" });

      const invoices = await db.select().from(purchaseInvoices)
        .where(eq(purchaseInvoices.supplierId, supplierId))
        .orderBy(purchaseInvoices.date, purchaseInvoices.time);

      const payments = await db.select().from(supplierPayments)
        .where(eq(supplierPayments.supplierId, supplierId))
        .orderBy(supplierPayments.date, supplierPayments.time);

      const adjustments = await db.select().from(supplierAdjustments)
        .where(eq(supplierAdjustments.supplierId, supplierId))
        .orderBy(supplierAdjustments.date, supplierAdjustments.time);

      type StatementEntry = {
        id: number;
        date: string;
        time: string;
        type: string;
        description: string;
        debitUsd: number;
        debitIqd: number;
        creditUsd: number;
        creditIqd: number;
        note: string | null;
      };

      const entries: StatementEntry[] = [];

      for (const inv of invoices) {
        const amount = parseFloat(inv.subtotal || "0") + parseFloat(inv.totalExpenses || "0") - parseFloat(inv.discount || "0");
        entries.push({
          id: inv.id,
          date: inv.date,
          time: inv.time || "00:00",
          type: "purchase_invoice",
          description: `${inv.invoiceNumber} (${inv.currency})`,
          debitUsd: inv.currency === "USD" ? amount : 0,
          debitIqd: inv.currency === "IQD" ? amount : 0,
          creditUsd: 0,
          creditIqd: 0,
          note: inv.note || null,
        });
      }

      for (const pay of payments) {
        entries.push({
          id: pay.id,
          date: pay.date,
          time: pay.time || "00:00",
          type: "payment",
          description: pay.paymentSourceName,
          debitUsd: 0,
          debitIqd: 0,
          creditUsd: parseFloat(pay.amountUsd || "0"),
          creditIqd: parseFloat(pay.amountIqd || "0"),
          note: pay.note || null,
        });
      }

      for (const adj of adjustments) {
        entries.push({
          id: adj.id,
          date: adj.date,
          time: adj.time || "00:00",
          type: adj.type === "received" ? "adjustment_received" : "adjustment_discount",
          description: adj.type === "received" ? "Received" : "Discount",
          debitUsd: 0,
          debitIqd: 0,
          creditUsd: parseFloat(adj.amountUsd || "0"),
          creditIqd: parseFloat(adj.amountIqd || "0"),
          note: adj.note || null,
        });
      }

      entries.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.time.localeCompare(b.time);
      });

      res.json({
        supplier,
        entries,
      });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.bankTransactions.list.path, requireAuth, async (_req, res) => {
    const data = await storage.getBankTransactions();
    res.json(data);
  });

  app.post(api.bankTransactions.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.bankTransactions.create.input.parse(req.body);
      const usdAmount = parseFloat(input.amountUsd || "0");
      const iqdAmount = parseFloat(input.amountIqd || "0");

      if (usdAmount <= 0 && iqdAmount <= 0) {
        return res.status(400).json({ message: "At least one amount must be greater than zero" });
      }

      const result = await db.transaction(async (tx) => {
        const [txn] = await tx.insert(bankTransactions).values(input).returning();
        return txn;
      });
      res.status(201).json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get('/api/bank-statement/:id', requireAuth, async (req, res) => {
    try {
      const bankId = parseInt(req.params.id as string);
      const [bank] = await db.select().from(banks).where(eq(banks.id, bankId));
      if (!bank) return res.status(404).json({ message: "Bank not found" });

      const txns = await storage.getBankTransactionsByBankId(bankId);

      type BankStatementEntry = {
        id: number;
        date: string;
        time: string;
        type: string;
        description: string | null;
        reference: string | null;
        debitUsd: number;
        debitIqd: number;
        creditUsd: number;
        creditIqd: number;
      };

      const entries: BankStatementEntry[] = txns.map((t) => {
        const usd = parseFloat(t.amountUsd || "0");
        const iqd = parseFloat(t.amountIqd || "0");
        return {
          id: t.id,
          date: t.date,
          time: t.time || "00:00",
          type: t.type,
          description: t.description,
          reference: t.reference,
          debitUsd: t.type === "receipt" ? usd : 0,
          debitIqd: t.type === "receipt" ? iqd : 0,
          creditUsd: t.type === "payment" ? usd : 0,
          creditIqd: t.type === "payment" ? iqd : 0,
        };
      });

      res.json({ bank, entries });
    } catch (err) {
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

  app.get(api.customsClearanceTransactions.list.path, requireAuth, async (_req, res) => {
    const data = await storage.getCustomsClearanceTransactions();
    res.json(data);
  });

  app.post(api.customsClearanceTransactions.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.customsClearanceTransactions.create.input.parse(req.body);
      const usdAmount = parseFloat(input.amountUsd || "0");
      const iqdAmount = parseFloat(input.amountIqd || "0");

      if (usdAmount <= 0 && iqdAmount <= 0) {
        return res.status(400).json({ message: "At least one amount must be greater than zero" });
      }

      const result = await db.transaction(async (tx) => {
        const [txn] = await tx.insert(customsClearanceTransactions).values(input).returning();
        return txn;
      });
      res.status(201).json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get('/api/clearance-statement/:id', requireAuth, async (req, res) => {
    try {
      const clearanceId = parseInt(req.params.id as string);
      const [clearance] = await db.select().from(customsClearances).where(eq(customsClearances.id, clearanceId));
      if (!clearance) return res.status(404).json({ message: "Customs clearance not found" });

      const txns = await storage.getCustomsClearanceTransactionsByClearanceId(clearanceId);

      const entries = txns.map((t) => {
        const usd = parseFloat(t.amountUsd || "0");
        const iqd = parseFloat(t.amountIqd || "0");
        return {
          id: t.id,
          date: t.date,
          time: t.time || "00:00",
          type: t.type,
          description: t.description,
          reference: t.reference,
          debitUsd: t.type === "receipt" ? usd : 0,
          debitIqd: t.type === "receipt" ? iqd : 0,
          creditUsd: t.type === "payment" ? usd : 0,
          creditIqd: t.type === "payment" ? iqd : 0,
        };
      });

      res.json({ clearance, entries });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.transferOfficeTransactions.list.path, requireAuth, async (_req, res) => {
    const data = await storage.getTransferOfficeTransactions();
    res.json(data);
  });

  app.post(api.transferOfficeTransactions.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.transferOfficeTransactions.create.input.parse(req.body);
      const usdAmount = parseFloat(input.amountUsd || "0");
      const iqdAmount = parseFloat(input.amountIqd || "0");

      if (usdAmount <= 0 && iqdAmount <= 0) {
        return res.status(400).json({ message: "At least one amount must be greater than zero" });
      }

      const result = await db.transaction(async (tx) => {
        const [txn] = await tx.insert(transferOfficeTransactions).values(input).returning();
        return txn;
      });
      res.status(201).json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get('/api/office-statement/:id', requireAuth, async (req, res) => {
    try {
      const officeId = parseInt(req.params.id as string);
      const [office] = await db.select().from(transferOffices).where(eq(transferOffices.id, officeId));
      if (!office) return res.status(404).json({ message: "Transfer office not found" });

      const txns = await storage.getTransferOfficeTransactionsByOfficeId(officeId);

      const entries = txns.map((t) => {
        const usd = parseFloat(t.amountUsd || "0");
        const iqd = parseFloat(t.amountIqd || "0");
        return {
          id: t.id,
          date: t.date,
          time: t.time || "00:00",
          type: t.type,
          description: t.description,
          reference: t.reference,
          debitUsd: t.type === "receipt" ? usd : 0,
          debitIqd: t.type === "receipt" ? iqd : 0,
          creditUsd: t.type === "payment" ? usd : 0,
          creditIqd: t.type === "payment" ? iqd : 0,
        };
      });

      res.json({ office, entries });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Expense Types CRUD
  app.get(api.expenseTypes.list.path, requireAuth, async (_req, res) => {
    const data = await storage.getExpenseTypes();
    res.json(data);
  });

  app.post(api.expenseTypes.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.expenseTypes.create.input.parse(req.body);
      const result = await storage.createExpenseType(input);
      res.status(201).json(result);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      if (err?.code === '23505') {
        return res.status(400).json({ message: "Expense type with this name already exists" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch(api.expenseTypes.update.path, requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const input = api.expenseTypes.update.input.parse(req.body);
      const result = await storage.updateExpenseType(id, input);
      res.json(result);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      if (err?.code === '23505') {
        return res.status(400).json({ message: "Expense type with this name already exists" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete(api.expenseTypes.delete.path, requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      await storage.deleteExpenseType(id);
      res.json({ message: "Expense type deleted successfully" });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Expenses
  app.get(api.expenses.list.path, requireAuth, async (_req, res) => {
    const data = await storage.getExpenses();
    res.json(data);
  });

  app.post(api.expenses.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.expenses.create.input.parse(req.body);
      const usdAmount = parseFloat(input.amountUsd || "0");
      const iqdAmount = parseFloat(input.amountIqd || "0");

      if (usdAmount <= 0 && iqdAmount <= 0) {
        return res.status(400).json({ message: "At least one amount must be greater than zero" });
      }

      const result = await storage.createExpense(input);
      res.status(201).json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Sales Invoices
  app.get('/api/sales-invoices/next-number', requireAuth, async (_req, res) => {
    const number = await storage.getNextSalesInvoiceNumber();
    res.json({ number });
  });

  app.get(api.salesInvoices.list.path, requireAuth, async (_req, res) => {
    const data = await storage.getSalesInvoices();
    res.json(data);
  });

  app.get('/api/sales-invoices/:id', requireAuth, async (req, res) => {
    const id = parseInt(req.params.id as string, 10);
    const data = await storage.getSalesInvoice(id);
    if (!data) return res.status(404).json({ message: "Invoice not found" });
    res.json(data);
  });

  app.get('/api/sales-invoices/:id/items', requireAuth, async (req, res) => {
    const id = parseInt(req.params.id as string, 10);
    const data = await storage.getSalesInvoiceItems(id);
    res.json(data);
  });

  app.post(api.salesInvoices.create.path, requireAuth, async (req, res) => {
    try {
      const { invoice, items } = api.salesInvoices.create.input.parse(req.body);

      const userId = req.session.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const sessionUser = await storage.getUser(userId);
      if (!sessionUser) return res.status(401).json({ message: "Unauthorized" });

      const serverRole = sessionUser.role;
      const isRep = serverRole === 'sales_rep';
      const serverStatus = isRep ? 'pending' : 'approved';

      const invoiceWithServerData = {
        ...invoice,
        status: serverStatus,
        createdBy: sessionUser.username,
        createdByRole: serverRole,
      };

      const result = await db.transaction(async (tx) => {
        const [created] = await tx.insert(salesInvoices).values(invoiceWithServerData).returning();
        if (items.length > 0) {
          const itemsWithInvoiceId = items.map(item => ({
            ...item,
            invoiceId: created.id,
          }));
          await tx.insert(salesInvoiceItems).values(itemsWithInvoiceId);
        }
        return created;
      });

      if (isRep) {
        await storage.createNotification({
          type: 'sales_invoice_approval',
          title: 'فاتورة مبيعات جديدة تحتاج موافقة',
          message: `فاتورة مبيعات رقم ${invoice.invoiceNumber} من المندوب ${sessionUser.username} بحاجة إلى موافقة`,
          referenceId: result.id,
          referenceType: 'sales_invoice',
          targetRole: 'admin_user',
          isRead: 0,
        });
      }

      res.status(201).json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Error creating sales invoice:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post('/api/sales-invoices/:id/approve', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const userId = req.session.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'admin' && user.role !== 'user')) {
        return res.status(403).json({ message: "Only admin or user can approve invoices" });
      }
      const result = await storage.updateSalesInvoiceStatus(id, 'approved');
      res.json(result);
    } catch (err) {
      console.error("Error approving sales invoice:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Sales Returns
  app.get('/api/sales-returns/next-number', requireAuth, async (_req, res) => {
    const number = await storage.getNextSalesReturnNumber();
    res.json({ number });
  });

  app.get(api.salesReturns.list.path, requireAuth, async (_req, res) => {
    const data = await storage.getSalesReturns();
    res.json(data);
  });

  app.get('/api/sales-returns/:id', requireAuth, async (req, res) => {
    const id = parseInt(req.params.id as string, 10);
    const data = await storage.getSalesReturn(id);
    if (!data) return res.status(404).json({ message: "Return not found" });
    res.json(data);
  });

  app.get('/api/sales-returns/:id/items', requireAuth, async (req, res) => {
    const id = parseInt(req.params.id as string, 10);
    const data = await storage.getSalesReturnItems(id);
    res.json(data);
  });

  app.post(api.salesReturns.create.path, requireAuth, async (req, res) => {
    try {
      const { returnData, items } = api.salesReturns.create.input.parse(req.body);

      const userId = req.session.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const sessionUser = await storage.getUser(userId);
      if (!sessionUser) return res.status(401).json({ message: "Unauthorized" });

      const serverRole = sessionUser.role;
      const isRep = serverRole === 'sales_rep';
      const serverStatus = isRep ? 'pending' : 'approved';

      const returnWithServerData = {
        ...returnData,
        status: serverStatus,
        createdBy: sessionUser.username,
        createdByRole: serverRole,
      };

      const result = await db.transaction(async (tx) => {
        const [created] = await tx.insert(salesReturns).values(returnWithServerData).returning();
        if (items.length > 0) {
          const itemsWithReturnId = items.map(item => ({
            ...item,
            returnId: created.id,
          }));
          await tx.insert(salesReturnItems).values(itemsWithReturnId);
        }
        return created;
      });

      if (isRep) {
        await storage.createNotification({
          type: 'sales_return_approval',
          title: 'مرجوعات مبيعات جديدة تحتاج موافقة',
          message: `مرجوعات مبيعات رقم ${returnData.returnNumber} من المندوب ${sessionUser.username} بحاجة إلى موافقة`,
          referenceId: result.id,
          referenceType: 'sales_return',
          targetRole: 'admin_user',
          isRead: 0,
        });
      }

      res.status(201).json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Error creating sales return:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post('/api/sales-returns/:id/approve', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const userId = req.session.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'admin' && user.role !== 'user')) {
        return res.status(403).json({ message: "Only admin or user can approve returns" });
      }
      const result = await storage.updateSalesReturnStatus(id, 'approved');
      res.json(result);
    } catch (err) {
      console.error("Error approving sales return:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Purchase Returns
  app.get('/api/purchase-returns/next-number', requireAuth, async (_req, res) => {
    const number = await storage.getNextPurchaseReturnNumber();
    res.json({ number });
  });

  app.get(api.purchaseReturns.list.path, requireAuth, async (_req, res) => {
    const data = await storage.getPurchaseReturns();
    res.json(data);
  });

  app.get('/api/purchase-returns/:id', requireAuth, async (req, res) => {
    const id = parseInt(req.params.id as string, 10);
    const data = await storage.getPurchaseReturn(id);
    if (!data) return res.status(404).json({ message: "Return not found" });
    res.json(data);
  });

  app.get('/api/purchase-returns/:id/items', requireAuth, async (req, res) => {
    const id = parseInt(req.params.id as string, 10);
    const data = await storage.getPurchaseReturnItems(id);
    res.json(data);
  });

  app.post(api.purchaseReturns.create.path, requireAuth, async (req, res) => {
    try {
      const { returnData, items } = api.purchaseReturns.create.input.parse(req.body);

      const userId = req.session.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const sessionUser = await storage.getUser(userId);
      if (!sessionUser) return res.status(401).json({ message: "Unauthorized" });

      const result = await db.transaction(async (tx) => {
        const [created] = await tx.insert(purchaseReturns).values(returnData).returning();
        if (items.length > 0) {
          const itemsWithReturnId = items.map(item => ({
            ...item,
            returnId: created.id,
          }));
          await tx.insert(purchaseReturnItems).values(itemsWithReturnId);
        }
        return created;
      });

      res.status(201).json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Error creating purchase return:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post('/api/purchase-returns/:id/approve', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const userId = req.session.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'admin' && user.role !== 'user')) {
        return res.status(403).json({ message: "Only admin or user can approve returns" });
      }
      const result = await storage.updatePurchaseReturnStatus(id, 'approved');
      res.json(result);
    } catch (err) {
      console.error("Error approving purchase return:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Customer Receipts
  app.get(api.customerReceipts.list.path, requireAuth, async (_req, res) => {
    const data = await storage.getCustomerReceipts();
    res.json(data);
  });

  app.post(api.customerReceipts.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.customerReceipts.create.input.parse(req.body);
      const amount = parseFloat(input.amount || "0");
      const discount = parseFloat(input.discount || "0");

      if (amount <= 0 && discount <= 0) {
        return res.status(400).json({ message: "Amount or discount must be greater than zero" });
      }

      const totalDeducted = amount + discount;

      const result = await db.transaction(async (tx) => {
        const [customer] = await tx.select().from(clients).where(eq(clients.id, input.customerId));

        let currentDebt = 0;
        if (input.currency === "USD") {
          currentDebt = parseFloat(customer?.oldDebtUsd || "0");
        } else {
          currentDebt = parseFloat(customer?.oldDebtIqd || "0");
        }

        const remaining = currentDebt - totalDeducted;

        const [receipt] = await tx.insert(customerReceipts).values({
          ...input,
          oldDebt: String(currentDebt),
          remaining: String(remaining),
        }).returning();

        if (input.currency === "USD") {
          await tx.update(clients)
            .set({
              oldDebtUsd: sql`CAST(${clients.oldDebtUsd} AS NUMERIC) - ${totalDeducted}`,
            })
            .where(eq(clients.id, input.customerId));
        } else {
          await tx.update(clients)
            .set({
              oldDebtIqd: sql`CAST(${clients.oldDebtIqd} AS NUMERIC) - ${totalDeducted}`,
            })
            .where(eq(clients.id, input.customerId));
        }

        return receipt;
      });
      res.status(201).json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Agent Payments
  app.get(api.agentPayments.list.path, requireAuth, async (_req, res) => {
    const data = await storage.getAgentPayments();
    res.json(data);
  });

  app.post(api.agentPayments.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.agentPayments.create.input.parse(req.body);
      const amount = parseFloat(input.amount || "0");

      if (amount <= 0) {
        return res.status(400).json({ message: "Amount must be greater than zero" });
      }

      const result = await db.transaction(async (tx) => {
        const [agent] = await tx.select().from(representatives).where(eq(representatives.id, input.agentId));

        let currentDebt = 0;
        if (input.currency === "USD") {
          currentDebt = parseFloat(agent?.debtUsd || "0");
        } else {
          currentDebt = parseFloat(agent?.debtIqd || "0");
        }

        const remaining = currentDebt - amount;

        const [payment] = await tx.insert(agentPayments).values({
          ...input,
          oldDebt: String(currentDebt),
          remaining: String(remaining),
        }).returning();

        if (input.currency === "USD") {
          await tx.update(representatives)
            .set({
              debtUsd: sql`CAST(${representatives.debtUsd} AS NUMERIC) - ${amount}`,
            })
            .where(eq(representatives.id, input.agentId));
        } else {
          await tx.update(representatives)
            .set({
              debtIqd: sql`CAST(${representatives.debtIqd} AS NUMERIC) - ${amount}`,
            })
            .where(eq(representatives.id, input.agentId));
        }

        return payment;
      });
      res.status(201).json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Notifications
  app.get(api.notifications.list.path, requireAuth, async (req, res) => {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const user = await storage.getUser(userId);
    if (!user || (user.role !== 'admin' && user.role !== 'user')) {
      return res.json([]);
    }
    const data = await storage.getNotifications(user.role);
    res.json(data);
  });

  app.get('/api/notifications/unread-count', requireAuth, async (req, res) => {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const user = await storage.getUser(userId);
    if (!user || (user.role !== 'admin' && user.role !== 'user')) {
      return res.json({ count: 0 });
    }
    const count = await storage.getUnreadNotificationCount(user.role);
    res.json({ count });
  });

  app.post('/api/notifications/:id/read', requireAuth, async (req, res) => {
    const id = parseInt(req.params.id as string, 10);
    await storage.markNotificationRead(id);
    res.json({ success: true });
  });

  // External Debts
  app.get(api.externalDebts.list.path, requireAuth, async (_req, res) => {
    const data = await storage.getExternalDebts();
    res.json(data);
  });

  app.post(api.externalDebts.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.externalDebts.create.input.parse(req.body);
      const result = await storage.createExternalDebt(input);
      res.status(201).json(result);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      if (err?.code === '23505') {
        return res.status(400).json({ message: "External debt with this name already exists" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch(api.externalDebts.update.path, requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const input = api.externalDebts.update.input.parse(req.body);
      const result = await storage.updateExternalDebt(id, input);
      res.json(result);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      if (err?.code === '23505') {
        return res.status(400).json({ message: "External debt with this name already exists" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete(api.externalDebts.delete.path, requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      await storage.deleteExternalDebt(id);
      res.json({ message: "External debt deleted successfully" });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // External Debt Transactions
  app.get(api.externalDebtTransactions.list.path, requireAuth, async (_req, res) => {
    const data = await storage.getExternalDebtTransactions();
    res.json(data);
  });

  app.post(api.externalDebtTransactions.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.externalDebtTransactions.create.input.parse(req.body);
      const usdAmount = parseFloat(input.amountUsd || "0");
      const iqdAmount = parseFloat(input.amountIqd || "0");
      if (usdAmount <= 0 && iqdAmount <= 0) {
        return res.status(400).json({ message: "At least one amount must be greater than zero" });
      }
      const result = await storage.createExternalDebtTransaction(input);
      res.status(201).json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Owners CRUD
  app.get(api.owners.list.path, requireAuth, async (_req, res) => {
    const data = await storage.getOwners();
    res.json(data);
  });

  app.post(api.owners.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.owners.create.input.parse(req.body);
      const result = await storage.createOwner(input);
      res.status(201).json(result);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      if (err?.code === '23505') {
        return res.status(400).json({ message: "Owner name already exists" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch('/api/owners/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const input = api.owners.update.input.parse(req.body);
      const result = await storage.updateOwner(id, input);
      res.json(result);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      if (err?.code === '23505') {
        return res.status(400).json({ message: "Owner name already exists" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete('/api/owners/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      await storage.deleteOwner(id);
      res.json({ message: "Owner deleted successfully" });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Owner Transactions
  app.get(api.ownerTransactions.list.path, requireAuth, async (_req, res) => {
    const data = await storage.getOwnerTransactions();
    res.json(data);
  });

  app.post(api.ownerTransactions.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.ownerTransactions.create.input.parse(req.body);
      const usdAmount = parseFloat(input.amountUsd || "0");
      const iqdAmount = parseFloat(input.amountIqd || "0");
      if (usdAmount <= 0 && iqdAmount <= 0) {
        return res.status(400).json({ message: "At least one amount must be greater than zero" });
      }
      const result = await storage.createOwnerTransaction(input);
      res.status(201).json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // External Debt Statement
  app.get('/api/external-debt-statement/:id', requireAuth, async (req, res) => {
    try {
      const debtId = parseInt(req.params.id as string);
      const [debt] = await db.select().from(externalDebts).where(eq(externalDebts.id, debtId));
      if (!debt) return res.status(404).json({ message: "External debt not found" });

      const txns = await storage.getExternalDebtTransactionsByDebtId(debtId);

      type DebtStatementEntry = {
        id: number;
        date: string;
        time: string;
        type: string;
        description: string | null;
        reference: string | null;
        debitUsd: number;
        debitIqd: number;
        creditUsd: number;
        creditIqd: number;
      };

      const entries: DebtStatementEntry[] = txns.map((t) => {
        const usd = parseFloat(t.amountUsd || "0");
        const iqd = parseFloat(t.amountIqd || "0");
        return {
          id: t.id,
          date: t.date,
          time: t.time || "00:00",
          type: t.type,
          description: t.description,
          reference: t.reference,
          debitUsd: t.type === "receipt" ? usd : 0,
          debitIqd: t.type === "receipt" ? iqd : 0,
          creditUsd: t.type === "payment" ? usd : 0,
          creditIqd: t.type === "payment" ? iqd : 0,
        };
      });

      res.json({ debt, entries });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get('/api/owner-statement/:id', requireAuth, async (req, res) => {
    try {
      const ownerId = parseInt(req.params.id as string);
      const [owner] = await db.select().from(owners).where(eq(owners.id, ownerId));
      if (!owner) return res.status(404).json({ message: "Owner not found" });

      const txns = await storage.getOwnerTransactionsByOwnerId(ownerId);

      type OwnerStatementEntry = {
        id: number;
        date: string;
        time: string;
        type: string;
        description: string | null;
        reference: string | null;
        debitUsd: number;
        debitIqd: number;
        creditUsd: number;
        creditIqd: number;
      };

      const entries: OwnerStatementEntry[] = txns.map((t) => {
        const usd = parseFloat(t.amountUsd || "0");
        const iqd = parseFloat(t.amountIqd || "0");
        return {
          id: t.id,
          date: t.date,
          time: t.time || "00:00",
          type: t.type,
          description: t.description,
          reference: t.reference,
          debitUsd: t.type === "withdrawal" ? usd : 0,
          debitIqd: t.type === "withdrawal" ? iqd : 0,
          creditUsd: t.type === "return" ? usd : 0,
          creditIqd: t.type === "return" ? iqd : 0,
        };
      });

      res.json({ owner, entries });
    } catch (err) {
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
