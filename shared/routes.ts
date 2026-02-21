import { z } from 'zod';
import { 
  insertAddressSchema, addresses,
  insertUnitSchema, units,
  insertCategorySchema, categories,
  insertTransferOfficeSchema, transferOffices,
  insertBankSchema, banks,
  insertCustomsClearanceSchema, customsClearances,
  insertWarehouseSchema, warehouses,
  insertRepresentativeSchema, representatives,
  insertProductSchema, products, 
  insertClientSchema, clients, 
  insertAccountSchema, accounts, 
  insertInvoiceSchema, invoices, 
  insertTransactionSchema, transactions, 
  insertPurchaseInvoiceSchema, purchaseInvoices,
  insertPurchaseInvoiceItemSchema, purchaseInvoiceItems,
  insertSupplierPaymentSchema, supplierPayments,
  insertSupplierAdjustmentSchema, supplierAdjustments,
  insertBankTransactionSchema, bankTransactions,
  insertCustomsClearanceTransactionSchema, customsClearanceTransactions,
  insertTransferOfficeTransactionSchema, transferOfficeTransactions,
  insertExternalDebtSchema, externalDebts,
  insertExternalDebtTransactionSchema, externalDebtTransactions,
  insertOwnerSchema, owners,
  insertOwnerTransactionSchema, ownerTransactions,
  insertExpenseTypeSchema, expenseTypes,
  insertExpenseSchema, expenses,
  insertSalesInvoiceSchema, salesInvoices,
  insertSalesInvoiceItemSchema, salesInvoiceItems,
  notifications,
  insertUserSchema, loginSchema, users 
} from './schema';

export * from './schema';

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  unauthorized: z.object({ message: z.string() }),
};

