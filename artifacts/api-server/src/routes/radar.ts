import { clerkClient } from "@clerk/express";
import { Router, type IRouter } from "express";
import {
  CreateRadarInvitationBody,
  GetRadarAccessResponse,
  ListRadarInvitationsResponse,
  CreateRadarInvitationResponse,
} from "@workspace/api-zod";
import {
  rejectCrossOriginMutation,
  requireRadarSupportRole,
} from "../lib/radarAccess";

const router: IRouter = Router();
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
  res.setHeader("Cache-Control", "no-store");
  const role = await requireRadarSupportRole(req, res);
  if (!role) return;

  res.json(GetRadarAccessResponse.parse({ role }));
});

router.get("/radar/invitations", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  const role = await requireRadarSupportRole(req, res, ["support_admin"]);
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
  const role = await requireRadarSupportRole(req, res, ["support_admin"]);
  if (!role) return;
  if (rejectCrossOriginMutation(req, res)) return;

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
