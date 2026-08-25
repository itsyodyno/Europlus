"use client";

import type { Session } from "@supabase/supabase-js";
import { FormEvent, useEffect, useMemo, useState } from "react";
import LoginPanel, { PasswordRecoveryPanel } from "./login-panel";
import { isSupabaseConfigured, supabase } from "./supabase";

type View = "command" | "inquiries" | "pi" | "orders" | "payments" | "accounts" | "expenses" | "production" | "activity";
type Tone = "red" | "amber" | "green" | "blue" | "grey" | "purple";
type TeamProfile = {
  full_name: string;
  role: "director" | "administrator" | "inquiry_lead" | "coordinator" | "assistant" | "team_member";
};

const nav: { id: View; index: string; label: string; count?: number }[] = [
  { id: "command", index: "01", label: "Command centre" },
  { id: "inquiries", index: "02", label: "Inquiries", count: 6 },
  { id: "pi", index: "03", label: "PI & approvals", count: 3 },
  { id: "orders", index: "04", label: "Orders" },
  { id: "payments", index: "05", label: "Payments", count: 4 },
  { id: "accounts", index: "06", label: "Accounts ledger" },
  { id: "expenses", index: "07", label: "Local expenses" },
  { id: "production", index: "08", label: "Production", count: 3 },
  { id: "activity", index: "09", label: "Activity" },
];

const inquirySeed = [
  { id: "INQ-260824-07", item: "Electric kettle · EP-802", source: "WeChat · 10:42", owner: "Max", deadline: "Today, 4:00 PM", stage: "PI draft", tone: "amber" as Tone, age: "2h", note: "Confirm 220V plug and 40HQ quantity." },
  { id: "INQ-260824-06", item: "EP-218K slow juicer", source: "WeChat · 09:18", owner: "Laura", deadline: "Tomorrow", stage: "Factory quotation", tone: "blue" as Tone, age: "5h", note: "Two factories invited to quote." },
  { id: "INQ-260823-04", item: "EP-316 smart blender", source: "WeChat · Yesterday", owner: "Hemansh", deadline: "Today, 6:00 PM", stage: "Client clarification", tone: "purple" as Tone, age: "1d", note: "Waiting for artwork colour confirmation." },
  { id: "INQ-260822-09", item: "5 KVA stabilizer", source: "WeChat · 22 Aug", owner: "Unassigned", deadline: "Overdue", stage: "Needs owner", tone: "red" as Tone, age: "2d", note: "No team member has accepted ownership." },
];

const piRows = [
  { id: "PI-EP-26081", inquiry: "INQ-260824-07", product: "Electric kettle · EP-802", owner: "Max", value: "$48,600", version: "V2", status: "Draft in review", tone: "amber" as Tone, updated: "31 min ago" },
  { id: "PI-EP-26078", inquiry: "INQ-260823-04", product: "EP-316 smart blender", owner: "Hemansh", value: "$72,450", version: "V3", status: "With client", tone: "blue" as Tone, updated: "Yesterday" },
  { id: "PI-EP-26074", inquiry: "INQ-260821-02", product: "Diesel generator · 2 HQ", owner: "Laura", value: "$186,000", version: "V1", status: "Approved", tone: "green" as Tone, updated: "22 Aug" },
];

const orders = [
  { id: "RB-3657", item: "VIDAA LED TV · 8 HQ", supplier: "MCTV", owner: "Laura", value: "$612,800", payment: "Advance paid", paymentTone: "green" as Tone, production: "Panel assembly", completion: 64, target: "12 Sep 2026", tracker: "Not ready" },
  { id: "RB-3656", item: "Refrigerator · 2 HQ", supplier: "Ryla", owner: "Hemansh", value: "$184,320", payment: "Advance overdue", paymentTone: "red" as Tone, production: "Waiting for advance", completion: 8, target: "26 Sep 2026", tracker: "Not ready" },
  { id: "RB-3646", item: "Soundbar speaker · 1 HQ", supplier: "K068", owner: "Max", value: "$76,540", payment: "Balance pending", paymentTone: "amber" as Tone, production: "Final inspection", completion: 91, target: "28 Aug 2026", tracker: "Booking needed" },
  { id: "RB-3643", item: "EUROPLUS refrigerator · 2 HQ", supplier: "Angel", owner: "Laura", value: "$169,800", payment: "Advance paid", paymentTone: "green" as Tone, production: "Artwork", completion: 33, target: "04 Oct 2026", tracker: "Not ready" },
];

