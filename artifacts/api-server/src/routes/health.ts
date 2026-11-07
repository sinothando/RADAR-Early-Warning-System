import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/healthz", async (req, res): Promise<void> => {
  try {
    await db.execute(sql`SELECT 1`);

    res.setHeader("Cache-Control", "no-store");
    res.json(HealthCheckResponse.parse({ status: "ok", database: "connected" }));
  } catch (error) {
    req.log.error({ err: error }, "Database health check failed");

    res.status(503).json({
      status: "error",
      database: "disconnected",
      message: "Database connection failed",
    });
  }
});

export default router;
