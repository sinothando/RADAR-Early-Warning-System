import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  ClerkProvider,
  SignIn,
  SignUp,
  useClerk,
  useUser,
} from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  LogOut,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Link, Redirect, Router as WouterRouter, useLocation } from "wouter";
import {
  createRadarInvitation,
  getRadarAccess,
  listRadarInvitations,
} from "@workspace/api-client-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY.");
}

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#347f76",
    colorForeground: "#254252",
    colorMutedForeground: "#71848d",
    colorDanger: "#b44f48",
    colorBackground: "#ffffff",
    colorInput: "#f8fbfa",
    colorInputForeground: "#254252",
    colorNeutral: "#254252",
    fontFamily: "DM Sans, sans-serif",
    borderRadius: "10px",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-2xl w-full max-w-[430px] overflow-hidden",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footerAction: "hidden",
    headerTitle: "text-[#254252] font-semibold",
    headerSubtitle: "text-[#71848d]",
    formFieldLabel: "text-[#526a73]",
    formFieldInput: "rounded-lg border-[#dce7e7] bg-[#f8fbfa]",
    formButtonPrimary: "rounded-lg bg-[#347f76] hover:bg-[#286d66]",
    socialButtonsBlockButton: "rounded-lg border-[#dce7e7]",
    socialButtonsBlockButtonText: "text-[#254252]",
    dividerText: "text-[#84959b]",
    footerActionText: "text-[#71848d]",
    footerActionLink: "text-[#347f76]",
    alert: "rounded-lg",
  },
};

function ClerkProviderWithWouter({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Support team sign-in",
            subtitle: "Use your invited account to access the RADAR workspace.",
          },
        },
        signUp: {
          start: {
            title: "Accept your RADAR invitation",
            subtitle: "Only invited support staff can create an account.",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      {children}
    </ClerkProvider>
  );
}

export function AuthProviders({ children }: { children: ReactNode }) {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithWouter>{children}</ClerkProviderWithWouter>
    </WouterRouter>
  );
}

function RadarBrand() {
  return (
    <Link href="/" className="auth-brand" aria-label="RADAR home">
      <img src={`${basePath}/logo.svg`} alt="" />
      <span>
        <strong>RADAR</strong>
        <small>Student success insight</small>
      </span>
    </Link>
  );
}

export function PublicLanding() {
  return (
    <div className="auth-public-page">
      <header className="auth-public-nav">
        <RadarBrand />
        <Link href="/sign-in" className="btn btn-primary">
          Support team sign in <ArrowRight size={14} />
        </Link>
      </header>

      <main className="auth-public-content">
        <section className="auth-public-hero">
          <div className="auth-public-copy">
            <div className="eyebrow">RADAR · Early Warning System</div>
            <h1>Earlier support starts with a clearer view.</h1>
            <p>
              A student-support workspace concept for reviewing early signals,
              coordinating check-ins, and keeping people—not predictions—at the
              centre of decisions.
            </p>
            <div className="auth-public-actions">
              <Link href="/sign-in" className="btn btn-primary">
                Sign in as support staff <ArrowRight size={14} />
              </Link>
              <span className="staff-role">
                Invited support team members only
              </span>
            </div>
          </div>

          <div className="auth-public-visual" aria-hidden="true">
            <div className="auth-visual-top">
              <span>Support overview</span>
              <span className="auth-visual-status">
                <i /> Human-led review
              </span>
            </div>
            <div className="auth-visual-chart">
              {[38, 50, 44, 68, 58, 77, 63, 88, 72, 96, 81, 100].map(
                (height, index) => (
                  <span
                    className="auth-chart-bar"
                    key={index}
                    style={{ height: `${height}%` }}
                  />
                ),
              )}
            </div>
          </div>
        </section>

        <footer className="auth-public-foot">
          <ShieldCheck size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />
          This preview uses fictional demo records only. It is not connected to
          an institution or live student system.
        </footer>
      </main>
    </div>
  );
}

function AuthStory({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <aside className="auth-story">
      <RadarBrand />
      <div className="auth-story-copy">
        <div className="eyebrow">Support team access</div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="auth-story-foot">
        <ShieldCheck size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />
        Invitation-only access · fictional demo data
      </div>
    </aside>
  );
}