const paymentRows = [
  { id: "PAY-260824-04", order: "RB-3656", supplier: "Ryla Refrigeration", amount: "¥180,000", type: "30% advance", requested: "23 Aug · 3:24 PM", due: "Overdue by 1 day", priority: "Urgent", tone: "red" as Tone, narration: "Advance for 2HQ EUROPLUS refrigerator. Order RB-3656." },
  { id: "PAY-260824-03", order: "RB-3646", supplier: "K068 Audio", amount: "¥96,400", type: "Balance payment", requested: "Today · 10:16 AM", due: "Before 4:00 PM", priority: "Today", tone: "amber" as Tone, narration: "Balance against soundbar order after inspection approval." },
  { id: "PAY-260824-02", order: "RB-3657", supplier: "MCTV", amount: "¥208,800", type: "Second instalment", requested: "Today · 9:05 AM", due: "25 Aug", priority: "Scheduled", tone: "blue" as Tone, narration: "Production instalment for VIDAA LED TV 8HQ." },
  { id: "PAY-260823-11", order: "RB-3643", supplier: "Angel Appliances", amount: "¥112,600", type: "Artwork deposit", requested: "Yesterday · 11:20 AM", due: "Today", priority: "Today", tone: "amber" as Tone, narration: "Artwork and material deposit for EUROPLUS refrigerators." },
];

const expenses = [
  { id: "EXP-260824-18", order: "RB-3646", category: "Trucking", detail: "Factory to Shenzhen warehouse", owner: "Hemansh", amount: "¥3,200", status: "Paid", tone: "green" as Tone, date: "24 Aug" },
  { id: "EXP-260824-17", order: "RB-3657", category: "Customs", detail: "CIQ documentation and filing", owner: "Max", amount: "¥1,850", status: "Needs receipt", tone: "red" as Tone, date: "24 Aug" },
  { id: "EXP-260823-13", order: "General", category: "Sample courier", detail: "Kettle samples to client", owner: "Laura", amount: "¥680", status: "Recorded", tone: "blue" as Tone, date: "23 Aug" },
  { id: "EXP-260822-09", order: "RB-3643", category: "Inspection", detail: "Pre-production sample check", owner: "Hemansh", amount: "¥1,200", status: "Paid", tone: "green" as Tone, date: "22 Aug" },
];

const accountRows = [
  { date: "24 Aug", ref: "ACC-260824-04", order: "RB-3656", narration: "Supplier advance · Ryla Refrigeration", debit: "¥180,000", credit: "—", balance: "¥1,246,800", by: "Jimmy" },
  { date: "24 Aug", ref: "ACC-260824-03", order: "RB-3646", narration: "Balance payment · K068 Audio", debit: "¥96,400", credit: "—", balance: "¥1,426,800", by: "Jimmy" },
  { date: "23 Aug", ref: "ACC-260823-11", order: "GENERAL", narration: "Operating funds received", debit: "—", credit: "¥500,000", balance: "¥1,523,200", by: "Hemansh" },
  { date: "22 Aug", ref: "ACC-260822-09", order: "RB-3643", narration: "Artwork and material deposit · Angel", debit: "¥112,600", credit: "—", balance: "¥1,023,200", by: "Jimmy" },
];

const productionRows = [
  { order: "RB-3657", item: "VIDAA LED TV · 8 HQ", owner: "Laura", stage: "Panel assembly", progress: 64, next: "Cabinet photos & quantity report", due: "Tomorrow", tone: "amber" as Tone, update: "Factory update 6h ago" },
  { order: "RB-3646", item: "Soundbar speaker · 1 HQ", owner: "Max", stage: "Final inspection", progress: 91, next: "Inspection report + booking request", due: "Today", tone: "red" as Tone, update: "Last update yesterday" },
  { order: "RB-3643", item: "EUROPLUS refrigerator · 2 HQ", owner: "Laura", stage: "Artwork approval", progress: 33, next: "Approve master carton artwork", due: "26 Aug", tone: "blue" as Tone, update: "Client revision received" },
  { order: "RB-4193", item: "Steam iron · 3 factories", owner: "Hemansh", stage: "Material purchase", progress: 22, next: "Align colour across factories", due: "28 Aug", tone: "grey" as Tone, update: "Factory call 2h ago" },
];

const activities = [
  { time: "11:48", initials: "MX", text: "Max uploaded PI V2 for electric kettle", ref: "INQ-260824-07", type: "PI" },
  { time: "11:21", initials: "HS", text: "Hemansh requested advance payment", ref: "RB-3656 · ¥180,000", type: "Payment" },
  { time: "10:57", initials: "LR", text: "Laura added factory production photos", ref: "RB-3657 · 6 files", type: "Production" },
  { time: "10:16", initials: "MX", text: "Max requested balance payment", ref: "RB-3646 · ¥96,400", type: "Payment" },
  { time: "09:42", initials: "HS", text: "Hemansh assigned new WeChat inquiry to Laura", ref: "INQ-260824-06", type: "Inquiry" },
  { time: "Yesterday", initials: "LR", text: "Laura recorded client approval on PI V1", ref: "PI-EP-26074", type: "Approval" },
];

