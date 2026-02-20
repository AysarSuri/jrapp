import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Mock Auth
  app.post(api.auth.login.path, async (req, res) => {
    try {
      const input = api.auth.login.input.parse(req.body);
      let user = await storage.getUserByUsername(input.username);
      if (!user) {
        // Create an admin user if it doesn't exist
        user = await storage.createUser({ username: input.username, password: input.password, role: 'admin' });
      } else if (user.password !== input.password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      res.status(200).json(user);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.auth.logout.path, (req, res) => {
    res.json({ message: "Logged out" });
  });

  app.get(api.auth.me.path, async (req, res) => {
    // Return a mock user for now, as we don't have session management setup yet
    const usersList = await storage.getUserByUsername('admin');
    if (usersList) {
      res.json(usersList);
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });

  // Products
  app.get(api.products.list.path, async (req, res) => {
    const data = await storage.getProducts();
    res.json(data);
  });

  app.post(api.products.create.path, async (req, res) => {
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

  // Clients
  app.get(api.clients.list.path, async (req, res) => {
    const data = await storage.getClients();
    res.json(data);
  });

  app.post(api.clients.create.path, async (req, res) => {
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

  // Accounts
  app.get(api.accounts.list.path, async (req, res) => {
    const data = await storage.getAccounts();
    res.json(data);
  });

  app.post(api.accounts.create.path, async (req, res) => {
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

  // Invoices
  app.get(api.invoices.list.path, async (req, res) => {
    const data = await storage.getInvoices();
    res.json(data);
  });

  app.post(api.invoices.create.path, async (req, res) => {
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

  // Transactions
  app.get(api.transactions.list.path, async (req, res) => {
    const data = await storage.getTransactions();
    res.json(data);
  });

  app.post(api.transactions.create.path, async (req, res) => {
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
  const usersList = await storage.getUserByUsername('admin');
  if (!usersList) {
    await storage.createUser({ username: 'admin', password: 'password', role: 'admin' });
  }

  const productsList = await storage.getProducts();
  if (productsList.length === 0) {
    await storage.createProduct({
      barcode: '1234567890',
      name: 'Sample Product',
      category: 'Electronics',
      priceUsd: '100',
      priceIqd: '150000',
      minStock: 10,
      bigUnit: 'Box',
      smallUnit: 'Piece',
      conversionFactor: 10
    });
  }

  const clientsList = await storage.getClients();
  if (clientsList.length === 0) {
    await storage.createClient({ name: 'Ali', type: 'customer', contact: '0770000000' });
    await storage.createClient({ name: 'Supplier Co', type: 'supplier', contact: '0780000000' });
  }

  const accountsList = await storage.getAccounts();
  if (accountsList.length === 0) {
    await storage.createAccount({ name: 'Main Cash', type: 'cash', currency: 'IQD' });
    await storage.createAccount({ name: 'Bank Account USD', type: 'bank', currency: 'USD' });
  }
}