export function SignInPage() {
  return (
    <main className="auth-page">
      <AuthStory
        title="Support work, with context."
        subtitle="Sign in to review the RADAR prototype. Staff accounts are invited by an authorized team administrator."
      />
      <section className="auth-panel">
        <div className="auth-panel-inner">
          <div className="auth-panel-heading">
            <div className="eyebrow">Welcome back</div>
            <h1>Sign in to RADAR</h1>
            <p>Use the email address associated with your support-team invitation.</p>
          </div>
          <div className="auth-clerk-wrap">
            <SignIn
              routing="path"
              path={`${basePath}/sign-in`}
              signUpUrl={`${basePath}/sign-up`}
            />
          </div>
          <div className="auth-policy-note">
            Accounts are created by invitation only. If you need access, contact
            your RADAR support-team administrator.
          </div>
        </div>
      </section>
    </main>
  );
}

function InvitationRequired() {
  return (
    <main className="auth-message-page">
      <section className="auth-message-card">
        <RadarBrand />
        <div className="eyebrow" style={{ marginTop: 28 }}>
          Invitation required
        </div>
        <h1>Staff accounts are invite-only.</h1>
        <p>
          Use the unique link sent to your email invitation to create your
          support-team account. This page does not accept public registrations.
        </p>
        <div className="auth-message-actions">
          <Link href="/sign-in" className="btn btn-primary">
            Go to sign in <ArrowRight size={14} />
          </Link>
          <Link href="/" className="btn">
            Back to RADAR
          </Link>
        </div>
      </section>
    </main>
  );
}

export function InvitationSignUpPage() {
  const hasInvitationTicket = new URLSearchParams(window.location.search).has(
    "__clerk_ticket",
  );

  if (!hasInvitationTicket) {
    return <InvitationRequired />;
  }

  return (
    <main className="auth-page">
      <AuthStory
        title="Join the support team."
        subtitle="Complete your account using the invitation link sent to your email."
      />
      <section className="auth-panel">
        <div className="auth-panel-inner">
          <div className="auth-panel-heading">
            <div className="eyebrow">Invitation accepted</div>
            <h1>Create your account</h1>
            <p>Your invited email address will be linked to your staff access.</p>
          </div>
          <div className="auth-clerk-wrap">
            <SignUp
              routing="path"
              path={`${basePath}/sign-up`}
              signInUrl={`${basePath}/sign-in`}
            />
          </div>
        </div>
      </section>
    </main>
  );
}

export function HomeRedirect() {
  const { isLoaded, isSignedIn } = useUser();
  if (!isLoaded) return <AuthLoading />;
  return isSignedIn ? <Redirect to="/dashboard" /> : <PublicLanding />;
}

function AuthLoading() {
  return <div className="auth-loading" role="status">Loading RADAR access…</div>;
}

function AccessDenied() {
  const { signOut } = useClerk();

  return (
    <main className="auth-message-page">
      <section className="auth-message-card">
        <RadarBrand />
        <div className="eyebrow" style={{ marginTop: 28 }}>
          Access not approved
        </div>
        <h1>This account is not on the support team.</h1>
        <p>
          RADAR access is limited to invited staff accounts. Contact the team
          administrator if you believe this is a mistake.
        </p>
        <div className="auth-message-actions">
          <button
            className="btn btn-primary"
            onClick={() => void signOut({ redirectUrl: basePath || "/" })}
          >
            Sign out <LogOut size={14} />
          </button>
          <Link href="/" className="btn">Back to RADAR</Link>
        </div>
      </section>
    </main>
  );
}

