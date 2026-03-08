import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import bcrypt from "bcryptjs";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool, db } from "./db";
import { eq, and, sql, inArray } from "drizzle-orm";
import { purchaseInvoices, purchaseInvoiceItems, clients, supplierPayments, supplierAdjustments, accounts, bankTransactions, banks, customsClearanceTransactions, customsClearances, clearancePurchaseInvoices, transferOfficeTransactions, transferOffices, externalDebts, externalDebtTransactions, owners, ownerTransactions, expenses, salesInvoices, salesInvoiceItems, salesReturns, salesReturnItems, purchaseReturns, purchaseReturnItems, customerReceipts, agentPayments, representatives, notifications, warehouseTransfers, warehouseTransferItems, productDamages, productDamageItems, products, exportLogs, agentProductLoads, agentProductLoadItems, users, agentClients, agentLocations } from "@shared/schema";

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

  app.get('/api/login-users', async (_req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const safeList = allUsers
        .filter(u => u.isActive !== false)
        .map(u => ({ id: u.id, username: u.username, fullName: u.fullName, role: u.role }));
      res.json(safeList);
    } catch {
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

  app.get('/api/agents', requireAuth, async (_req, res) => {
    try {
      const salesRepUsers = await db.select({ id: users.id, fullName: users.fullName, username: users.username, mobile: users.mobile }).from(users).where(and(eq(users.role, 'sales_rep'), eq(users.isActive, 1)));
      const agents = salesRepUsers.map(u => ({ id: u.id, name: u.fullName || u.username, mobile: u.mobile || "" }));
      res.json(agents);
    } catch { res.status(500).json({ message: "Internal server error" }); }
  });

  app.get('/api/users', requireAuth, async (req, res) => {
    try {
      const currentUser = await storage.getUser(req.session.userId!);
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can manage users" });
      }
      const allUsers = await storage.getAllUsers();
      const safeUsers = allUsers.map(({ password, ...u }) => u);
      res.json(safeUsers);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post('/api/users', requireAuth, async (req, res) => {
    try {
      const currentUser = await storage.getUser(req.session.userId!);
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can manage users" });
      }
      const { username, password, fullName, role, mobile } = req.body;
      if (!username || !password || !role) {
        return res.status(400).json({ message: "Username, password, and role are required" });
      }
      const allowedRoles = ["admin", "user", "sales_rep"];
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(400).json({ message: "Username already exists" });
      }
      const hashed = await bcrypt.hash(password, 12);
      const user = await storage.createUser({ username, password: hashed, fullName: fullName || "", mobile: mobile || "", role });
      if (role === 'sales_rep') {
        const repName = fullName || username;
        await db.insert(representatives).values({ name: repName, mobile: mobile || null }).onConflictDoNothing();
      }
      const { password: _, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch('/api/users/:id', requireAuth, async (req, res) => {
    try {
      const currentUser = await storage.getUser(req.session.userId!);
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can manage users" });
      }
      const { id } = req.params;
      const { username, password, fullName, role, isActive, mobile } = req.body;
      const updateData: any = {};
      if (username !== undefined) updateData.username = username;
      if (fullName !== undefined) updateData.fullName = fullName;
      if (mobile !== undefined) updateData.mobile = mobile;
      if (role !== undefined) {
        const allowedRoles = ["admin", "user", "sales_rep"];
        if (!allowedRoles.includes(role)) {
          return res.status(400).json({ message: "Invalid role" });
        }
        updateData.role = role;
      }
      if (isActive !== undefined) updateData.isActive = isActive;
      if (password) {
        updateData.password = await bcrypt.hash(password, 12);
      }
      if (username) {
        const existing = await storage.getUserByUsername(username);
        if (existing && existing.id !== id) {
          return res.status(400).json({ message: "Username already exists" });
        }
      }
      const oldUser = await storage.getUser(id);
      const user = await storage.updateUser(id, updateData);
      if (oldUser && user.role === 'sales_rep' && oldUser.role === 'sales_rep') {
        const oldName = oldUser.fullName || oldUser.username;
        const newName = fullName || user.fullName || user.username;
        const updateFields: any = {};
        if (fullName && fullName !== oldUser.fullName) updateFields.name = newName;
        if (mobile !== undefined) updateFields.mobile = mobile || null;
        if (Object.keys(updateFields).length > 0) {
          await db.update(representatives).set(updateFields).where(eq(representatives.name, oldName));
        }
      }
      if (user.role === 'sales_rep' && oldUser?.role !== 'sales_rep') {
        const repName = user.fullName || user.username;
        await db.insert(representatives).values({ name: repName, mobile: user.mobile || null }).onConflictDoNothing();
      }
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete('/api/users/:id', requireAuth, async (req, res) => {
    try {
      const currentUser = await storage.getUser(req.session.userId!);
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can manage users" });
      }
      const { id } = req.params;
      if (id === currentUser.id) {
        return res.status(400).json({ message: "Cannot delete yourself" });
      }
      await storage.deleteUser(id);
      res.json({ message: "User deleted" });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

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

  async function syncRepresentativesFromUsers() {
    const salesRepUsers = await db.select().from(users).where(and(eq(users.role, 'sales_rep'), eq(users.isActive, 1)));
    const existingReps = await db.select().from(representatives);
    const existingByName = new Map(existingReps.map(r => [r.name, r]));
    for (const user of salesRepUsers) {
      const name = user.fullName || user.username;
      const existing = existingByName.get(name);
      if (!existing) {
        await db.insert(representatives).values({ name, mobile: user.mobile || null }).onConflictDoNothing();
      } else if (user.mobile && existing.mobile !== user.mobile) {
        await db.update(representatives).set({ mobile: user.mobile }).where(eq(representatives.name, name));
      }
    }
  }

  app.get(api.representatives.list.path, requireAuth, async (_req, res) => {
    try {
      await syncRepresentativesFromUsers();
      const data = await storage.getRepresentatives();
      res.json(data);
    } catch {
      const data = await storage.getRepresentatives();
      res.json(data);
    }
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

  app.delete('/api/purchase-invoices/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      await db.transaction(async (tx) => {
        await tx.delete(purchaseInvoiceItems).where(eq(purchaseInvoiceItems.invoiceId, id));
        await tx.delete(purchaseInvoices).where(eq(purchaseInvoices.id, id));
      });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch('/api/purchase-invoices/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const { invoice, items } = req.body;
      const result = await db.transaction(async (tx) => {
        const [updated] = await tx.update(purchaseInvoices).set(invoice).where(eq(purchaseInvoices.id, id)).returning();
        await tx.delete(purchaseInvoiceItems).where(eq(purchaseInvoiceItems.invoiceId, id));
        if (items && items.length > 0) {
          const itemsWithInvoiceId = items.map((item: any) => ({ ...item, invoiceId: id }));
          await tx.insert(purchaseInvoiceItems).values(itemsWithInvoiceId);
        }
        return updated;
      });
      res.json(result);
    } catch (err) {
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

  app.patch('/api/supplier-payments/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const { supplierId, supplierName, paymentSource, paymentSourceName, amountUsd, amountIqd, commissionUsd, commissionIqd, usdExchangeType, iqdExchangeType, usdEquivalentAmount, usdEquivalentCommission, iqdEquivalentAmount, iqdEquivalentCommission, note, reference, date, time } = req.body;
      const [updated] = await db.update(supplierPayments).set({
        supplierId, supplierName, paymentSource, paymentSourceName,
        amountUsd, amountIqd, commissionUsd, commissionIqd,
        usdExchangeType, iqdExchangeType, usdEquivalentAmount, usdEquivalentCommission, iqdEquivalentAmount, iqdEquivalentCommission,
        note, reference, date, time,
      }).where(eq(supplierPayments.id, id)).returning();
      if (!updated) return res.status(404).json({ message: "Payment not found" });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete('/api/supplier-payments/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      await db.delete(supplierPayments).where(eq(supplierPayments.id, id));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get('/api/supplier-payments/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const [payment] = await db.select().from(supplierPayments).where(eq(supplierPayments.id, id));
      if (!payment) return res.status(404).json({ message: "Payment not found" });
      res.json(payment);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch('/api/supplier-adjustments/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const { supplierId, supplierName, type, amountUsd, amountIqd, payTo, payToName, note, date, time } = req.body;
      const [updated] = await db.update(supplierAdjustments).set({
        supplierId, supplierName, type, amountUsd, amountIqd,
        payTo, payToName, note, date, time,
      }).where(eq(supplierAdjustments.id, id)).returning();
      if (!updated) return res.status(404).json({ message: "Adjustment not found" });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete('/api/supplier-adjustments/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      await db.delete(supplierAdjustments).where(eq(supplierAdjustments.id, id));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get('/api/supplier-adjustments/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const [adj] = await db.select().from(supplierAdjustments).where(eq(supplierAdjustments.id, id));
      if (!adj) return res.status(404).json({ message: "Adjustment not found" });
      res.json(adj);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get('/api/supplier-debts', requireAuth, async (req, res) => {
    try {
      const suppliers = await db.select().from(clients).where(eq(clients.type, "supplier"));
      const allInvoices = await db.select().from(purchaseInvoices);
      const allPayments = await db.select().from(supplierPayments);
      const allAdjustments = await db.select().from(supplierAdjustments);

      const results = suppliers.map(supplier => {
        const sInvoices = allInvoices.filter(i => i.supplierId === supplier.id);
        const sPayments = allPayments.filter(p => p.supplierId === supplier.id);
        const sAdjustments = allAdjustments.filter(a => a.supplierId === supplier.id);

        let totalDebitUsd = parseFloat(supplier.oldDebtUsd || "0");
        let totalDebitIqd = parseFloat(supplier.oldDebtIqd || "0");
        let totalCreditUsd = 0;
        let totalCreditIqd = 0;

        for (const inv of sInvoices) {
          const amount = parseFloat(inv.subtotal || "0") + parseFloat(inv.totalExpenses || "0") - parseFloat(inv.discount || "0");
          if (inv.currency === "USD") totalDebitUsd += amount;
          else totalDebitIqd += amount;
        }
        for (const pay of sPayments) {
          totalCreditUsd += parseFloat(pay.amountUsd || "0");
          totalCreditIqd += parseFloat(pay.amountIqd || "0");
        }
        for (const adj of sAdjustments) {
          totalCreditUsd += parseFloat(adj.amountUsd || "0");
          totalCreditIqd += parseFloat(adj.amountIqd || "0");
        }

        const remainingUsd = totalDebitUsd - totalCreditUsd;
        const remainingIqd = totalDebitIqd - totalCreditIqd;

        const sortedInvoices = [...sInvoices].sort((a, b) => {
          const da = `${a.date} ${a.time}`;
          const db2 = `${b.date} ${b.time}`;
          return db2.localeCompare(da);
        });
        const lastInvoiceUsd = sortedInvoices.find(i => i.currency === "USD") || null;
        const lastInvoiceIqd = sortedInvoices.find(i => i.currency === "IQD") || null;

        const sortedPayments = [...sPayments].sort((a, b) => {
          const da = `${a.date} ${a.time}`;
          const db2 = `${b.date} ${b.time}`;
          return db2.localeCompare(da);
        });
        const lastPaymentUsd = sortedPayments.find(p => parseFloat(p.amountUsd || "0") > 0) || null;
        const lastPaymentIqd = sortedPayments.find(p => parseFloat(p.amountIqd || "0") > 0) || null;

        const calcInvAmount = (inv: typeof sortedInvoices[0] | null) =>
          inv ? parseFloat(inv.subtotal || "0") + parseFloat(inv.totalExpenses || "0") - parseFloat(inv.discount || "0") : null;

        return {
          id: supplier.id,
          name: supplier.name,
          remainingUsd,
          remainingIqd,
          lastInvoiceAmountUsd: calcInvAmount(lastInvoiceUsd),
          lastInvoiceDateUsd: lastInvoiceUsd?.date || null,
          lastInvoiceAmountIqd: calcInvAmount(lastInvoiceIqd),
          lastInvoiceDateIqd: lastInvoiceIqd?.date || null,
          lastPaymentAmountUsd: lastPaymentUsd ? parseFloat(lastPaymentUsd.amountUsd || "0") : null,
          lastPaymentDateUsd: lastPaymentUsd?.date || null,
          lastPaymentAmountIqd: lastPaymentIqd ? parseFloat(lastPaymentIqd.amountIqd || "0") : null,
          lastPaymentDateIqd: lastPaymentIqd?.date || null,
        };
      });

      res.json(results);
    } catch (error: any) {
      console.error("Error fetching supplier debts:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get('/api/supplier-statement/:id', requireAuth, async (req, res) => {
    try {
      const supplierId = parseInt(req.params.id as string);
      const { startDate, endDate } = req.query;
      const [supplier] = await db.select().from(clients).where(eq(clients.id, supplierId));
      if (!supplier) return res.status(404).json({ message: "Supplier not found" });

      let invoicesQuery = db.select().from(purchaseInvoices).where(eq(purchaseInvoices.supplierId, supplierId));
      let returnsQuery = db.select().from(purchaseReturns).where(eq(purchaseReturns.supplierId, supplierId));
      let paymentsQuery = db.select().from(supplierPayments).where(eq(supplierPayments.supplierId, supplierId));
      let adjustmentsQuery = db.select().from(supplierAdjustments).where(eq(supplierAdjustments.supplierId, supplierId));

      let openingBalanceUsd = 0;
      let openingBalanceIqd = 0;

      if (startDate) {
        const prevInvoices = await db.select().from(purchaseInvoices)
          .where(sql`${purchaseInvoices.supplierId} = ${supplierId} AND ${purchaseInvoices.date} < ${startDate}`);
        const prevReturns = await db.select().from(purchaseReturns)
          .where(sql`${purchaseReturns.supplierId} = ${supplierId} AND ${purchaseReturns.date} < ${startDate}`);
        const prevPayments = await db.select().from(supplierPayments)
          .where(sql`${supplierPayments.supplierId} = ${supplierId} AND ${supplierPayments.date} < ${startDate}`);
        const prevAdjustments = await db.select().from(supplierAdjustments)
          .where(sql`${supplierAdjustments.supplierId} = ${supplierId} AND ${supplierAdjustments.date} < ${startDate}`);

        openingBalanceUsd = parseFloat(supplier.oldDebtUsd || "0");
        openingBalanceIqd = parseFloat(supplier.oldDebtIqd || "0");

        for (const inv of prevInvoices) {
          const amount = parseFloat(inv.subtotal || "0") + parseFloat(inv.totalExpenses || "0") - parseFloat(inv.discount || "0");
          if (inv.currency === "USD") openingBalanceUsd += amount;
          else openingBalanceIqd += amount;
        }
        for (const ret of prevReturns) {
          const amount = parseFloat(ret.subtotal || "0") - parseFloat(ret.discount || "0");
          if (ret.currency === "USD") openingBalanceUsd -= amount;
          else openingBalanceIqd -= amount;
        }
        for (const pay of prevPayments) {
          openingBalanceUsd -= parseFloat(pay.amountUsd || "0");
          openingBalanceIqd -= parseFloat(pay.amountIqd || "0");
        }
        for (const adj of prevAdjustments) {
          openingBalanceUsd -= parseFloat(adj.amountUsd || "0");
          openingBalanceIqd -= parseFloat(adj.amountIqd || "0");
        }

        invoicesQuery = db.select().from(purchaseInvoices)
          .where(sql`${purchaseInvoices.supplierId} = ${supplierId} AND ${purchaseInvoices.date} >= ${startDate}`);
        returnsQuery = db.select().from(purchaseReturns)
          .where(sql`${purchaseReturns.supplierId} = ${supplierId} AND ${purchaseReturns.date} >= ${startDate}`);
        paymentsQuery = db.select().from(supplierPayments)
          .where(sql`${supplierPayments.supplierId} = ${supplierId} AND ${supplierPayments.date} >= ${startDate}`);
        adjustmentsQuery = db.select().from(supplierAdjustments)
          .where(sql`${supplierAdjustments.supplierId} = ${supplierId} AND ${supplierAdjustments.date} >= ${startDate}`);
      } else {
        openingBalanceUsd = parseFloat(supplier.oldDebtUsd || "0");
        openingBalanceIqd = parseFloat(supplier.oldDebtIqd || "0");
      }

      if (endDate) {
        if (startDate) {
          invoicesQuery = db.select().from(purchaseInvoices)
            .where(sql`${purchaseInvoices.supplierId} = ${supplierId} AND ${purchaseInvoices.date} >= ${startDate} AND ${purchaseInvoices.date} <= ${endDate}`);
          returnsQuery = db.select().from(purchaseReturns)
            .where(sql`${purchaseReturns.supplierId} = ${supplierId} AND ${purchaseReturns.date} >= ${startDate} AND ${purchaseReturns.date} <= ${endDate}`);
          paymentsQuery = db.select().from(supplierPayments)
            .where(sql`${supplierPayments.supplierId} = ${supplierId} AND ${supplierPayments.date} >= ${startDate} AND ${supplierPayments.date} <= ${endDate}`);
          adjustmentsQuery = db.select().from(supplierAdjustments)
            .where(sql`${supplierAdjustments.supplierId} = ${supplierId} AND ${supplierAdjustments.date} >= ${startDate} AND ${supplierAdjustments.date} <= ${endDate}`);
        } else {
          invoicesQuery = db.select().from(purchaseInvoices)
            .where(sql`${purchaseInvoices.supplierId} = ${supplierId} AND ${purchaseInvoices.date} <= ${endDate}`);
          returnsQuery = db.select().from(purchaseReturns)
            .where(sql`${purchaseReturns.supplierId} = ${supplierId} AND ${purchaseReturns.date} <= ${endDate}`);
          paymentsQuery = db.select().from(supplierPayments)
            .where(sql`${supplierPayments.supplierId} = ${supplierId} AND ${supplierPayments.date} <= ${endDate}`);
          adjustmentsQuery = db.select().from(supplierAdjustments)
            .where(sql`${supplierAdjustments.supplierId} = ${supplierId} AND ${supplierAdjustments.date} <= ${endDate}`);
        }
      }

      const invoices = await invoicesQuery.orderBy(purchaseInvoices.date, purchaseInvoices.time);
      const returns = await returnsQuery.orderBy(purchaseReturns.date, purchaseReturns.time);
      const payments = await paymentsQuery.orderBy(supplierPayments.date, supplierPayments.time);
      const adjustments = await adjustmentsQuery.orderBy(supplierAdjustments.date, supplierAdjustments.time);

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
        agentName?: string | null;
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

      for (const ret of returns) {
        const amount = parseFloat(ret.subtotal || "0") - parseFloat(ret.discount || "0");
        entries.push({
          id: ret.id,
          date: ret.date,
          time: ret.time || "00:00",
          type: "return_invoice",
          description: `${ret.returnNumber} (${ret.currency})`,
          debitUsd: 0,
          debitIqd: 0,
          creditUsd: ret.currency === "USD" ? amount : 0,
          creditIqd: ret.currency === "IQD" ? amount : 0,
          note: ret.note || null,
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
          agentName: adj.payToName || null,
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
        openingBalanceUsd,
        openingBalanceIqd,
      });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get('/api/supplier-products-report/:id', requireAuth, async (req, res) => {
    try {
      const supplierId = parseInt(req.params.id as string);
      const { startDate, endDate, currency } = req.query;
      const curr = (currency as string) || "USD";
      
      const [supplier] = await db.select().from(clients).where(eq(clients.id, supplierId));
      if (!supplier) return res.status(404).json({ message: "Supplier not found" });

      let invoiceConditions = sql`${purchaseInvoices.supplierId} = ${supplierId} AND ${purchaseInvoices.currency} = ${curr}`;
      let returnConditions = sql`${purchaseReturns.supplierId} = ${supplierId} AND ${purchaseReturns.currency} = ${curr}`;

      if (startDate) {
        invoiceConditions = sql`${invoiceConditions} AND ${purchaseInvoices.date} >= ${startDate}`;
        returnConditions = sql`${returnConditions} AND ${purchaseReturns.date} >= ${startDate}`;
      }
      if (endDate) {
        invoiceConditions = sql`${invoiceConditions} AND ${purchaseInvoices.date} <= ${endDate}`;
        returnConditions = sql`${returnConditions} AND ${purchaseReturns.date} <= ${endDate}`;
      }

      const invoices = await db.select().from(purchaseInvoices).where(invoiceConditions).orderBy(purchaseInvoices.date);
      const returns = await db.select().from(purchaseReturns).where(returnConditions).orderBy(purchaseReturns.date);

      type ReportRow = {
        invoiceId: number;
        invoiceNumber: string;
        type: "purchase" | "return";
        date: string;
        productName: string;
        quantity: number;
        unit: string;
        returnQuantity: number;
        price: number;
      };

      const rows: ReportRow[] = [];

      for (const inv of invoices) {
        const items = await db.select().from(purchaseInvoiceItems).where(eq(purchaseInvoiceItems.invoiceId, inv.id));
        for (const item of items) {
          rows.push({
            invoiceId: inv.id,
            invoiceNumber: inv.invoiceNumber,
            type: "purchase",
            date: inv.date,
            productName: item.productName,
            quantity: parseFloat(item.quantity || "0"),
            unit: item.unit,
            returnQuantity: 0,
            price: parseFloat(item.price || "0"),
          });
        }
      }

      for (const ret of returns) {
        const items = await db.select().from(purchaseReturnItems).where(eq(purchaseReturnItems.returnId, ret.id));
        for (const item of items) {
          rows.push({
            invoiceId: ret.id,
            invoiceNumber: ret.returnNumber,
            type: "return",
            date: ret.date,
            productName: item.productName,
            quantity: 0,
            unit: item.unit,
            returnQuantity: parseFloat(item.quantity || "0"),
            price: parseFloat(item.price || "0"),
          });
        }
      }

      rows.sort((a, b) => a.date.localeCompare(b.date));

      const totalQuantity = rows.reduce((s, r) => s + r.quantity, 0);
      const totalReturns = rows.reduce((s, r) => s + r.returnQuantity, 0);
      const totalAmount = rows.reduce((s, r) => s + (r.quantity * r.price) - (r.returnQuantity * r.price), 0);

      res.json({
        supplier,
        rows,
        totalQuantity,
        totalReturns,
        totalAmount,
        currency: curr,
      });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get('/api/supplier-vehicle-expenses/:id', requireAuth, async (req, res) => {
    try {
      const supplierId = parseInt(req.params.id as string);
      const { startDate, endDate, currency } = req.query;
      const curr = (currency as string) || "USD";

      const [supplier] = await db.select().from(clients).where(eq(clients.id, supplierId));
      if (!supplier) return res.status(404).json({ message: "Supplier not found" });

      let conditions = sql`${purchaseInvoices.supplierId} = ${supplierId} AND ${purchaseInvoices.currency} = ${curr}`;
      if (startDate) conditions = sql`${conditions} AND ${purchaseInvoices.date} >= ${startDate}`;
      if (endDate) conditions = sql`${conditions} AND ${purchaseInvoices.date} <= ${endDate}`;

      const invoices = await db.select().from(purchaseInvoices).where(conditions).orderBy(purchaseInvoices.date);

      const rows = invoices.map(inv => {
        const subtotal = parseFloat(inv.subtotal || "0");
        const totalExpenses = parseFloat(inv.totalExpenses || "0");
        const discount = parseFloat(inv.discount || "0");
        const invoiceAmount = subtotal + totalExpenses - discount;
        return {
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          date: inv.date,
          carNumber: inv.carNumber || "",
          manifest: inv.manifest || "",
          driverName: inv.driverName || "",
          driverMobile: inv.driverMobile || "",
          customsExpense: parseFloat(inv.customsExpense || "0"),
          carExpense: parseFloat(inv.carExpense || "0"),
          invoiceAmount,
          amountPaid: parseFloat(inv.amountPaid || "0"),
          remaining: parseFloat(inv.remaining || "0"),
        };
      });

      const totalCustoms = rows.reduce((s, r) => s + r.customsExpense, 0);
      const totalCarExpense = rows.reduce((s, r) => s + r.carExpense, 0);
      const totalInvoiceAmount = rows.reduce((s, r) => s + r.invoiceAmount, 0);
      const totalPaid = rows.reduce((s, r) => s + r.amountPaid, 0);
      const totalRemaining = rows.reduce((s, r) => s + r.remaining, 0);

      res.json({
        supplier,
        rows,
        totalCustoms,
        totalCarExpense,
        totalInvoiceAmount,
        totalPaid,
        totalRemaining,
        currency: curr,
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

  app.patch('/api/bank-transactions/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const { bankId, bankName, type, amountUsd, amountIqd, description, reference, date, time } = req.body;
      const [updated] = await db.update(bankTransactions).set({
        bankId, bankName, type, amountUsd, amountIqd, description, reference, date, time,
      }).where(eq(bankTransactions.id, id)).returning();
      if (!updated) return res.status(404).json({ message: "Transaction not found" });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete('/api/bank-transactions/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      await db.delete(bankTransactions).where(eq(bankTransactions.id, id));
      res.json({ success: true });
    } catch (err) {
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

  app.get('/api/clearance-transactions/next-number/:type', requireAuth, async (req, res) => {
    try {
      const txnType = req.params.type as string;
      const prefix = txnType === 'payment' ? 'CP' : 'CR';
      const [result] = await db.select({ maxNum: sql<string>`MAX(${customsClearanceTransactions.listNumber})` })
        .from(customsClearanceTransactions)
        .where(sql`${customsClearanceTransactions.listNumber} LIKE ${prefix + '%'}`);
      let nextNum = 1;
      if (result?.maxNum) {
        const numPart = parseInt(result.maxNum.replace(prefix + '-', ''), 10);
        if (!isNaN(numPart)) nextNum = numPart + 1;
      }
      res.json({ number: `${prefix}-${String(nextNum).padStart(5, '0')}` });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
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

  app.patch('/api/clearance-transactions/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const { clearanceId, clearanceName, type, amountUsd, amountIqd, description, reference, date, time } = req.body;
      const [updated] = await db.update(customsClearanceTransactions).set({
        clearanceId, clearanceName, type, amountUsd, amountIqd, description, reference, date, time,
      }).where(eq(customsClearanceTransactions.id, id)).returning();
      if (!updated) return res.status(404).json({ message: "Transaction not found" });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete('/api/clearance-transactions/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      await db.delete(customsClearanceTransactions).where(eq(customsClearanceTransactions.id, id));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get('/api/clearance-purchase-invoices', requireAuth, async (req, res) => {
    const data = await storage.getClearancePurchaseInvoices();
    res.json(data);
  });

  app.get('/api/clearance-purchase-invoices/next-number', requireAuth, async (req, res) => {
    try {
      const prefix = 'CPI';
      const [result] = await db.select({ maxNum: sql<string>`MAX(${clearancePurchaseInvoices.listNumber})` })
        .from(clearancePurchaseInvoices)
        .where(sql`${clearancePurchaseInvoices.listNumber} LIKE ${prefix + '%'}`);
      let nextNum = 1;
      if (result?.maxNum) {
        const numPart = parseInt(result.maxNum.replace(prefix + '-', ''), 10);
        if (!isNaN(numPart)) nextNum = numPart + 1;
      }
      res.json({ number: `${prefix}-${String(nextNum).padStart(5, '0')}` });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post('/api/clearance-purchase-invoices', requireAuth, async (req, res) => {
    try {
      const { insertClearancePurchaseInvoiceSchema } = await import("@shared/schema");
      const input = insertClearancePurchaseInvoiceSchema.parse(req.body);
      const result = await storage.createClearancePurchaseInvoice(input);
      res.status(201).json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch('/api/clearance-purchase-invoices/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const { clearanceId, clearanceName, date, time, carNumber, manifest, customsUsd, customsIqd, description } = req.body;
      const updated = await storage.updateClearancePurchaseInvoice(id, {
        clearanceId, clearanceName, date, time, carNumber, manifest, customsUsd, customsIqd, description,
      });
      if (!updated) return res.status(404).json({ message: "Invoice not found" });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete('/api/clearance-purchase-invoices/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      await storage.deleteClearancePurchaseInvoice(id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get('/api/clearance-statement/:id', requireAuth, async (req, res) => {
    try {
      const clearanceId = parseInt(req.params.id as string);
      const [clearance] = await db.select().from(customsClearances).where(eq(customsClearances.id, clearanceId));
      if (!clearance) return res.status(404).json({ message: "Customs clearance not found" });

      const txns = await storage.getCustomsClearanceTransactionsByClearanceId(clearanceId);

      const allClearanceInvoices = await db.select().from(purchaseInvoices).where(
        sql`${purchaseInvoices.customsClearance} = ${clearance.name}`
      ).orderBy(purchaseInvoices.date);

      const invoicesWithCustoms = allClearanceInvoices.filter(inv => parseFloat(inv.customsExpense || "0") > 0);

      const txnEntries = txns.map((t) => {
        const usdAmt = parseFloat(t.amountUsd || "0");
        const iqdAmt = parseFloat(t.amountIqd || "0");
        return {
          id: t.id,
          date: t.date,
          time: t.time || "00:00",
          type: t.type,
          source: "clearance" as const,
          description: t.description,
          reference: t.reference,
          listNumber: t.listNumber || "",
          carNumber: "",
          manifest: "",
          debitUsd: t.type === "receipt" ? usdAmt : 0,
          debitIqd: t.type === "receipt" ? iqdAmt : 0,
          creditUsd: t.type === "payment" ? usdAmt : 0,
          creditIqd: t.type === "payment" ? iqdAmt : 0,
        };
      });

      const invoiceEntries = invoicesWithCustoms.map((inv) => {
        const expense = parseFloat(inv.customsExpense || "0");
        const isUsd = inv.currency === "USD";
        return {
          id: inv.id,
          date: inv.date,
          time: inv.time || "00:00",
          type: "customs_expense" as const,
          source: "invoice" as const,
          description: `${inv.invoiceNumber} - ${inv.supplierName}`,
          reference: inv.invoiceNumber,
          listNumber: inv.invoiceNumber || "",
          carNumber: inv.carNumber || "",
          manifest: inv.manifest || "",
          debitUsd: isUsd ? expense : 0,
          debitIqd: !isUsd ? expense : 0,
          creditUsd: 0,
          creditIqd: 0,
        };
      });

      const clearancePurchaseInvs = await db.select().from(clearancePurchaseInvoices).where(
        eq(clearancePurchaseInvoices.clearanceId, clearanceId)
      ).orderBy(clearancePurchaseInvoices.date);

      const clearanceInvoiceEntries = clearancePurchaseInvs.map((inv) => {
        const usdAmt = parseFloat(inv.customsUsd || "0");
        const iqdAmt = parseFloat(inv.customsIqd || "0");
        return {
          id: inv.id,
          date: inv.date,
          time: inv.time || "00:00",
          type: "customs" as const,
          source: "clearance_invoice" as const,
          description: inv.description || null,
          reference: inv.listNumber,
          listNumber: inv.listNumber || "",
          carNumber: inv.carNumber || "",
          manifest: inv.manifest || "",
          debitUsd: usdAmt,
          debitIqd: iqdAmt,
          creditUsd: 0,
          creditIqd: 0,
        };
      });

      const allEntries = [...txnEntries, ...invoiceEntries, ...clearanceInvoiceEntries].sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.time.localeCompare(b.time);
      });

      const vehicles = allClearanceInvoices.map(inv => {
        const subtotal = parseFloat(inv.subtotal || "0");
        const totalExpenses = parseFloat(inv.totalExpenses || "0");
        const discount = parseFloat(inv.discount || "0");
        const invoiceAmount = subtotal + totalExpenses - discount;
        return {
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          date: inv.date,
          currency: inv.currency,
          supplierName: inv.supplierName || "",
          carNumber: inv.carNumber || "",
          manifest: inv.manifest || "",
          driverName: inv.driverName || "",
          driverMobile: inv.driverMobile || "",
          customsExpense: parseFloat(inv.customsExpense || "0"),
          carExpense: parseFloat(inv.carExpense || "0"),
          invoiceAmount,
          amountPaid: parseFloat(inv.amountPaid || "0"),
          remaining: parseFloat(inv.remaining || "0"),
        };
      });

      res.json({ clearance, entries: allEntries, vehicles });
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

  app.patch('/api/office-transactions/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const { officeId, officeName, type, amountUsd, amountIqd, description, reference, date, time } = req.body;
      const [updated] = await db.update(transferOfficeTransactions).set({
        officeId, officeName, type, amountUsd, amountIqd, description, reference, date, time,
      }).where(eq(transferOfficeTransactions.id, id)).returning();
      if (!updated) return res.status(404).json({ message: "Transaction not found" });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete('/api/office-transactions/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      await db.delete(transferOfficeTransactions).where(eq(transferOfficeTransactions.id, id));
      res.json({ success: true });
    } catch (err) {
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

  app.patch('/api/expenses/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const { expenseTypeId, expenseTypeName, invoiceNumber, amountUsd, amountIqd, description, reference, date, time } = req.body;
      const [updated] = await db.update(expenses).set({
        expenseTypeId, expenseTypeName, invoiceNumber, amountUsd, amountIqd, description, reference, date, time,
      }).where(eq(expenses.id, id)).returning();
      if (!updated) return res.status(404).json({ message: "Expense not found" });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete('/api/expenses/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      await db.delete(expenses).where(eq(expenses.id, id));
      res.json({ success: true });
    } catch (err) {
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

  app.delete('/api/sales-invoices/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const userId = req.session.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Only admin can delete invoices" });
      }
      await db.delete(salesInvoiceItems).where(eq(salesInvoiceItems.invoiceId, id));
      await db.delete(salesInvoices).where(eq(salesInvoices.id, id));
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting sales invoice:", err);
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

  app.patch('/api/purchase-returns/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const { returnData, items } = req.body;
      const result = await db.transaction(async (tx) => {
        const [updated] = await tx.update(purchaseReturns).set(returnData).where(eq(purchaseReturns.id, id)).returning();
        await tx.delete(purchaseReturnItems).where(eq(purchaseReturnItems.returnId, id));
        if (items && items.length > 0) {
          const itemsWithReturnId = items.map((item: any) => ({ ...item, returnId: id }));
          await tx.insert(purchaseReturnItems).values(itemsWithReturnId);
        }
        return updated;
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete('/api/purchase-returns/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      await db.transaction(async (tx) => {
        await tx.delete(purchaseReturnItems).where(eq(purchaseReturnItems.returnId, id));
        await tx.delete(purchaseReturns).where(eq(purchaseReturns.id, id));
      });
      res.json({ success: true });
    } catch (err) {
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

  app.patch('/api/customer-receipts/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const { customerId, customerName, paymentSource, paymentSourceName, amount, discount, currency, note, reference, date, time } = req.body;
      const [updated] = await db.update(customerReceipts).set({
        customerId, customerName, paymentSource, paymentSourceName, amount, discount, currency, note, reference, date, time,
      }).where(eq(customerReceipts.id, id)).returning();
      if (!updated) return res.status(404).json({ message: "Receipt not found" });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete('/api/customer-receipts/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      await db.delete(customerReceipts).where(eq(customerReceipts.id, id));
      res.json({ success: true });
    } catch (err) {
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
        const [customer] = await tx.select().from(clients).where(eq(clients.id, input.agentId));

        let currentDebt = 0;
        if (input.currency === "USD") {
          currentDebt = parseFloat(customer?.oldDebtUsd || "0");
        } else {
          currentDebt = parseFloat(customer?.oldDebtIqd || "0");
        }

        const remaining = currentDebt - amount;

        const [payment] = await tx.insert(agentPayments).values({
          ...input,
          oldDebt: String(currentDebt),
          remaining: String(remaining),
        }).returning();

        if (input.currency === "USD") {
          await tx.update(clients)
            .set({
              oldDebtUsd: sql`CAST(${clients.oldDebtUsd} AS NUMERIC) - ${amount}`,
            })
            .where(eq(clients.id, input.agentId));
        } else {
          await tx.update(clients)
            .set({
              oldDebtIqd: sql`CAST(${clients.oldDebtIqd} AS NUMERIC) - ${amount}`,
            })
            .where(eq(clients.id, input.agentId));
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

  // Currency Exchanges
  app.get(api.currencyExchanges.list.path, requireAuth, async (_req, res) => {
    const data = await storage.getCurrencyExchanges();
    res.json(data);
  });

  app.post(api.currencyExchanges.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.currencyExchanges.create.input.parse(req.body);
      const fromAmount = parseFloat(input.fromAmount || "0");
      const exchangeRate = parseFloat(input.exchangeRate || "0");

      if (fromAmount <= 0) {
        return res.status(400).json({ message: "Amount must be greater than zero" });
      }
      if (exchangeRate <= 0) {
        return res.status(400).json({ message: "Exchange rate must be greater than zero" });
      }

      const toAmount = fromAmount * exchangeRate;
      const exchange = await storage.createCurrencyExchange({
        ...input,
        toAmount: String(toAmount),
      });
      res.status(201).json(exchange);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete(api.currencyExchanges.delete.path, requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCurrencyExchange(id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Warehouse Transfers
  app.get('/api/warehouse-transfers/next-number', requireAuth, async (_req, res) => {
    const number = await storage.getNextTransferNumber();
    res.json({ number });
  });

  app.get(api.warehouseTransfers.list.path, requireAuth, async (_req, res) => {
    const data = await storage.getWarehouseTransfers();
    res.json(data);
  });

  app.get('/api/warehouse-transfers/:id/items', requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const items = await storage.getWarehouseTransferItems(id);
    res.json(items);
  });

  app.post(api.warehouseTransfers.create.path, requireAuth, async (req, res) => {
    try {
      const parsed = api.warehouseTransfers.create.input.parse(req.body);
      const { transfer: transferData, items: itemsData } = parsed;

      if (!itemsData || itemsData.length === 0) {
        return res.status(400).json({ message: "At least one item is required" });
      }

      if (transferData.fromWarehouseId === transferData.toWarehouseId) {
        return res.status(400).json({ message: "Source and destination warehouses must be different" });
      }

      const result = await db.transaction(async (tx) => {
        const [transfer] = await tx.insert(warehouseTransfers).values(transferData).returning();

        for (const item of itemsData) {
          await tx.insert(warehouseTransferItems).values({
            ...item,
            transferId: transfer.id,
          });
        }

        return transfer;
      });

      res.status(201).json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete('/api/warehouse-transfers/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      await db.transaction(async (tx) => {
        await tx.delete(warehouseTransferItems).where(eq(warehouseTransferItems.transferId, id));
        await tx.delete(warehouseTransfers).where(eq(warehouseTransfers.id, id));
      });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Agent Product Loads
  app.get('/api/agent-product-loads/next-number', requireAuth, async (_req, res) => {
    const [result] = await db.select({ count: sql<number>`COUNT(*)` }).from(agentProductLoads);
    const num = (result?.count || 0) + 1;
    res.json({ number: `APL-${String(num).padStart(6, '0')}` });
  });

  app.get(api.agentProductLoads.list.path, requireAuth, async (_req, res) => {
    const data = await db.select().from(agentProductLoads).orderBy(sql`${agentProductLoads.createdAt} DESC`);
    res.json(data);
  });

  app.get('/api/agent-product-loads/:id/items', requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const items = await db.select().from(agentProductLoadItems).where(eq(agentProductLoadItems.loadId, id));
    res.json(items);
  });

  app.post(api.agentProductLoads.create.path, requireAuth, async (req, res) => {
    try {
      const parsed = api.agentProductLoads.create.input.parse(req.body);
      const { load: loadData, items: itemsData } = parsed;

      if (!itemsData || itemsData.length === 0) {
        return res.status(400).json({ message: "At least one item is required" });
      }

      const result = await db.transaction(async (tx) => {
        const [load] = await tx.insert(agentProductLoads).values(loadData).returning();

        for (const item of itemsData) {
          await tx.insert(agentProductLoadItems).values({
            ...item,
            loadId: load.id,
          });
        }

        return load;
      });

      res.status(201).json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete('/api/agent-product-loads/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      await db.transaction(async (tx) => {
        await tx.delete(agentProductLoadItems).where(eq(agentProductLoadItems.loadId, id));
        await tx.delete(agentProductLoads).where(eq(agentProductLoads.id, id));
      });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get('/api/agent-clients', requireAuth, async (_req, res) => {
    try {
      const data = await db
        .select({
          id: agentClients.id,
          agentUserId: agentClients.agentUserId,
          agentName: agentClients.agentName,
          clientId: agentClients.clientId,
          clientName: agentClients.clientName,
          assignedAt: agentClients.assignedAt,
          clientAddress: clients.address,
          clientContact: clients.contact,
        })
        .from(agentClients)
        .leftJoin(clients, eq(agentClients.clientId, clients.id))
        .orderBy(agentClients.agentName, agentClients.clientName);
      res.json(data);
    } catch { res.status(500).json({ message: "Internal server error" }); }
  });

  app.get('/api/agent-clients/by-agent/:agentUserId', requireAuth, async (req, res) => {
    try {
      const { agentUserId } = req.params;
      const data = await db.select().from(agentClients).where(eq(agentClients.agentUserId, agentUserId)).orderBy(agentClients.clientName);
      res.json(data);
    } catch { res.status(500).json({ message: "Internal server error" }); }
  });

  app.post('/api/agent-clients', requireAuth, async (req, res) => {
    try {
      const { agentUserId, agentName, clientIds } = req.body;
      if (!agentUserId || !agentName || !Array.isArray(clientIds)) {
        return res.status(400).json({ message: "agentUserId, agentName, and clientIds are required" });
      }
      if (clientIds.length > 0) {
        const existingOther = await db.select().from(agentClients)
          .where(and(
            inArray(agentClients.clientId, clientIds),
            sql`${agentClients.agentUserId} != ${agentUserId}`
          ));
        if (existingOther.length > 0) {
          const names = existingOther.map(e => `${e.clientName} (${e.agentName})`).join(", ");
          return res.status(400).json({ message: `These clients are already assigned to other agents: ${names}` });
        }
      }
      await db.delete(agentClients).where(eq(agentClients.agentUserId, agentUserId));
      if (clientIds.length > 0) {
        const customerList = await db.select().from(clients).where(eq(clients.type, 'customer'));
        const customerMap = new Map(customerList.map(c => [c.id, c.name]));
        const values = clientIds
          .filter((id: number) => customerMap.has(id))
          .map((id: number) => ({ agentUserId, agentName, clientId: id, clientName: customerMap.get(id)! }));
        if (values.length > 0) {
          await db.insert(agentClients).values(values);
        }
      }
      const data = await db.select().from(agentClients).where(eq(agentClients.agentUserId, agentUserId)).orderBy(agentClients.clientName);
      res.json(data);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post('/api/agent-clients/single', requireAuth, async (req, res) => {
    try {
      const { agentUserId, agentName, clientId, clientName } = req.body;
      if (!agentUserId || !agentName || !clientId || !clientName) {
        return res.status(400).json({ message: "agentUserId, agentName, clientId, and clientName are required" });
      }
      await db.delete(agentClients).where(eq(agentClients.clientId, clientId));
      const [row] = await db.insert(agentClients).values({ agentUserId, agentName, clientId, clientName }).returning();
      res.status(201).json(row);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete('/api/agent-clients/by-client/:clientId', requireAuth, async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId as string, 10);
      await db.delete(agentClients).where(eq(agentClients.clientId, clientId));
      res.json({ message: "Deleted" });
    } catch { res.status(500).json({ message: "Internal server error" }); }
  });

  app.delete('/api/agent-clients/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      await db.delete(agentClients).where(eq(agentClients.id, id));
      res.json({ message: "Deleted" });
    } catch { res.status(500).json({ message: "Internal server error" }); }
  });

  app.get('/api/agent-locations', requireAuth, async (_req, res) => {
    try {
      const data = await db.select().from(agentLocations).orderBy(agentLocations.agentName);
      res.json(data);
    } catch { res.status(500).json({ message: "Internal server error" }); }
  });

  app.post('/api/agent-locations', requireAuth, async (req, res) => {
    try {
      const { agentUserId, agentName, latitude, longitude, accuracy, deviceType } = req.body;
      if (!agentUserId || !agentName || latitude == null || longitude == null) {
        return res.status(400).json({ message: "agentUserId, agentName, latitude, longitude are required" });
      }
      const dt = deviceType || "unknown";
      const existing = await db.select().from(agentLocations).where(and(eq(agentLocations.agentUserId, agentUserId), eq(agentLocations.deviceType, dt)));
      if (existing.length > 0) {
        const [updated] = await db.update(agentLocations)
          .set({ agentName, latitude: String(latitude), longitude: String(longitude), accuracy: accuracy ? String(accuracy) : null, updatedAt: new Date() })
          .where(and(eq(agentLocations.agentUserId, agentUserId), eq(agentLocations.deviceType, dt)))
          .returning();
        return res.json(updated);
      }
      const [created] = await db.insert(agentLocations).values({
        agentUserId, agentName, latitude: String(latitude), longitude: String(longitude),
        accuracy: accuracy ? String(accuracy) : null, deviceType: dt,
      }).returning();
      res.json(created);
    } catch { res.status(500).json({ message: "Internal server error" }); }
  });

  app.delete('/api/agent-locations/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      await db.delete(agentLocations).where(eq(agentLocations.id, id));
      res.json({ message: "Deleted" });
    } catch { res.status(500).json({ message: "Internal server error" }); }
  });

  // Inventory Report
  app.get('/api/inventory-report', requireAuth, async (req, res) => {
    try {
      const warehouseId = req.query.warehouseId ? parseInt(req.query.warehouseId as string) : null;

      const damageFilter = warehouseId
        ? `JOIN product_damages d ON d.id = di.damage_id WHERE d.warehouse_id = ${warehouseId}`
        : `WHERE 1=1`;

      const transferInFilter = warehouseId
        ? `JOIN warehouse_transfers t ON t.id = ti.transfer_id WHERE t.to_warehouse_id = ${warehouseId}`
        : `WHERE 1=0`;

      const transferOutFilter = warehouseId
        ? `JOIN warehouse_transfers t ON t.id = ti.transfer_id WHERE t.from_warehouse_id = ${warehouseId}`
        : `WHERE 1=0`;

      const query = `
        WITH purchase_agg AS (
          SELECT product_id, unit, SUM(CAST(quantity AS NUMERIC)) as total
          FROM purchase_invoice_items WHERE product_id IS NOT NULL
          GROUP BY product_id, unit
        ),
        sales_agg AS (
          SELECT product_id, unit, SUM(CAST(quantity AS NUMERIC)) as total
          FROM sales_invoice_items WHERE product_id IS NOT NULL
          GROUP BY product_id, unit
        ),
        purchase_return_agg AS (
          SELECT product_id, unit, SUM(CAST(quantity AS NUMERIC)) as total
          FROM purchase_return_items WHERE product_id IS NOT NULL
          GROUP BY product_id, unit
        ),
        sales_return_agg AS (
          SELECT product_id, unit, SUM(CAST(quantity AS NUMERIC)) as total
          FROM sales_return_items WHERE product_id IS NOT NULL
          GROUP BY product_id, unit
        ),
        damage_agg AS (
          SELECT di.product_id, di.unit, SUM(di.quantity) as total
          FROM product_damage_items di
          ${damageFilter}
          AND di.product_id IS NOT NULL
          GROUP BY di.product_id, di.unit
        ),
        transfer_in_agg AS (
          SELECT ti.product_id, ti.unit, SUM(ti.quantity) as total
          FROM warehouse_transfer_items ti
          ${transferInFilter}
          AND ti.product_id IS NOT NULL
          GROUP BY ti.product_id, ti.unit
        ),
        transfer_out_agg AS (
          SELECT ti.product_id, ti.unit, SUM(ti.quantity) as total
          FROM warehouse_transfer_items ti
          ${transferOutFilter}
          AND ti.product_id IS NOT NULL
          GROUP BY ti.product_id, ti.unit
        )
        SELECT
          p.id as product_id,
          p.barcode as product_code,
          p.name as product_name,
          p.name_en as product_name_en,
          p.category,
          p.big_unit,
          p.small_unit,
          p.conversion_factor,
          COALESCE(SUM(CASE WHEN pa.unit = p.big_unit THEN pa.total * p.conversion_factor ELSE pa.total END), 0)::INTEGER as purchased,
          COALESCE(SUM(CASE WHEN sa.unit = p.big_unit THEN sa.total * p.conversion_factor ELSE sa.total END), 0)::INTEGER as sold,
          COALESCE(SUM(CASE WHEN pra.unit = p.big_unit THEN pra.total * p.conversion_factor ELSE pra.total END), 0)::INTEGER as purchase_returned,
          COALESCE(SUM(CASE WHEN sra.unit = p.big_unit THEN sra.total * p.conversion_factor ELSE sra.total END), 0)::INTEGER as sales_returned,
          COALESCE(SUM(CASE WHEN da.unit = p.big_unit THEN da.total * p.conversion_factor ELSE da.total END), 0)::INTEGER as damaged,
          COALESCE(SUM(CASE WHEN tia.unit = p.big_unit THEN tia.total * p.conversion_factor ELSE tia.total END), 0)::INTEGER as transfer_in,
          COALESCE(SUM(CASE WHEN toa.unit = p.big_unit THEN toa.total * p.conversion_factor ELSE toa.total END), 0)::INTEGER as transfer_out
        FROM products p
        LEFT JOIN purchase_agg pa ON pa.product_id = p.id
        LEFT JOIN sales_agg sa ON sa.product_id = p.id
        LEFT JOIN purchase_return_agg pra ON pra.product_id = p.id
        LEFT JOIN sales_return_agg sra ON sra.product_id = p.id
        LEFT JOIN damage_agg da ON da.product_id = p.id
        LEFT JOIN transfer_in_agg tia ON tia.product_id = p.id
        LEFT JOIN transfer_out_agg toa ON toa.product_id = p.id
        GROUP BY p.id, p.barcode, p.name, p.name_en, p.category, p.big_unit, p.small_unit, p.conversion_factor
        ORDER BY p.name
      `;

      const result = await pool.query(query);

      const report = result.rows.map(row => {
        const cf = parseInt(row.conversion_factor) || 1;
        const purchased = parseInt(row.purchased) || 0;
        const sold = parseInt(row.sold) || 0;
        const purchaseReturned = parseInt(row.purchase_returned) || 0;
        const salesReturned = parseInt(row.sales_returned) || 0;
        const damaged = parseInt(row.damaged) || 0;
        const transferIn = parseInt(row.transfer_in) || 0;
        const transferOut = parseInt(row.transfer_out) || 0;

        const netSmall = purchased + salesReturned + transferIn - sold - purchaseReturned - damaged - transferOut;

        return {
          productId: row.product_id,
          productCode: row.product_code,
          productName: row.product_name,
          productNameEn: row.product_name_en || null,
          category: row.category,
          bigUnit: row.big_unit,
          smallUnit: row.small_unit,
          conversionFactor: cf,
          purchased,
          sold,
          purchaseReturned,
          salesReturned,
          damaged,
          transferIn,
          transferOut,
          netSmallUnits: netSmall,
          bigQty: Math.floor(Math.abs(netSmall) / cf) * (netSmall < 0 ? -1 : 1),
          smallQty: Math.abs(netSmall) % cf,
          purchasedBig: Math.floor(purchased / cf),
          purchasedRemainder: purchased % cf,
          soldBig: Math.floor(sold / cf),
          soldRemainder: sold % cf,
          purchaseReturnedBig: Math.floor(purchaseReturned / cf),
          purchaseReturnedRemainder: purchaseReturned % cf,
          salesReturnedBig: Math.floor(salesReturned / cf),
          salesReturnedRemainder: salesReturned % cf,
          damagedBig: Math.floor(damaged / cf),
          damagedRemainder: damaged % cf,
          transferInBig: Math.floor(transferIn / cf),
          transferInRemainder: transferIn % cf,
          transferOutBig: Math.floor(transferOut / cf),
          transferOutRemainder: transferOut % cf,
        };
      });

      res.json(report);
    } catch (err) {
      console.error("Inventory report error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Product Damages
  app.get('/api/product-damages/next-number', requireAuth, async (_req, res) => {
    const number = await storage.getNextDamageNumber();
    res.json({ number });
  });

  app.get(api.productDamages.list.path, requireAuth, async (_req, res) => {
    const data = await storage.getProductDamages();
    const allItems = await db.select().from(productDamageItems);
    const result = data.map(d => ({
      ...d,
      itemProductNames: allItems.filter(i => i.damageId === d.id).map(i => i.productName),
    }));
    res.json(result);
  });

  app.get('/api/product-damages/:id/items', requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const items = await storage.getProductDamageItems(id);
    res.json(items);
  });

  app.post(api.productDamages.create.path, requireAuth, async (req, res) => {
    try {
      const parsed = api.productDamages.create.input.parse(req.body);
      const { damage: damageData, items: itemsData } = parsed;

      if (!itemsData || itemsData.length === 0) {
        return res.status(400).json({ message: "At least one item is required" });
      }

      const result = await db.transaction(async (tx) => {
        const [damage] = await tx.insert(productDamages).values(damageData).returning();

        for (const item of itemsData) {
          await tx.insert(productDamageItems).values({
            ...item,
            damageId: damage.id,
          });
        }

        return damage;
      });

      res.status(201).json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put('/api/product-damages/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const { damage: damageData, items: itemsData } = req.body;

      if (!itemsData || itemsData.length === 0) {
        return res.status(400).json({ message: "At least one item is required" });
      }

      const result = await db.transaction(async (tx) => {
        const [updated] = await tx.update(productDamages)
          .set({
            warehouseId: damageData.warehouseId,
            warehouseName: damageData.warehouseName,
            reason: damageData.reason,
            note: damageData.note,
            date: damageData.date,
            time: damageData.time,
          })
          .where(eq(productDamages.id, id))
          .returning();

        await tx.delete(productDamageItems).where(eq(productDamageItems.damageId, id));

        for (const item of itemsData) {
          await tx.insert(productDamageItems).values({
            ...item,
            damageId: id,
          });
        }

        return updated;
      });

      res.json(result);
    } catch (err) {
      console.error("Error updating product damage:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete('/api/product-damages/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      await db.transaction(async (tx) => {
        await tx.delete(productDamageItems).where(eq(productDamageItems.damageId, id));
        await tx.delete(productDamages).where(eq(productDamages.id, id));
      });
      res.json({ success: true });
    } catch (err) {
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

  app.patch('/api/external-debt-transactions/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const { debtId, debtName, type, receiptNumber, amountUsd, amountIqd, description, reference, date, time } = req.body;
      const [updated] = await db.update(externalDebtTransactions).set({
        debtId, debtName, type, receiptNumber, amountUsd, amountIqd, description, reference, date, time,
      }).where(eq(externalDebtTransactions.id, id)).returning();
      if (!updated) return res.status(404).json({ message: "Transaction not found" });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete('/api/external-debt-transactions/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      await db.delete(externalDebtTransactions).where(eq(externalDebtTransactions.id, id));
      res.json({ success: true });
    } catch (err) {
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

  app.patch('/api/owner-transactions/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const { ownerId, ownerName, type, receiptNumber, amountUsd, amountIqd, description, reference, date, time } = req.body;
      const [updated] = await db.update(ownerTransactions).set({
        ownerId, ownerName, type, receiptNumber, amountUsd, amountIqd, description, reference, date, time,
      }).where(eq(ownerTransactions.id, id)).returning();
      if (!updated) return res.status(404).json({ message: "Transaction not found" });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete('/api/owner-transactions/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      await db.delete(ownerTransactions).where(eq(ownerTransactions.id, id));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get('/api/external-debt-debts', requireAuth, async (req, res) => {
    try {
      const debts = await db.select().from(externalDebts);
      const allTxns = await db.select().from(externalDebtTransactions);

      const results = debts.map(debt => {
        const dTxns = allTxns.filter(t => t.debtId === debt.id);

        let totalDebitUsd = parseFloat(debt.oldDebtUsd || "0");
        let totalDebitIqd = parseFloat(debt.oldDebtIqd || "0");
        let totalCreditUsd = 0;
        let totalCreditIqd = 0;

        for (const t of dTxns) {
          const usdAmt = parseFloat(t.amountUsd || "0");
          const iqdAmt = parseFloat(t.amountIqd || "0");
          if (t.type === "receipt") {
            totalDebitUsd += usdAmt;
            totalDebitIqd += iqdAmt;
          } else {
            totalCreditUsd += usdAmt;
            totalCreditIqd += iqdAmt;
          }
        }

        const remainingUsd = totalDebitUsd - totalCreditUsd;
        const remainingIqd = totalDebitIqd - totalCreditIqd;

        const sorted = [...dTxns].sort((a, b) => {
          const da = `${a.date} ${a.time}`;
          const db2 = `${b.date} ${b.time}`;
          return db2.localeCompare(da);
        });
        const lastReceipt = sorted.find(t => t.type === "receipt") || null;
        const lastPayment = sorted.find(t => t.type === "payment") || null;

        const txnAmount = (t: typeof sorted[0] | null) => {
          if (!t) return { usd: null, iqd: null, date: null };
          const u = parseFloat(t.amountUsd || "0");
          const i = parseFloat(t.amountIqd || "0");
          return { usd: u || null, iqd: i || null, date: t.date };
        };

        const lr = txnAmount(lastReceipt);
        const lp = txnAmount(lastPayment);

        return {
          id: debt.id,
          name: debt.name,
          remainingUsd,
          remainingIqd,
          lastReceiptAmountUsd: lr.usd,
          lastReceiptAmountIqd: lr.iqd,
          lastReceiptDate: lr.date,
          lastPaymentAmountUsd: lp.usd,
          lastPaymentAmountIqd: lp.iqd,
          lastPaymentDate: lp.date,
        };
      });

      res.json(results);
    } catch (error: any) {
      console.error("Error fetching external debt debts:", error);
      res.status(500).json({ message: error.message });
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

  // Agent Statement
  app.get('/api/agent-statement/:id', requireAuth, async (req, res) => {
    try {
      const agentId = parseInt(req.params.id as string);
      const [agent] = await db.select().from(representatives).where(eq(representatives.id, agentId));
      if (!agent) return res.status(404).json({ message: "Agent not found" });

      const invoices = await db.select().from(salesInvoices).where(eq(salesInvoices.representativeId, agentId)).orderBy(sql`${salesInvoices.date} ASC, ${salesInvoices.time} ASC`);
      const returns = await db.select().from(salesReturns).where(eq(salesReturns.representativeId, agentId)).orderBy(sql`${salesReturns.date} ASC, ${salesReturns.time} ASC`);
      const payments = await storage.getAgentPaymentsByAgentId(agentId);

      type AgentStatementEntry = {
        id: number;
        date: string;
        time: string;
        type: string;
        description: string | null;
        reference: string | null;
        currency: string;
        debit: number;
        credit: number;
      };

      const entries: AgentStatementEntry[] = [];

      for (const inv of invoices) {
        const remaining = parseFloat(inv.remaining || "0");
        if (remaining > 0) {
          entries.push({
            id: inv.id,
            date: inv.date,
            time: inv.time || "00:00",
            type: "sales_invoice",
            description: `${inv.invoiceNumber} - ${inv.customerName}`,
            reference: inv.invoiceNumber,
            currency: inv.currency,
            debit: remaining,
            credit: 0,
          });
        }
      }

      for (const ret of returns) {
        const subtotal = parseFloat(ret.subtotal || "0");
        if (subtotal > 0) {
          entries.push({
            id: ret.id,
            date: ret.date,
            time: ret.time || "00:00",
            type: "sales_return",
            description: `${ret.returnNumber} - ${ret.customerName}`,
            reference: ret.returnNumber,
            currency: ret.currency,
            debit: 0,
            credit: subtotal,
          });
        }
      }

      for (const pay of payments) {
        const amount = parseFloat(pay.amount || "0");
        if (amount > 0) {
          entries.push({
            id: pay.id,
            date: pay.date,
            time: pay.time || "00:00",
            type: "agent_payment",
            description: pay.paymentSourceName,
            reference: pay.reference,
            currency: pay.currency,
            debit: 0,
            credit: amount,
          });
        }
      }

      entries.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.time.localeCompare(b.time);
      });

      res.json({ agent, entries });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.companyProfile.get.path, requireAuth, async (_req, res) => {
    try {
      const profile = await storage.getCompanyProfile();
      res.json(profile || null);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.companyProfile.upsert.path, requireAuth, async (req, res) => {
    try {
      const input = api.companyProfile.upsert.input.parse(req.body);
      const MAX_BASE64_SIZE = 3 * 1024 * 1024;
      if (input.logo && input.logo.length > MAX_BASE64_SIZE) {
        return res.status(400).json({ message: "Logo image is too large (max 2MB)" });
      }
      if (input.cliche && input.cliche.length > MAX_BASE64_SIZE) {
        return res.status(400).json({ message: "Cliché image is too large (max 2MB)" });
      }
      if (input.stamp && input.stamp.length > MAX_BASE64_SIZE) {
        return res.status(400).json({ message: "Stamp image is too large (max 2MB)" });
      }
      const profile = await storage.upsertCompanyProfile(input);
      res.json(profile);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post('/api/export-logs', requireAuth, async (req, res) => {
    try {
      const { reportName, supplierName, invoiceNumber, exportType, currency } = req.body;
      const [log] = await db.insert(exportLogs).values({
        reportName: reportName || "",
        supplierName: supplierName || "",
        invoiceNumber: invoiceNumber || "",
        exportType: exportType || "pdf",
        currency: currency || "",
        exportedBy: (req.session as any).userId || "",
      }).returning();
      res.json(log);
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get('/api/export-logs', requireAuth, async (_req, res) => {
    try {
      const logs = await db.select().from(exportLogs).orderBy(sql`${exportLogs.exportedAt} DESC`).limit(500);
      res.json(logs);
    } catch {
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
