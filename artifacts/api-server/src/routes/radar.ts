import {
  clerkClient,
  getAuth,
} from "@clerk/express";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  CreateRadarInvitationBody,
  GetRadarAccessResponse,
  ListRadarInvitationsResponse,
  CreateRadarInvitationResponse,
} from "@workspace/api-zod";
import { getClerkProxyHost } from "../middlewares/clerkProxyMiddleware";

const router: IRouter = Router();
const supportRoles = new Set(["support_admin", "support_member"]);

async function requireSupportRole(
  req: Request,
  res: Response,
  allowedRoles: Set<string> = supportRoles,
): Promise<"support_admin" | "support_member" | null> {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "Sign-in is required." });
    return null;
  }

  const user = await clerkClient.users.getUser(userId);
  const role = user.publicMetadata?.radarRole;
  if (typeof role !== "string" || !allowedRoles.has(role)) {
    res.status(403).json({ error: "Support team access is required." });
    return null;
  }

  return role as "support_admin" | "support_member";
}

function invitationResponse(invitation: {
  id: string;
  emailAddress: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  createdAt: number;
}) {
  return {
    id: invitation.id,
    email: invitation.emailAddress,
    status: invitation.status,
    createdAt: new Date(invitation.createdAt).toISOString(),
  };
}

router.get("/radar/access", async (req, res): Promise<void> => {
  const role = await requireSupportRole(req, res);
  if (!role) return;

  res.json(GetRadarAccessResponse.parse({ role }));
});

router.get("/radar/invitations", async (req, res): Promise<void> => {
  const role = await requireSupportRole(req, res, new Set(["support_admin"]));
  if (!role) return;

  const invitations = await clerkClient.invitations.getInvitationList({
    limit: 100,
    orderBy: "-created_at",
  });
  const result = invitations.data
    .filter(
      (invitation) =>
        invitation.publicMetadata?.radarRole === "support_admin" ||
        invitation.publicMetadata?.radarRole === "support_member",
    )
    .map(invitationResponse);

  res.json(ListRadarInvitationsResponse.parse(result));
});

router.post("/radar/invitations", async (req, res): Promise<void> => {
  const role = await requireSupportRole(req, res, new Set(["support_admin"]));
  if (!role) return;

  const origin = req.get("origin");
  const requestHost = getClerkProxyHost(req);
  if (origin) {
    try {
      if (
        !requestHost ||
        new URL(origin).host.toLowerCase() !== requestHost.toLowerCase()
      ) {
        res
          .status(403)
          .json({ error: "Cross-origin invitation requests are not allowed." });
        return;
      }
    } catch {
      res
        .status(403)
        .json({ error: "Cross-origin invitation requests are not allowed." });
      return;
    }
  }

  const parsed = CreateRadarInvitationBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.issues }, "Invalid support invitation request");
    res.status(400).json({ error: "A valid email address is required." });
    return;
  }

  try {
    const invitation = await clerkClient.invitations.createInvitation({
      emailAddress: parsed.data.email.trim().toLowerCase(),
      publicMetadata: { radarRole: "support_member" },
      redirectUrl: "/sign-up",
    });

    res
      .status(201)
      .json(CreateRadarInvitationResponse.parse(invitationResponse(invitation)));
  } catch {
    res.status(409).json({
      error: "Invitation could not be created. The account or invitation may already exist.",
    });
  }
});

export default router;