export function RequireSupportAccess({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const [status, setStatus] = useState<"loading" | "allowed" | "denied" | "error">(
    "loading",
  );
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let active = true;
    setStatus("loading");

    getRadarAccess({ credentials: "include" })
      .then((access) => {
        if (active) {
          setStatus(
            access.role === "support_admin" || access.role === "support_member"
              ? "allowed"
              : "denied",
          );
        }
      })
      .catch((error: unknown) => {
        if (active) {
          const statusCode =
            error && typeof error === "object" && "status" in error
              ? Number(error.status)
              : 0;
          setStatus(statusCode === 401 || statusCode === 403 ? "denied" : "error");
        }
      });

    return () => {
      active = false;
    };
  }, [isLoaded, isSignedIn, user?.id, retry]);

  if (!isLoaded) return <AuthLoading />;
  if (!isSignedIn) return <Redirect to="/" />;
  if (status === "loading") return <AuthLoading />;
  if (status === "denied") return <AccessDenied />;
  if (status === "error") {
    return (
      <main className="auth-message-page">
        <section className="auth-message-card">
          <RadarBrand />
          <div className="eyebrow" style={{ marginTop: 28 }}>Access check</div>
          <h1>We couldn't verify your access.</h1>
          <p>Check your connection and try again. RADAR will not open the workspace until access is verified.</p>
          <button className="btn btn-primary" onClick={() => setRetry((count) => count + 1)}>
            Retry access check <ArrowRight size={14} />
          </button>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}

export function SupportAccountControls() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const label = user?.fullName || user?.primaryEmailAddress?.emailAddress || "Support staff";

  return (
    <div className="account-controls">
      <span className="account-controls-name" title={label}>{label}</span>
      <button
        className="account-signout"
        type="button"
        onClick={() => void signOut({ redirectUrl: basePath || "/" })}
        aria-label="Sign out"
      >
        <LogOut size={14} /> <span>Sign out</span>
      </button>
    </div>
  );
}

export function SupportSidebarProfile() {
  const { user } = useUser();
  const name = user?.fullName || user?.primaryEmailAddress?.emailAddress || "Support staff";
  const initials = (user?.firstName || user?.primaryEmailAddress?.emailAddress || "ST")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  const role = user?.publicMetadata?.radarRole === "support_admin"
    ? "Support team admin"
    : "Support team";

  return (
    <div className="staff-mini">
      <div className="avatar">{initials || "ST"}</div>
      <div style={{ minWidth: 0 }}>
        <div className="staff-name" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {name}
        </div>
        <div className="staff-role">{role}</div>
      </div>
    </div>
  );
}

type Invitation = Awaited<ReturnType<typeof listRadarInvitations>>[number];

export function SupportTeamInvitations() {
  const { user } = useUser();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const isAdmin = user?.publicMetadata?.radarRole === "support_admin";

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    setLoading(true);
    listRadarInvitations({ credentials: "include" })
      .then((items) => {
        if (active) {
          setInvitations(items);
          setError("");
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : "Could not load invitations.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isAdmin]);

  if (!isAdmin) return null;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSending(true);
    setError("");
    setNotice("");
    try {
      const invitation = await createRadarInvitation(
        { email: email.trim() },
        { credentials: "include" },
      );
      setInvitations((current) => [invitation, ...current]);
      setEmail("");
      setNotice("Invitation email sent. The recipient can create an account from that link.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not send this invitation.");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2 className="card-title">Support team access</h2>
          <div className="card-kicker">Invite staff members; public registration is disabled in the RADAR experience.</div>
        </div>
        <Users size={16} color="#729397" />
      </div>
      <form className="team-invite-form" onSubmit={submit}>
        <div className="field">
          <label htmlFor="support-invite-email">Staff email</label>
          <input
            id="support-invite-email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@university.edu"
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={sending}>
          <ArrowUpRight size={14} />
          {sending ? "Sending…" : "Send invitation"}
        </button>
      </form>
      {notice && (
        <div className="team-invite-error" style={{ color: "#347f76" }} role="status">
          <CheckCircle2 size={13} style={{ verticalAlign: "middle", marginRight: 5 }} />
          {notice}
        </div>
      )}
      {error && <div className="team-invite-error" role="alert">{error}</div>}
      <div className="team-invite-list">
        {loading ? (
          <div className="table-empty">Loading invitations…</div>
        ) : invitations.length ? (
          invitations.map((invitation) => (
            <div className="list-entry" key={invitation.id}>
              <div>
                <div className="entry-title">{invitation.email}</div>
                <div className="entry-sub">
                  Sent {new Date(String(invitation.createdAt)).toLocaleDateString()}
                </div>
              </div>
              <span className="tag">{invitation.status}</span>
            </div>
          ))
        ) : (
          <div className="table-empty">No team invitations yet.</div>
        )}
      </div>
      <div className="card-content">
        <div className="note-box">
          Invitations grant the support-team role after the recipient accepts
          the email link. Keep real student data out of this prototype.
        </div>
      </div>
    </section>
  );
}
