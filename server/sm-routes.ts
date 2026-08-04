import { Router, type Express } from "express";
import { requireAuth } from "./sm/lib/smAuth";

import branchesRouter from "./sm/routes/branches";
import shiftsRouter from "./sm/routes/shifts";
import productionsRouter from "./sm/routes/productions";
import cashierRouter from "./sm/routes/cashier";
import cashierCardsRouter from "./sm/routes/cashier-cards";
import capitalRouter from "./sm/routes/capital";
import paymentCardsRouter from "./sm/routes/payment-cards";

/*
 * Mounts the ported supermarket (SM) feature routes on the same API paths the
 * supermarket frontend expects. Session auth (JR's requireAuth) is reused via
 * ./sm/lib/smAuth, which also hydrates req.user for the SM branch/role logic.
 *
 * No path prefixes were needed: none of these 7 paths collide with existing JR
 * routes (verified by grep against server/routes.ts and shared/routes.ts).
 *
 * `/branches` GET stays public (login branch picker); its writes carry
 * requireAuth inline, mirroring the source app. Everything else requires auth.
 */
export function registerSmRoutes(app: Express): void {
  const router = Router();

  // Public (writes are protected inline inside the router).
  router.get("/login-branches", async (_req, res) => {
    try {
      const { db } = await import("./db");
      const { branchesTable } = await import("@shared/schema");
      const rows = await db.select({ id: branchesTable.id, name: branchesTable.name, color: branchesTable.color })
        .from(branchesTable)
        .orderBy(branchesTable.id);
      res.json(rows);
    } catch {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  router.use("/branches", branchesRouter);

  // All routes below require a valid session.
  router.use(requireAuth);
  router.use("/shifts", shiftsRouter);
  router.use("/productions", productionsRouter);
  router.use("/cashier", cashierRouter);
  router.use("/cashier-cards", cashierCardsRouter);
  router.use("/capital", capitalRouter);
  router.use("/payment-cards", paymentCardsRouter);

  app.use("/api", router);
}
