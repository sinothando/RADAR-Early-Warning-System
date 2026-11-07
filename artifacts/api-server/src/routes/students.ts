import { Router, type IRouter, type Request, type Response } from "express";
import { asc, eq } from "drizzle-orm";
import { db, students } from "@workspace/db";
import {
  CreateStudentBody,
  CreateStudentResponse,
  DeleteStudentParams,
  GetStudentParams,
  GetStudentResponse,
  ListStudentsResponse,
  UpdateStudentBody,
  UpdateStudentParams,
  UpdateStudentResponse,
} from "@workspace/api-zod";
import {
  rejectCrossOriginMutation,
  requireRadarSupportRole,
} from "../lib/radarAccess";

const router: IRouter = Router();
const allowedRoles = ["support_admin", "support_member"] as const;

function normalizeStudentBody(body: unknown): unknown {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return body;
  }

  const normalized = { ...body } as Record<string, unknown>;
  for (const key of ["studentNumber", "firstName", "lastName"]) {
    if (typeof normalized[key] === "string") {
      normalized[key] = normalized[key].trim();
    }
  }
  for (const key of ["email", "faculty", "programme"]) {
    if (typeof normalized[key] === "string") {
      const value = normalized[key].trim();
      normalized[key] = value || null;
    }
  }
  return normalized;
}

function postgresCode(error: unknown): string | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }
  return undefined;
}

function reportDatabaseError(
  req: Request,
  res: Response,
  error: unknown,
  logMessage: string,
): void {
  req.log.error({ err: error }, logMessage);
  res.status(500).json({ error: "The student record request could not be completed." });
}

router.get("/students", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  const role = await requireRadarSupportRole(req, res, allowedRoles);
  if (!role) return;

  try {
    const records = await db
      .select()
      .from(students)
      .orderBy(asc(students.lastName), asc(students.firstName), asc(students.id));

    res.json(ListStudentsResponse.parse(records));
  } catch (error) {
    reportDatabaseError(req, res, error, "Failed to list student records");
  }
});

router.post("/students", async (req, res): Promise<void> => {
  const role = await requireRadarSupportRole(req, res, allowedRoles);
  if (!role) return;
  if (rejectCrossOriginMutation(req, res)) return;

  const parsed = CreateStudentBody.safeParse(normalizeStudentBody(req.body));
  if (!parsed.success) {
    req.log.warn({ issues: parsed.error.issues }, "Invalid student creation request");
    res.status(400).json({ error: "Enter a student number, first name, and last name, and check optional fields." });
    return;
  }

  try {
    const [record] = await db.insert(students).values(parsed.data).returning();
    res.status(201).json(CreateStudentResponse.parse(record));
  } catch (error) {
    if (postgresCode(error) === "23505") {
      res.status(409).json({ error: "That student number is already in use." });
      return;
    }
    reportDatabaseError(req, res, error, "Failed to create student record");
  }
});

router.get("/students/:studentId", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  const role = await requireRadarSupportRole(req, res, allowedRoles);
  if (!role) return;

  const params = GetStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid student ID." });
    return;
  }

  try {
    const [record] = await db
      .select()
      .from(students)
      .where(eq(students.id, params.data.studentId))
      .limit(1);

    if (!record) {
      res.status(404).json({ error: "Student record not found." });
      return;
    }

    res.json(GetStudentResponse.parse(record));
  } catch (error) {
    reportDatabaseError(req, res, error, "Failed to fetch student record");
  }
});

router.patch("/students/:studentId", async (req, res): Promise<void> => {
  const role = await requireRadarSupportRole(req, res, allowedRoles);
  if (!role) return;
  if (rejectCrossOriginMutation(req, res)) return;

  const params = UpdateStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid student ID." });
    return;
  }

  const parsed = UpdateStudentBody.safeParse(normalizeStudentBody(req.body));
  if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) {
    req.log.warn(
      { issues: parsed.success ? [] : parsed.error.issues },
      "Invalid student update request",
    );
    res.status(400).json({ error: "Provide at least one valid student field to update." });
    return;
  }

  try {
    const [record] = await db
      .update(students)
      .set(parsed.data)
      .where(eq(students.id, params.data.studentId))
      .returning();

    if (!record) {
      res.status(404).json({ error: "Student record not found." });
      return;
    }

    res.json(UpdateStudentResponse.parse(record));
  } catch (error) {
    if (postgresCode(error) === "23505") {
      res.status(409).json({ error: "That student number is already in use." });
      return;
    }
    reportDatabaseError(req, res, error, "Failed to update student record");
  }
});

router.delete("/students/:studentId", async (req, res): Promise<void> => {
  const role = await requireRadarSupportRole(req, res, allowedRoles);
  if (!role) return;
  if (rejectCrossOriginMutation(req, res)) return;

  const params = DeleteStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid student ID." });
    return;
  }

  try {
    const [deleted] = await db
      .delete(students)
      .where(eq(students.id, params.data.studentId))
      .returning({ id: students.id });

    if (!deleted) {
      res.status(404).json({ error: "Student record not found." });
      return;
    }

    res.status(204).end();
  } catch (error) {
    if (postgresCode(error) === "23503") {
      res.status(409).json({
        error: "This student has linked academic or support history and cannot be deleted.",
      });
      return;
    }
    reportDatabaseError(req, res, error, "Failed to delete student record");
  }
});

export default router;