export const api = {
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/login' as const,
      input: loginSchema,
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      }
    },
    register: {
      method: 'POST' as const,
      path: '/api/register' as const,
      input: insertUserSchema,
      responses: {
        201: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
      }
    },
    logout: {
      method: 'POST' as const,
      path: '/api/logout' as const,
      responses: {
        200: z.object({ message: z.string() }),
      }
    },
    me: {
      method: 'GET' as const,
      path: '/api/user' as const,
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      }
    }
  },
  addresses: {
    list: {
      method: 'GET' as const,
      path: '/api/addresses' as const,
      responses: {
        200: z.array(z.custom<typeof addresses.$inferSelect>()),
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/addresses' as const,
      input: insertAddressSchema,
      responses: {
        201: z.custom<typeof addresses.$inferSelect>(),
      }
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/addresses/:id' as const,
      input: insertAddressSchema,
      responses: {
        200: z.custom<typeof addresses.$inferSelect>(),
      }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/addresses/:id' as const,
      responses: {
        200: z.object({ message: z.string() }),
      }
    }
  },
  units: {
    list: {
      method: 'GET' as const,
      path: '/api/units' as const,
      responses: {
        200: z.array(z.custom<typeof units.$inferSelect>()),
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/units' as const,
      input: insertUnitSchema,
      responses: {
        201: z.custom<typeof units.$inferSelect>(),
      }
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/units/:id' as const,
      input: insertUnitSchema,
      responses: {
        200: z.custom<typeof units.$inferSelect>(),
      }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/units/:id' as const,
      responses: {
        200: z.object({ message: z.string() }),
      }
    }
  },
  categories: {
    list: {
      method: 'GET' as const,
      path: '/api/categories' as const,
      responses: {
        200: z.array(z.custom<typeof categories.$inferSelect>()),
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/categories' as const,
      input: insertCategorySchema,
      responses: {
        201: z.custom<typeof categories.$inferSelect>(),
      }
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/categories/:id' as const,
      input: insertCategorySchema,
      responses: {
        200: z.custom<typeof categories.$inferSelect>(),
      }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/categories/:id' as const,
      responses: {
        200: z.object({ message: z.string() }),
      }
    }
  },
  transferOffices: {
    list: {
      method: 'GET' as const,
      path: '/api/transfer-offices' as const,
      responses: { 200: z.array(z.custom<typeof transferOffices.$inferSelect>()) }
    },
    create: {
      method: 'POST' as const,
      path: '/api/transfer-offices' as const,
      input: insertTransferOfficeSchema,
      responses: { 201: z.custom<typeof transferOffices.$inferSelect>() }
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/transfer-offices/:id' as const,
      input: insertTransferOfficeSchema,
      responses: { 200: z.custom<typeof transferOffices.$inferSelect>() }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/transfer-offices/:id' as const,
      responses: { 200: z.object({ message: z.string() }) }
    }
  },
  banks: {
    list: {
      method: 'GET' as const,
      path: '/api/banks' as const,
      responses: { 200: z.array(z.custom<typeof banks.$inferSelect>()) }
    },
    create: {
      method: 'POST' as const,
      path: '/api/banks' as const,
      input: insertBankSchema,
      responses: { 201: z.custom<typeof banks.$inferSelect>() }
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/banks/:id' as const,
      input: insertBankSchema,
      responses: { 200: z.custom<typeof banks.$inferSelect>() }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/banks/:id' as const,
      responses: { 200: z.object({ message: z.string() }) }
    }
  },
  customsClearances: {
    list: {
      method: 'GET' as const,
      path: '/api/customs-clearances' as const,
      responses: { 200: z.array(z.custom<typeof customsClearances.$inferSelect>()) }
    },
    create: {
      method: 'POST' as const,
      path: '/api/customs-clearances' as const,
      input: insertCustomsClearanceSchema,
      responses: { 201: z.custom<typeof customsClearances.$inferSelect>() }
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/customs-clearances/:id' as const,
      input: insertCustomsClearanceSchema,
      responses: { 200: z.custom<typeof customsClearances.$inferSelect>() }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/customs-clearances/:id' as const,
      responses: { 200: z.object({ message: z.string() }) }
    }
  },
  warehouses: {
    list: {
      method: 'GET' as const,
      path: '/api/warehouses' as const,
      responses: { 200: z.array(z.custom<typeof warehouses.$inferSelect>()) }
    },
    create: {
      method: 'POST' as const,
      path: '/api/warehouses' as const,
      input: insertWarehouseSchema,
      responses: { 201: z.custom<typeof warehouses.$inferSelect>() }
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/warehouses/:id' as const,
      input: insertWarehouseSchema,
      responses: { 200: z.custom<typeof warehouses.$inferSelect>() }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/warehouses/:id' as const,
      responses: { 200: z.object({ message: z.string() }) }
    }
  },
  representatives: {
    list: {
      method: 'GET' as const,
      path: '/api/representatives' as const,
      responses: { 200: z.array(z.custom<typeof representatives.$inferSelect>()) }
    },
    create: {
      method: 'POST' as const,
      path: '/api/representatives' as const,
      input: insertRepresentativeSchema,
      responses: { 201: z.custom<typeof representatives.$inferSelect>() }
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/representatives/:id' as const,
      input: insertRepresentativeSchema,
      responses: { 200: z.custom<typeof representatives.$inferSelect>() }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/representatives/:id' as const,
      responses: { 200: z.object({ message: z.string() }) }
    }
  },
  products: {
    list: {
      method: 'GET' as const,
      path: '/api/products' as const,
      responses: {
        200: z.array(z.custom<typeof products.$inferSelect>()),
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/products' as const,
      input: insertProductSchema,
      responses: {
        201: z.custom<typeof products.$inferSelect>(),
      }
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/products/:id' as const,
      input: insertProductSchema.partial(),
      responses: {
        200: z.custom<typeof products.$inferSelect>(),
      }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/products/:id' as const,
      responses: {
        200: z.object({ message: z.string() }),
      }
    }
  },
  clients: {
    list: {
      method: 'GET' as const,
      path: '/api/clients' as const,
      responses: {
        200: z.array(z.custom<typeof clients.$inferSelect>()),
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/clients' as const,
      input: insertClientSchema,
      responses: {
        201: z.custom<typeof clients.$inferSelect>(),
      }
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/clients/:id' as const,
      input: insertClientSchema.partial(),
      responses: {
        200: z.custom<typeof clients.$inferSelect>(),
      }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/clients/:id' as const,
      responses: {
        200: z.object({ message: z.string() }),
      }
    }
  },
  accounts: {
    list: {
      method: 'GET' as const,
      path: '/api/accounts' as const,
      responses: {
        200: z.array(z.custom<typeof accounts.$inferSelect>()),
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/accounts' as const,
      input: insertAccountSchema,
      responses: {
        201: z.custom<typeof accounts.$inferSelect>(),
      }
    }
  },
  invoices: {
    list: {
      method: 'GET' as const,
      path: '/api/invoices' as const,
      responses: {
        200: z.array(z.custom<typeof invoices.$inferSelect>()),
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/invoices' as const,
      input: insertInvoiceSchema,
      responses: {
        201: z.custom<typeof invoices.$inferSelect>(),
      }
    }
  },
  purchaseInvoices: {
    list: {
      method: 'GET' as const,
      path: '/api/purchase-invoices' as const,
      responses: { 200: z.array(z.custom<typeof purchaseInvoices.$inferSelect>()) }
    },
    get: {
      method: 'GET' as const,
      path: '/api/purchase-invoices/:id' as const,
      responses: { 200: z.custom<typeof purchaseInvoices.$inferSelect>() }
    },
    getItems: {
      method: 'GET' as const,
      path: '/api/purchase-invoices/:id/items' as const,
      responses: { 200: z.array(z.custom<typeof purchaseInvoiceItems.$inferSelect>()) }
    },
    create: {
      method: 'POST' as const,
      path: '/api/purchase-invoices' as const,
      input: z.object({
        invoice: insertPurchaseInvoiceSchema,
        items: z.array(insertPurchaseInvoiceItemSchema.omit({ invoiceId: true })),
      }),
      responses: { 201: z.custom<typeof purchaseInvoices.$inferSelect>() }
    },
    nextNumber: {
      method: 'GET' as const,
      path: '/api/purchase-invoices/next-number' as const,
      responses: { 200: z.object({ number: z.string() }) }
    }
  },
  transactions: {
    list: {
      method: 'GET' as const,
      path: '/api/transactions' as const,
      responses: {
        200: z.array(z.custom<typeof transactions.$inferSelect>()),
      }
    },
    create: {
      method: 'POST' as const,
      path: '/api/transactions' as const,
      input: insertTransactionSchema,
      responses: {
        201: z.custom<typeof transactions.$inferSelect>(),
      }
    }
  },
  supplierPayments: {
    list: {
      method: 'GET' as const,
      path: '/api/supplier-payments' as const,
      responses: { 200: z.array(z.custom<typeof supplierPayments.$inferSelect>()) }
    },
    create: {
      method: 'POST' as const,
      path: '/api/supplier-payments' as const,
      input: insertSupplierPaymentSchema,
      responses: { 201: z.custom<typeof supplierPayments.$inferSelect>() }
    }
  },
  supplierAdjustments: {
    list: {
      method: 'GET' as const,
      path: '/api/supplier-adjustments' as const,
      responses: { 200: z.array(z.custom<typeof supplierAdjustments.$inferSelect>()) }
    },
    create: {
      method: 'POST' as const,
      path: '/api/supplier-adjustments' as const,
      input: insertSupplierAdjustmentSchema,
      responses: { 201: z.custom<typeof supplierAdjustments.$inferSelect>() }
    }
  },
  bankTransactions: {
    list: {
      method: 'GET' as const,
      path: '/api/bank-transactions' as const,
      responses: { 200: z.array(z.custom<typeof bankTransactions.$inferSelect>()) }
    },
    create: {
      method: 'POST' as const,
      path: '/api/bank-transactions' as const,
      input: insertBankTransactionSchema,
      responses: { 201: z.custom<typeof bankTransactions.$inferSelect>() }
    }
  },
  customsClearanceTransactions: {
    list: {
      method: 'GET' as const,
      path: '/api/clearance-transactions' as const,
      responses: { 200: z.array(z.custom<typeof customsClearanceTransactions.$inferSelect>()) }
    },
    create: {
      method: 'POST' as const,
      path: '/api/clearance-transactions' as const,
      input: insertCustomsClearanceTransactionSchema,
      responses: { 201: z.custom<typeof customsClearanceTransactions.$inferSelect>() }
    }
  },
  transferOfficeTransactions: {
    list: {
      method: 'GET' as const,
      path: '/api/office-transactions' as const,
      responses: { 200: z.array(z.custom<typeof transferOfficeTransactions.$inferSelect>()) }
    },
    create: {
      method: 'POST' as const,
      path: '/api/office-transactions' as const,
      input: insertTransferOfficeTransactionSchema,
      responses: { 201: z.custom<typeof transferOfficeTransactions.$inferSelect>() }
    }
  },
  expenseTypes: {
    list: {
      method: 'GET' as const,
      path: '/api/expense-types' as const,
      responses: { 200: z.array(z.custom<typeof expenseTypes.$inferSelect>()) }
    },
    create: {
      method: 'POST' as const,
      path: '/api/expense-types' as const,
      input: insertExpenseTypeSchema,
      responses: { 201: z.custom<typeof expenseTypes.$inferSelect>() }
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/expense-types/:id' as const,
      input: insertExpenseTypeSchema,
      responses: { 200: z.custom<typeof expenseTypes.$inferSelect>() }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/expense-types/:id' as const,
      responses: { 200: z.object({ message: z.string() }) }
    }
  },
  externalDebts: {
    list: {
      method: 'GET' as const,
      path: '/api/external-debts' as const,
      responses: { 200: z.array(z.custom<typeof externalDebts.$inferSelect>()) }
    },
    create: {
      method: 'POST' as const,
      path: '/api/external-debts' as const,
      input: insertExternalDebtSchema,
      responses: { 201: z.custom<typeof externalDebts.$inferSelect>() }
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/external-debts/:id' as const,
      input: insertExternalDebtSchema,
      responses: { 200: z.custom<typeof externalDebts.$inferSelect>() }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/external-debts/:id' as const,
      responses: { 200: z.object({ message: z.string() }) }
    }
  },
  externalDebtTransactions: {
    list: {
      method: 'GET' as const,
      path: '/api/external-debt-transactions' as const,
      responses: { 200: z.array(z.custom<typeof externalDebtTransactions.$inferSelect>()) }
    },
    create: {
      method: 'POST' as const,
      path: '/api/external-debt-transactions' as const,
      input: insertExternalDebtTransactionSchema,
      responses: { 201: z.custom<typeof externalDebtTransactions.$inferSelect>() }
    }
  },
  owners: {
    list: {
      method: 'GET' as const,
      path: '/api/owners' as const,
      responses: { 200: z.array(z.custom<typeof owners.$inferSelect>()) }
    },
    create: {
      method: 'POST' as const,
      path: '/api/owners' as const,
      input: insertOwnerSchema,
      responses: { 201: z.custom<typeof owners.$inferSelect>() }
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/owners/:id' as const,
      input: insertOwnerSchema,
      responses: { 200: z.custom<typeof owners.$inferSelect>() }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/owners/:id' as const,
      responses: { 200: z.object({ message: z.string() }) }
    }
  },
  ownerTransactions: {
    list: {
      method: 'GET' as const,
      path: '/api/owner-transactions' as const,
      responses: { 200: z.array(z.custom<typeof ownerTransactions.$inferSelect>()) }
    },
    create: {
      method: 'POST' as const,
      path: '/api/owner-transactions' as const,
      input: insertOwnerTransactionSchema,
      responses: { 201: z.custom<typeof ownerTransactions.$inferSelect>() }
    }
  },
  expenses: {
    list: {
      method: 'GET' as const,
      path: '/api/expenses' as const,
      responses: { 200: z.array(z.custom<typeof expenses.$inferSelect>()) }
    },
    create: {
      method: 'POST' as const,
      path: '/api/expenses' as const,
      input: insertExpenseSchema,
      responses: { 201: z.custom<typeof expenses.$inferSelect>() }
    }
  },
  salesInvoices: {
    list: {
      method: 'GET' as const,
      path: '/api/sales-invoices' as const,
      responses: { 200: z.array(z.custom<typeof salesInvoices.$inferSelect>()) }
    },
    get: {
      method: 'GET' as const,
      path: '/api/sales-invoices/:id' as const,
      responses: { 200: z.custom<typeof salesInvoices.$inferSelect>() }
    },
    getItems: {
      method: 'GET' as const,
      path: '/api/sales-invoices/:id/items' as const,
      responses: { 200: z.array(z.custom<typeof salesInvoiceItems.$inferSelect>()) }
    },
    create: {
      method: 'POST' as const,
      path: '/api/sales-invoices' as const,
      input: z.object({
        invoice: insertSalesInvoiceSchema,
        items: z.array(insertSalesInvoiceItemSchema.omit({ invoiceId: true })),
      }),
      responses: { 201: z.custom<typeof salesInvoices.$inferSelect>() }
    },
    nextNumber: {
      method: 'GET' as const,
      path: '/api/sales-invoices/next-number' as const,
      responses: { 200: z.object({ number: z.string() }) }
    },
    approve: {
      method: 'POST' as const,
      path: '/api/sales-invoices/:id/approve' as const,
      responses: { 200: z.custom<typeof salesInvoices.$inferSelect>() }
    }
  },
  notifications: {
    list: {
      method: 'GET' as const,
      path: '/api/notifications' as const,
      responses: { 200: z.array(z.custom<typeof notifications.$inferSelect>()) }
    },
    unreadCount: {
      method: 'GET' as const,
      path: '/api/notifications/unread-count' as const,
      responses: { 200: z.object({ count: z.number() }) }
    },
    markRead: {
      method: 'POST' as const,
      path: '/api/notifications/:id/read' as const,
      responses: { 200: z.object({ success: z.boolean() }) }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
