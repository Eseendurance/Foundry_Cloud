"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";

type Mode = "signup" | "login";
type Workspace = { id: string; name: string; role: "owner" | "admin" | "member" };
type Member = { email: string; role: Workspace["role"]; joinedAt: string };
type PaymentOrder = {
  id: string;
  amount_minor: number;
  currency: string;
  description: string;
  method: string;
  status: string;
  reference: string;
  proof_mime: string | null;
  canUploadProof: boolean;
  canConfirm: boolean;
};
type BankTransferInstructions = {
  bankName: string;
  accountName: string;
  accountNumber: string;
  reference: string;
};

export default function Account() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeOrganizationId, setActiveOrganizationId] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [invitationUrl, setInvitationUrl] = useState<string | null>(null);
  const [amountMinor, setAmountMinor] = useState("10000");
  const [currency, setCurrency] = useState("NGN");
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"PAYSTACK" | "BANK_TRANSFER">("PAYSTACK");
  const [activeTransfer, setActiveTransfer] = useState<BankTransferInstructions | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentEmail) return;
    void (async () => {
      try {
        const token =
          inviteToken || new URLSearchParams(window.location.hash.slice(1)).get("invite");
        const paymentId = new URLSearchParams(window.location.search).get("payment_id");
        const [teamResponse, ordersResponse] = await Promise.all([
          fetch("/api/organizations", { cache: "no-store" }),
          fetch("/api/payments", { cache: "no-store" }),
        ]);
        const teamData = await teamResponse.json();
        const ordersData = await ordersResponse.json();
        if (!teamResponse.ok) throw new Error(teamData.error || "Could not load workspace members.");
        if (!ordersResponse.ok) throw new Error(ordersData.error || "Could not load payment orders.");
        setMembers(teamData.members || []);
        setOrders(ordersData.orders || []);
        if (token) {
          const acceptance = await fetch("/api/auth/invitations/accept", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          });
          const acceptanceData = await acceptance.json();
          if (!acceptance.ok) throw new Error(acceptanceData.error || "Could not accept the invitation.");
          window.history.replaceState(null, "", "/account");
          router.refresh();
          setInviteToken("");
        }
        if (paymentId) {
          const verification = await fetch(`/api/payments/${encodeURIComponent(paymentId)}/verify`, {
            method: "POST",
          });
          const verificationData = await verification.json();
          if (!verification.ok) throw new Error(verificationData.error || "Could not verify payment.");
          window.history.replaceState(null, "", "/account");
          const latestOrders = await fetch("/api/payments", { cache: "no-store" });
          const latestData = await latestOrders.json();
          setOrders(latestData.orders || []);
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Could not load account details.");
      }
    })();
  }, [currentEmail, inviteToken, router]);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        const account = await response.json();
        if (account.user?.email) {
          setCurrentEmail(account.user.email);
          setWorkspaces(account.organizations || []);
          setActiveOrganizationId(account.activeOrganizationId || "");
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Could not load account details.");
      }
    })();
  }, []);

  async function reloadTeamAndOrders() {
    const [teamResponse, ordersResponse] = await Promise.all([
      fetch("/api/organizations", { cache: "no-store" }),
      fetch("/api/payments", { cache: "no-store" }),
    ]);
    const teamData = await teamResponse.json();
    const ordersData = await ordersResponse.json();
    if (!teamResponse.ok) throw new Error(teamData.error || "Could not refresh members.");
    if (!ordersResponse.ok) throw new Error(ordersData.error || "Could not refresh payments.");
    setMembers(teamData.members || []);
    setOrders(ordersData.orders || []);
  }

  async function createInvitation(event: FormEvent) {
    event.preventDefault();
    setBusyAction("invite");
    setError(null);
    try {
      const response = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create invitation.");
      setInvitationUrl(data.invitationUrl || null);
      setInviteEmail("");
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Could not create invitation.");
    } finally {
      setBusyAction(null);
    }
  }

  async function switchWorkspace(organizationId: string) {
    setBusyAction("workspace");
    setError(null);
    try {
      const response = await fetch("/api/auth/organization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not switch workspace.");
      setActiveOrganizationId(organizationId);
      setWorkspaces((current) =>
        current.map((workspace) =>
          workspace.id === organizationId ? { ...workspace, role: data.organization.role } : workspace
        )
      );
      await reloadTeamAndOrders();
      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Could not switch workspace.");
    } finally {
      setBusyAction(null);
    }
  }

  async function createPayment(event: FormEvent) {
    event.preventDefault();
    setBusyAction("payment");
    setError(null);
    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountMinor: Number(amountMinor),
          currency,
          description,
          method: paymentMethod,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create payment order.");
      if (data.bankTransfer) setActiveTransfer(data.bankTransfer);
      if (data.checkout?.checkoutUrl) {
        window.location.assign(data.checkout.checkoutUrl);
        return;
      }
      await reloadTeamAndOrders();
      setDescription("");
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Could not create payment order.");
    } finally {
      setBusyAction(null);
    }
  }

  async function uploadProof(orderId: string, file: File | undefined) {
    if (!file) return;
    setBusyAction(orderId);
    setError(null);
    try {
      const form = new FormData();
      form.set("proof", file);
      const response = await fetch(`/api/payments/${encodeURIComponent(orderId)}/proof`, {
        method: "POST",
        body: form,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not submit transfer proof.");
      await reloadTeamAndOrders();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Could not submit transfer proof.");
    } finally {
      setBusyAction(null);
    }
  }

  async function updatePayment(orderId: string, action: "verify" | "confirm" | "refund") {
    setBusyAction(orderId);
    setError(null);
    try {
      const response = await fetch(`/api/payments/${encodeURIComponent(orderId)}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: refundReason }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Could not ${action} payment.`);
      await reloadTeamAndOrders();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : `Could not ${action} payment.`);
    } finally {
      setBusyAction(null);
    }
  }

  async function signOut() {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (!response.ok) {
      setError("Could not sign out.");
      return;
    }
    setCurrentEmail(null);
    setWorkspaces([]);
    setMembers([]);
    setOrders([]);
    router.refresh();
  }

  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeOrganizationId);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, organizationName }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setLoading(false);
        return;
      }

      const invitationToken =
        inviteToken || new URLSearchParams(window.location.hash.slice(1)).get("invite") || "";
      if (invitationToken) {
        const invitationResponse = await fetch("/api/auth/invitations/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: invitationToken }),
        });
        const invitationData = await invitationResponse.json();
        if (!invitationResponse.ok) {
          setError(invitationData.error || "Could not accept the workspace invitation.");
          setLoading(false);
          return;
        }
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-6 py-12">
      <Link
        href="/dashboard"
        className="absolute left-6 top-6 flex items-center gap-2 text-sm text-ink-soft hover:text-ink"
      >
        <ArrowLeft size={16} />
        Back to workspace
      </Link>

      <div className="w-full max-w-4xl">
        {!currentEmail ? (
          <section className="mx-auto max-w-sm">
        <h1 className="font-display text-2xl text-ink">
          {mode === "signup" ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          {mode === "signup"
            ? "This stores a real row in a real Postgres database — the password is hashed, never stored as text."
            : "Log in to see the projects saved to your account."}
        </p>

        <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-full border border-line bg-paper px-5 py-3 text-sm focus:border-moss focus:outline-none focus:ring-2 focus:ring-moss/20"
          />
          {mode === "signup" && (
            <input
              type="text"
              maxLength={100}
              placeholder="Workspace name (optional)"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              className="w-full rounded-full border border-line bg-paper px-5 py-3 text-sm focus:border-moss focus:outline-none focus:ring-2 focus:ring-moss/20"
            />
          )}
          <input
            type="password"
            required
            minLength={8}
            placeholder="Password (min. 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-full border border-line bg-paper px-5 py-3 text-sm focus:border-moss focus:outline-none focus:ring-2 focus:ring-moss/20"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-moss px-5 py-3 text-sm font-medium text-paper hover:bg-moss-deep disabled:opacity-60"
          >
            {loading
              ? "One moment…"
              : mode === "signup"
              ? "Create account"
              : "Log in"}
          </button>
        </form>

        {inviteToken && (
          <p className="mt-4 rounded-xl border border-blue-300 bg-blue-50 p-3 text-sm text-blue-900">
            Sign in with the invited email to join the shared workspace.
          </p>
        )}

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-rust/30 bg-rust/5 p-3 text-sm text-rust">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <button
          onClick={() => {
            setMode(mode === "signup" ? "login" : "signup");
            setError(null);
          }}
          className="mt-6 text-sm text-ink-soft hover:text-ink"
        >
          {mode === "signup"
            ? "Already have an account? Log in"
            : "New here? Create an account"}
        </button>
            </section>
        ) : (
            <section className="space-y-8">
              <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-300 pb-5">
                <div>
                  <h1 className="text-2xl font-semibold text-slate-950">Account and workspace</h1>
                  <p className="mt-1 text-sm text-slate-600">{currentEmail}</p>
                </div>
                <button onClick={signOut} className="rounded border border-slate-300 px-4 py-2 text-sm">
                  Sign out
                </button>
              </header>

              <section className="grid gap-6 md:grid-cols-2">
                <div className="rounded-lg border border-slate-300 bg-white p-5">
                  <h2 className="font-semibold text-slate-950">Workspace access</h2>
                  <label className="mt-4 block text-xs font-medium text-slate-600" htmlFor="workspace-select">
                    Active workspace
                  </label>
                  <select
                    id="workspace-select"
                    value={activeOrganizationId}
                    onChange={(event) => void switchWorkspace(event.target.value)}
                    disabled={busyAction === "workspace"}
                    className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    {workspaces.map((workspace) => (
                      <option key={workspace.id} value={workspace.id}>
                        {workspace.name} · {workspace.role}
                      </option>
                    ))}
                  </select>
                  <h3 className="mt-5 text-sm font-medium text-slate-800">Members</h3>
                  <ul className="mt-2 divide-y divide-slate-200">
                    {members.map((member) => (
                      <li key={member.email} className="flex justify-between py-2 text-sm">
                        <span>{member.email}</span>
                        <span className="text-slate-500">{member.role}</span>
                      </li>
                    ))}
                  </ul>
                  {activeWorkspace?.role !== "member" && (
                    <form onSubmit={createInvitation} className="mt-5 space-y-2 border-t border-slate-200 pt-4">
                      <h3 className="text-sm font-medium text-slate-800">Invite a teammate</h3>
                      <input
                        type="email"
                        required
                        value={inviteEmail}
                        onChange={(event) => setInviteEmail(event.target.value)}
                        placeholder="teammate@example.com"
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                      />
                      <div className="flex gap-2">
                        <select
                          value={inviteRole}
                          onChange={(event) => setInviteRole(event.target.value as "admin" | "member")}
                          className="min-w-0 flex-1 rounded border border-slate-300 bg-white px-3 py-2 text-sm"
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button disabled={busyAction === "invite"} className="rounded bg-blue-700 px-4 py-2 text-sm text-white">
                          Create invite
                        </button>
                      </div>
                      {invitationUrl && (
                        <p className="break-all rounded bg-blue-50 p-3 text-xs text-blue-900">
                          Share this one-time link (expires in 7 days): {invitationUrl}
                        </p>
                      )}
                    </form>
                  )}
                </div>

                <div className="rounded-lg border border-slate-300 bg-white p-5">
                  <h2 className="font-semibold text-slate-950">Payment order</h2>
                  <p className="mt-1 text-xs text-slate-600">
                    Prices are entered in the currency&apos;s smallest unit (for NGN, kobo). Orders remain pending until provider or operator verification.
                  </p>
                  <form onSubmit={createPayment} className="mt-4 space-y-3">
                    <input
                      type="text"
                      maxLength={160}
                      required
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder="What is this order for?"
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        min={100}
                        max={1000000000}
                        step={1}
                        required
                        value={amountMinor}
                        onChange={(event) => setAmountMinor(event.target.value)}
                        aria-label="Amount in minor units"
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                      />
                      <input
                        type="text"
                        maxLength={3}
                        minLength={3}
                        required
                        value={currency}
                        onChange={(event) => setCurrency(event.target.value.toUpperCase())}
                        aria-label="Currency code"
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm uppercase"
                      />
                    </div>
                    <select
                      value={paymentMethod}
                      onChange={(event) => setPaymentMethod(event.target.value as "PAYSTACK" | "BANK_TRANSFER")}
                      className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="PAYSTACK">Paystack checkout</option>
                      <option value="BANK_TRANSFER">Bank transfer</option>
                    </select>
                    <button disabled={busyAction === "payment"} className="w-full rounded bg-blue-700 px-4 py-2.5 text-sm font-medium text-white">
                      {busyAction === "payment" ? "Creating order…" : "Create payment order"}
                    </button>
                  </form>
                  {activeTransfer && (
                    <div className="mt-4 space-y-1 rounded border border-blue-300 bg-blue-50 p-3 text-sm">
                      <p><strong>Bank:</strong> {activeTransfer.bankName}</p>
                      <p><strong>Account:</strong> {activeTransfer.accountName}</p>
                      <p><strong>Number:</strong> {activeTransfer.accountNumber}</p>
                      <p><strong>Reference:</strong> {activeTransfer.reference}</p>
                      <p className="pt-1 text-xs text-slate-700">Submit the transfer proof below. An admin other than the payer must confirm it.</p>
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-lg border border-slate-300 bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-semibold text-slate-950">Order history</h2>
                  <input
                    value={refundReason}
                    onChange={(event) => setRefundReason(event.target.value)}
                    placeholder="Refund reason (for admins)"
                    maxLength={160}
                    className="rounded border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <ul className="mt-3 divide-y divide-slate-200">
                  {orders.map((order) => (
                    <li key={order.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{order.description}</p>
                        <p className="mt-1 text-xs text-slate-600">
                          {order.amount_minor} {order.currency} minor units · {order.method} · {order.reference}
                        </p>
                        <p className="mt-1 font-mono text-xs text-slate-700">{order.status}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {order.status === "PENDING" && order.method === "PAYSTACK" && (
                          <button onClick={() => void updatePayment(order.id, "verify")} className="rounded border border-blue-700 px-3 py-2 text-xs text-blue-800">
                            Verify payment
                          </button>
                        )}
                        {order.canUploadProof && (
                          <label className="cursor-pointer rounded border border-slate-300 px-3 py-2 text-xs">
                            Upload transfer proof
                            <input
                              type="file"
                              accept="image/png,image/jpeg,application/pdf"
                              className="sr-only"
                              onChange={(event) => void uploadProof(order.id, event.target.files?.[0])}
                            />
                          </label>
                        )}
                        {order.proof_mime && (
                          <a href={`/api/payments/${encodeURIComponent(order.id)}/proof`} target="_blank" rel="noreferrer" className="rounded border border-slate-300 px-3 py-2 text-xs">
                            View proof
                          </a>
                        )}
                        {order.canConfirm && (
                          <button onClick={() => void updatePayment(order.id, "confirm")} className="rounded border border-blue-700 px-3 py-2 text-xs text-blue-800">
                            Confirm transfer
                          </button>
                        )}
                        {order.status === "PAID" && order.method === "PAYSTACK" && activeWorkspace?.role !== "member" && (
                          <button onClick={() => void updatePayment(order.id, "refund")} disabled={!refundReason.trim()} className="rounded border border-slate-400 px-3 py-2 text-xs disabled:opacity-40">
                            Request refund
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                  {orders.length === 0 && <li className="py-5 text-sm text-slate-500">No payment orders yet.</li>}
                </ul>
              </section>
            </section>
        )}

        {error && (
            <div className="mx-auto mt-5 flex max-w-4xl items-start gap-2 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-900">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
        )}
      </div>
    </div>
  );
}
