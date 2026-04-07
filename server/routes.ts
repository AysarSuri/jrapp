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
import { purchaseInvoices, purchaseInvoiceItems, clients, supplierPayments, supplierAdjustments, accounts, bankTransactions, banks, customsClearanceTransactions, customsClearances, clearancePurchaseInvoices, transferOfficeTransactions, transferOffices, externalDebts, externalDebtTransactions, owners, ownerTransactions, expenses, salesInvoices, salesInvoiceItems, salesReturns, salesReturnItems, purchaseReturns, purchaseReturnItems, customerReceipts, agentPayments, agentReceipts, representatives, notifications, warehouseTransfers, warehouseTransferItems, productDamages, productDamageItems, products, exportLogs, agentProductLoads, agentProductLoadItems, users, agentClients, agentLocations, units, categories, categoryGroups, addresses, supplierAddresses, warehouses, expenseTypes, inventory, currencyExchanges, companyProfile, transactions, systemSettings, supplierOrders, supplierOrderItems, companyBooks, bookTypes, auditLogs, loginAttempts } from "@shared/schema";

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

  async function logAudit(req: import("express").Request, action: string, entity: string, entityId?: string | number | null, details?: any, riskLevel: string = "low") {
    try {
      const user = req.session.userId ? await storage.getUser(req.session.userId) : null;
      await db.insert(auditLogs).values({
        userId: req.session.userId || null,
        username: user?.username || details?.username || null,
        action,
        entity,
        entityId: entityId != null ? String(entityId) : null,
        details: details || null,
        ipAddress: req.ip || req.headers["x-forwarded-for"]?.toString() || null,
        riskLevel,
        flagged: riskLevel === "high" || riskLevel === "critical",
      });
    } catch (e) {
      console.error("Audit log error:", e);
    }
  }

  async function checkLoginAttempts(username: string, ip: string): Promise<{ blocked: boolean; remaining: number }> {
    const windowMs = 15 * 60 * 1000;
    const maxAttempts = 5;
    const since = new Date(Date.now() - windowMs);
    const result = await db.select({ count: sql<number>`count(*)` }).from(loginAttempts)
      .where(and(eq(loginAttempts.username, username), eq(loginAttempts.success, false), sql`${loginAttempts.createdAt} > ${since}`));
    const count = Number(result[0]?.count || 0);
    return { blocked: count >= maxAttempts, remaining: Math.max(0, maxAttempts - count) };
  }

  app.post(api.auth.login.path, async (req, res) => {
    try {
      const input = api.auth.login.input.parse(req.body);
      const ip = req.ip || req.headers["x-forwarded-for"]?.toString() || "unknown";

      const { blocked } = await checkLoginAttempts(input.username, ip);
      if (blocked) {
        await logAudit(req, "LOGIN_BLOCKED", "auth", null, { username: input.username, reason: "too_many_attempts" }, "critical");
        return res.status(429).json({ message: "Account temporarily locked due to too many failed attempts. Try again in 15 minutes." });
      }

      const user = await storage.getUserByUsername(input.username);
      if (!user) {
        await db.insert(loginAttempts).values({ username: input.username, ipAddress: ip, success: false });
        await logAudit(req, "LOGIN_FAILED", "auth", null, { username: input.username, reason: "user_not_found" }, "medium");
        return res.status(401).json({ message: "Invalid username or password" });
      }

      if (user.isActive !== 1) {
        await db.insert(loginAttempts).values({ username: input.username, ipAddress: ip, success: false });
        await logAudit(req, "LOGIN_FAILED", "auth", null, { username: input.username, reason: "account_disabled" }, "high");
        return res.status(401).json({ message: "Account is disabled" });
      }

      const valid = await bcrypt.compare(input.password, user.password);
      if (!valid) {
        await db.insert(loginAttempts).values({ username: input.username, ipAddress: ip, success: false });
        await logAudit(req, "LOGIN_FAILED", "auth", null, { username: input.username, reason: "wrong_password" }, "medium");
        return res.status(401).json({ message: "Invalid username or password" });
      }

      await db.insert(loginAttempts).values({ username: input.username, ipAddress: ip, success: true });
      await logAudit(req, "LOGIN_SUCCESS", "auth", user.id, { username: input.username }, "low");

      req.session.userId = user.id;
      if (user.role === 'admin') {
        const allPerms = Object.keys(API_PERMISSION_MAP).map(k => API_PERMISSION_MAP[k]).filter((v, i, a) => a.indexOf(v) === i).concat(['dashboard']);
        await db.update(users).set({ lastLoginAt: new Date(), permissions: allPerms }).where(eq(users.id, user.id));
      } else {
        await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
      }
      const updatedUser = await storage.getUser(user.id);
      const { password: _pw, ...safeUser } = updatedUser!;
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
      await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
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
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ message: "Not available in production" });
    }
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
      await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
      await logAudit(req, "LOGIN_BY_ROLE", "auth", user.id, { role, username: user.username }, "critical");
      const { password, ...safeUser } = user;
      res.status(200).json(safeUser);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.auth.logout.path, async (req, res) => {
    const userId = req.session.userId;
    if (userId) {
      await db.update(users).set({ lastLogoutAt: new Date() }).where(eq(users.id, userId));
    }
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

  const API_PERMISSION_MAP: Record<string, string> = {
    '/api/customers': 'sales_management',
    '/api/sales-invoices': 'sales_management',
    '/api/sales-returns': 'sales_management',
    '/api/customer-receipts': 'sales_management',
    '/api/agent-payments': 'sales_management',
    '/api/suppliers': 'supplier_management',
    '/api/purchase-invoices': 'supplier_management',
    '/api/purchase-returns': 'supplier_management',
    '/api/supplier-payments': 'supplier_management',
    '/api/supplier-adjustments': 'supplier_management',
    '/api/customer-debts': 'sales_management',
    '/api/representatives': 'agent_management',
    '/api/representative-products': 'agent_management',
    '/api/supplier-debts': 'supplier_management',
    '/api/agents': 'agent_management',
    '/api/agent-clients': 'agent_management',
    '/api/agent-product-loads': 'agent_management',
    '/api/agent-receipts': 'agent_management',
    '/api/agent-daily-summary': 'agent_management',
    '/api/rep-balances': 'agent_management',
    '/api/rep-sales': 'agent_management',
    '/api/rep-sales-by-product': 'agent_management',
    '/api/rep-returns': 'agent_management',
    '/api/rep-receipts': 'agent_management',
    '/api/rep-loads': 'agent_management',
    '/api/agent-locations': 'agent_management',
    '/api/products': 'material_management',
    '/api/units': 'material_management',
    '/api/categories': 'material_management',
    '/api/category-groups': 'material_management',
    '/api/inventory': 'material_management',
    '/api/expiry-report': 'reports',
    '/api/max-stock-report': 'reports',
    '/api/profits-report': 'reports',
    '/api/sales-discounts-gifts-report': 'reports',
    '/api/supplier-discounts-gifts-report': 'reports',
    '/api/banks': 'bank_management',
    '/api/bank-transactions': 'bank_management',
    '/api/customs-clearances': 'clearance_management',
    '/api/clearance-transactions': 'clearance_management',
    '/api/clearance-purchase-invoices': 'clearance_management',
    '/api/transfer-offices': 'office_management',
    '/api/office-transactions': 'office_management',
    '/api/expense-types': 'expense_management',
    '/api/expenses': 'expense_management',
    '/api/external-debts': 'external_debt_management',
    '/api/external-debt-transactions': 'external_debt_management',
    '/api/owners': 'owner_management',
    '/api/owner-transactions': 'owner_management',
    '/api/warehouses': 'warehouse_management',
    '/api/warehouse-transfers': 'warehouse_management',
    '/api/accounts': 'accounts',
    '/api/currency-exchange': 'currency_exchange',
    '/api/product-damages': 'product_damage',
    '/api/company-profile': 'company_profile',
    '/api/addresses': 'addresses',
    '/api/supplier-addresses': 'addresses',
    '/api/supplier-orders': 'supplier_management',
    '/api/company-books': 'company_book',
    '/api/users': 'user_management',
  };

  const SALES_REP_PERMS = ['dashboard', 'sales_management', 'agent_management'];

  function getEffectivePerms(role: string, perms: string[] | null): string[] {
    if (role === 'admin') return Object.values(API_PERMISSION_MAP).concat(['user_management', 'dashboard']);
    if (role === 'sales_rep') return SALES_REP_PERMS;
    return perms || [];
  }

  const requirePermission = (permissionKey: string): import("express").RequestHandler => {
    return async (req, res, next) => {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const effectivePerms = getEffectivePerms(user.role, user.permissions);
      if (!effectivePerms.includes(permissionKey)) {
        return res.status(403).json({ message: "You do not have permission to access this resource" });
      }
      next();
    };
  };

  const API_ROUTE_TO_FORM: Record<string, string> = {
    '/api/customers': '/customers',
    '/api/sales-invoices': '/sales-invoice-usd',
    '/api/sales-returns': '/sales-return-usd',
    '/api/customer-receipts': '/customer-receipt-usd',
    '/api/agent-payments': '/agent-payment-usd',
    '/api/suppliers': '/suppliers',
    '/api/purchase-invoices': '/purchase-invoice-usd',
    '/api/purchase-returns': '/purchase-return-usd',
    '/api/supplier-payments': '/supplier-payments',
    '/api/supplier-adjustments': '/supplier-adjustments',
    '/api/supplier-orders': '/supplier-order-usd',
    '/api/products': '/products',
    '/api/units': '/units',
    '/api/categories': '/categories',
    '/api/banks': '/banks',
    '/api/bank-receipts': '/bank-receipts',
    '/api/bank-payments': '/bank-payments',
    '/api/customs-clearances': '/customs-clearances',
    '/api/clearance-receipts': '/clearance-receipts',
    '/api/clearance-payments': '/clearance-payments',
    '/api/transfer-offices': '/transfer-offices',
    '/api/office-receipts': '/office-receipts',
    '/api/office-payments': '/office-payments',
    '/api/expense-types': '/expense-types',
    '/api/expenses': '/expenses',
    '/api/external-debts': '/external-debts',
    '/api/external-debt-transactions': '/external-debt-receipts',
    '/api/owners': '/owners',
    '/api/owner-withdrawals': '/owner-withdrawals',
    '/api/owner-returns': '/owner-returns',
    '/api/warehouses': '/warehouses',
    '/api/warehouse-transfers': '/warehouse-transfer',
    '/api/accounts': '/accounts',
    '/api/currency-exchange': '/currency-exchange',
    '/api/product-damage': '/product-damage',
    '/api/addresses': '/addresses',
    '/api/supplier-addresses': '/supplier-addresses',
  };

  function checkFormAction(detailedPerms: any, moduleKey: string, formRoute: string, action: string): boolean {
    if (!detailedPerms || typeof detailedPerms !== 'object') return true;
    const moduleLevelPerms = detailedPerms[moduleKey];
    if (!moduleLevelPerms) return true;
    const formPerms = moduleLevelPerms[formRoute];
    if (!formPerms) return true;
    if (action === 'editDays') return true;
    return formPerms[action] !== false;
  }

  function getEditDaysLimit(detailedPerms: any, moduleKey: string, formRoute: string): number {
    if (!detailedPerms || typeof detailedPerms !== 'object') return 0;
    const moduleLevelPerms = detailedPerms[moduleKey];
    if (!moduleLevelPerms) return 0;
    const formPerms = moduleLevelPerms[formRoute];
    if (!formPerms) return 0;
    return formPerms.editDays ?? 0;
  }

  app.use('/api', (req, res, next) => {
    const openPaths = ['/api/auth', '/api/user', '/api/login-users', '/api/notifications', '/api/dashboard'];
    const fullPath = req.path.startsWith('/api') ? req.path : `/api${req.path}`;
    if (openPaths.some(p => fullPath.startsWith(p))) return next();
    if (!req.session.userId) return next();

    const matchedKey = Object.keys(API_PERMISSION_MAP)
      .sort((a, b) => b.length - a.length)
      .find(prefix => fullPath.startsWith(prefix));

    if (!matchedKey) return next();

    const permKey = API_PERMISSION_MAP[matchedKey];
    storage.getUser(req.session.userId).then(user => {
      if (!user) return next();
      const effectivePerms = getEffectivePerms(user.role, user.permissions);
      if (!effectivePerms.includes(permKey)) {
        return res.status(403).json({ message: "You do not have permission to access this resource" });
      }

      if (user.role === 'admin') return next();

      const formRoute = API_ROUTE_TO_FORM[matchedKey];
      if (formRoute && user.detailedPermissions) {
        const method = req.method.toUpperCase();
        let action: string | null = null;
        if (method === 'POST') action = 'create';
        else if (method === 'PATCH' || method === 'PUT') action = 'edit';
        else if (method === 'DELETE') action = 'delete';

        if (action && !checkFormAction(user.detailedPermissions, permKey, formRoute, action)) {
          return res.status(403).json({ message: "You do not have permission for this action" });
        }
      }

      next();
    }).catch(() => next());
  });

  const FINANCIAL_ENTITIES = [
    '/api/purchase-invoices', '/api/sales-invoices', '/api/supplier-payments',
    '/api/supplier-adjustments', '/api/customer-receipts', '/api/agent-payments',
    '/api/currency-exchange', '/api/bank-transactions', '/api/clearance-transactions',
    '/api/office-transactions', '/api/external-debt-transactions', '/api/owner-transactions',
    '/api/expenses', '/api/warehouse-transfers', '/api/product-damages',
    '/api/purchase-returns', '/api/sales-returns', '/api/supplier-orders',
    '/api/clearance-purchase-invoices', '/api/accounts',
  ];

  app.use('/api', (req, res, next) => {
    const method = req.method.toUpperCase();
    if (method === 'GET') return next();

    const fullPath = req.path.startsWith('/api') ? req.path : `/api${req.path}`;
    const matchedEntity = FINANCIAL_ENTITIES.find(e => fullPath.startsWith(e));
    if (!matchedEntity) return next();

    const actionMap: Record<string, string> = { POST: 'CREATE', PATCH: 'UPDATE', PUT: 'UPDATE', DELETE: 'DELETE' };
    const action = actionMap[method] || method;
    const entityName = matchedEntity.replace('/api/', '').replace(/-/g, '_');

    const idMatch = fullPath.replace(matchedEntity, '').match(/^\/(\d+)/);
    const entityId = idMatch ? idMatch[1] : null;

    let riskLevel = "low";
    if (method === 'DELETE') riskLevel = "high";
    if (method === 'PATCH' || method === 'PUT') riskLevel = "medium";

    const body = req.body ? { ...req.body } : {};
    if (body.password) delete body.password;

    const originalJson = res.json.bind(res);
    res.json = function(data: any) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const createdId = data?.id || entityId;
        logAudit(req, action, entityName, createdId, {
          ...(method === 'DELETE' ? {} : body),
          responseStatus: res.statusCode,
        }, riskLevel).catch(() => {});
      }
      return originalJson(data);
    };

    next();
  });

  app.use('/api', (req, res, next) => {
    const method = req.method.toUpperCase();
    if (method !== 'POST' && method !== 'PATCH') return next();

    const fullPath = req.path.startsWith('/api') ? req.path : `/api${req.path}`;
    if (!fullPath.startsWith('/api/users')) return next();

    const body = req.body;
    if (body?.role === 'admin' || body?.permissions) {
      logAudit(req, method === 'POST' ? 'USER_CREATE' : 'USER_PERMISSION_CHANGE', 'users', body?.id || null, {
        role: body.role,
        hasPermissionChanges: !!body.permissions,
      }, "high").catch(() => {});
    }
    next();
  });

  app.get('/api/agents', requireAuth, async (_req, res) => {
    try {
      const salesRepUsers = await db.select({ id: users.id, fullName: users.fullName, username: users.username, mobile: users.mobile }).from(users).where(and(eq(users.role, 'sales_rep'), eq(users.isActive, 1)));
      const allReps = await db.select().from(representatives);
      const agentsFromUsers = salesRepUsers.map(u => {
        const name = u.fullName || u.username;
        const matchedRep = allReps.find(r => r.name === name);
        return { id: u.id, name, mobile: u.mobile || "", repId: matchedRep?.id || null, debtUsd: matchedRep?.debtUsd || "0", debtIqd: matchedRep?.debtIqd || "0" };
      });
      res.json(agentsFromUsers);
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
      const { username, password, fullName, role, mobile, permissions, detailedPermissions, debtUsd, debtIqd } = req.body;
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
      let effectivePerms: string[] = Array.isArray(permissions) ? permissions : [];
      if (role === 'admin') effectivePerms = Object.keys(API_PERMISSION_MAP).map(k => API_PERMISSION_MAP[k]).filter((v, i, a) => a.indexOf(v) === i).concat(['dashboard']);
      if (role === 'sales_rep') effectivePerms = SALES_REP_PERMS;
      const userData: any = { username, password: hashed, fullName: fullName || "", mobile: mobile || "", role, permissions: effectivePerms };
      if ((role === 'user' || role === 'sales_rep') && detailedPermissions && typeof detailedPermissions === 'object') {
        userData.detailedPermissions = detailedPermissions;
      }
      const user = await storage.createUser(userData);
      if (role === 'sales_rep') {
        const repName = fullName || username;
        await db.insert(representatives).values({ name: repName, mobile: mobile || null, debtUsd: debtUsd || "0", debtIqd: debtIqd || "0" }).onConflictDoNothing();
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
      const { username, password, fullName, role, isActive, mobile, permissions, detailedPermissions, debtUsd, debtIqd } = req.body;
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
      const finalRole = role || (await storage.getUser(id))?.role || 'user';
      if (finalRole === 'admin') {
        updateData.permissions = Object.keys(API_PERMISSION_MAP).map(k => API_PERMISSION_MAP[k]).filter((v, i, a) => a.indexOf(v) === i).concat(['dashboard']);
        updateData.detailedPermissions = {};
      } else if (finalRole === 'sales_rep') {
        updateData.permissions = SALES_REP_PERMS;
      } else if (permissions !== undefined) {
        updateData.permissions = Array.isArray(permissions) ? permissions : [];
      }
      if ((finalRole === 'user' || finalRole === 'sales_rep') && detailedPermissions !== undefined) {
        updateData.detailedPermissions = (detailedPermissions && typeof detailedPermissions === 'object') ? detailedPermissions : {};
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
        if (debtUsd !== undefined) updateFields.debtUsd = debtUsd;
        if (debtIqd !== undefined) updateFields.debtIqd = debtIqd;
        if (Object.keys(updateFields).length > 0) {
          await db.update(representatives).set(updateFields).where(eq(representatives.name, oldName));
        }
      }
      if (user.role === 'sales_rep' && oldUser?.role !== 'sales_rep') {
        const repName = user.fullName || user.username;
        await db.insert(representatives).values({ name: repName, mobile: user.mobile || null, debtUsd: debtUsd || "0", debtIqd: debtIqd || "0" }).onConflictDoNothing();
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

  app.post('/api/users/:id/force-logout', requireAuth, async (req, res) => {
    try {
      const currentUser = await storage.getUser(req.session.userId!);
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can force logout users" });
      }
      const { id } = req.params;
      if (id === currentUser.id) {
        return res.status(400).json({ message: "Cannot force logout yourself" });
      }
      await pool.query(`DELETE FROM "session" WHERE sess::text LIKE $1`, [`%"userId":"${id}"%`]);
      await db.update(users).set({ lastLogoutAt: new Date() }).where(eq(users.id, id));
      res.json({ message: "User session terminated" });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post('/api/users/:id/change-password', requireAuth, async (req, res) => {
    try {
      const currentUser = await storage.getUser(req.session.userId!);
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can change passwords" });
      }
      const { id } = req.params;
      const { newPassword } = req.body;
      if (!newPassword || newPassword.length < 3) {
        return res.status(400).json({ message: "Password must be at least 3 characters" });
      }
      const hashed = await bcrypt.hash(newPassword, 12);
      await storage.updateUser(id, { password: hashed });
      await pool.query(`DELETE FROM "session" WHERE sess::text LIKE $1`, [`%"userId":"${id}"%`]);
      res.json({ message: "Password changed successfully" });
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

  // Supplier Addresses CRUD
  app.get(api.supplierAddresses.list.path, requireAuth, async (_req, res) => {
    const data = await storage.getSupplierAddresses();
    res.json(data);
  });

  app.post(api.supplierAddresses.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.supplierAddresses.create.input.parse(req.body);
      const data = await storage.createSupplierAddress(input);
      res.status(201).json(data);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      if (err?.code === '23505') {
        return res.status(400).json({ message: "Supplier address already exists" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch(api.supplierAddresses.update.path, requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const input = api.supplierAddresses.update.input.parse(req.body);
      const data = await storage.updateSupplierAddress(id, input);
      res.json(data);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      if (err?.code === '23505') {
        return res.status(400).json({ message: "Supplier address already exists" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete(api.supplierAddresses.delete.path, requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      await storage.deleteSupplierAddress(id);
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

  // Category Groups CRUD
  app.get(api.categoryGroups.list.path, requireAuth, async (_req, res) => {
    const data = await storage.getCategoryGroups();
    res.json(data);
  });

  app.get('/api/categories/:categoryId/groups', requireAuth, async (req, res) => {
    const categoryId = parseInt(req.params.categoryId as string, 10);
    const data = await storage.getCategoryGroupsByCategoryId(categoryId);
    res.json(data);
  });

  app.post(api.categoryGroups.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.categoryGroups.create.input.parse(req.body);
      const data = await storage.createCategoryGroup(input);
      res.status(201).json(data);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch('/api/category-groups/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const input = api.categoryGroups.update.input.parse(req.body);
      const data = await storage.updateCategoryGroup(id, input);
      res.json(data);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete('/api/category-groups/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      await storage.deleteCategoryGroup(id);
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
      const userId = (req.session as any)?.userId;
      const sessionUser = userId ? await storage.getUser(userId) : null;
      const data = await storage.createClient({ ...input, createdBy: sessionUser?.username || null });
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

      const [existingClient] = await db.select().from(clients).where(eq(clients.id, id));

      if (input.name && existingClient && input.name !== existingClient.name) {
        const newName = input.name;
        const data = await db.transaction(async (tx) => {
          const [updated] = await tx.update(clients).set(input).where(eq(clients.id, id)).returning();

          await tx.update(purchaseInvoices).set({ supplierName: newName }).where(eq(purchaseInvoices.supplierId, id));
          await tx.update(supplierPayments).set({ supplierName: newName }).where(eq(supplierPayments.supplierId, id));
          await tx.update(supplierAdjustments).set({ supplierName: newName }).where(eq(supplierAdjustments.supplierId, id));
          await tx.update(purchaseReturns).set({ supplierName: newName }).where(eq(purchaseReturns.supplierId, id));
          await tx.update(supplierOrders).set({ supplierName: newName }).where(eq(supplierOrders.supplierId, id));

          await tx.update(salesInvoices).set({ customerName: newName }).where(eq(salesInvoices.customerId, id));
          await tx.update(salesReturns).set({ customerName: newName }).where(eq(salesReturns.customerId, id));
          await tx.update(customerReceipts).set({ customerName: newName }).where(eq(customerReceipts.customerId, id));

          return updated;
        });
        res.json(data);
      } else {
        const data = await storage.updateClient(id, input);
        res.json(data);
      }
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

      const [existingClient] = await db.select().from(clients).where(eq(clients.id, id));
      if (!existingClient) {
        return res.status(404).json({ message: "Client not found" });
      }

      const [piCount] = await db.select({ count: sql<number>`count(*)::int` }).from(purchaseInvoices).where(eq(purchaseInvoices.supplierId, id));
      const [spCount] = await db.select({ count: sql<number>`count(*)::int` }).from(supplierPayments).where(eq(supplierPayments.supplierId, id));
      const [saCount] = await db.select({ count: sql<number>`count(*)::int` }).from(supplierAdjustments).where(eq(supplierAdjustments.supplierId, id));
      const [prCount] = await db.select({ count: sql<number>`count(*)::int` }).from(purchaseReturns).where(eq(purchaseReturns.supplierId, id));
      const [soCount] = await db.select({ count: sql<number>`count(*)::int` }).from(supplierOrders).where(eq(supplierOrders.supplierId, id));
      const [siCount] = await db.select({ count: sql<number>`count(*)::int` }).from(salesInvoices).where(eq(salesInvoices.customerId, id));
      const [srCount] = await db.select({ count: sql<number>`count(*)::int` }).from(salesReturns).where(eq(salesReturns.customerId, id));
      const [crCount] = await db.select({ count: sql<number>`count(*)::int` }).from(customerReceipts).where(eq(customerReceipts.customerId, id));

      const totalUsage = piCount.count + spCount.count + saCount.count + prCount.count + soCount.count + siCount.count + srCount.count + crCount.count;

      if (totalUsage > 0) {
        return res.status(400).json({ message: "لا يمكن حذف هذا العميل لأنه مرتبط بسجلات موجودة" });
      }

      const oldDebtUsd = parseFloat(existingClient.oldDebtUsd || "0");
      const oldDebtIqd = parseFloat(existingClient.oldDebtIqd || "0");
      if (oldDebtUsd !== 0 || oldDebtIqd !== 0) {
        return res.status(400).json({ message: "لا يمكن حذف هذا العميل لأنه يحتوي على رصيد افتتاحي (دين قديم)" });
      }

      await storage.deleteClient(id);
      res.json({ message: "Deleted" });
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

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
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      if (err?.code === '23505') {
        return res.status(400).json({ message: "Representative name already exists" });
      }
      res.status(500).json({ message: err.message });
    }
  });

  app.patch(api.representatives.update.path, requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const input = api.representatives.update.input.parse(req.body);
      const data = await storage.updateRepresentative(id, input);
      res.json(data);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      if (err?.code === '23505') {
        return res.status(400).json({ message: "Representative name already exists" });
      }
      res.status(500).json({ message: err.message });
    }
  });

  app.delete(api.representatives.delete.path, requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      await storage.deleteRepresentative(id);
      res.json({ message: "Deleted" });
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get('/api/representative-products/:id', requireAuth, async (req, res) => {
    try {
      const repId = parseInt(req.params.id as string, 10);
      const [rep] = await db.select().from(representatives).where(eq(representatives.id, repId));
      if (!rep) return res.status(404).json({ message: "Representative not found" });
      const repName = rep.name;

      const loads = await db.select().from(agentProductLoads).where(eq(agentProductLoads.agentName, repName));
      const loadIds = loads.map(l => l.id);
      let loadItems: any[] = [];
      if (loadIds.length > 0) {
        loadItems = await db.select().from(agentProductLoadItems).where(sql`${agentProductLoadItems.loadId} IN (${sql.join(loadIds.map(id => sql`${id}`), sql`, `)})`);
      }

      const invoices = await db.select().from(salesInvoices).where(eq(salesInvoices.representativeName, repName));
      const invoiceIds = invoices.map(i => i.id);
      let invoiceItems: any[] = [];
      if (invoiceIds.length > 0) {
        invoiceItems = await db.select().from(salesInvoiceItems).where(sql`${salesInvoiceItems.invoiceId} IN (${sql.join(invoiceIds.map(id => sql`${id}`), sql`, `)})`);
      }

      const returns = await db.select().from(salesReturns).where(eq(salesReturns.representativeName, repName));
      const returnIds = returns.map(r => r.id);
      let returnItems: any[] = [];
      if (returnIds.length > 0) {
        returnItems = await db.select().from(salesReturnItems).where(sql`${salesReturnItems.returnId} IN (${sql.join(returnIds.map(id => sql`${id}`), sql`, `)})`);
      }

      const allProducts = await db.select().from(products);
      const productMap = new Map(allProducts.map(p => [p.id, p]));

      const productTotals = new Map<number, { loadQtyBig: number; loadQtySmall: number; loadReturnedBig: number; loadReturnedSmall: number; invoiceQtyBig: number; invoiceQtySmall: number; returnQtyBig: number; returnQtySmall: number }>();

      const ensureProduct = (productId: number) => {
        if (!productTotals.has(productId)) {
          productTotals.set(productId, { loadQtyBig: 0, loadQtySmall: 0, loadReturnedBig: 0, loadReturnedSmall: 0, invoiceQtyBig: 0, invoiceQtySmall: 0, returnQtyBig: 0, returnQtySmall: 0 });
        }
        return productTotals.get(productId)!;
      };

      const addToUnit = (totals: any, field: string, qty: number, unit: string, product: any) => {
        if (unit === product.bigUnit) {
          totals[field + 'Big'] += qty;
        } else {
          totals[field + 'Small'] += qty;
        }
      };

      for (const item of loadItems) {
        const prod = productMap.get(item.productId);
        if (!prod) continue;
        const totals = ensureProduct(item.productId);
        addToUnit(totals, 'loadQty', item.quantity || 0, item.unit, prod);
        addToUnit(totals, 'loadReturned', item.returned || 0, item.unit, prod);
      }

      for (const item of invoiceItems) {
        const prod = item.productId ? productMap.get(item.productId) : null;
        if (!prod) continue;
        const totals = ensureProduct(item.productId!);
        const qty = parseFloat(item.quantity || "0") + parseFloat(item.gift || "0");
        addToUnit(totals, 'invoiceQty', qty, item.unit, prod);
      }

      for (const item of returnItems) {
        const prod = item.productId ? productMap.get(item.productId) : null;
        if (!prod) continue;
        const totals = ensureProduct(item.productId!);
        const qty = parseFloat(item.quantity || "0");
        addToUnit(totals, 'returnQty', qty, item.unit, prod);
      }

      const result: any[] = [];
      for (const [productId, totals] of productTotals) {
        const prod = productMap.get(productId);
        if (!prod) continue;
        const remainingBig = (totals.loadQtyBig + totals.returnQtyBig) - (totals.invoiceQtyBig + totals.loadReturnedBig);
        const remainingSmall = (totals.loadQtySmall + totals.returnQtySmall) - (totals.invoiceQtySmall + totals.loadReturnedSmall);
        if (remainingBig === 0 && remainingSmall === 0) continue;
        result.push({
          productId,
          productName: prod.name,
          productCode: prod.barcode,
          bigUnit: prod.bigUnit,
          smallUnit: prod.smallUnit,
          conversionFactor: prod.conversionFactor,
          remainingBig,
          remainingSmall,
        });
      }
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Internal server error" });
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

  app.get('/api/purchase-invoices/:id/opening-balance', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const invoice = await storage.getPurchaseInvoice(id);
      if (!invoice) return res.status(404).json({ message: "Invoice not found" });

      const [supplier] = await db.select().from(clients).where(eq(clients.id, invoice.supplierId));
      if (!supplier) return res.status(404).json({ message: "Supplier not found" });

      const invoiceDate = invoice.date;
      const invoiceTime = invoice.time || "00:00";

      const beforeDateTimeCondition = (dateCol: any, timeCol: any) =>
        sql`(${dateCol} < ${invoiceDate} OR (${dateCol} = ${invoiceDate} AND COALESCE(${timeCol}, '00:00') < ${invoiceTime}))`;

      const prevInvoices = await db.select().from(purchaseInvoices)
        .where(sql`${purchaseInvoices.supplierId} = ${invoice.supplierId} AND ${purchaseInvoices.id} != ${id} AND ${beforeDateTimeCondition(purchaseInvoices.date, purchaseInvoices.time)}`);

      const prevReturns = await db.select().from(purchaseReturns)
        .where(sql`${purchaseReturns.supplierId} = ${invoice.supplierId} AND ${beforeDateTimeCondition(purchaseReturns.date, purchaseReturns.time)}`);

      const prevPayments = await db.select().from(supplierPayments)
        .where(sql`${supplierPayments.supplierId} = ${invoice.supplierId} AND ${beforeDateTimeCondition(supplierPayments.date, supplierPayments.time)}`);

      const prevAdjustments = await db.select().from(supplierAdjustments)
        .where(sql`${supplierAdjustments.supplierId} = ${invoice.supplierId} AND ${beforeDateTimeCondition(supplierAdjustments.date, supplierAdjustments.time)}`);

      let openingBalanceUsd = parseFloat(supplier.oldDebtUsd || "0");
      let openingBalanceIqd = parseFloat(supplier.oldDebtIqd || "0");

      for (const inv of prevInvoices) {
        const amount = parseFloat(inv.remaining || "0");
        if (inv.currency === "USD") openingBalanceUsd += amount;
        else openingBalanceIqd += amount;
      }
      for (const ret of prevReturns) {
        const amount = parseFloat(ret.remaining || "0");
        if (ret.currency === "USD") openingBalanceUsd -= amount;
        else openingBalanceIqd -= amount;
      }
      for (const pay of prevPayments) {
        openingBalanceUsd -= parseFloat(pay.amountUsd || "0");
        openingBalanceIqd -= parseFloat(pay.amountIqd || "0");
      }
      for (const adj of prevAdjustments) {
        if (adj.type === "received") {
          openingBalanceUsd += parseFloat(adj.amountUsd || "0");
          openingBalanceIqd += parseFloat(adj.amountIqd || "0");
        } else {
          openingBalanceUsd -= parseFloat(adj.amountUsd || "0");
          openingBalanceIqd -= parseFloat(adj.amountIqd || "0");
        }
      }

      res.json({ openingBalanceUsd, openingBalanceIqd });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get('/api/purchase-invoices/:id/items', requireAuth, async (req, res) => {
    const id = parseInt(req.params.id as string, 10);
    const data = await storage.getPurchaseInvoiceItems(id);
    res.json(data);
  });

  async function updateProductBuyPrices(tx: any, invoiceItems: any[], currency: string) {
    const rate = await getExchangeRate();
    for (const item of invoiceItems) {
      if (!item.productId) continue;
      const [product] = await tx.select().from(products).where(eq(products.id, item.productId));
      if (!product) continue;
      const isBigUnit = item.unit === product.bigUnit;
      const isSmallUnit = item.unit === product.smallUnit;
      if (!isBigUnit && !isSmallUnit) continue;
      const price = parseFloat(item.price) || 0;
      const updateFields: Record<string, string> = {};
      if (currency === 'USD') {
        if (isBigUnit) {
          updateFields.bigUnitBuyPriceUsd = item.price;
          updateFields.bigUnitBuyPriceIqd = (price * rate).toFixed(0);
        }
        if (isSmallUnit) {
          updateFields.smallUnitBuyPriceUsd = item.price;
          updateFields.smallUnitBuyPriceIqd = (price * rate).toFixed(0);
        }
      } else {
        if (isBigUnit) {
          updateFields.bigUnitBuyPriceIqd = item.price;
          updateFields.bigUnitBuyPriceUsd = (price / rate).toFixed(2);
        }
        if (isSmallUnit) {
          updateFields.smallUnitBuyPriceIqd = item.price;
          updateFields.smallUnitBuyPriceUsd = (price / rate).toFixed(2);
        }
      }
      if (Object.keys(updateFields).length > 0) {
        await tx.update(products).set(updateFields).where(eq(products.id, item.productId));
      }
    }
  }

  app.post(api.purchaseInvoices.create.path, requireAuth, async (req, res) => {
    try {
      const { invoice, items } = api.purchaseInvoices.create.input.parse(req.body);
      const userId = (req.session as any)?.userId;
      const sessionUser = userId ? await storage.getUser(userId) : null;
      const result = await db.transaction(async (tx) => {
        const [created] = await tx.insert(purchaseInvoices).values({ ...invoice, createdBy: sessionUser?.username || null }).returning();
        if (items.length > 0) {
          const itemsWithInvoiceId = items.map(item => ({
            ...item,
            invoiceId: created.id,
          }));
          await tx.insert(purchaseInvoiceItems).values(itemsWithInvoiceId);
          await updateProductBuyPrices(tx, items, invoice.currency || 'USD');
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
          await updateProductBuyPrices(tx, items, (invoice?.currency || updated.currency || 'USD'));
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

      const userId = (req.session as any)?.userId;
      const sessionUser = userId ? await storage.getUser(userId) : null;

      const result = await db.transaction(async (tx) => {
        const [supplier] = await tx.select().from(clients).where(eq(clients.id, input.supplierId));
        const currentDebtUsd = parseFloat(supplier?.oldDebtUsd || "0");
        const currentDebtIqd = parseFloat(supplier?.oldDebtIqd || "0");
        const remainingUsd = currentDebtUsd - usdAmount;
        const remainingIqd = currentDebtIqd - iqdAmount;

        let receiptNumber = input.receiptNumber;
        if (!receiptNumber) {
          const [maxRow] = await tx.select({ maxNum: sql<string>`MAX(receipt_number)` }).from(supplierPayments);
          receiptNumber = String((parseInt(maxRow?.maxNum || "0", 10) || 0) + 1).padStart(6, "0");
        }

        const [existing] = await tx.select({ id: supplierPayments.id }).from(supplierPayments).where(eq(supplierPayments.receiptNumber, receiptNumber));
        if (existing) throw new Error("DUPLICATE_RECEIPT");

        const [payment] = await tx.insert(supplierPayments).values({
          ...input,
          receiptNumber,
          oldDebtUsd: String(currentDebtUsd),
          oldDebtIqd: String(currentDebtIqd),
          remainingUsd: String(remainingUsd),
          remainingIqd: String(remainingIqd),
          createdBy: sessionUser?.username || null,
        }).returning();

        return payment;
      });
      res.status(201).json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      if (err instanceof Error && err.message === "DUPLICATE_RECEIPT") {
        return res.status(400).json({ message: "Duplicate receipt number" });
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

      const userId = (req.session as any)?.userId;
      const sessionUser = userId ? await storage.getUser(userId) : null;

      const result = await db.transaction(async (tx) => {
        const [supplier] = await tx.select().from(clients).where(eq(clients.id, input.supplierId));
        const currentDebtUsd = parseFloat(supplier?.oldDebtUsd || "0");
        const currentDebtIqd = parseFloat(supplier?.oldDebtIqd || "0");

        let remainingUsd: number;
        let remainingIqd: number;

        if (input.type === "received") {
          remainingUsd = currentDebtUsd + usdAmount;
          remainingIqd = currentDebtIqd + iqdAmount;
        } else {
          remainingUsd = currentDebtUsd - usdAmount;
          remainingIqd = currentDebtIqd - iqdAmount;
        }

        let receiptNumber = input.receiptNumber;
        if (!receiptNumber) {
          const [maxRow] = await tx.select({ maxNum: sql<string>`MAX(receipt_number)` }).from(supplierAdjustments);
          receiptNumber = String((parseInt(maxRow?.maxNum || "0", 10) || 0) + 1).padStart(6, "0");
        }

        const [existing] = await tx.select({ id: supplierAdjustments.id }).from(supplierAdjustments).where(eq(supplierAdjustments.receiptNumber, receiptNumber));
        if (existing) throw new Error("DUPLICATE_RECEIPT");

        const [adj] = await tx.insert(supplierAdjustments).values({
          ...input,
          receiptNumber,
          oldDebtUsd: String(currentDebtUsd),
          oldDebtIqd: String(currentDebtIqd),
          remainingUsd: String(remainingUsd),
          remainingIqd: String(remainingIqd),
          createdBy: sessionUser?.username || null,
        }).returning();

        return adj;
      });
      res.status(201).json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      if (err instanceof Error && err.message === "DUPLICATE_RECEIPT") {
        return res.status(400).json({ message: "Duplicate receipt number" });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch('/api/supplier-payments/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const { supplierId, supplierName, paymentSource, paymentSourceName, amountUsd, amountIqd, commissionUsd, commissionIqd, usdExchangeType, iqdExchangeType, usdEquivalentAmount, usdEquivalentCommission, iqdEquivalentAmount, iqdEquivalentCommission, note, reference, date, time, receiptNumber } = req.body;
      const [updated] = await db.update(supplierPayments).set({
        supplierId, supplierName, paymentSource, paymentSourceName,
        amountUsd, amountIqd, commissionUsd, commissionIqd,
        usdExchangeType, iqdExchangeType, usdEquivalentAmount, usdEquivalentCommission, iqdEquivalentAmount, iqdEquivalentCommission,
        note, reference, date, time, receiptNumber,
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

  app.get('/api/supplier-opening-balance', requireAuth, async (req, res) => {
    try {
      const supplierId = parseInt(req.query.supplierId as string, 10);
      const balanceDate = req.query.date as string;
      const balanceTime = (req.query.time as string) || "00:00";
      const excludePaymentId = req.query.excludePaymentId ? parseInt(req.query.excludePaymentId as string, 10) : null;
      const excludeAdjustmentId = req.query.excludeAdjustmentId ? parseInt(req.query.excludeAdjustmentId as string, 10) : null;

      if (!supplierId || !balanceDate) return res.status(400).json({ message: "supplierId and date are required" });

      const [supplier] = await db.select().from(clients).where(eq(clients.id, supplierId));
      if (!supplier) return res.status(404).json({ message: "Supplier not found" });

      const beforeDateTimeCondition = (dateCol: any, timeCol: any) =>
        sql`(${dateCol} < ${balanceDate} OR (${dateCol} = ${balanceDate} AND COALESCE(${timeCol}, '00:00') < ${balanceTime}))`;

      const prevInvoices = await db.select().from(purchaseInvoices)
        .where(sql`${purchaseInvoices.supplierId} = ${supplierId} AND ${beforeDateTimeCondition(purchaseInvoices.date, purchaseInvoices.time)}`);

      const prevReturns = await db.select().from(purchaseReturns)
        .where(sql`${purchaseReturns.supplierId} = ${supplierId} AND ${beforeDateTimeCondition(purchaseReturns.date, purchaseReturns.time)}`);

      let paymentCondition = sql`${supplierPayments.supplierId} = ${supplierId} AND ${beforeDateTimeCondition(supplierPayments.date, supplierPayments.time)}`;
      if (excludePaymentId) {
        paymentCondition = sql`${paymentCondition} AND ${supplierPayments.id} != ${excludePaymentId}`;
      }
      const prevPayments = await db.select().from(supplierPayments).where(paymentCondition);

      let adjustmentCondition = sql`${supplierAdjustments.supplierId} = ${supplierId} AND ${beforeDateTimeCondition(supplierAdjustments.date, supplierAdjustments.time)}`;
      if (excludeAdjustmentId) {
        adjustmentCondition = sql`${adjustmentCondition} AND ${supplierAdjustments.id} != ${excludeAdjustmentId}`;
      }
      const prevAdjustments = await db.select().from(supplierAdjustments).where(adjustmentCondition);

      let openingBalanceUsd = parseFloat(supplier.oldDebtUsd || "0");
      let openingBalanceIqd = parseFloat(supplier.oldDebtIqd || "0");

      for (const inv of prevInvoices) {
        const amount = parseFloat(inv.remaining || "0");
        if (inv.currency === "USD") openingBalanceUsd += amount;
        else openingBalanceIqd += amount;
      }
      for (const r of prevReturns) {
        const amount = parseFloat(r.remaining || "0");
        if (r.currency === "USD") openingBalanceUsd -= amount;
        else openingBalanceIqd -= amount;
      }
      for (const pay of prevPayments) {
        openingBalanceUsd -= parseFloat(pay.amountUsd || "0");
        openingBalanceIqd -= parseFloat(pay.amountIqd || "0");
      }
      for (const adj of prevAdjustments) {
        if (adj.type === "received") {
          openingBalanceUsd += parseFloat(adj.amountUsd || "0");
          openingBalanceIqd += parseFloat(adj.amountIqd || "0");
        } else {
          openingBalanceUsd -= parseFloat(adj.amountUsd || "0");
          openingBalanceIqd -= parseFloat(adj.amountIqd || "0");
        }
      }

      res.json({ openingBalanceUsd, openingBalanceIqd });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get('/api/supplier-payments/next-receipt-number', requireAuth, async (_req, res) => {
    try {
      const [maxRow] = await db.select({ maxNum: sql<string>`MAX(receipt_number)` }).from(supplierPayments);
      const last = parseInt(maxRow?.maxNum || "0", 10) || 0;
      res.json({ receiptNumber: String(last + 1).padStart(6, "0") });
    } catch {
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
      const { supplierId, supplierName, type, amountUsd, amountIqd, payTo, payToName, note, date, time, receiptNumber } = req.body;
      const [updated] = await db.update(supplierAdjustments).set({
        supplierId, supplierName, type, amountUsd, amountIqd,
        payTo, payToName, note, date, time, receiptNumber,
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

  app.get('/api/supplier-adjustments/next-receipt-number', requireAuth, async (_req, res) => {
    try {
      const [maxRow] = await db.select({ maxNum: sql<string>`MAX(receipt_number)` }).from(supplierAdjustments);
      const last = parseInt(maxRow?.maxNum || "0", 10) || 0;
      res.json({ receiptNumber: String(last + 1).padStart(6, "0") });
    } catch {
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
      const allReturns = await db.select().from(purchaseReturns);
      const allPayments = await db.select().from(supplierPayments);
      const allAdjustments = await db.select().from(supplierAdjustments);

      const results = suppliers.map(supplier => {
        const sInvoices = allInvoices.filter(i => i.supplierId === supplier.id);
        const sReturns = allReturns.filter(r => r.supplierId === supplier.id);
        const sPayments = allPayments.filter(p => p.supplierId === supplier.id);
        const sAdjustments = allAdjustments.filter(a => a.supplierId === supplier.id);

        const oldDebtUsd = parseFloat(supplier.oldDebtUsd || "0");
        const oldDebtIqd = parseFloat(supplier.oldDebtIqd || "0");

        let totalDebitUsd = oldDebtUsd > 0 ? oldDebtUsd : 0;
        let totalDebitIqd = oldDebtIqd > 0 ? oldDebtIqd : 0;
        let totalCreditUsd = oldDebtUsd < 0 ? Math.abs(oldDebtUsd) : 0;
        let totalCreditIqd = oldDebtIqd < 0 ? Math.abs(oldDebtIqd) : 0;

        for (const inv of sInvoices) {
          const amount = parseFloat(inv.remaining || "0");
          if (inv.currency === "USD") totalDebitUsd += amount;
          else totalDebitIqd += amount;
        }
        for (const ret of sReturns) {
          const amount = parseFloat(ret.remaining || "0");
          if (ret.currency === "USD") totalCreditUsd += amount;
          else totalCreditIqd += amount;
        }
        for (const pay of sPayments) {
          totalCreditUsd += parseFloat(pay.amountUsd || "0");
          totalCreditIqd += parseFloat(pay.amountIqd || "0");
        }
        for (const adj of sAdjustments) {
          if (adj.type === "received") {
            totalDebitUsd += parseFloat(adj.amountUsd || "0");
            totalDebitIqd += parseFloat(adj.amountIqd || "0");
          } else {
            totalCreditUsd += parseFloat(adj.amountUsd || "0");
            totalCreditIqd += parseFloat(adj.amountIqd || "0");
          }
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
          inv ? parseFloat(inv.remaining || "0") : null;

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

  app.get('/api/customer-debts', requireAuth, async (_req, res) => {
    try {
      const customers = await db.select().from(clients).where(eq(clients.type, "customer"));
      const allSalesInvoices = await db.select().from(salesInvoices);
      const allSalesReturns = await db.select().from(salesReturns);
      const allCustomerReceipts = await db.select().from(customerReceipts);
      const allAgentPayments = await db.select().from(agentPayments);

      const results = customers.map(customer => {
        const cInvoices = allSalesInvoices.filter(i => i.customerId === customer.id);
        const cReturns = allSalesReturns.filter(r => r.customerId === customer.id);
        const cReceipts = allCustomerReceipts.filter(r => r.customerId === customer.id);
        const cPayments = allAgentPayments.filter(p => p.agentId === customer.id);

        const oldDebtUsd = parseFloat(customer.oldDebtUsd || "0");
        const oldDebtIqd = parseFloat(customer.oldDebtIqd || "0");

        let totalDebitUsd = oldDebtUsd > 0 ? oldDebtUsd : 0;
        let totalDebitIqd = oldDebtIqd > 0 ? oldDebtIqd : 0;
        let totalCreditUsd = oldDebtUsd < 0 ? Math.abs(oldDebtUsd) : 0;
        let totalCreditIqd = oldDebtIqd < 0 ? Math.abs(oldDebtIqd) : 0;

        for (const inv of cInvoices) {
          const amount = parseFloat(inv.remaining || "0");
          if (inv.currency === "USD") totalDebitUsd += amount;
          else totalDebitIqd += amount;
        }
        for (const pay of cPayments) {
          const amount = parseFloat(pay.amount || "0");
          if (pay.currency === "USD") totalDebitUsd += amount;
          else totalDebitIqd += amount;
        }
        for (const ret of cReturns) {
          const amount = parseFloat(ret.remaining || "0");
          if (ret.currency === "USD") totalCreditUsd += amount;
          else totalCreditIqd += amount;
        }
        for (const rec of cReceipts) {
          const amount = parseFloat(rec.amount || "0") + parseFloat(rec.discount || "0");
          if (rec.currency === "USD") totalCreditUsd += amount;
          else totalCreditIqd += amount;
        }

        const remainingUsd = totalDebitUsd - totalCreditUsd;
        const remainingIqd = totalDebitIqd - totalCreditIqd;

        const sortedInvoices = [...cInvoices].sort((a, b) => {
          const da = `${a.date} ${a.time}`;
          const db2 = `${b.date} ${b.time}`;
          return db2.localeCompare(da);
        });
        const lastInvoiceUsd = sortedInvoices.find(i => i.currency === "USD") || null;
        const lastInvoiceIqd = sortedInvoices.find(i => i.currency === "IQD") || null;

        const allCredits = [
          ...cReceipts.map(r => ({ date: r.date, time: r.time, amountUsd: r.currency === "USD" ? parseFloat(r.amount || "0") : 0, amountIqd: r.currency === "IQD" ? parseFloat(r.amount || "0") : 0 })),
        ].sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
        const lastReceiptUsd = allCredits.find(c => c.amountUsd > 0) || null;
        const lastReceiptIqd = allCredits.find(c => c.amountIqd > 0) || null;

        return {
          id: customer.id,
          name: customer.name,
          address: customer.address || "",
          mobile: customer.contact || "",
          remainingUsd,
          remainingIqd,
          lastInvoiceAmountUsd: lastInvoiceUsd ? parseFloat(lastInvoiceUsd.remaining || "0") : null,
          lastInvoiceDateUsd: lastInvoiceUsd?.date || null,
          lastInvoiceAmountIqd: lastInvoiceIqd ? parseFloat(lastInvoiceIqd.remaining || "0") : null,
          lastInvoiceDateIqd: lastInvoiceIqd?.date || null,
          lastReceiptAmountUsd: lastReceiptUsd?.amountUsd || null,
          lastReceiptDateUsd: lastReceiptUsd?.date || null,
          lastReceiptAmountIqd: lastReceiptIqd?.amountIqd || null,
          lastReceiptDateIqd: lastReceiptIqd?.date || null,
        };
      });

      res.json(results);
    } catch (error: any) {
      console.error("Error fetching customer debts:", error);
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
          const amount = parseFloat(inv.remaining || "0");
          if (inv.currency === "USD") openingBalanceUsd += amount;
          else openingBalanceIqd += amount;
        }
        for (const ret of prevReturns) {
          const amount = parseFloat(ret.remaining || "0");
          if (ret.currency === "USD") openingBalanceUsd -= amount;
          else openingBalanceIqd -= amount;
        }
        for (const pay of prevPayments) {
          openingBalanceUsd -= parseFloat(pay.amountUsd || "0");
          openingBalanceIqd -= parseFloat(pay.amountIqd || "0");
        }
        for (const adj of prevAdjustments) {
          if (adj.type === "received") {
            openingBalanceUsd += parseFloat(adj.amountUsd || "0");
            openingBalanceIqd += parseFloat(adj.amountIqd || "0");
          } else {
            openingBalanceUsd -= parseFloat(adj.amountUsd || "0");
            openingBalanceIqd -= parseFloat(adj.amountIqd || "0");
          }
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
        const amount = parseFloat(inv.remaining || "0");
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
        const amount = parseFloat(ret.remaining || "0");
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
          description: pay.receiptNumber || String(pay.id).padStart(6, "0"),
          debitUsd: 0,
          debitIqd: 0,
          creditUsd: parseFloat(pay.amountUsd || "0"),
          creditIqd: parseFloat(pay.amountIqd || "0"),
          note: pay.note || null,
        });
      }

      for (const adj of adjustments) {
        const amtUsd = parseFloat(adj.amountUsd || "0");
        const amtIqd = parseFloat(adj.amountIqd || "0");
        entries.push({
          id: adj.id,
          date: adj.date,
          time: adj.time || "00:00",
          type: adj.type === "received" ? "adjustment_received" : "adjustment_discount",
          description: adj.receiptNumber || String(adj.id).padStart(6, "0"),
          debitUsd: adj.type === "received" ? amtUsd : 0,
          debitIqd: adj.type === "received" ? amtIqd : 0,
          creditUsd: adj.type === "discount" ? amtUsd : 0,
          creditIqd: adj.type === "discount" ? amtIqd : 0,
          note: adj.note || null,
          agentName: adj.payToName || null,
        });
      }

      entries.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.time.localeCompare(b.time);
      });

      const invoiceIds = invoices.map(inv => inv.id);
      const returnIds = returns.map(ret => ret.id);

      let totalPurchaseGifts = 0;
      let totalReturnGifts = 0;

      if (invoiceIds.length > 0) {
        const invItems = await db.select().from(purchaseInvoiceItems)
          .where(sql`${purchaseInvoiceItems.invoiceId} IN ${invoiceIds}`);
        for (const item of invItems) {
          totalPurchaseGifts += parseFloat(item.gift || "0");
        }
      }

      if (returnIds.length > 0) {
        const retItems = await db.select().from(purchaseReturnItems)
          .where(sql`${purchaseReturnItems.returnId} IN ${returnIds}`);
        for (const item of retItems) {
          totalReturnGifts += parseFloat(item.gift || "0");
        }
      }

      res.json({
        supplier,
        entries,
        openingBalanceUsd,
        openingBalanceIqd,
        totalPurchaseGifts,
        totalReturnGifts,
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
        gift: number;
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
            gift: parseFloat(item.gift || "0"),
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
            gift: parseFloat(item.gift || "0"),
          });
        }
      }

      rows.sort((a, b) => a.date.localeCompare(b.date));

      const totalQuantity = rows.reduce((s, r) => s + r.quantity, 0);
      const totalReturns = rows.reduce((s, r) => s + r.returnQuantity, 0);
      const totalAmount = rows.reduce((s, r) => s + (r.quantity * r.price) - (r.returnQuantity * r.price), 0);
      const totalGifts = rows.reduce((s, r) => s + r.gift, 0);

      res.json({
        supplier,
        rows,
        totalQuantity,
        totalReturns,
        totalAmount,
        totalGifts,
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
        const prefix = input.type === 'receipt' ? 'BR' : 'BP';
        const existing = await tx.select({ invoiceNumber: bankTransactions.invoiceNumber })
          .from(bankTransactions)
          .where(eq(bankTransactions.type, input.type));
        let maxNum = 0;
        for (const row of existing) {
          const match = row.invoiceNumber?.match(/\d+$/);
          if (match) {
            const num = parseInt(match[0], 10);
            if (num > maxNum) maxNum = num;
          }
        }
        const invoiceNumber = `${prefix}-${String(maxNum + 1).padStart(6, '0')}`;
        const [txn] = await tx.insert(bankTransactions).values({ ...input, invoiceNumber }).returning();
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
        const prefix = input.type === 'receipt' ? 'OR' : 'OP';
        const existing = await tx.select({ invoiceNumber: transferOfficeTransactions.invoiceNumber })
          .from(transferOfficeTransactions)
          .where(eq(transferOfficeTransactions.type, input.type));
        let maxNum = 0;
        for (const row of existing) {
          const match = row.invoiceNumber?.match(/\d+$/);
          if (match) {
            const num = parseInt(match[0], 10);
            if (num > maxNum) maxNum = num;
          }
        }
        const invoiceNumber = `${prefix}-${String(maxNum + 1).padStart(6, '0')}`;
        const [txn] = await tx.insert(transferOfficeTransactions).values({ ...input, invoiceNumber }).returning();
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
      const { expenseTypeId, expenseTypeName, invoiceNumber, amountUsd, amountIqd, description, reference, agentName, date, time } = req.body;
      const [updated] = await db.update(expenses).set({
        expenseTypeId, expenseTypeName, invoiceNumber, amountUsd, amountIqd, description, reference, agentName, date, time,
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

  async function getExchangeRate(): Promise<number> {
    const [row] = await db.select().from(systemSettings).where(eq(systemSettings.key, 'usd_to_iqd_rate'));
    return row ? parseFloat(row.value) || 1500 : 1500;
  }

  app.get('/api/system-settings/:key', requireAuth, async (req, res) => {
    try {
      const [row] = await db.select().from(systemSettings).where(eq(systemSettings.key, req.params.key));
      res.json({ key: req.params.key, value: row?.value || null });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put('/api/system-settings/:key', requireAuth, async (req, res) => {
    try {
      const { value } = req.body;
      await db.insert(systemSettings).values({ key: req.params.key, value: String(value) })
        .onConflictDoUpdate({ target: systemSettings.key, set: { value: String(value) } });
      res.json({ key: req.params.key, value: String(value) });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  async function populateCostPrices(tx: any, invoiceItems: any[], currency: string) {
    const rate = await getExchangeRate();
    const itemsWithCost = [];
    for (const item of invoiceItems) {
      let costPrice = "0";
      if (item.productId) {
        const [product] = await tx.select().from(products).where(eq(products.id, item.productId));
        if (product) {
          const isBigUnit = item.unit === product.bigUnit;
          if (currency === 'USD') {
            let directPrice = parseFloat(isBigUnit ? (product.bigUnitBuyPriceUsd || "0") : (product.smallUnitBuyPriceUsd || "0"));
            if (directPrice === 0) {
              const iqdPrice = parseFloat(isBigUnit ? (product.bigUnitBuyPriceIqd || "0") : (product.smallUnitBuyPriceIqd || "0"));
              if (iqdPrice > 0 && rate > 0) directPrice = iqdPrice / rate;
            }
            costPrice = directPrice.toFixed(2);
          } else {
            let directPrice = parseFloat(isBigUnit ? (product.bigUnitBuyPriceIqd || "0") : (product.smallUnitBuyPriceIqd || "0"));
            if (directPrice === 0) {
              const usdPrice = parseFloat(isBigUnit ? (product.bigUnitBuyPriceUsd || "0") : (product.smallUnitBuyPriceUsd || "0"));
              if (usdPrice > 0 && rate > 0) directPrice = usdPrice * rate;
            }
            costPrice = directPrice.toFixed(0);
          }
        }
      }
      itemsWithCost.push({ ...item, costPrice });
    }
    return itemsWithCost;
  }

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

      const [existingInvoice] = await db.select({ id: salesInvoices.id }).from(salesInvoices).where(eq(salesInvoices.invoiceNumber, invoice.invoiceNumber));
      if (existingInvoice) {
        return res.status(400).json({ message: "Invoice number already exists" });
      }

      const invoiceWithServerData = {
        ...invoice,
        status: serverStatus,
        createdBy: sessionUser.username,
        createdByRole: serverRole,
      };

      const result = await db.transaction(async (tx) => {
        const [created] = await tx.insert(salesInvoices).values(invoiceWithServerData).returning();
        if (items.length > 0) {
          const itemsWithCost = await populateCostPrices(tx, items, invoice.currency || 'USD');
          const itemsWithInvoiceId = itemsWithCost.map(item => ({
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

  app.patch('/api/sales-invoices/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const userId = req.session.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'admin' && user.role !== 'user')) {
        return res.status(403).json({ message: "Only admin or user can edit invoices" });
      }
      const { invoice, items } = req.body;
      const { createdBy, createdByRole, status, id: _ignoreId, ...safeInvoice } = invoice || {};
      const result = await db.transaction(async (tx) => {
        const [existing] = await tx.select().from(salesInvoices).where(eq(salesInvoices.id, id));
        if (!existing) throw new Error("NOT_FOUND");
        const [updated] = await tx.update(salesInvoices).set(safeInvoice).where(eq(salesInvoices.id, id)).returning();
        await tx.delete(salesInvoiceItems).where(eq(salesInvoiceItems.invoiceId, id));
        if (items && items.length > 0) {
          const currency = safeInvoice.currency || existing.currency || 'USD';
          const itemsWithCost = await populateCostPrices(tx, items, currency);
          const itemsWithInvoiceId = itemsWithCost.map((item: any) => ({ ...item, invoiceId: id }));
          await tx.insert(salesInvoiceItems).values(itemsWithInvoiceId);
        }
        return updated;
      });
      res.json(result);
    } catch (err) {
      if (err instanceof Error && err.message === "NOT_FOUND") {
        return res.status(404).json({ message: "Invoice not found" });
      }
      console.error("Error updating sales invoice:", err);
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
          const itemsWithCost = await populateCostPrices(tx, items, returnData.currency || 'USD');
          const itemsWithReturnId = itemsWithCost.map(item => ({
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

  app.patch('/api/sales-returns/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const { returnData: retData, items } = req.body;

      await db.transaction(async (tx) => {
        const [existing] = await tx.select().from(salesReturns).where(eq(salesReturns.id, id));
        await tx.update(salesReturns).set(retData).where(eq(salesReturns.id, id));
        await tx.delete(salesReturnItems).where(eq(salesReturnItems.returnId, id));
        if (items && items.length > 0) {
          const currency = retData?.currency || existing?.currency || 'USD';
          const itemsWithCost = await populateCostPrices(tx, items, currency);
          const itemsWithReturnId = itemsWithCost.map((item: any) => ({
            ...item,
            returnId: id,
          }));
          await tx.insert(salesReturnItems).values(itemsWithReturnId);
        }
      });

      const updated = await storage.getSalesReturn(id);
      res.json(updated);
    } catch (err) {
      console.error("Error updating sales return:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete('/api/sales-returns/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      await db.delete(salesReturnItems).where(eq(salesReturnItems.returnId, id));
      await db.delete(salesReturns).where(eq(salesReturns.id, id));
      res.json({ message: "Deleted" });
    } catch (err) {
      console.error("Error deleting sales return:", err);
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

  app.get('/api/purchase-returns/:id/opening-balance', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const ret = await storage.getPurchaseReturn(id);
      if (!ret) return res.status(404).json({ message: "Return not found" });

      const [supplier] = await db.select().from(clients).where(eq(clients.id, ret.supplierId));
      if (!supplier) return res.status(404).json({ message: "Supplier not found" });

      const retDate = ret.date;
      const retTime = ret.time || "00:00";

      const beforeDateTimeCondition = (dateCol: any, timeCol: any) =>
        sql`(${dateCol} < ${retDate} OR (${dateCol} = ${retDate} AND COALESCE(${timeCol}, '00:00') < ${retTime}))`;

      const prevInvoices = await db.select().from(purchaseInvoices)
        .where(sql`${purchaseInvoices.supplierId} = ${ret.supplierId} AND ${beforeDateTimeCondition(purchaseInvoices.date, purchaseInvoices.time)}`);

      const prevReturns = await db.select().from(purchaseReturns)
        .where(sql`${purchaseReturns.supplierId} = ${ret.supplierId} AND ${purchaseReturns.id} != ${id} AND ${beforeDateTimeCondition(purchaseReturns.date, purchaseReturns.time)}`);

      const prevPayments = await db.select().from(supplierPayments)
        .where(sql`${supplierPayments.supplierId} = ${ret.supplierId} AND ${beforeDateTimeCondition(supplierPayments.date, supplierPayments.time)}`);

      const prevAdjustments = await db.select().from(supplierAdjustments)
        .where(sql`${supplierAdjustments.supplierId} = ${ret.supplierId} AND ${beforeDateTimeCondition(supplierAdjustments.date, supplierAdjustments.time)}`);

      let openingBalanceUsd = parseFloat(supplier.oldDebtUsd || "0");
      let openingBalanceIqd = parseFloat(supplier.oldDebtIqd || "0");

      for (const inv of prevInvoices) {
        const amount = parseFloat(inv.remaining || "0");
        if (inv.currency === "USD") openingBalanceUsd += amount;
        else openingBalanceIqd += amount;
      }
      for (const r of prevReturns) {
        const amount = parseFloat(r.remaining || "0");
        if (r.currency === "USD") openingBalanceUsd -= amount;
        else openingBalanceIqd -= amount;
      }
      for (const pay of prevPayments) {
        openingBalanceUsd -= parseFloat(pay.amountUsd || "0");
        openingBalanceIqd -= parseFloat(pay.amountIqd || "0");
      }
      for (const adj of prevAdjustments) {
        if (adj.type === "received") {
          openingBalanceUsd += parseFloat(adj.amountUsd || "0");
          openingBalanceIqd += parseFloat(adj.amountIqd || "0");
        } else {
          openingBalanceUsd -= parseFloat(adj.amountUsd || "0");
          openingBalanceIqd -= parseFloat(adj.amountIqd || "0");
        }
      }

      res.json({ openingBalanceUsd, openingBalanceIqd });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
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
        const [created] = await tx.insert(purchaseReturns).values({ ...returnData, createdBy: sessionUser?.username || null }).returning();
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

  app.get('/api/customer-opening-balance', requireAuth, async (req, res) => {
    try {
      const customerId = parseInt(req.query.customerId as string, 10);
      const balanceDate = req.query.date as string;
      const balanceTime = (req.query.time as string) || "00:00";
      const currency = (req.query.currency as string) || "USD";
      const excludeInvoiceId = req.query.excludeInvoiceId ? parseInt(req.query.excludeInvoiceId as string, 10) : null;
      const excludeReturnId = req.query.excludeReturnId ? parseInt(req.query.excludeReturnId as string, 10) : null;

      if (!customerId || !balanceDate) return res.status(400).json({ message: "customerId and date are required" });

      const [customer] = await db.select().from(clients).where(eq(clients.id, customerId));
      if (!customer) return res.status(404).json({ message: "Customer not found" });

      const fixedOldDebt = currency === "USD" ? parseFloat(customer.oldDebtUsd || "0") : parseFloat(customer.oldDebtIqd || "0");

      const beforeDateTimeCondition = (dateCol: any, timeCol: any) =>
        sql`(${dateCol} < ${balanceDate} OR (${dateCol} = ${balanceDate} AND COALESCE(${timeCol}, '00:00') < ${balanceTime}))`;

      let invoiceCondition = sql`${salesInvoices.customerId} = ${customerId} AND ${salesInvoices.currency} = ${currency} AND ${beforeDateTimeCondition(salesInvoices.date, salesInvoices.time)}`;
      if (excludeInvoiceId) {
        invoiceCondition = sql`${invoiceCondition} AND ${salesInvoices.id} != ${excludeInvoiceId}`;
      }
      const [invSum] = await db.select({ total: sql<string>`COALESCE(SUM(remaining::numeric), 0)` }).from(salesInvoices).where(invoiceCondition);

      let returnCondition = sql`${salesReturns.customerId} = ${customerId} AND ${salesReturns.currency} = ${currency} AND ${beforeDateTimeCondition(salesReturns.date, salesReturns.time)}`;
      if (excludeReturnId) {
        returnCondition = sql`${returnCondition} AND ${salesReturns.id} != ${excludeReturnId}`;
      }
      const [retSum] = await db.select({ total: sql<string>`COALESCE(SUM(remaining::numeric), 0)` }).from(salesReturns).where(returnCondition);

      const [paySum] = await db.select({ total: sql<string>`COALESCE(SUM(amount::numeric), 0)` }).from(agentPayments)
        .where(sql`${agentPayments.agentId} = ${customerId} AND ${agentPayments.currency} = ${currency} AND ${beforeDateTimeCondition(agentPayments.date, agentPayments.time)}`);

      const [recAmtSum] = await db.select({ total: sql<string>`COALESCE(SUM(amount::numeric), 0)` }).from(customerReceipts)
        .where(sql`${customerReceipts.customerId} = ${customerId} AND ${customerReceipts.currency} = ${currency} AND ${beforeDateTimeCondition(customerReceipts.date, customerReceipts.time)}`);

      const [recDiscSum] = await db.select({ total: sql<string>`COALESCE(SUM(discount::numeric), 0)` }).from(customerReceipts)
        .where(sql`${customerReceipts.customerId} = ${customerId} AND ${customerReceipts.currency} = ${currency} AND ${beforeDateTimeCondition(customerReceipts.date, customerReceipts.time)}`);

      const openingBalance = fixedOldDebt
        + parseFloat(invSum?.total || "0")
        + parseFloat(paySum?.total || "0")
        - parseFloat(retSum?.total || "0")
        - parseFloat(recAmtSum?.total || "0")
        - parseFloat(recDiscSum?.total || "0");

      res.json({ openingBalance });
    } catch (err) {
      console.error("Error calculating customer opening balance:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get('/api/customer-representative/:customerId', requireAuth, async (req, res) => {
    try {
      const customerId = parseInt(req.params.customerId, 10);
      if (!customerId) return res.status(400).json({ message: "customerId required" });
      const [row] = await db.select({ representativeName: salesInvoices.representativeName })
        .from(salesInvoices)
        .where(sql`${salesInvoices.customerId} = ${customerId} AND ${salesInvoices.representativeName} IS NOT NULL AND ${salesInvoices.representativeName} != ''`)
        .orderBy(sql`${salesInvoices.createdAt} DESC`)
        .limit(1);
      res.json({ representativeName: row?.representativeName || null });
    } catch (err) {
      console.error("Error fetching customer representative:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Customer Receipts
  app.get('/api/customer-receipts/next-number', requireAuth, async (_req, res) => {
    try {
      const [maxRow] = await db.select({ maxNum: sql<string>`MAX(receipt_number)` }).from(customerReceipts);
      const last = parseInt(maxRow?.maxNum || "0", 10) || 0;
      res.json({ receiptNumber: String(last + 1).padStart(6, "0") });
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

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
      const userId = (req.session as any)?.userId;
      const sessionUser = userId ? await storage.getUser(userId) : null;

      const result = await db.transaction(async (tx) => {
        const [customer] = await tx.select().from(clients).where(eq(clients.id, input.customerId));
        const currency = input.currency;
        const fixedOldDebt = currency === "USD" ? parseFloat(customer?.oldDebtUsd || "0") : parseFloat(customer?.oldDebtIqd || "0");

        const [invSum] = await tx.select({ total: sql<string>`COALESCE(SUM(remaining::numeric), 0)` }).from(salesInvoices)
          .where(sql`${salesInvoices.customerId} = ${input.customerId} AND ${salesInvoices.currency} = ${currency}`);
        const [paySum] = await tx.select({ total: sql<string>`COALESCE(SUM(amount::numeric), 0)` }).from(agentPayments)
          .where(sql`${agentPayments.agentId} = ${input.customerId} AND ${agentPayments.currency} = ${currency}`);
        const [retSum] = await tx.select({ total: sql<string>`COALESCE(SUM(remaining::numeric), 0)` }).from(salesReturns)
          .where(sql`${salesReturns.customerId} = ${input.customerId} AND ${salesReturns.currency} = ${currency}`);
        const [recDiscSum] = await tx.select({ total: sql<string>`COALESCE(SUM(discount::numeric), 0)` }).from(customerReceipts)
          .where(sql`${customerReceipts.customerId} = ${input.customerId} AND ${customerReceipts.currency} = ${currency}`);
        const [recAmtSum] = await tx.select({ total: sql<string>`COALESCE(SUM(amount::numeric), 0)` }).from(customerReceipts)
          .where(sql`${customerReceipts.customerId} = ${input.customerId} AND ${customerReceipts.currency} = ${currency}`);

        const currentDebt = fixedOldDebt + parseFloat(invSum[0]?.total || "0") + parseFloat(paySum[0]?.total || "0")
          - parseFloat(retSum[0]?.total || "0") - parseFloat(recDiscSum[0]?.total || "0") - parseFloat(recAmtSum[0]?.total || "0");

        const remaining = currentDebt - totalDeducted;

        const [receipt] = await tx.insert(customerReceipts).values({
          ...input,
          oldDebt: String(currentDebt),
          remaining: String(remaining),
          createdBy: sessionUser?.username || null,
        }).returning();

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
  app.get('/api/agent-payments/next-number', requireAuth, async (_req, res) => {
    try {
      const [maxRow] = await db.select({ maxNum: sql<string>`MAX(payment_number)` }).from(agentPayments);
      const last = parseInt(maxRow?.maxNum || "0", 10) || 0;
      res.json({ paymentNumber: String(last + 1).padStart(6, "0") });
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

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

      const userId = (req.session as any)?.userId;
      const sessionUser = userId ? await storage.getUser(userId) : null;

      const result = await db.transaction(async (tx) => {
        const [customer] = await tx.select().from(clients).where(eq(clients.id, input.agentId));
        const currency = input.currency;
        const fixedOldDebt = currency === "USD" ? parseFloat(customer?.oldDebtUsd || "0") : parseFloat(customer?.oldDebtIqd || "0");

        const [invSum] = await tx.select({ total: sql<string>`COALESCE(SUM(remaining::numeric), 0)` }).from(salesInvoices)
          .where(sql`${salesInvoices.customerId} = ${input.agentId} AND ${salesInvoices.currency} = ${currency}`);
        const [paySum] = await tx.select({ total: sql<string>`COALESCE(SUM(amount::numeric), 0)` }).from(agentPayments)
          .where(sql`${agentPayments.agentId} = ${input.agentId} AND ${agentPayments.currency} = ${currency}`);
        const [retSum] = await tx.select({ total: sql<string>`COALESCE(SUM(remaining::numeric), 0)` }).from(salesReturns)
          .where(sql`${salesReturns.customerId} = ${input.agentId} AND ${salesReturns.currency} = ${currency}`);
        const [recDiscSum] = await tx.select({ total: sql<string>`COALESCE(SUM(discount::numeric), 0)` }).from(customerReceipts)
          .where(sql`${customerReceipts.customerId} = ${input.agentId} AND ${customerReceipts.currency} = ${currency}`);
        const [recAmtSum] = await tx.select({ total: sql<string>`COALESCE(SUM(amount::numeric), 0)` }).from(customerReceipts)
          .where(sql`${customerReceipts.customerId} = ${input.agentId} AND ${customerReceipts.currency} = ${currency}`);

        const currentDebt = fixedOldDebt + parseFloat(invSum[0]?.total || "0") + parseFloat(paySum[0]?.total || "0")
          - parseFloat(retSum[0]?.total || "0") - parseFloat(recDiscSum[0]?.total || "0") - parseFloat(recAmtSum[0]?.total || "0");

        const remaining = currentDebt - amount;

        const [payment] = await tx.insert(agentPayments).values({
          ...input,
          oldDebt: String(currentDebt),
          remaining: String(remaining),
          createdBy: sessionUser?.username || null,
        }).returning();

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

  app.patch('/api/agent-payments/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const { note, reference, date, time } = req.body;
      const updateFields: Record<string, any> = {};
      if (note !== undefined) updateFields.note = note;
      if (reference !== undefined) updateFields.reference = reference;
      if (date !== undefined) updateFields.date = date;
      if (time !== undefined) updateFields.time = time;
      const [updated] = await db.update(agentPayments).set(updateFields).where(eq(agentPayments.id, id)).returning();
      if (!updated) return res.status(404).json({ message: "Payment not found" });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete('/api/agent-payments/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const [payment] = await db.select().from(agentPayments).where(eq(agentPayments.id, id));
      if (!payment) return res.status(404).json({ message: "Payment not found" });

      await db.delete(agentPayments).where(eq(agentPayments.id, id));
      res.json({ message: "Deleted" });
    } catch (err) {
      console.error("Error deleting agent payment:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Agent Receipts
  app.get('/api/agent-daily-summary', requireAuth, async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const date = (req.query.date as string) || today;

      const allSales = await db.select().from(salesInvoices).where(eq(salesInvoices.date, date));
      const allReturns = await db.select().from(salesReturns).where(eq(salesReturns.date, date));
      const allReceipts = await db.select().from(agentReceipts).where(eq(agentReceipts.date, date));
      const allPayments = await db.select().from(agentPayments).where(eq(agentPayments.date, date));

      const agentMap: Record<string, any> = {};

      const getAgent = (name: string) => {
        if (!agentMap[name]) {
          agentMap[name] = {
            agentName: name,
            salesUsd: 0, salesIqd: 0, salesCount: 0,
            returnsUsd: 0, returnsIqd: 0, returnsCount: 0,
            receiptsUsd: 0, receiptsIqd: 0, receiptsCount: 0,
            paymentsUsd: 0, paymentsIqd: 0, paymentsCount: 0,
            discountsUsd: 0, discountsIqd: 0,
          };
        }
        return agentMap[name];
      };

      for (const s of allSales) {
        if (!s.representativeName) continue;
        const a = getAgent(s.representativeName);
        a.salesCount++;
        if (s.currency === 'USD') a.salesUsd += parseFloat(s.subtotal || '0');
        else a.salesIqd += parseFloat(s.subtotal || '0');
        if (s.currency === 'USD') a.discountsUsd += parseFloat(s.discount || '0');
        else a.discountsIqd += parseFloat(s.discount || '0');
      }

      for (const r of allReturns) {
        if (!r.representativeName) continue;
        const a = getAgent(r.representativeName);
        a.returnsCount++;
        if (r.currency === 'USD') a.returnsUsd += parseFloat(r.subtotal || '0');
        else a.returnsIqd += parseFloat(r.subtotal || '0');
      }

      for (const r of allReceipts) {
        if (!r.agentName) continue;
        const a = getAgent(r.agentName);
        a.receiptsCount++;
        if (r.currency === 'USD') a.receiptsUsd += parseFloat(r.amount || '0');
        else a.receiptsIqd += parseFloat(r.amount || '0');
      }

      for (const p of allPayments) {
        if (!p.agentName) continue;
        const a = getAgent(p.agentName);
        a.paymentsCount++;
        if (p.currency === 'USD') a.paymentsUsd += parseFloat(p.amount || '0');
        else a.paymentsIqd += parseFloat(p.amount || '0');
      }

      const summaries = Object.values(agentMap).filter((a: any) =>
        a.salesCount > 0 || a.returnsCount > 0 || a.receiptsCount > 0 || a.paymentsCount > 0
      );

      res.json({ date, summaries });
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get('/api/agent-receipts/next-number', requireAuth, async (_req, res) => {
    try {
      const [maxRow] = await db.select({ maxNum: sql<string>`MAX(receipt_number)` }).from(agentReceipts);
      const last = parseInt(maxRow?.maxNum || "0", 10) || 0;
      res.json({ receiptNumber: String(last + 1).padStart(6, "0") });
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.agentReceipts.list.path, requireAuth, async (_req, res) => {
    const data = await storage.getAgentReceipts();
    res.json(data);
  });

  app.post(api.agentReceipts.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.agentReceipts.create.input.parse(req.body);
      const amount = parseFloat(input.amount || "0");
      if (amount <= 0) {
        return res.status(400).json({ message: "Amount must be greater than zero" });
      }
      const [existing] = await db.select({ id: agentReceipts.id }).from(agentReceipts).where(eq(agentReceipts.receiptNumber, input.receiptNumber)).limit(1);
      if (existing) {
        return res.status(400).json({ message: "Receipt number already exists" });
      }
      const result = await storage.createAgentReceipt(input);
      res.status(201).json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch('/api/agent-receipts/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const { note, date, time } = req.body;
      const updateFields: Record<string, any> = {};
      if (note !== undefined) updateFields.note = note;
      if (date !== undefined) updateFields.date = date;
      if (time !== undefined) updateFields.time = time;
      const [updated] = await db.update(agentReceipts).set(updateFields).where(eq(agentReceipts.id, id)).returning();
      if (!updated) return res.status(404).json({ message: "Receipt not found" });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete('/api/agent-receipts/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const [receipt] = await db.select().from(agentReceipts).where(eq(agentReceipts.id, id));
      if (!receipt) return res.status(404).json({ message: "Receipt not found" });
      await db.delete(agentReceipts).where(eq(agentReceipts.id, id));
      res.json({ message: "Deleted" });
    } catch (err) {
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

  app.get('/api/max-stock-report', requireAuth, async (req, res) => {
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
          p.min_stock,
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
        GROUP BY p.id, p.barcode, p.name, p.name_en, p.category, p.big_unit, p.small_unit, p.conversion_factor, p.min_stock
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
          minStock: parseInt(row.min_stock) || 0,
          netSmallUnits: netSmall,
          bigQty: Math.floor(Math.abs(netSmall) / cf) * (netSmall < 0 ? -1 : 1),
          smallQty: Math.abs(netSmall) % cf,
        };
      });

      res.json(report);
    } catch (err) {
      console.error("Max stock report error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get('/api/profits-report', requireAuth, async (req, res) => {
    try {
      const { from, to } = req.query as { from?: string; to?: string };
      let query = `
        SELECT
          si.id as "invoiceId",
          si.invoice_number as "invoiceNumber",
          si.date,
          si.customer_name as "customerName",
          si.currency,
          COALESCE(si.subtotal::numeric, 0) as "totalSales",
          sii.product_code as "productCode",
          sii.product_name as "productName",
          sii.quantity::numeric as "quantity",
          sii.unit,
          sii.price::numeric as "price",
          sii.cost_price::numeric as "costPrice",
          sii.amount::numeric as "amount"
        FROM sales_invoices si
        JOIN sales_invoice_items sii ON sii.invoice_id = si.id
        WHERE si.status != 'cancelled'
      `;
      const params: any[] = [];
      if (from) {
        params.push(from);
        query += ` AND si.date >= $${params.length}`;
      }
      if (to) {
        params.push(to);
        query += ` AND si.date <= $${params.length}`;
      }
      query += ` ORDER BY si.date DESC, si.id DESC`;

      const result = await pool.query(query, params);

      const invoiceMap = new Map<number, any>();
      for (const row of result.rows) {
        if (!invoiceMap.has(row.invoiceId)) {
          invoiceMap.set(row.invoiceId, {
            invoiceId: row.invoiceId,
            invoiceNumber: row.invoiceNumber,
            date: row.date,
            customerName: row.customerName,
            currency: row.currency,
            totalSales: 0,
            totalCost: 0,
            profit: 0,
            items: [],
          });
        }
        const inv = invoiceMap.get(row.invoiceId);
        const qty = Number(row.quantity);
        const price = Number(row.price);
        const costPrice = Number(row.costPrice);
        const amount = Number(row.amount);
        const itemProfit = amount - (costPrice * qty);
        inv.items.push({
          productCode: row.productCode,
          productName: row.productName,
          quantity: qty,
          unit: row.unit,
          price,
          costPrice,
          amount,
          profit: itemProfit,
        });
        inv.totalSales += amount;
        inv.totalCost += costPrice * qty;
        inv.profit += itemProfit;
      }

      res.json(Array.from(invoiceMap.values()));
    } catch (err) {
      console.error("Profits report error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get('/api/supplier-discounts-gifts-report', requireAuth, async (req, res) => {
    try {
      const { from, to } = req.query as { from?: string; to?: string };
      let query = `
        SELECT
          pi.id as "invoiceId",
          pi.invoice_number as "invoiceNumber",
          pi.date,
          pi.supplier_name as "supplierName",
          pi.currency,
          COALESCE(pi.subtotal::numeric, 0) as "subtotal",
          COALESCE(pi.discount::numeric, 0) as "discount",
          pii.product_code as "productCode",
          pii.product_name as "productName",
          pii.quantity::numeric as "quantity",
          COALESCE(pii.gift::numeric, 0) as "gift",
          pii.unit,
          pii.price::numeric as "price",
          pii.amount::numeric as "amount"
        FROM purchase_invoices pi
        JOIN purchase_invoice_items pii ON pii.invoice_id = pi.id
        WHERE pi.status != 'cancelled'
      `;
      const params: any[] = [];
      if (from) {
        params.push(from);
        query += ` AND pi.date >= $${params.length}`;
      }
      if (to) {
        params.push(to);
        query += ` AND pi.date <= $${params.length}`;
      }
      query += ` ORDER BY pi.date DESC, pi.id DESC`;

      const result = await pool.query(query, params);

      const invoiceMap = new Map<number, any>();
      for (const row of result.rows) {
        if (!invoiceMap.has(row.invoiceId)) {
          invoiceMap.set(row.invoiceId, {
            invoiceId: row.invoiceId,
            invoiceNumber: row.invoiceNumber,
            date: row.date,
            supplierName: row.supplierName,
            currency: row.currency,
            subtotal: Number(row.subtotal),
            discount: Number(row.discount),
            giftItems: [],
            totalGiftValue: 0,
          });
        }
        const inv = invoiceMap.get(row.invoiceId);
        const gift = Number(row.gift);
        if (gift > 0) {
          const giftValue = gift * Number(row.price);
          inv.giftItems.push({
            productCode: row.productCode,
            productName: row.productName,
            quantity: Number(row.quantity),
            gift,
            unit: row.unit,
            price: Number(row.price),
            giftValue,
          });
          inv.totalGiftValue += giftValue;
        }
      }

      const invoices = Array.from(invoiceMap.values()).filter(
        (inv: any) => inv.discount > 0 || inv.totalGiftValue > 0
      );
      res.json(invoices);
    } catch (err) {
      console.error("Supplier discounts gifts report error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get('/api/sales-discounts-gifts-report', requireAuth, async (req, res) => {
    try {
      const { from, to } = req.query as { from?: string; to?: string };
      let query = `
        SELECT
          si.id as "invoiceId",
          si.invoice_number as "invoiceNumber",
          si.date,
          si.customer_name as "customerName",
          si.currency,
          COALESCE(si.subtotal::numeric, 0) as "subtotal",
          COALESCE(si.discount::numeric, 0) as "discount",
          sii.product_code as "productCode",
          sii.product_name as "productName",
          sii.quantity::numeric as "quantity",
          COALESCE(sii.gift::numeric, 0) as "gift",
          sii.unit,
          sii.price::numeric as "price",
          sii.amount::numeric as "amount"
        FROM sales_invoices si
        JOIN sales_invoice_items sii ON sii.invoice_id = si.id
        WHERE si.status != 'cancelled'
      `;
      const params: any[] = [];
      if (from) {
        params.push(from);
        query += ` AND si.date >= $${params.length}`;
      }
      if (to) {
        params.push(to);
        query += ` AND si.date <= $${params.length}`;
      }
      query += ` ORDER BY si.date DESC, si.id DESC`;

      const result = await pool.query(query, params);

      const invoiceMap = new Map<number, any>();
      for (const row of result.rows) {
        if (!invoiceMap.has(row.invoiceId)) {
          invoiceMap.set(row.invoiceId, {
            invoiceId: row.invoiceId,
            invoiceNumber: row.invoiceNumber,
            date: row.date,
            customerName: row.customerName,
            currency: row.currency,
            subtotal: Number(row.subtotal),
            discount: Number(row.discount),
            giftItems: [],
            totalGiftValue: 0,
          });
        }
        const inv = invoiceMap.get(row.invoiceId);
        const gift = Number(row.gift);
        if (gift > 0) {
          const giftValue = gift * Number(row.price);
          inv.giftItems.push({
            productCode: row.productCode,
            productName: row.productName,
            quantity: Number(row.quantity),
            gift,
            unit: row.unit,
            price: Number(row.price),
            giftValue,
          });
          inv.totalGiftValue += giftValue;
        }
      }

      const invoices = Array.from(invoiceMap.values()).filter(
        (inv: any) => inv.discount > 0 || inv.totalGiftValue > 0
      );
      res.json(invoices);
    } catch (err) {
      console.error("Sales discounts gifts report error:", err);
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
      const fromDate = (req.query.fromDate as string) || "2000-01-01";
      const toDate = (req.query.toDate as string) || "2099-12-31";
      const [agent] = await db.select().from(representatives).where(eq(representatives.id, agentId));
      if (!agent) return res.status(404).json({ message: "Agent not found" });

      const oldDebtUsd = parseFloat(agent.debtUsd || "0");
      const oldDebtIqd = parseFloat(agent.debtIqd || "0");

      const allInvoices = await db.select().from(salesInvoices).where(eq(salesInvoices.representativeId, agentId)).orderBy(sql`${salesInvoices.date} ASC, ${salesInvoices.time} ASC`);
      const allReturns = await db.select().from(salesReturns).where(eq(salesReturns.representativeId, agentId)).orderBy(sql`${salesReturns.date} ASC, ${salesReturns.time} ASC`);
      const allPayments = await storage.getAgentPaymentsByAgentId(agentId);

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

      let preUsdDebit = 0, preUsdCredit = 0, preIqdDebit = 0, preIqdCredit = 0;
      const entries: AgentStatementEntry[] = [];

      for (const inv of allInvoices) {
        const remaining = parseFloat(inv.remaining || "0");
        if (remaining <= 0) continue;
        const entry = {
          id: inv.id,
          date: inv.date,
          time: inv.time || "00:00",
          type: "sales_invoice",
          description: `${inv.invoiceNumber} - ${inv.customerName}`,
          reference: inv.invoiceNumber,
          currency: inv.currency,
          debit: remaining,
          credit: 0,
        };
        if (inv.date < fromDate) {
          if (inv.currency === "USD") preUsdDebit += remaining; else preIqdDebit += remaining;
        } else if (inv.date <= toDate) {
          entries.push(entry);
        }
      }

      for (const ret of allReturns) {
        const subtotal = parseFloat(ret.subtotal || "0");
        if (subtotal <= 0) continue;
        const entry = {
          id: ret.id,
          date: ret.date,
          time: ret.time || "00:00",
          type: "sales_return",
          description: `${ret.returnNumber} - ${ret.customerName}`,
          reference: ret.returnNumber,
          currency: ret.currency,
          debit: 0,
          credit: subtotal,
        };
        if (ret.date < fromDate) {
          if (ret.currency === "USD") preUsdCredit += subtotal; else preIqdCredit += subtotal;
        } else if (ret.date <= toDate) {
          entries.push(entry);
        }
      }

      for (const pay of allPayments) {
        const amount = parseFloat(pay.amount || "0");
        if (amount <= 0) continue;
        const entry = {
          id: pay.id,
          date: pay.date,
          time: pay.time || "00:00",
          type: "agent_payment",
          description: pay.paymentSourceName,
          reference: pay.reference,
          currency: pay.currency,
          debit: 0,
          credit: amount,
        };
        if (pay.date < fromDate) {
          if (pay.currency === "USD") preUsdCredit += amount; else preIqdCredit += amount;
        } else if (pay.date <= toDate) {
          entries.push(entry);
        }
      }

      entries.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.time.localeCompare(b.time);
      });

      const openingBalanceUsd = oldDebtUsd + preUsdDebit - preUsdCredit;
      const openingBalanceIqd = oldDebtIqd + preIqdDebit - preIqdCredit;

      res.json({ agent, entries, openingBalanceUsd, openingBalanceIqd });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get('/api/customer-statement/:id', requireAuth, async (req, res) => {
    try {
      const customerId = parseInt(req.params.id as string);
      const fromDate = (req.query.fromDate as string) || "2000-01-01";
      const toDate = (req.query.toDate as string) || "2099-12-31";

      const [customer] = await db.select().from(clients).where(eq(clients.id, customerId));
      if (!customer) return res.status(404).json({ message: "Customer not found" });

      const oldDebtUsd = parseFloat(customer.oldDebtUsd || "0");
      const oldDebtIqd = parseFloat(customer.oldDebtIqd || "0");

      let openingBalanceUsd = oldDebtUsd;
      let openingBalanceIqd = oldDebtIqd;

      const priorInvoicesUsd = await db.select({ total: sql<string>`COALESCE(SUM(${salesInvoices.remaining}::numeric), 0)` })
        .from(salesInvoices)
        .where(sql`${salesInvoices.customerId} = ${customerId} AND ${salesInvoices.date} < ${fromDate} AND ${salesInvoices.currency} = 'USD'`);
      openingBalanceUsd += parseFloat(priorInvoicesUsd[0]?.total || "0");

      const priorInvoicesIqd = await db.select({ total: sql<string>`COALESCE(SUM(${salesInvoices.remaining}::numeric), 0)` })
        .from(salesInvoices)
        .where(sql`${salesInvoices.customerId} = ${customerId} AND ${salesInvoices.date} < ${fromDate} AND ${salesInvoices.currency} = 'IQD'`);
      openingBalanceIqd += parseFloat(priorInvoicesIqd[0]?.total || "0");

      const priorPaymentsUsd = await db.select({ total: sql<string>`COALESCE(SUM(${agentPayments.amount}::numeric), 0)` })
        .from(agentPayments)
        .where(sql`${agentPayments.agentId} = ${customerId} AND ${agentPayments.date} < ${fromDate} AND ${agentPayments.currency} = 'USD'`);
      openingBalanceUsd += parseFloat(priorPaymentsUsd[0]?.total || "0");

      const priorPaymentsIqd = await db.select({ total: sql<string>`COALESCE(SUM(${agentPayments.amount}::numeric), 0)` })
        .from(agentPayments)
        .where(sql`${agentPayments.agentId} = ${customerId} AND ${agentPayments.date} < ${fromDate} AND ${agentPayments.currency} = 'IQD'`);
      openingBalanceIqd += parseFloat(priorPaymentsIqd[0]?.total || "0");

      const priorReturnsUsd = await db.select({ total: sql<string>`COALESCE(SUM(${salesReturns.remaining}::numeric), 0)` })
        .from(salesReturns)
        .where(sql`${salesReturns.customerId} = ${customerId} AND ${salesReturns.date} < ${fromDate} AND ${salesReturns.currency} = 'USD'`);
      openingBalanceUsd -= parseFloat(priorReturnsUsd[0]?.total || "0");

      const priorReturnsIqd = await db.select({ total: sql<string>`COALESCE(SUM(${salesReturns.remaining}::numeric), 0)` })
        .from(salesReturns)
        .where(sql`${salesReturns.customerId} = ${customerId} AND ${salesReturns.date} < ${fromDate} AND ${salesReturns.currency} = 'IQD'`);
      openingBalanceIqd -= parseFloat(priorReturnsIqd[0]?.total || "0");

      const priorReceiptUsd = await db.select({ totalAmt: sql<string>`COALESCE(SUM(${customerReceipts.amount}::numeric), 0)`, totalDisc: sql<string>`COALESCE(SUM(${customerReceipts.discount}::numeric), 0)` })
        .from(customerReceipts)
        .where(sql`${customerReceipts.customerId} = ${customerId} AND ${customerReceipts.date} < ${fromDate} AND ${customerReceipts.currency} = 'USD'`);
      openingBalanceUsd -= parseFloat(priorReceiptUsd[0]?.totalAmt || "0");
      openingBalanceUsd -= parseFloat(priorReceiptUsd[0]?.totalDisc || "0");

      const priorReceiptIqd = await db.select({ totalAmt: sql<string>`COALESCE(SUM(${customerReceipts.amount}::numeric), 0)`, totalDisc: sql<string>`COALESCE(SUM(${customerReceipts.discount}::numeric), 0)` })
        .from(customerReceipts)
        .where(sql`${customerReceipts.customerId} = ${customerId} AND ${customerReceipts.date} < ${fromDate} AND ${customerReceipts.currency} = 'IQD'`);
      openingBalanceIqd -= parseFloat(priorReceiptIqd[0]?.totalAmt || "0");
      openingBalanceIqd -= parseFloat(priorReceiptIqd[0]?.totalDisc || "0");

      const invoices = await db.select().from(salesInvoices)
        .where(sql`${salesInvoices.customerId} = ${customerId} AND ${salesInvoices.date} >= ${fromDate} AND ${salesInvoices.date} <= ${toDate}`)
        .orderBy(sql`${salesInvoices.date} ASC, ${salesInvoices.time} ASC`);

      const returns = await db.select().from(salesReturns)
        .where(sql`${salesReturns.customerId} = ${customerId} AND ${salesReturns.date} >= ${fromDate} AND ${salesReturns.date} <= ${toDate}`)
        .orderBy(sql`${salesReturns.date} ASC, ${salesReturns.time} ASC`);

      const payments = await db.select().from(agentPayments)
        .where(sql`${agentPayments.agentId} = ${customerId} AND ${agentPayments.date} >= ${fromDate} AND ${agentPayments.date} <= ${toDate}`)
        .orderBy(sql`${agentPayments.date} ASC, ${agentPayments.time} ASC`);

      const receipts = await db.select().from(customerReceipts)
        .where(sql`${customerReceipts.customerId} = ${customerId} AND ${customerReceipts.date} >= ${fromDate} AND ${customerReceipts.date} <= ${toDate}`)
        .orderBy(sql`${customerReceipts.date} ASC, ${customerReceipts.time} ASC`);

      type CustomerStatementEntry = {
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

      const entries: CustomerStatementEntry[] = [];

      for (const inv of invoices) {
        const remaining = parseFloat(inv.remaining || "0");
        if (remaining !== 0) {
          entries.push({
            id: inv.id,
            date: inv.date,
            time: inv.time || "00:00",
            type: "sales_invoice",
            description: inv.note || "",
            reference: inv.invoiceNumber,
            currency: inv.currency,
            debit: remaining,
            credit: 0,
          });
        }
      }

      for (const ret of returns) {
        const remaining = parseFloat(ret.remaining || "0");
        if (remaining !== 0) {
          entries.push({
            id: ret.id,
            date: ret.date,
            time: ret.time || "00:00",
            type: "sales_return",
            description: ret.note || "",
            reference: ret.returnNumber,
            currency: ret.currency,
            debit: 0,
            credit: remaining,
          });
        }
      }

      for (const pay of payments) {
        const amount = parseFloat(pay.amount || "0");
        if (amount !== 0) {
          entries.push({
            id: pay.id,
            date: pay.date,
            time: pay.time || "00:00",
            type: "agent_payment",
            description: pay.note || "",
            reference: pay.paymentNumber,
            currency: pay.currency,
            debit: amount,
            credit: 0,
          });
        }
      }

      for (const rec of receipts) {
        const amount = parseFloat(rec.amount || "0");
        const discount = parseFloat(rec.discount || "0");
        if (amount !== 0) {
          entries.push({
            id: rec.id,
            date: rec.date,
            time: rec.time || "00:00",
            type: "customer_receipt",
            description: rec.note || "",
            reference: rec.receiptNumber,
            currency: rec.currency,
            debit: 0,
            credit: amount,
          });
        }
        if (discount !== 0) {
          entries.push({
            id: rec.id,
            date: rec.date,
            time: rec.time || "00:00",
            type: "customer_receipt_discount",
            description: rec.note || "",
            reference: rec.receiptNumber,
            currency: rec.currency,
            debit: 0,
            credit: discount,
          });
        }
      }

      entries.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.time.localeCompare(b.time);
      });

      res.json({ customer, entries, openingBalanceUsd, openingBalanceIqd });
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

  try {
    await seedDatabase();
  } catch (err) {
    console.error("seedDatabase failed, will retry in 5s:", (err as Error).message);
    setTimeout(async () => {
      try { await seedDatabase(); } catch (e) { console.error("seedDatabase retry failed:", (e as Error).message); }
    }, 5000);
  }

  const TABLE_MAP: Record<string, any> = {
    addresses,
    units,
    categories,
    category_groups: categoryGroups,
    products,
    inventory,
    clients,
    accounts,
    transactions,
    representatives,
    purchase_invoices: purchaseInvoices,
    purchase_invoice_items: purchaseInvoiceItems,
    supplier_payments: supplierPayments,
    supplier_adjustments: supplierAdjustments,
    sales_invoices: salesInvoices,
    sales_invoice_items: salesInvoiceItems,
    sales_returns: salesReturns,
    sales_return_items: salesReturnItems,
    purchase_returns: purchaseReturns,
    purchase_return_items: purchaseReturnItems,
    customer_receipts: customerReceipts,
    agent_payments: agentPayments,
    bank_transactions: bankTransactions,
    banks,
    customs_clearance_transactions: customsClearanceTransactions,
    customs_clearances: customsClearances,
    clearance_purchase_invoices: clearancePurchaseInvoices,
    transfer_office_transactions: transferOfficeTransactions,
    transfer_offices: transferOffices,
    external_debts: externalDebts,
    external_debt_transactions: externalDebtTransactions,
    owners,
    owner_transactions: ownerTransactions,
    expense_types: expenseTypes,
    expenses,
    currency_exchanges: currencyExchanges,
    warehouse_transfers: warehouseTransfers,
    warehouse_transfer_items: warehouseTransferItems,
    product_damages: productDamages,
    product_damage_items: productDamageItems,
    warehouses,
    notifications,
    export_logs: exportLogs,
    agent_product_loads: agentProductLoads,
    agent_product_load_items: agentProductLoadItems,
    agent_clients: agentClients,
    agent_locations: agentLocations,
  };

  const CHILD_TABLES: Record<string, string[]> = {
    purchase_invoices: ["purchase_invoice_items"],
    sales_invoices: ["sales_invoice_items"],
    sales_returns: ["sales_return_items"],
    purchase_returns: ["purchase_return_items"],
    warehouse_transfers: ["warehouse_transfer_items"],
    product_damages: ["product_damage_items"],
    agent_product_loads: ["agent_product_load_items"],
    external_debts: ["external_debt_transactions"],
    categories: ["category_groups"],
    representatives: ["agent_clients", "agent_locations", "agent_product_load_items", "agent_product_loads"],
  };

  const PARENT_TABLES: Record<string, string[]> = {
    purchase_invoice_items: ["purchase_invoices"],
    sales_invoice_items: ["sales_invoices"],
    sales_return_items: ["sales_returns"],
    purchase_return_items: ["purchase_returns"],
    warehouse_transfer_items: ["warehouse_transfers"],
    product_damage_items: ["product_damages"],
    agent_product_load_items: ["agent_product_loads"],
    external_debt_transactions: ["external_debts"],
    category_groups: ["categories"],
  };

  app.delete('/api/data-reset/:tableName', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const [currentUser] = await db.select().from(users).where(eq(users.id, userId));
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      const tableName = req.params.tableName;
      const table = TABLE_MAP[tableName];
      if (!table) return res.status(400).json({ message: "Invalid table name" });

      await db.transaction(async (tx) => {
        const childTables = CHILD_TABLES[tableName] || [];
        for (const child of childTables) {
          if (TABLE_MAP[child]) {
            await tx.delete(TABLE_MAP[child]);
          }
        }
        await tx.delete(table);
        if (tableName === "representatives") {
          await tx.delete(users).where(eq(users.role, 'sales_rep'));
        }
      });
      res.json({ message: `Table ${tableName} cleared successfully` });
    } catch (err: any) {
      res.status(500).json({ message: err?.message || "Failed to clear table" });
    }
  });

  app.delete('/api/data-reset-all', requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const [currentUser] = await db.select().from(users).where(eq(users.id, userId));
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const deleteOrder = [
        "agent_locations", "agent_clients",
        "agent_product_load_items", "agent_product_loads",
        "export_logs", "notifications",
        "product_damage_items", "product_damages",
        "warehouse_transfer_items", "warehouse_transfers",
        "currency_exchanges",
        "customer_receipts", "agent_payments",
        "sales_return_items", "sales_returns",
        "sales_invoice_items", "sales_invoices",
        "purchase_return_items", "purchase_returns",
        "purchase_invoice_items", "purchase_invoices",
        "supplier_payments", "supplier_adjustments",
        "owner_transactions", "owners",
        "expenses", "expense_types",
        "external_debt_transactions", "external_debts",
        "transfer_office_transactions", "transfer_offices",
        "clearance_purchase_invoices",
        "customs_clearance_transactions", "customs_clearances",
        "bank_transactions", "banks",
        "transactions", "accounts",
        "inventory",
        "representatives",
        "clients",
        "products",
        "category_groups", "categories",
        "warehouses",
        "units",
        "addresses",
      ];

      await db.transaction(async (tx) => {
        for (const tableName of deleteOrder) {
          if (TABLE_MAP[tableName]) {
            await tx.delete(TABLE_MAP[tableName]);
          }
        }
        await tx.delete(users).where(eq(users.role, 'sales_rep'));
      });
      res.json({ message: "All tables cleared successfully" });
    } catch (err: any) {
      res.status(500).json({ message: err?.message || "Failed to clear all tables" });
    }
  });

  app.get('/api/rep-balances', requireAuth, async (req, res) => {
    try {
      const allReps = await db.select().from(representatives);
      const balances: Record<number, { balanceUsd: number; balanceIqd: number }> = {};

      for (const rep of allReps) {
        const oldDebtUsd = parseFloat(rep.debtUsd || "0");
        const oldDebtIqd = parseFloat(rep.debtIqd || "0");

        const [invoiceUsd] = await db.select({ total: sql<string>`COALESCE(SUM(${salesInvoices.remaining}::numeric), 0)` })
          .from(salesInvoices).where(sql`${salesInvoices.representativeId} = ${rep.id} AND ${salesInvoices.currency} = 'USD' AND ${salesInvoices.remaining}::numeric > 0`);
        const [invoiceIqd] = await db.select({ total: sql<string>`COALESCE(SUM(${salesInvoices.remaining}::numeric), 0)` })
          .from(salesInvoices).where(sql`${salesInvoices.representativeId} = ${rep.id} AND ${salesInvoices.currency} = 'IQD' AND ${salesInvoices.remaining}::numeric > 0`);

        const [returnUsd] = await db.select({ total: sql<string>`COALESCE(SUM(${salesReturns.subtotal}::numeric), 0)` })
          .from(salesReturns).where(sql`${salesReturns.representativeId} = ${rep.id} AND ${salesReturns.currency} = 'USD' AND ${salesReturns.subtotal}::numeric > 0`);
        const [returnIqd] = await db.select({ total: sql<string>`COALESCE(SUM(${salesReturns.subtotal}::numeric), 0)` })
          .from(salesReturns).where(sql`${salesReturns.representativeId} = ${rep.id} AND ${salesReturns.currency} = 'IQD' AND ${salesReturns.subtotal}::numeric > 0`);

        const allPayments = await storage.getAgentPaymentsByAgentId(rep.id);
        let payUsd = 0, payIqd = 0;
        for (const p of allPayments) {
          const amt = parseFloat(p.amount || "0");
          if (amt <= 0) continue;
          if (p.currency === "USD") payUsd += amt; else payIqd += amt;
        }

        const debitUsd = parseFloat(invoiceUsd?.total || "0");
        const debitIqd = parseFloat(invoiceIqd?.total || "0");
        const creditUsd = parseFloat(returnUsd?.total || "0") + payUsd;
        const creditIqd = parseFloat(returnIqd?.total || "0") + payIqd;

        balances[rep.id] = {
          balanceUsd: oldDebtUsd + debitUsd - creditUsd,
          balanceIqd: oldDebtIqd + debitIqd - creditIqd,
        };
      }

      res.json(balances);
    } catch (err: any) {
      res.status(500).json({ message: err?.message || "Failed to calculate balances" });
    }
  });

  app.get('/api/rep-sales/:id', requireAuth, async (req, res) => {
    try {
      const repId = parseInt(req.params.id as string);
      const fromDate = (req.query.fromDate as string) || "2000-01-01";
      const toDate = (req.query.toDate as string) || "2099-12-31";
      const [rep] = await db.select().from(representatives).where(eq(representatives.id, repId));
      if (!rep) return res.status(404).json({ message: "Representative not found" });
      const data = await db.select().from(salesInvoices)
        .where(sql`${salesInvoices.representativeName} = ${rep.name} AND ${salesInvoices.date} >= ${fromDate} AND ${salesInvoices.date} <= ${toDate}`)
        .orderBy(sql`${salesInvoices.date} DESC, ${salesInvoices.time} DESC`);
      res.json(data);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get('/api/rep-sales-by-product/:id', requireAuth, async (req, res) => {
    try {
      const repId = parseInt(req.params.id as string);
      const fromDate = (req.query.fromDate as string) || "2000-01-01";
      const toDate = (req.query.toDate as string) || "2099-12-31";
      const [rep] = await db.select().from(representatives).where(eq(representatives.id, repId));
      if (!rep) return res.status(404).json({ message: "Representative not found" });
      const invoices = await db.select().from(salesInvoices)
        .where(sql`${salesInvoices.representativeName} = ${rep.name} AND ${salesInvoices.date} >= ${fromDate} AND ${salesInvoices.date} <= ${toDate}`);
      const invoiceIds = invoices.map(inv => inv.id);
      const returns = await db.select().from(salesReturns)
        .where(sql`${salesReturns.representativeName} = ${rep.name} AND ${salesReturns.date} >= ${fromDate} AND ${salesReturns.date} <= ${toDate}`);
      const returnIds = returns.map(r => r.id);
      const grouped: Record<string, { productId: number | null; productCode: string; productName: string; unit: string; totalQuantity: number; totalGift: number; totalAmount: number; totalAmountUsd: number; totalAmountIqd: number; invoiceCount: number; invoiceNumbers: string[]; returnQuantity: number; returnGift: number; returnAmountUsd: number; returnAmountIqd: number; returnNumbers: string[] }> = {};
      if (invoiceIds.length > 0) {
        const items = await db.select().from(salesInvoiceItems)
          .where(sql`${salesInvoiceItems.invoiceId} IN (${sql.join(invoiceIds.map(id => sql`${id}`), sql`, `)})`);
        items.forEach((item) => {
          const inv = invoices.find(i => i.id === item.invoiceId);
          const currency = inv?.currency || "USD";
          const key = `${item.productCode}_${item.unit}`;
          if (!grouped[key]) {
            grouped[key] = { productId: item.productId, productCode: item.productCode, productName: item.productName, unit: item.unit, totalQuantity: 0, totalGift: 0, totalAmount: 0, totalAmountUsd: 0, totalAmountIqd: 0, invoiceCount: 0, invoiceNumbers: [], returnQuantity: 0, returnGift: 0, returnAmountUsd: 0, returnAmountIqd: 0, returnNumbers: [] };
          }
          grouped[key].totalQuantity += parseFloat(item.quantity || "0");
          grouped[key].totalGift += parseFloat(item.gift || "0");
          grouped[key].totalAmount += parseFloat(item.amount || "0");
          if (currency === "USD") { grouped[key].totalAmountUsd += parseFloat(item.amount || "0"); }
          else { grouped[key].totalAmountIqd += parseFloat(item.amount || "0"); }
          grouped[key].invoiceCount += 1;
          const invNum = inv?.invoiceNumber || "";
          if (invNum && !grouped[key].invoiceNumbers.includes(invNum)) {
            grouped[key].invoiceNumbers.push(invNum);
          }
        });
      }
      if (returnIds.length > 0) {
        const retItems = await db.select().from(salesReturnItems)
          .where(sql`${salesReturnItems.returnId} IN (${sql.join(returnIds.map(id => sql`${id}`), sql`, `)})`);
        retItems.forEach((item) => {
          const ret = returns.find(r => r.id === item.returnId);
          const currency = ret?.currency || "USD";
          const key = `${item.productCode}_${item.unit}`;
          if (!grouped[key]) {
            grouped[key] = { productId: item.productId, productCode: item.productCode, productName: item.productName, unit: item.unit, totalQuantity: 0, totalGift: 0, totalAmount: 0, totalAmountUsd: 0, totalAmountIqd: 0, invoiceCount: 0, invoiceNumbers: [], returnQuantity: 0, returnGift: 0, returnAmountUsd: 0, returnAmountIqd: 0, returnNumbers: [] };
          }
          grouped[key].returnQuantity += parseFloat(item.quantity || "0");
          grouped[key].returnGift += parseFloat(item.gift || "0");
          if (currency === "USD") { grouped[key].returnAmountUsd += parseFloat(item.amount || "0"); }
          else { grouped[key].returnAmountIqd += parseFloat(item.amount || "0"); }
          const retNum = ret?.returnNumber || "";
          if (retNum && !grouped[key].returnNumbers.includes(retNum)) {
            grouped[key].returnNumbers.push(retNum);
          }
        });
      }
      const result = Object.values(grouped).sort((a, b) => a.productName.localeCompare(b.productName));
      res.json(result);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get('/api/rep-returns/:id', requireAuth, async (req, res) => {
    try {
      const repId = parseInt(req.params.id as string);
      const fromDate = (req.query.fromDate as string) || "2000-01-01";
      const toDate = (req.query.toDate as string) || "2099-12-31";
      const [rep] = await db.select().from(representatives).where(eq(representatives.id, repId));
      if (!rep) return res.status(404).json({ message: "Representative not found" });
      const data = await db.select().from(salesReturns)
        .where(sql`${salesReturns.representativeName} = ${rep.name} AND ${salesReturns.date} >= ${fromDate} AND ${salesReturns.date} <= ${toDate}`)
        .orderBy(sql`${salesReturns.date} DESC, ${salesReturns.time} DESC`);
      res.json(data);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get('/api/rep-receipts/:id', requireAuth, async (req, res) => {
    try {
      const repId = parseInt(req.params.id as string);
      const fromDate = (req.query.fromDate as string) || "2000-01-01";
      const toDate = (req.query.toDate as string) || "2099-12-31";
      const [rep] = await db.select().from(representatives).where(eq(representatives.id, repId));
      if (!rep) return res.status(404).json({ message: "Representative not found" });
      const receipts = await db.select().from(customerReceipts)
        .where(sql`${customerReceipts.representativeName} = ${rep.name} AND ${customerReceipts.date} >= ${fromDate} AND ${customerReceipts.date} <= ${toDate}`)
        .orderBy(sql`${customerReceipts.date} DESC, ${customerReceipts.time} DESC`);
      const payments = await db.select().from(agentPayments)
        .where(sql`${agentPayments.representativeName} = ${rep.name} AND ${agentPayments.date} >= ${fromDate} AND ${agentPayments.date} <= ${toDate}`)
        .orderBy(sql`${agentPayments.date} DESC, ${agentPayments.time} DESC`);
      const cashFromSales = await db.select({
        id: salesInvoices.id,
        invoiceNumber: salesInvoices.invoiceNumber,
        date: salesInvoices.date,
        customerName: salesInvoices.customerName,
        amountPaid: salesInvoices.amountPaid,
        currency: salesInvoices.currency,
      }).from(salesInvoices)
        .where(sql`${salesInvoices.representativeName} = ${rep.name} AND ${salesInvoices.date} >= ${fromDate} AND ${salesInvoices.date} <= ${toDate} AND CAST(${salesInvoices.amountPaid} AS numeric) > 0`)
        .orderBy(sql`${salesInvoices.date} DESC`);
      res.json({ receipts, payments, cashFromSales });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get('/api/rep-payments-statement/:id', requireAuth, async (req, res) => {
    try {
      const repId = parseInt(req.params.id as string);
      const fromDate = (req.query.fromDate as string) || "2000-01-01";
      const toDate = (req.query.toDate as string) || "2099-12-31";
      const [rep] = await db.select().from(representatives).where(eq(representatives.id, repId));
      if (!rep) return res.status(404).json({ message: "Representative not found" });
      const receipts = await db.select().from(customerReceipts)
        .where(sql`${customerReceipts.representativeName} = ${rep.name} AND ${customerReceipts.date} >= ${fromDate} AND ${customerReceipts.date} <= ${toDate}`)
        .orderBy(sql`${customerReceipts.date} DESC, ${customerReceipts.time} DESC`);
      const returnPayments = await db.select({
        id: salesReturns.id,
        returnNumber: salesReturns.returnNumber,
        date: salesReturns.date,
        customerName: salesReturns.customerName,
        amountPaid: salesReturns.amountPaid,
        currency: salesReturns.currency,
      }).from(salesReturns)
        .where(sql`${salesReturns.representativeName} = ${rep.name} AND ${salesReturns.date} >= ${fromDate} AND ${salesReturns.date} <= ${toDate} AND CAST(${salesReturns.amountPaid} AS numeric) > 0`)
        .orderBy(sql`${salesReturns.date} DESC`);
      const payments = await db.select().from(agentPayments)
        .where(sql`${agentPayments.representativeName} = ${rep.name} AND ${agentPayments.date} >= ${fromDate} AND ${agentPayments.date} <= ${toDate}`)
        .orderBy(sql`${agentPayments.date} DESC, ${agentPayments.time} DESC`);
      res.json({ receipts, returnPayments, payments });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get('/api/rep-loads/:id', requireAuth, async (req, res) => {
    try {
      const repId = parseInt(req.params.id as string);
      const fromDate = (req.query.fromDate as string) || "2000-01-01";
      const toDate = (req.query.toDate as string) || "2099-12-31";
      const [rep] = await db.select().from(representatives).where(eq(representatives.id, repId));
      if (!rep) return res.status(404).json({ message: "Representative not found" });
      const loads = await db.select().from(agentProductLoads)
        .where(sql`${agentProductLoads.agentName} = ${rep.name} AND ${agentProductLoads.date} >= ${fromDate} AND ${agentProductLoads.date} <= ${toDate}`)
        .orderBy(sql`${agentProductLoads.date} DESC`);
      const loadIds = loads.map(l => l.id);
      let items: any[] = [];
      if (loadIds.length > 0) {
        items = await db.select().from(agentProductLoadItems)
          .where(sql`${agentProductLoadItems.loadId} IN (${sql.join(loadIds.map(id => sql`${id}`), sql`, `)})`);
      }
      res.json({ loads, items });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get('/api/expiry-report', requireAuth, async (_req, res) => {
    try {
      const items = await db.select({
        id: purchaseInvoiceItems.id,
        invoiceId: purchaseInvoiceItems.invoiceId,
        productCode: purchaseInvoiceItems.productCode,
        productName: purchaseInvoiceItems.productName,
        quantity: purchaseInvoiceItems.quantity,
        unit: purchaseInvoiceItems.unit,
        productionDate: purchaseInvoiceItems.productionDate,
        expiryDate: purchaseInvoiceItems.expiryDate,
        invoiceNumber: purchaseInvoices.invoiceNumber,
      }).from(purchaseInvoiceItems)
        .innerJoin(purchaseInvoices, eq(purchaseInvoiceItems.invoiceId, purchaseInvoices.id))
        .where(sql`${purchaseInvoiceItems.expiryDate} IS NOT NULL AND ${purchaseInvoiceItems.expiryDate} != ''`)
        .orderBy(sql`${purchaseInvoiceItems.expiryDate} ASC`);

      const allProducts = await db.select({ id: products.id, name: products.name, nameEn: products.nameEn }).from(products);
      const productMap = new Map(allProducts.map(p => [p.name, p.nameEn]));

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const result = items.map(item => {
        const expiryParts = (item.expiryDate || "").split(/[-/]/);
        let expiryMs: number;
        if (expiryParts.length === 3) {
          const [y, m, d] = expiryParts.map(Number);
          expiryMs = new Date(y, m - 1, d).getTime();
        } else {
          expiryMs = new Date(item.expiryDate!).getTime();
        }
        const diffMs = expiryMs - today.getTime();
        const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        let status: "expired" | "expiring_soon" | "ok" = "ok";
        if (daysLeft <= 0) status = "expired";
        else if (daysLeft <= 90) status = "expiring_soon";

        return {
          id: item.id,
          invoiceId: item.invoiceId,
          invoiceNumber: item.invoiceNumber,
          productCode: item.productCode,
          productName: item.productName,
          productNameEn: productMap.get(item.productName) || null,
          quantity: item.quantity,
          unit: item.unit,
          productionDate: item.productionDate,
          expiryDate: item.expiryDate!,
          daysLeft,
          status,
        };
      });

      res.json(result);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ===== SUPPLIER ORDERS =====
  app.get('/api/supplier-orders/next-number', requireAuth, async (_req, res) => {
    try {
      const allOrders = await db.select().from(supplierOrders);
      let maxNum = 0;
      for (const o of allOrders) {
        const num = parseInt(o.orderNumber.replace(/\D/g, ''), 10);
        if (num > maxNum) maxNum = num;
      }
      const next = `SO-${String(maxNum + 1).padStart(6, '0')}`;
      res.json({ number: next });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get('/api/supplier-orders', requireAuth, async (_req, res) => {
    try {
      const data = await db.select().from(supplierOrders);
      res.json(data);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get('/api/supplier-orders/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const [data] = await db.select().from(supplierOrders).where(eq(supplierOrders.id, id));
      if (!data) return res.status(404).json({ message: "Order not found" });
      res.json(data);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get('/api/supplier-orders/:id/items', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const data = await db.select().from(supplierOrderItems).where(eq(supplierOrderItems.orderId, id));
      res.json(data);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post('/api/supplier-orders', requireAuth, async (req, res) => {
    try {
      const { order, items } = req.body;
      if (!order || !order.orderNumber || !order.supplierName) {
        return res.status(400).json({ message: "Missing required order fields" });
      }
      const userId = (req.session as any)?.userId;
      const sessionUser = userId ? await storage.getUser(userId) : null;
      const result = await db.transaction(async (tx) => {
        const [inserted] = await tx.insert(supplierOrders).values({ ...order, createdBy: sessionUser?.username || null }).returning();
        if (items && items.length > 0) {
          const itemsWithOrderId = items.map((item: any) => ({ ...item, orderId: inserted.id }));
          await tx.insert(supplierOrderItems).values(itemsWithOrderId);
        }
        return inserted;
      });
      res.json(result);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.patch('/api/supplier-orders/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { order, items } = req.body;
      const result = await db.transaction(async (tx) => {
        await tx.update(supplierOrders).set(order).where(eq(supplierOrders.id, id));
        await tx.delete(supplierOrderItems).where(eq(supplierOrderItems.orderId, id));
        if (items && items.length > 0) {
          const itemsWithOrderId = items.map((item: any) => ({ ...item, orderId: id }));
          await tx.insert(supplierOrderItems).values(itemsWithOrderId);
        }
        const [updated] = await tx.select().from(supplierOrders).where(eq(supplierOrders.id, id));
        return updated;
      });
      res.json(result);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete('/api/supplier-orders/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      await db.delete(supplierOrderItems).where(eq(supplierOrderItems.orderId, id));
      await db.delete(supplierOrders).where(eq(supplierOrders.id, id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ===== BOOK TYPES =====
  app.get('/api/book-types', requireAuth, async (_req, res) => {
    try {
      const rows = await db.select().from(bookTypes).orderBy(bookTypes.name);
      res.json(rows);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post('/api/book-types', requireAuth, async (req, res) => {
    try {
      const { name } = req.body;
      if (!name || !name.trim()) return res.status(400).json({ message: "Name is required" });
      const [row] = await db.insert(bookTypes).values({ name: name.trim() }).returning();
      res.json(row);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.put('/api/book-types/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { name } = req.body;
      if (!name?.trim()) return res.status(400).json({ message: "Name is required" });
      const [row] = await db.update(bookTypes).set({ name: name.trim() }).where(eq(bookTypes.id, id)).returning();
      res.json(row);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete('/api/book-types/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(bookTypes).where(eq(bookTypes.id, id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  // ===== COMPANY BOOKS =====
  app.get('/api/company-books/next-number', requireAuth, async (_req, res) => {
    try {
      const [result] = await db.select({ maxNum: sql<number>`COALESCE(MAX(${companyBooks.bookNumber}), 0)` }).from(companyBooks);
      const next = (result?.maxNum || 0) + 1;
      res.json({ number: next });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get('/api/company-books', requireAuth, async (_req, res) => {
    try {
      const data = await db.select().from(companyBooks);
      res.json(data);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get('/api/company-books/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const [data] = await db.select().from(companyBooks).where(eq(companyBooks.id, id));
      if (!data) return res.status(404).json({ message: "Book not found" });
      res.json(data);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post('/api/company-books', requireAuth, async (req, res) => {
    try {
      const body = req.body;
      if (!body.toField || !body.subject || !body.authorizedPerson) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      const [result] = await db.select({ maxNum: sql<number>`COALESCE(MAX(${companyBooks.bookNumber}), 0)` }).from(companyBooks);
      const nextNum = (result?.maxNum || 0) + 1;
      body.bookNumber = nextNum;
      const [inserted] = await db.insert(companyBooks).values(body).returning();
      res.json(inserted);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.patch('/api/company-books/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const body = req.body;
      delete body.bookNumber;
      await db.update(companyBooks).set(body).where(eq(companyBooks.id, id));
      const [updated] = await db.select().from(companyBooks).where(eq(companyBooks.id, id));
      res.json(updated);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.delete('/api/company-books/:id', requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      await db.delete(companyBooks).where(eq(companyBooks.id, id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  const BACKUP_TABLES: Record<string, any> = {
    addresses, supplierAddresses, units, categories, categoryGroups, transferOffices, banks,
    customsClearances, warehouses, representatives, users, products, inventory, clients, accounts,
    transactions, purchaseInvoices, purchaseInvoiceItems, supplierPayments, supplierAdjustments,
    bankTransactions, customsClearanceTransactions, clearancePurchaseInvoices, transferOfficeTransactions,
    externalDebts, externalDebtTransactions, owners, ownerTransactions, expenseTypes, expenses,
    salesInvoices, salesInvoiceItems, salesReturns, salesReturnItems, notifications,
    purchaseReturns, purchaseReturnItems, customerReceipts, agentPayments, agentReceipts,
    currencyExchanges, warehouseTransfers, warehouseTransferItems, productDamages, productDamageItems,
    companyProfile, exportLogs, agentProductLoads, agentProductLoadItems, agentClients, agentLocations,
    systemSettings, supplierOrders, supplierOrderItems, bookTypes, companyBooks,
  };

  app.get('/api/backup', requireAuth, async (req, res) => {
    try {
      const currentUser = await storage.getUser(req.session.userId!);
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      const data: Record<string, any[]> = {};
      for (const [name, table] of Object.entries(BACKUP_TABLES)) {
        data[name] = await db.select().from(table);
      }
      const backup = {
        version: 1,
        createdAt: new Date().toISOString(),
        createdBy: currentUser.username,
        tables: data,
      };
      await logAudit(req, "BACKUP_CREATED", "system", null, { tableCount: Object.keys(data).length }, "high");
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="erp-backup-${new Date().toISOString().slice(0,10)}.json"`);
      res.json(backup);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post('/api/restore', requireAuth, async (req, res) => {
    try {
      const currentUser = await storage.getUser(req.session.userId!);
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      const backup = req.body;
      if (!backup || !backup.tables || !backup.version) {
        return res.status(400).json({ message: "Invalid backup file format" });
      }

      const deleteOrder = [
        "agentLocations", "agentClients", "agentProductLoadItems", "agentProductLoads",
        "exportLogs", "productDamageItems", "productDamages",
        "warehouseTransferItems", "warehouseTransfers", "currencyExchanges",
        "agentReceipts", "agentPayments", "customerReceipts",
        "purchaseReturnItems", "purchaseReturns", "salesReturnItems", "salesReturns",
        "salesInvoiceItems", "salesInvoices", "notifications",
        "ownerTransactions", "owners", "externalDebtTransactions", "externalDebts",
        "transferOfficeTransactions", "clearancePurchaseInvoices",
        "customsClearanceTransactions", "bankTransactions",
        "supplierAdjustments", "supplierPayments",
        "purchaseInvoiceItems", "purchaseInvoices",
        "supplierOrderItems", "supplierOrders",
        "companyBooks", "bookTypes",
        "expenses", "expenseTypes",
        "transactions",
        "inventory", "accounts", "clients", "products",
        "representatives", "systemSettings", "companyProfile",
        "warehouses", "customsClearances", "banks", "transferOffices",
        "categoryGroups", "categories", "units", "supplierAddresses", "addresses",
      ];

      for (const tableName of deleteOrder) {
        if (BACKUP_TABLES[tableName]) {
          await db.delete(BACKUP_TABLES[tableName]);
        }
      }

      const insertOrder = [
        "addresses", "supplierAddresses", "units", "categories", "categoryGroups",
        "transferOffices", "banks", "customsClearances", "warehouses",
        "representatives", "products", "clients", "accounts",
        "systemSettings", "companyProfile", "inventory",
        "expenseTypes", "bookTypes",
        "transactions",
        "purchaseInvoices", "purchaseInvoiceItems",
        "supplierPayments", "supplierAdjustments",
        "bankTransactions", "customsClearanceTransactions",
        "clearancePurchaseInvoices", "transferOfficeTransactions",
        "externalDebts", "externalDebtTransactions",
        "owners", "ownerTransactions",
        "expenses", "notifications",
        "salesInvoices", "salesInvoiceItems",
        "salesReturns", "salesReturnItems",
        "purchaseReturns", "purchaseReturnItems",
        "customerReceipts", "agentPayments", "agentReceipts",
        "currencyExchanges",
        "warehouseTransfers", "warehouseTransferItems",
        "productDamages", "productDamageItems",
        "exportLogs", "agentProductLoads", "agentProductLoadItems",
        "agentClients", "agentLocations",
        "supplierOrders", "supplierOrderItems",
        "companyBooks",
      ];

      let restoredCount = 0;
      for (const tableName of insertOrder) {
        const rows = backup.tables[tableName];
        if (rows && Array.isArray(rows) && rows.length > 0 && BACKUP_TABLES[tableName]) {
          for (const row of rows) {
            try {
              await db.insert(BACKUP_TABLES[tableName]).values(row);
            } catch (e: any) { }
          }
          restoredCount += rows.length;
        }
      }

      const userRows = backup.tables["users"];
      if (userRows && Array.isArray(userRows)) {
        for (const row of userRows) {
          const existing = await storage.getUserByUsername(row.username);
          if (!existing) {
            try { await db.insert(users).values(row); } catch (e: any) { }
          }
        }
      }

      await logAudit(req, "BACKUP_RESTORED", "system", null, {
        backupDate: backup.createdAt,
        backupBy: backup.createdBy,
        restoredRows: restoredCount,
      }, "critical");

      res.json({ success: true, message: "Backup restored successfully", restoredRows: restoredCount });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get('/api/audit-logs', requireAuth, async (req, res) => {
    try {
      const currentUser = await storage.getUser(req.session.userId!);
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      const { entity, action, riskLevel, flagged, limit: limitStr, offset: offsetStr } = req.query;
      let query = db.select().from(auditLogs).orderBy(sql`${auditLogs.createdAt} DESC`);
      const conditions: any[] = [];
      if (entity) conditions.push(eq(auditLogs.entity, entity as string));
      if (action) conditions.push(eq(auditLogs.action, action as string));
      if (riskLevel) conditions.push(eq(auditLogs.riskLevel, riskLevel as string));
      if (flagged === 'true') conditions.push(eq(auditLogs.flagged, true));
      const limit = Math.min(parseInt(limitStr as string) || 100, 500);
      const offset = parseInt(offsetStr as string) || 0;
      if (conditions.length > 0) {
        const rows = await db.select().from(auditLogs).where(and(...conditions)).orderBy(sql`${auditLogs.createdAt} DESC`).limit(limit).offset(offset);
        const countResult = await db.select({ count: sql<number>`count(*)` }).from(auditLogs).where(and(...conditions));
        res.json({ logs: rows, total: Number(countResult[0]?.count || 0) });
      } else {
        const rows = await db.select().from(auditLogs).orderBy(sql`${auditLogs.createdAt} DESC`).limit(limit).offset(offset);
        const countResult = await db.select({ count: sql<number>`count(*)` }).from(auditLogs);
        res.json({ logs: rows, total: Number(countResult[0]?.count || 0) });
      }
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get('/api/audit-logs/stats', requireAuth, async (req, res) => {
    try {
      const currentUser = await storage.getUser(req.session.userId!);
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const [totalResult] = await db.select({ count: sql<number>`count(*)` }).from(auditLogs);
      const [todayResult] = await db.select({ count: sql<number>`count(*)` }).from(auditLogs).where(sql`${auditLogs.createdAt} >= ${today}`);
      const [flaggedResult] = await db.select({ count: sql<number>`count(*)` }).from(auditLogs).where(eq(auditLogs.flagged, true));
      const [failedLoginsResult] = await db.select({ count: sql<number>`count(*)` }).from(loginAttempts).where(eq(loginAttempts.success, false));
      res.json({
        total: Number(totalResult?.count || 0),
        today: Number(todayResult?.count || 0),
        flagged: Number(flaggedResult?.count || 0),
        failedLogins: Number(failedLoginsResult?.count || 0),
      });
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

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