const viewMeta: Record<View, { eyebrow: string; title: string; description: string }> = {
  command: { eyebrow: "COMMAND CENTRE", title: "One view. Every handoff.", description: "Live ownership, deadlines and exceptions across the EUROPLUS account." },
  inquiries: { eyebrow: "INQUIRY CONTROL", title: "Nothing stays buried in WeChat.", description: "Capture, assign and trace every client request from first message to PI." },
  pi: { eyebrow: "PI & APPROVALS", title: "One controlled version trail.", description: "Know which PI is current, who has it, and what the client confirmed." },
  orders: { eyebrow: "CONFIRMED ORDERS", title: "Commercial truth in one place.", description: "Payment, production and shipment readiness for every active order." },
  payments: { eyebrow: "PAYMENT DESK", title: "One queue for the payment window.", description: "Prioritised factory requests with narration, due time and proof." },
  accounts: { eyebrow: "RESTRICTED ACCOUNTS", title: "The financial ledger stays private.", description: "Only Jimmy and Hemansh can view or amend account-level transactions." },
  expenses: { eyebrow: "LOCAL RMB LEDGER", title: "Small payments, fully traceable.", description: "Trucking, customs, inspection and local costs against the correct order." },
  production: { eyebrow: "PRODUCTION FOLLOW-UP", title: "Updates before they become delays.", description: "Milestones, next actions, photos and due dates for each factory order." },
  activity: { eyebrow: "AUDIT TRAIL", title: "The shared memory of the account.", description: "Every assignment, approval, payment and status change in time order." },
};

