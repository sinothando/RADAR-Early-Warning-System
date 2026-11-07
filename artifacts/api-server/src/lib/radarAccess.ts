import { clerkClient, getAuth } from "@clerk/express";
import type { Request, Response } from "express";
import { getClerkProxyHost } from "../middlewares/clerkProxyMiddleware";

const supportRoles = ["support_admin", "support_member"] as const;
export type RadarSupportRole = (typeof supportRoles)[number];

export async function requireRadarSupportRole(
  req: Request,
  res: Response,
  allowedRoles: readonly RadarSupportRole[] = supportRoles,
): Promise<RadarSupportRole | null> {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "Sign-in is required." });
    return null;
  }

  const user = await clerkClient.users.getUser(userId);
  const role = user.publicMetadata?.radarRole;
  if (typeof role !== "string" || !allowedRoles.includes(role as RadarSupportRole)) {
    res.status(403).json({ error: "Support team access is required." });
    return null;
  }

  return role as RadarSupportRole;
}

export function rejectCrossOriginMutation(
  req: Request,
  res: Response,
): boolean {
  const origin = req.get("origin");
  if (!origin) return false;

  const expectedHost = getClerkProxyHost(req);
  try {
    if (
      expectedHost &&
      new URL(origin).host.toLowerCase() === expectedHost.toLowerCase()
    ) {
      return false;
    }
  } catch {
    // Reject malformed origins below.
  }

  req.log.warn(
    { originHost: safeOriginHost(origin), expectedHost },
    "Rejected cross-origin support-team mutation",
  );
  res.status(403).json({ error: "Cross-origin requests are not allowed." });
  return true;
}

function safeOriginHost(origin: string): string | undefined {
  try {
    return new URL(origin).host;
  } catch {
    return undefined;
  }
}