function Badge({ children, tone = "grey" }: { children: React.ReactNode; tone?: Tone }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

function Avatar({ name }: { name: string }) {
  const initials = name === "Unassigned" ? "?" : name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return <span className={`avatar ${name === "Unassigned" ? "unassigned" : ""}`}>{initials}</span>;
}

export default function Home() {
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const [session, setSession] = useState<Session | null>(null);
  const [recoveringPassword, setRecoveringPassword] = useState(false);
  const [demoPreview, setDemoPreview] = useState(false);
  const [profile, setProfile] = useState<TeamProfile | null>(null);
  const [view, setView] = useState<View>("command");
  const [query, setQuery] = useState("");
  const [newInquiryOpen, setNewInquiryOpen] = useState(false);
  const [trackerOrder, setTrackerOrder] = useState<(typeof orders)[number] | null>(null);
  const [paid, setPaid] = useState<string[]>([]);
  const [doneTasks, setDoneTasks] = useState<string[]>([]);
  const [toast, setToast] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [inquiries, setInquiries] = useState(inquirySeed);

  useEffect(() => {
    if (!supabase) return;

    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setAuthReady(true);
    });

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "PASSWORD_RECOVERY") setRecoveringPassword(true);
      setSession(nextSession);
      setAuthReady(true);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabase || !session?.user.id) {
      setProfile(null);
      return;
    }

    let active = true;
    void supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setProfile(data as TeamProfile | null);
      });

    return () => {
      active = false;
    };
  }, [session]);

  const displayName =
    (demoPreview ? "Hemansh" : profile?.full_name) ||
    String(session?.user.user_metadata?.full_name || "") ||
    session?.user.email?.split("@")[0] ||
    "Team member";
  const roleLabel: Record<TeamProfile["role"], string> = {
    director: "Director",
    administrator: "Administrator",
    inquiry_lead: "Inquiry lead",
    coordinator: "Operations coordinator",
    assistant: "Inquiry assistant",
    team_member: "Team member",
  };
  const currentRole = demoPreview ? "administrator" : profile?.role ?? "team_member";
  const canAccessAccounts = currentRole === "director" || currentRole === "administrator";
  const profileInitials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const switchView = (next: View) => {
    if (next === "accounts" && !canAccessAccounts) {
      notify("Accounts ledger access is limited to Jimmy and Hemansh.");
      return;
    }
    setView(next);
    setMobileNav(false);
  };

  const signOut = async () => {
    if (demoPreview) {
      setDemoPreview(false);
      setView("command");
      return;
    }
    await supabase?.auth.signOut();
    setView("command");
  };

  const addInquiry = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const item = String(form.get("product") || "New EUROPLUS inquiry");
    const owner = String(form.get("owner") || "Unassigned");
    const nextNumber = String(inquiries.length + 8).padStart(2, "0");
    setInquiries((current) => [{
      id: `INQ-260824-${nextNumber}`,
      item,
      source: "WeChat · just now",
      owner,
      deadline: String(form.get("deadline") || "Tomorrow"),
      stage: owner === "Unassigned" ? "Needs owner" : "New",
      tone: owner === "Unassigned" ? "red" : "blue",
      age: "Now",
      note: String(form.get("details") || "New inquiry captured from WeChat."),
    }, ...current]);
    setNewInquiryOpen(false);
    setView("inquiries");
    notify("Inquiry captured and visible to the team.");
  };

  const filteredInquiries = useMemo(() => {
    const needle = query.toLowerCase().trim();
    if (!needle) return inquiries;
    return inquiries.filter((item) => [item.id, item.item, item.owner, item.stage].join(" ").toLowerCase().includes(needle));
  }, [inquiries, query]);

  const copyNarration = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      notify("Narration copied for Redberry | Accounts.");
    } catch {
      notify("Narration is ready to copy.");
    }
  };

  const header = viewMeta[view];

  if (!authReady) {
    return (
      <main className="auth-loading" role="status">
        <img src="/europlus-logo-red.png" alt="EUROPLUS" />
        <span>Opening your secure workspace…</span>
      </main>
    );
  }

  if ((!isSupabaseConfigured || !session) && !demoPreview) {
    return <LoginPanel onPreview={process.env.NODE_ENV === "development" ? () => setDemoPreview(true) : undefined} />;
  }

  if (recoveringPassword) {
    return <PasswordRecoveryPanel onComplete={() => setRecoveringPassword(false)} />;
  }

  const Dashboard = () => (
    <>
      <div className="alert-bar"><span>4 actions need attention</span><p>2 advances overdue · 1 PI waiting for client · 1 production update due</p><button onClick={() => switchView("payments")}>Review now →</button></div>
      <div className="section-heading"><div><p>{header.eyebrow}</p><h2>{header.title}</h2><small>{header.description}</small></div><span className="live"><i /> Live team view</span></div>
      <div className="metrics">
        <article onClick={() => switchView("inquiries")}><span>OPEN INQUIRIES</span><strong>12</strong><p><b>6</b> unassigned or due today</p></article>
        <article onClick={() => switchView("pi")}><span>PI AWAITING APPROVAL</span><strong>5</strong><p>Oldest waiting <b>3 days</b></p></article>
        <article className="critical" onClick={() => switchView("payments")}><span>PAYMENTS TO RELEASE</span><strong>¥ 486,200</strong><p><b>2 overdue</b> · next window 3:30 PM</p></article>
        <article onClick={() => switchView("production")}><span>ACTIVE PRODUCTION</span><strong>9</strong><p>3 updates due this week</p></article>
      </div>
      <div className="content-grid">
        <section className="panel work-queue">
          <div className="panel-head"><div><p>TEAM WORK QUEUE</p><h3>What is moving now</h3></div><button onClick={() => switchView("orders")}>View all 32 →</button></div>
          <div className="queue-header"><span>REFERENCE & ITEM</span><span>OWNER</span><span>STAGE</span><span>AGE</span><span /></div>
          {inquiries.slice(0, 1).map((row) => <button className="queue-row" key={row.id} onClick={() => switchView("inquiries")}>
            <span><strong>{row.id}</strong><small>{row.item}</small></span><span className="owner"><Avatar name={row.owner} />{row.owner}</span><span><Badge tone={row.tone}>{row.stage}</Badge></span><span>{row.age}</span><span>›</span>
          </button>)}
          {orders.slice(0, 3).map((row) => <button className="queue-row" key={row.id} onClick={() => switchView("orders")}>
            <span><strong>{row.id}</strong><small>{row.item}</small></span><span className="owner"><Avatar name={row.owner} />{row.owner}</span><span><Badge tone={row.paymentTone}>{row.production}</Badge></span><span>{row.id === "RB-3656" ? "1d" : row.id === "RB-3657" ? "18d" : "31d"}</span><span>›</span>
          </button>)}
        </section>
        <aside className="panel next-actions">
          <div className="panel-head"><div><p>MY NEXT ACTIONS</p><h3>Before 4:00 PM</h3></div><span>{4 - doneTasks.length}</span></div>
          {[
            ["pay", "Release advance · RB-3656", "¥180,000 · requested yesterday", "OVERDUE"],
            ["pi", "Send revised PI to WeChat", "INQ-260824-07 · kettle", ""],
            ["photos", "Get production photos", "RB-3657 · VIDAA LED TV", ""],
            ["receipt", "Attach customs receipt", "RB-3657 · ¥1,850", ""],
          ].map(([id, title, detail, flag]) => <label className={doneTasks.includes(id) ? "done" : ""} key={id}>
            <input type="checkbox" checked={doneTasks.includes(id)} onChange={() => setDoneTasks((current) => current.includes(id) ? current.filter((task) => task !== id) : [...current, id])} />
            <span><strong>{title}</strong><small>{detail}</small></span>{flag && <b>{flag}</b>}
          </label>)}
          <button className="quiet" onClick={() => switchView("activity")}>Open full activity →</button>
        </aside>
      </div>
      <div className="flow-strip">
        <div><p>THE CONTROL LOOP</p><h3>One record moves forward—no repeated retyping.</h3></div>
        {["WeChat inquiry", "Assigned owner", "PI approved", "Advance paid", "Production", "Tracker handoff"].map((step, index) => <span key={step}><b>{index + 1}</b>{step}{index < 5 && <i>→</i>}</span>)}
      </div>
    </>
  );

  const Inquiries = () => (
    <>
      <div className="section-heading page-title"><div><p>{header.eyebrow}</p><h2>{header.title}</h2><small>{header.description}</small></div><button className="primary" onClick={() => setNewInquiryOpen(true)}>＋ Capture inquiry</button></div>
      <div className="mini-metrics"><article><span>NEW TODAY</span><strong>4</strong></article><article><span>NEEDS OWNER</span><strong className="red-text">1</strong></article><article><span>QUOTATION DUE</span><strong>3</strong></article><article><span>CONVERTED THIS MONTH</span><strong>68%</strong></article></div>
      <section className="panel table-panel">
        <div className="toolbar"><div className="tabs"><button className="active">All inquiries</button><button>Mine</button><button>Unassigned</button><button>Overdue</button></div><label className="inline-search">⌕<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search inquiry" /></label></div>
        <div className="inquiry-grid table-head"><span>REFERENCE & REQUEST</span><span>OWNER</span><span>DEADLINE</span><span>STATUS</span><span>LAST NOTE</span><span /></div>
        {filteredInquiries.map((row) => <div className="inquiry-grid table-row" key={row.id}>
          <span><strong>{row.id}</strong><small>{row.item}</small><em>{row.source}</em></span>
          <span className="owner"><Avatar name={row.owner} /><b>{row.owner}</b></span>
          <span className={row.deadline === "Overdue" ? "red-text" : ""}>{row.deadline}</span>
          <span><Badge tone={row.tone}>{row.stage}</Badge></span>
          <span className="wrap">{row.note}</span>
          <button className="row-action" onClick={() => notify(`${row.id} opened.`)}>›</button>
        </div>)}
      </section>
      <div className="rule-card"><span>RULE 01</span><div><strong>Every WeChat inquiry gets an ID, owner and response deadline.</strong><p>If unassigned for 30 minutes or untouched for 24 hours, it appears in the attention queue.</p></div><Badge tone="green">Automatic alert</Badge></div>
    </>
  );

  const PiApprovals = () => (
    <>
      <div className="section-heading page-title"><div><p>{header.eyebrow}</p><h2>{header.title}</h2><small>{header.description}</small></div><button className="secondary" onClick={() => notify("PI template flow opened.")}>＋ Create PI from inquiry</button></div>
      <div className="approval-board">
        {[
          ["DRAFT / INTERNAL", piRows.filter((row) => row.status.includes("Draft"))],
          ["WITH CLIENT", piRows.filter((row) => row.status === "With client")],
          ["APPROVED", piRows.filter((row) => row.status === "Approved")],
        ].map(([column, rows]) => <section className="kanban-column" key={String(column)}>
          <div className="kanban-head"><span>{String(column)}</span><b>{(rows as typeof piRows).length}</b></div>
          {(rows as typeof piRows).map((row) => <article className="pi-card" key={row.id}>
            <div><Badge tone={row.tone}>{row.status}</Badge><em>{row.version}</em></div>
            <h3>{row.product}</h3><p>{row.id} · from {row.inquiry}</p>
            <dl><div><dt>VALUE</dt><dd>{row.value}</dd></div><div><dt>OWNER</dt><dd>{row.owner}</dd></div></dl>
            <footer><span>Updated {row.updated}</span><button onClick={() => notify(row.status === "Approved" ? "Order creation is ready." : "PI version opened.")}>{row.status === "Approved" ? "Create order →" : "Open PI →"}</button></footer>
          </article>)}
          {(rows as typeof piRows).length === 0 && <div className="empty-column">No PI at this stage</div>}
        </section>)}
      </div>
      <div className="rule-card"><span>RULE 02</span><div><strong>Only one PI version is marked “Current”.</strong><p>Client confirmation is recorded with date, WeChat proof and the exact version approved.</p></div><Badge tone="blue">Version control</Badge></div>
    </>
  );

  const Orders = () => (
    <>
      <div className="section-heading page-title"><div><p>{header.eyebrow}</p><h2>{header.title}</h2><small>{header.description}</small></div><button className="secondary" onClick={() => notify("Order export prepared.")}>⇩ Export orders</button></div>
      <section className="panel table-panel">
        <div className="toolbar"><div className="tabs"><button className="active">Active orders</button><button>Payment risk</button><button>Shipment ready</button></div><button className="filter-button">☷ Filter</button></div>
        <div className="orders-grid table-head"><span>ORDER & PRODUCT</span><span>SUPPLIER / OWNER</span><span>ORDER VALUE</span><span>PAYMENT</span><span>PRODUCTION</span><span>TARGET</span><span>CONTAINER TRACKER</span></div>
        {orders.map((row) => <div className="orders-grid table-row" key={row.id}>
          <span><strong>{row.id}</strong><small>{row.item}</small></span>
          <span><b>{row.supplier}</b><small className="owner-line"><Avatar name={row.owner} />{row.owner}</small></span>
          <span className="money">{row.value}</span>
          <span><Badge tone={row.paymentTone}>{row.payment}</Badge></span>
          <span><b>{row.production}</b><small className="progress"><i style={{ width: `${row.completion}%` }} /></small><em>{row.completion}%</em></span>
          <span>{row.target}</span>
          <span><button className="tracker-button" onClick={() => setTrackerOrder(row)}>{row.tracker} ↗</button></span>
        </div>)}
      </section>
      <div className="integration-card">
        <span className="integration-icon">CT</span><div><p>SEPARATE, CONNECTED PANEL</p><h3>Container Tracker receives the order only when shipment work begins.</h3><small>EUROPLUS stays the system for inquiry, PI, payments and production. Container Tracker stays the system for booking, loading, sailing and arrival.</small></div><button onClick={() => setTrackerOrder(orders[2])}>See handoff design →</button>
      </div>
    </>
  );

  const Payments = () => (
    <>
      <div className="section-heading page-title"><div><p>{header.eyebrow}</p><h2>{header.title}</h2><small>{header.description}</small></div><button className="primary" onClick={() => notify("Payment request form opened.")}>＋ Request payment</button></div>
      <div className="payment-summary"><article><span>WAITING TO RELEASE</span><strong>¥598,400</strong><small>4 requests</small></article><article><span>OVERDUE</span><strong className="red-text">¥180,000</strong><small>1 factory advance</small></article><article><span>NEXT PAYMENT WINDOW</span><strong>3:30 PM</strong><small>in 2 hours 14 min</small></article><article><span>PAID THIS MONTH</span><strong>¥1.84m</strong><small>19 transactions</small></article></div>
      <div className="payment-layout">
        <section className="payment-stack">
          {paymentRows.map((row) => {
            const released = paid.includes(row.id);
            return <article className={`payment-card ${released ? "released" : ""}`} key={row.id}>
              <div className="priority-line"><Badge tone={released ? "green" : row.tone}>{released ? "Released" : row.priority}</Badge><span>{row.id} · requested {row.requested}</span></div>
              <div className="payment-main"><div><p>{row.order}</p><h3>{row.supplier}</h3><small>{row.type}</small></div><strong>{row.amount}</strong></div>
              <p className="narration">{row.narration}</p>
              <footer><span className={row.tone === "red" && !released ? "red-text" : ""}>{released ? "Payment proof recorded" : row.due}</span><div><button onClick={() => copyNarration(`${row.amount} — ${row.narration}`)}>Copy narration</button><button className="pay-action" disabled={released} onClick={() => { setPaid((current) => [...current, row.id]); notify(`${row.id} marked released.`); }}>{released ? "Paid ✓" : "Mark released"}</button></div></footer>
            </article>;
          })}
        </section>
        <aside className="payment-window panel">
          <div className="panel-head"><div><p>TODAY</p><h3>Payment window</h3></div><span className="live"><i /> Available</span></div>
          <div className="window-time"><strong>3:30–4:15 PM</strong><small>Accounts operator · online window</small></div>
          <ol><li><b>1</b><span>Requests auto-sorted by urgency and due time.</span></li><li><b>2</b><span>Narration is complete before it reaches Accounts.</span></li><li><b>3</b><span>Proof and paid time close the loop for everyone.</span></li></ol>
          <div className="window-note"><strong>No more repeated reposting.</strong><p>Overdue requests remain pinned until released or rejected with a reason.</p></div>
        </aside>
      </div>
    </>
  );

  const Expenses = () => (
    <>
      <div className="section-heading page-title"><div><p>{header.eyebrow}</p><h2>{header.title}</h2><small>{header.description}</small></div><button className="primary" onClick={() => notify("Local expense form opened.")}>＋ Add RMB expense</button></div>
      <div className="mini-metrics"><article><span>AUGUST SPEND</span><strong>¥42,680</strong></article><article><span>MISSING RECEIPTS</span><strong className="red-text">3</strong></article><article><span>TRUCKING</span><strong>¥21,400</strong></article><article><span>CUSTOMS & INSPECTION</span><strong>¥13,850</strong></article></div>
      <section className="panel table-panel">
        <div className="toolbar"><div className="tabs"><button className="active">All expenses</button><button>Missing receipt</button><button>By order</button></div><button className="secondary compact" onClick={() => notify("Expense report prepared.")}>⇩ Export ledger</button></div>
        <div className="expense-grid table-head"><span>DATE / ID</span><span>AGAINST ORDER</span><span>CATEGORY & DESCRIPTION</span><span>RECORDED BY</span><span>AMOUNT</span><span>STATUS</span></div>
        {expenses.map((row) => <div className="expense-grid table-row" key={row.id}>
          <span><strong>{row.date}</strong><small>{row.id}</small></span><span><b>{row.order}</b></span><span><b>{row.category}</b><small>{row.detail}</small></span><span className="owner"><Avatar name={row.owner} />{row.owner}</span><span className="money">{row.amount}</span><span><Badge tone={row.tone}>{row.status}</Badge></span>
        </div>)}
      </section>
      <div className="rule-card"><span>RULE 03</span><div><strong>Every RMB payment belongs to an order or “General”.</strong><p>Category, payer, date and receipt are mandatory. Missing receipts stay visible until attached.</p></div><Badge tone="amber">Expense control</Badge></div>
    </>
  );

  const Accounts = () => (
    <>
      <div className="section-heading page-title">
        <div><p>{header.eyebrow}</p><h2>{header.title}</h2><small>{header.description}</small></div>
        <button className="primary" onClick={() => notify("Manual transaction form opened.")}>＋ Record transaction</button>
      </div>
      <div className="accounts-lock-note">
        <span>PRIVATE</span>
        <div><strong>Visible only to Jimmy and Hemansh</strong><p>Payment requests and factory proofs remain visible in Payments. This ledger contains the restricted account-level record.</p></div>
        <b>◆ Secured by Supabase</b>
      </div>
      <div className="mini-metrics accounts-summary">
        <article><span>AVAILABLE BALANCE</span><strong>¥1,246,800</strong></article>
        <article><span>PAID THIS MONTH</span><strong>¥1.84m</strong></article>
        <article><span>WAITING TO POST</span><strong className="red-text">4</strong></article>
        <article><span>LAST RECONCILED</span><strong>23 Aug</strong></article>
      </div>
      <section className="panel table-panel accounts-table">
        <div className="toolbar"><div className="tabs"><button className="active">Manual ledger</button><button>Supplier advances</button><button>Balances</button></div><button className="secondary compact" onClick={() => notify("Restricted ledger export prepared.")}>⇩ Export ledger</button></div>
        <div className="account-grid table-head"><span>DATE / REFERENCE</span><span>ORDER</span><span>NARRATION</span><span>DEBIT</span><span>CREDIT</span><span>RUNNING BALANCE</span><span>RECORDED BY</span></div>
        {accountRows.map((row) => <div className="account-grid table-row" key={row.ref}>
          <span><strong>{row.date}</strong><small>{row.ref}</small></span><span><b>{row.order}</b></span><span className="wrap">{row.narration}</span><span className="money">{row.debit}</span><span className="money green-text">{row.credit}</span><span className="money"><b>{row.balance}</b></span><span className="owner"><Avatar name={row.by} />{row.by}</span>
        </div>)}
      </section>
    </>
  );

  const Production = () => (
    <>
      <div className="section-heading page-title"><div><p>{header.eyebrow}</p><h2>{header.title}</h2><small>{header.description}</small></div><button className="secondary" onClick={() => notify("Production update form opened.")}>＋ Add factory update</button></div>
      <div className="production-board">
        {productionRows.map((row) => <article className="production-card" key={row.order}>
          <header><div><Badge tone={row.tone}>{row.due}</Badge><p>{row.order}</p></div><Avatar name={row.owner} /></header>
          <h3>{row.item}</h3><small>{row.update}</small>
          <div className="stage-line"><span>Current stage</span><strong>{row.stage}</strong></div>
          <div className="large-progress"><i style={{ width: `${row.progress}%` }} /></div><div className="progress-label"><span>Order progress</span><b>{row.progress}%</b></div>
          <div className="next-step"><span>NEXT REQUIRED UPDATE</span><strong>{row.next}</strong></div>
          <footer><button onClick={() => notify(`${row.order} timeline opened.`)}>Open timeline</button><button onClick={() => notify("WeChat update text copied.")}>Copy client update</button></footer>
        </article>)}
      </div>
      <div className="milestone-legend"><p>STANDARD MILESTONES</p>{["Advance released", "Artwork", "Materials", "Assembly", "Inspection", "Ready to ship"].map((step, i) => <span key={step}><b>{i + 1}</b>{step}</span>)}</div>
    </>
  );

  const Activity = () => (
    <>
      <div className="section-heading page-title"><div><p>{header.eyebrow}</p><h2>{header.title}</h2><small>{header.description}</small></div><button className="secondary" onClick={() => notify("Activity report prepared.")}>⇩ Export audit trail</button></div>
      <div className="activity-layout">
        <section className="panel activity-panel">
          <div className="toolbar"><div className="tabs"><button className="active">Everything</button><button>Payments</button><button>Approvals</button><button>Production</button></div><button className="filter-button">☷ Date filter</button></div>
          {activities.map((item, index) => <div className="activity-row" key={`${item.time}-${item.ref}`}>
            <span className="activity-time">{item.time}</span><span className="activity-avatar">{item.initials}</span><span><strong>{item.text}</strong><small>{item.ref}</small></span><Badge tone={index === 1 || index === 3 ? "amber" : index === 5 ? "green" : "blue"}>{item.type}</Badge>
          </div>)}
        </section>
        <aside className="panel accountability">
          <div className="panel-head"><div><p>ACCOUNTABILITY</p><h3>This week</h3></div></div>
          <div><span>INQUIRIES CLOSED ON TIME</span><strong>87%</strong><i><b style={{ width: "87%" }} /></i></div>
          <div><span>PAYMENTS RELEASED ON TIME</span><strong>72%</strong><i><b className="amber-fill" style={{ width: "72%" }} /></i></div>
          <div><span>PRODUCTION UPDATES ON TIME</span><strong>91%</strong><i><b style={{ width: "91%" }} /></i></div>
          <p>This is not for blaming people. It shows where the process itself needs attention.</p>
        </aside>
      </div>
    </>
  );

  return (
    <main className="app-shell">
      <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
        <div className="brand"><div className="brand-lockup"><img src="/europlus-logo-red.png" alt="EUROPLUS" /><small>WORK COMMAND</small></div><button className="mobile-close" onClick={() => setMobileNav(false)}>×</button></div>
        <nav aria-label="Main navigation">
          {nav.map((item) => {
            const locked = item.id === "accounts" && !canAccessAccounts;
            return <button className={`nav-item ${view === item.id ? "active" : ""} ${locked ? "locked" : ""}`} key={item.id} onClick={() => switchView(item.id)} aria-disabled={locked} title={locked ? "Jimmy and Hemansh only" : undefined}><span>{item.index}</span>{item.label}{locked ? <b>◆</b> : item.count ? <b>{item.count}</b> : null}</button>;
          })}
        </nav>
        <button className="tracker-link" onClick={() => setTrackerOrder(orders[2])}><span>CONNECTED PANEL</span><strong>Container Tracker ↗</strong><small>Open separately · synced orders</small></button>
        <div className="profile"><span>{profileInitials}</span><div><strong>{displayName}</strong><small>{roleLabel[currentRole]}</small></div><button onClick={signOut}>Sign out</button></div>
      </aside>
      {mobileNav && <button className="nav-scrim" onClick={() => setMobileNav(false)} aria-label="Close navigation" />}

      <section className="workspace">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileNav(true)}>☰</button>
          <div><p>MONDAY · 24 AUGUST</p><h1>{view === "command" ? `Good morning, ${displayName}.` : header.eyebrow}</h1></div>
          <div className="header-actions"><label className="search">⌕<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search anything" /></label><button className="primary" onClick={() => setNewInquiryOpen(true)}>＋ New inquiry</button></div>
        </header>
        <div className="view">
          {view === "command" && <Dashboard />}
          {view === "inquiries" && <Inquiries />}
          {view === "pi" && <PiApprovals />}
          {view === "orders" && <Orders />}
          {view === "payments" && <Payments />}
          {view === "accounts" && canAccessAccounts && <Accounts />}
          {view === "expenses" && <Expenses />}
          {view === "production" && <Production />}
          {view === "activity" && <Activity />}
        </div>
      </section>

      {newInquiryOpen && <div className="modal-backdrop" onMouseDown={() => setNewInquiryOpen(false)}><section className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <header><div><p>CAPTURE FROM WECHAT</p><h2>New EUROPLUS inquiry</h2></div><button onClick={() => setNewInquiryOpen(false)}>×</button></header>
        <form onSubmit={addInquiry}>
          <label className="full"><span>Product / client request</span><input name="product" required placeholder="e.g. EP-802 electric kettle, 1×40HQ" autoFocus /></label>
          <label className="full"><span>Details copied from WeChat</span><textarea name="details" rows={4} placeholder="Quantity, model, specification, target price, artwork or special instructions" /></label>
          <label><span>Assign owner</span><select name="owner" defaultValue="Unassigned"><option>Unassigned</option><option>Hemansh</option><option>Max</option><option>Laura</option><option>Apex</option></select></label>
          <label><span>Response deadline</span><select name="deadline" defaultValue="Tomorrow"><option>Today, 4:00 PM</option><option>Today, 6:00 PM</option><option>Tomorrow</option><option>Within 48 hours</option></select></label>
          <label><span>Priority</span><select name="priority"><option>Normal</option><option>Urgent</option><option>Client waiting</option></select></label>
          <label><span>WeChat proof</span><button type="button" className="upload-button" onClick={() => notify("Screenshot attachment slot selected.")}>＋ Attach screenshot</button></label>
          <div className="modal-note full"><b>What happens next</b><span>The entire team sees this inquiry. The owner receives a deadline, and every PI/payment/order created later remains linked to this ID.</span></div>
          <footer className="full"><button type="button" className="secondary" onClick={() => setNewInquiryOpen(false)}>Cancel</button><button type="submit" className="primary">Create & assign inquiry</button></footer>
        </form>
      </section></div>}

      {trackerOrder && <div className="modal-backdrop" onMouseDown={() => setTrackerOrder(null)}><section className="modal tracker-modal" onMouseDown={(e) => e.stopPropagation()}>
        <header><div><p>SEPARATE PANEL CONNECTION</p><h2>{trackerOrder.id} → Container Tracker</h2></div><button onClick={() => setTrackerOrder(null)}>×</button></header>
        <div className="handoff-map"><article className="current"><span>EUROPLUS PANEL</span><strong>{trackerOrder.item}</strong><small>Order · payment · production</small></article><i>→</i><article><span>CONTAINER TRACKER</span><strong>Shipment record</strong><small>Booking · container · BL · ETA</small></article></div>
        <div className="handoff-fields"><p>FIELDS PASSED ONCE</p>{[["Order number", trackerOrder.id],["Client", "EUROPLUS"],["Product", trackerOrder.item],["Supplier", trackerOrder.supplier],["Expected ready date", trackerOrder.target],["Commercial owner", trackerOrder.owner]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
        <div className="modal-note"><b>The panels remain separate.</b><span>A shared order number is the bridge. Container Tracker sends back booking, on-board date and tracking status without duplicating the entire order workflow.</span></div>
        <footer><button className="secondary" onClick={() => setTrackerOrder(null)}>Close</button><button className="primary" onClick={() => { setTrackerOrder(null); notify(`${trackerOrder.id} queued for Container Tracker.`); }}>Queue tracker handoff</button></footer>
      </section></div>}

      {toast && <div className="toast"><span>✓</span>{toast}</div>}
    </main>
  );
}
