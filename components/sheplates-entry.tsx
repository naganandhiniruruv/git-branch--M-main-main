"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import type * as React from "react";
import {
  ArrowRight, BadgeCheck, Bot, ChevronRight, LocateFixed, MapPin,
  Search, ShieldCheck, Sparkles, Upload, X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Toaster } from "@/components/ui/sonner";
import { categories, plans, vendors } from "@/lib/sheplates-data";
import { demoAccounts, type DemoSession } from "@/lib/sheplates-v2-data";
import { isSupabaseConfigured, liveSignIn, requestEmailVerificationCode, verifyEmailCodeAndSetPassword } from "@/lib/supabase";

type Audience = "customer" | "team";
type AuthMode = "login" | "create";

// Kept in sync with STAFF_KEY / StaffAccount in sheplates-v3.tsx — a Super Admin
// "Create user" without Supabase configured stores the account here so it can sign in.
const LOCAL_STAFF_KEY = "sheplates-v3-staff-accounts";
type LocalStaffAccount = { email: string; name: string; role: "operations" | "admin"; password: string; active: boolean };
function readLocalStaffAccount(email: string, password: string): LocalStaffAccount | null {
  try {
    const list = JSON.parse(localStorage.getItem(LOCAL_STAFF_KEY) || "[]") as LocalStaffAccount[];
    return list.find((account) => account.active !== false && account.email.toLowerCase() === email.trim().toLowerCase() && account.password === password) || null;
  } catch { return null; }
}

function authErrorMessage(caught: unknown) {
  if (caught instanceof Error && caught.message) return caught.message;
  if (caught && typeof caught === "object" && "message" in caught && typeof caught.message === "string") return caught.message;
  return "Unable to continue. Please contact your administrator if you need team access.";
}

export function ShePlatesEntry({ onLogin }: { onLogin: (session: DemoSession) => void }) {
  const [authAudience, setAuthAudience] = useState<Audience | null>(null);
  const [location, setLocation] = useState("Ganapathy, Coimbatore");
  const [locating, setLocating] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [agentOpen, setAgentOpen] = useState(false);

  const filteredPlans = useMemo(() => {
    const query = search.trim().toLowerCase();
    return plans.filter((plan) =>
      (selectedCategory === "All" || plan.category === selectedCategory) &&
      (!query || `${plan.name} ${plan.category} ${plan.description}`.toLowerCase().includes(query)),
    );
  }, [search, selectedCategory]);

  function detectLocation() {
    if (!navigator.geolocation) {
      toast.error("Location detection is not supported in this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      () => {
        setLocation("Ganapathy, Coimbatore");
        setLocating(false);
        toast.success("Showing verified vendors near your location");
      },
      () => {
        setLocating(false);
        toast.info("Location permission was not enabled. You can type your area instead.");
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  return (
    <div className="app-shell-bg min-h-screen text-[#171312]">
      <Toaster position="top-center" richColors />
      <section className="section-hero text-white">
        <div className="absolute -left-28 top-40 size-72 rounded-full bg-[#5ba400]/30 blur-3xl" />
        <div className="absolute -right-24 top-24 size-96 rounded-full bg-[#ef3d3d]/15 blur-3xl" />
        <header className="relative z-20 mx-auto flex h-20 max-w-7xl items-center px-4 sm:h-24 sm:px-8">
          <Brand />
          <nav className="ml-auto flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setAuthAudience("team")}
              className="rounded-2xl border border-white/35 bg-white/6 px-3 py-3 text-xs font-extrabold transition hover:bg-white/10 sm:px-5 sm:text-sm"
            >
              <span className="sm:hidden">Vendor</span><span className="hidden sm:inline">Vendor / Team</span>
            </button>
            <button
              onClick={() => setAuthAudience("customer")}
              className="rounded-2xl bg-[#5f8f2d] px-3 py-3 text-xs font-extrabold shadow-xl transition hover:bg-[#537e27] sm:px-5 sm:text-sm"
            >
              <span className="sm:hidden">Customer</span><span className="hidden sm:inline">Customer login</span>
            </button>
          </nav>
        </header>

        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-8 px-4 pb-12 pt-5 sm:px-8 sm:pb-16 sm:pt-8 lg:grid-cols-[1.08fr_.92fr] lg:pb-24 lg:pt-14">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold backdrop-blur">
              <ShieldCheck className="size-4" /> Verified neighbourhood vendors
            </div>
            <h1 className="mt-6 max-w-3xl text-5xl font-black leading-[.98] tracking-[-.055em] sm:text-6xl lg:text-7xl">
              Everything your home needs—planned locally.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/85">
              Discover milk, homemade food, fresh meat and groceries nearby. Schedule ahead or upload your monthly list and compare local quotes.
            </p>

            <div className="surface-card mt-8 grid gap-3 rounded-[30px] p-3 md:grid-cols-[.82fr_1.18fr]">
              <div className="flex h-14 items-center rounded-[22px] bg-[#fff7f0] px-4 text-[#171312]">
                <MapPin className="mr-3 size-5 shrink-0 text-[#5ba400]" />
                <input
                  aria-label="Delivery location"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-base font-bold outline-none"
                />
                <button onClick={detectLocation} className="ml-2 grid size-9 place-items-center rounded-xl hover:bg-white" title="Use current location">
                  <LocateFixed className={`size-5 text-[#5ba400] ${locating ? "animate-spin" : ""}`} />
                </button>
              </div>
              <div className="flex h-14 items-center rounded-[22px] bg-[#f7f5f2] px-4 text-[#171312]">
                <Search className="mr-3 size-5 shrink-0 text-stone-500" />
                <input
                  aria-label="Search local food and groceries"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search milk, meals, meat or groceries"
                  className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-stone-400"
                />
                {search && <button onClick={() => setSearch("")} aria-label="Clear search"><X className="size-4 text-stone-500" /></button>}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2 text-sm font-bold text-white/90">
              <span>Popular:</span>
              {["Cow milk", "Home lunch", "Chicken", "Monthly groceries"].map((item) => (
                <button key={item} onClick={() => setSearch(item)} className="border-b border-white/50 hover:border-white">{item}</button>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl lg:ml-auto">
            <div className="absolute -inset-4 rotate-3 rounded-[44px] bg-[#5ba400]/35" />
            <div className="surface-card relative overflow-hidden rounded-[38px] border-8 border-white/10 bg-[#251b18] shadow-2xl">
              <img src="/sheplates-hero.png" alt="Fresh vegetables, milk and homemade food" className="h-[300px] w-full object-cover sm:h-[500px]" />
              <div className="surface-card absolute inset-x-4 bottom-4 rounded-[24px] bg-white/95 p-4 text-[#171312] shadow-xl backdrop-blur">
                <div className="flex items-center gap-3">
                  <div className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><BadgeCheck /></div>
                  <div className="flex-1"><div className="font-black">Verified local supply</div><div className="text-sm text-stone-500">Scheduled for tomorrow or later</div></div>
                  <ChevronRight className="size-5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-8 sm:py-20">
        <section>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="text-sm font-black uppercase tracking-[.16em] text-[#5ba400]">Browse nearby</p><h2 className="mt-2 text-3xl font-black tracking-[-.04em] sm:text-4xl">What are you planning?</h2></div>
            <p className="max-w-xl text-base leading-7 text-stone-500">Choose a category now. Every order starts tomorrow or on a future date selected by you.</p>
          </div>
          <div className="mt-7 flex snap-x gap-3 overflow-x-auto pb-2 hide-scrollbar sm:grid sm:grid-cols-4 lg:grid-cols-8">
            {categories.map((category) => (
              <button
                key={category.name}
                onClick={() => setSelectedCategory(selectedCategory === category.name ? "All" : category.name)}
                className={`surface-card group min-w-[132px] snap-start rounded-[24px] p-4 text-center transition sm:min-w-0 hover:-translate-y-1 hover:shadow-lg ${selectedCategory === category.name ? "border-[#5ba400] ring-2 ring-lime-100" : "border-stone-100"}`}
              >
                <div className="mx-auto grid aspect-square max-w-20 place-items-center rounded-[20px] text-4xl" style={{ background: category.color }}>{category.emoji}</div>
                <div className="mt-3 text-sm font-extrabold leading-5">{category.name}</div>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-16">
          <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-black uppercase tracking-[.16em] text-[#5ba400]">Near {location.split(",")[0]}</p><h2 className="mt-2 text-3xl font-black tracking-[-.04em]">Popular scheduled essentials</h2></div><Button onClick={() => setAuthAudience("customer")} variant="outline" className="hidden rounded-xl sm:flex">View all <ArrowRight /></Button></div>
          {filteredPlans.length ? (
            <div className="mt-7 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {filteredPlans.slice(0, 6).map((plan) => {
                const vendor = vendors.find((item) => item.id === plan.vendorId);
                return <button key={plan.id} onClick={() => setAuthAudience("customer")} className="surface-card group overflow-hidden rounded-[30px] text-left transition hover:-translate-y-1 hover:shadow-xl">
                  <div className={`grid h-44 place-items-center bg-gradient-to-br ${plan.accent} text-7xl transition group-hover:scale-[1.02]`}>{plan.emoji}</div>
                  <div className="p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-black">{plan.name}</h3><p className="mt-1 text-sm text-stone-500">{vendor?.name} · {vendor?.distance}</p></div><BadgeCheck className="size-5 shrink-0 text-emerald-600" /></div><div className="mt-4 flex items-end justify-between"><div><div className="text-xl font-black">₹{plan.price.toLocaleString("en-IN")}</div><div className="text-xs text-stone-500">{plan.unit} · {plan.frequency}</div></div><span className="rounded-xl bg-[#171312] px-3 py-2 text-sm font-bold text-white">Schedule</span></div></div>
                </button>;
              })}
            </div>
          ) : <div className="surface-card mt-7 rounded-[30px] border border-dashed p-12 text-center"><Search className="mx-auto size-8 text-stone-300" /><h3 className="mt-3 font-black">No matching essentials</h3><button onClick={() => { setSearch(""); setSelectedCategory("All"); }} className="mt-2 text-sm font-bold text-[#ff4d18]">Clear filters</button></div>}
        </section>

        <section className="mt-16 grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
          <div className="surface-dark rounded-[34px] p-7 text-white sm:p-10"><div className="grid size-12 place-items-center rounded-2xl bg-[#ff4d18]"><Upload /></div><h2 className="mt-6 text-3xl font-black tracking-[-.04em]">Upload one monthly grocery list.</h2><p className="mt-3 max-w-xl text-base leading-7 text-white/65">ShePlates structures your requirement, invites eligible local vendors and returns sealed quotations for you to compare.</p><Button onClick={() => setAuthAudience("customer")} className="mt-7 h-12 rounded-xl bg-white px-5 font-black text-[#171312] hover:bg-white/90">Create a monthly request <ArrowRight /></Button></div>
          <div className="rounded-[34px] border border-white/10 bg-gradient-to-br from-[#5f8f2d] to-[#39611a] p-7 text-white shadow-[0_20px_60px_rgba(95,143,45,.22)] sm:p-10"><div className="flex items-center gap-3"><div className="grid size-12 place-items-center rounded-2xl bg-white/15"><Sparkles /></div><div><div className="text-xl font-black">She Agent</div><div className="text-sm text-white/60">Your agentic commerce guide</div></div></div><p className="mt-6 text-lg leading-8 text-white/80">“Find verified vendors for milk every morning and chicken on Sundays.”</p><Button onClick={() => setAgentOpen(true)} className="mt-7 h-12 rounded-xl bg-white px-5 font-black text-[#477f00] hover:bg-white/90">Meet She Agent <ArrowRight /></Button></div>
        </section>
      </main>

      <footer className="border-t border-white/70 bg-[#f8f3ec]/95 backdrop-blur"><div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8"><Brand dark /><div className="flex flex-wrap gap-5 text-sm font-bold text-stone-500"><button onClick={() => setAuthAudience("team")}>Partner with ShePlates</button><span>Scheduled local commerce</span><span>Coimbatore</span></div></div></footer>

      <AuthDialog audience={authAudience} close={() => setAuthAudience(null)} onLogin={onLogin} />
      <AgentPreview open={agentOpen} close={() => setAgentOpen(false)} login={() => { setAgentOpen(false); setAuthAudience("customer"); }} />
    </div>
  );
}

function AuthDialog({ audience, close, onLogin }: { audience: Audience | null; close: () => void; onLogin: (session: DemoSession) => void }) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [verificationStep, setVerificationStep] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");

  function revealField(event: React.FocusEvent<HTMLInputElement>) {
    const element = event.currentTarget;
    window.setTimeout(() => element.scrollIntoView({ block: "center", behavior: "smooth" }), 180);
  }

  useEffect(() => {
    if (!audience) return;
    queueMicrotask(() => { setMode("login"); setEmail(""); setPassword(""); setError(""); setName(""); setVerificationStep(false); setVerificationCode(""); });
  }, [audience]);

  if (!audience) return null;
  const registrationRole = audience === "customer" ? "customer" : "vendor";

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const liveMode = process.env.NEXT_PUBLIC_DEMO_MODE === "false" && isSupabaseConfigured();
      if (mode === "create") {
        if (!name.trim()) throw new Error("Enter your full name.");
        if (password.length < 8) throw new Error("Use a password with at least 8 characters.");
        if (!liveMode) {
          onLogin({ email, name: name.trim(), role: registrationRole, vendorId: registrationRole === "vendor" ? `local-${crypto.randomUUID().slice(0, 8)}` : undefined, isNewVendor: registrationRole === "vendor" });
          toast.success(registrationRole === "vendor" ? "Vendor account created. Complete verification next." : "Customer account created.");
          return;
        }
        if (!verificationStep) {
          await requestEmailVerificationCode({ name: name.trim(), email, role: registrationRole });
          setVerificationStep(true);
          toast.success("A 6-digit verification code was sent to your email.");
          return;
        }
        if (!/^\d{6}$/.test(verificationCode.trim())) throw new Error("Enter the 6-digit code sent to your email.");
        const result = await verifyEmailCodeAndSetPassword({ email, token: verificationCode.trim(), password });
        onLogin({ email, name: name.trim(), role: registrationRole, userId: result.user?.id, isNewVendor: registrationRole === "vendor" });
        return;
      }

      const demo = demoAccounts.find((account) => account.email === email && account.password === password);
      if (!liveMode) {
        if (demo) {
          const permitted = audience === "customer" ? demo.role === "customer" : demo.role !== "customer";
          if (!permitted) throw new Error(audience === "customer" ? "Use Customer login for this account." : "Use Vendor / Team login for this account.");
          onLogin({ email: demo.email, name: demo.name, role: demo.role, vendorId: demo.vendorId, isNewVendor: demo.isNewVendor });
          return;
        }
        const staffAccount = readLocalStaffAccount(email, password);
        if (staffAccount) {
          if (audience === "customer") throw new Error("Use Vendor / Team login for this account.");
          onLogin({ email: staffAccount.email, name: staffAccount.name, role: staffAccount.role });
          return;
        }
        throw new Error("Use one of the packaged demo credentials, or a team login created by Super Admin.");
      }
      const live = await liveSignIn(email, password);
      const permitted = audience === "customer" ? live.profile.role === "customer" : live.profile.role !== "customer";
      if (!permitted) throw new Error(audience === "customer" ? "This account belongs in Vendor / Team login." : "This account belongs in Customer login.");
      onLogin({ email, name: live.profile.full_name, role: live.profile.role, userId: live.user.id, vendorId: live.profile.vendor_id });
    } catch (caught) {
      setError(authErrorMessage(caught));
    } finally { setBusy(false); }
  }

  return <Dialog open onOpenChange={(open) => !open && close()}><DialogContent className="sp-auth-dialog max-h-[90vh] overflow-y-auto rounded-[32px] p-0 sm:max-w-lg"><div className="bg-gradient-to-r from-[#e55a41] via-[#ff845e] to-[#5f8f2d] p-6 text-white"><DialogHeader><DialogTitle className="text-2xl font-black">{audience === "customer" ? "Customer access" : "Vendor / Team access"}</DialogTitle><DialogDescription className="text-white/75">{audience === "customer" ? "Discover, request quotes and track scheduled orders." : "Vendors, operations and super admins use this secure entry."}</DialogDescription></DialogHeader></div><div className="p-6">
    {audience === "customer" && <div className="grid grid-cols-2 rounded-2xl bg-stone-100 p-1"><button onClick={() => setMode("login")} className={`rounded-xl py-2.5 text-sm font-black ${mode === "login" ? "bg-white shadow-sm" : "text-stone-500"}`}>Sign in</button><button onClick={() => setMode("create")} className={`rounded-xl py-2.5 text-sm font-black ${mode === "create" ? "bg-white shadow-sm" : "text-stone-500"}`}>Create account</button></div>}
    <form onSubmit={submit} className="sp-auth-form mt-5 space-y-4">{mode === "create" && <InputField label="Full name"><input value={name} onChange={(event) => setName(event.target.value)} onFocus={revealField} autoComplete="name" className="entry-input" placeholder="Your name" /></InputField>}<InputField label="Email"><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} onFocus={revealField} autoComplete="email" inputMode="email" className="entry-input" /></InputField><InputField label="Password"><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} onFocus={revealField} autoComplete={mode === "create" ? "new-password" : "current-password"} className="entry-input" /></InputField>{mode === "create" && verificationStep && <InputField label="Verification code"><input inputMode="numeric" maxLength={6} value={verificationCode} onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, ""))} onFocus={revealField} autoComplete="one-time-code" className="entry-input tracking-[.35em] text-center text-lg font-black" placeholder="000000" /></InputField>}{mode === "create" && audience === "team" && <div className="rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-900"><b>Vendor registration only.</b> Operations and super-admin access is created by an existing super admin.</div>}{error && <div className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>}<Button disabled={busy} className="h-12 w-full rounded-xl bg-[#171312] text-base font-black hover:bg-black">{busy ? "Please wait…" : mode === "login" ? "Sign in" : verificationStep ? "Verify code & continue" : "Send verification code"}<ArrowRight /></Button></form>
    {audience === "team" && <button onClick={() => { setMode(mode === "login" ? "create" : "login"); setError(""); }} className="mt-4 w-full text-center text-sm text-stone-500">{mode === "login" ? <>Not a vendor? <span className="font-black text-[#ff4d18]">Be part of our vendor team</span></> : <>Already registered? <span className="font-black text-[#ff4d18]">Sign in</span></>}</button>}
  </div></DialogContent></Dialog>;
}

function AgentPreview({ open, close, login }: { open: boolean; close: () => void; login: () => void }) {
  const [message, setMessage] = useState("Plan milk every morning and chicken on Sunday under ₹800");
  if (!open) return null;
  return <div className="fixed inset-0 z-[80] sm:pointer-events-none"><button onClick={close} className="absolute inset-0 bg-[#111611]/45 backdrop-blur-[2px] sm:pointer-events-auto" aria-label="Close She Agent preview" /><section className="surface-card pointer-events-auto absolute inset-x-0 bottom-0 overflow-hidden rounded-t-[30px] sm:rounded-[34px] border border-white/60 bg-[#fbfcf8] shadow-[0_-20px_80px_rgba(17,22,17,.25)] sm:bottom-6 sm:right-6 sm:left-auto sm:w-[430px] sm:rounded-[34px] sm:shadow-[0_24px_90px_rgba(17,22,17,.3)]">
    <div className="surface-dark relative overflow-hidden p-5 text-white"><div className="absolute -right-12 -top-16 size-44 rounded-full bg-[#6cab1b]/30 blur-3xl" /><div className="relative flex items-center gap-3"><div className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-[#e55a41] via-[#ff845e] to-[#5f8f2d] shadow-lg"><Sparkles /></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h2 className="text-lg font-black">She Agent</h2><span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-white/70">Preview</span></div><p className="text-xs text-white/55">Your agentic local-commerce copilot</p></div><button onClick={close} className="grid size-10 place-items-center rounded-full bg-white/10"><X className="size-4" /></button></div></div>
    <div className="p-5"><div className="surface-card-muted rounded-[22px_22px_22px_8px] p-4 text-sm leading-6 text-stone-600 shadow-sm">Tell me a meal, budget or recurring need. I can shortlist nearby verified options, build a review basket and help you schedule it after sign-in.</div><div className="mt-3 grid grid-cols-3 gap-2">{[["🥛", "Daily milk"], ["🍱", "Meal plan"], ["🛍️", "Budget basket"]].map(([emoji,label]) => <button key={label} onClick={() => setMessage(label === "Daily milk" ? "Plan milk every morning" : label === "Meal plan" ? "Plan a healthy dinner under ₹400" : "Build groceries under ₹500")} className="surface-card-muted rounded-[22px] p-3 text-center shadow-sm"><div className="text-2xl">{emoji}</div><div className="mt-1 text-[10px] font-black">{label}</div></button>)}</div><div className="surface-card-muted mt-4 flex items-end gap-2 rounded-[22px] bg-[#f6f8f2] p-2"><textarea value={message} onChange={(event) => setMessage(event.target.value)} className="min-h-16 flex-1 resize-none bg-transparent px-2 py-1 text-sm outline-none" /><button onClick={login} className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#ef3d3d] text-white"><ArrowRight className="size-4" /></button></div><Button onClick={login} className="mt-3 h-12 w-full rounded-xl bg-[#111611] font-black text-white hover:bg-black"><Sparkles />Sign in and let She Agent build it</Button><p className="mt-3 text-center text-[10px] leading-4 text-stone-400">Your private profile, nearby catalogue, schedules and orders are only used after sign-in.</p></div>
  </section></div>;
}

function InputField({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-wider text-stone-500">{label}</span>{children}</label>; }

function Brand({ dark = false }: { dark?: boolean }) { return <div className="flex min-w-0 items-center gap-2.5 sm:gap-3"><div className={`grid size-10 shrink-0 place-items-center rounded-[14px] sm:size-12 sm:rounded-2xl ${dark ? "surface-card-muted" : "border border-white/10 bg-white/10"}`}><img src="/sheplates-logo.png" alt="ShePlates" className="size-8 rounded-full object-contain sm:size-10" /></div><div className="min-w-0"><div className={`truncate text-xl font-black tracking-[-.05em] sm:text-2xl ${dark ? "text-[#171312]" : "text-white"}`}>ShePlates</div><div className={`hidden text-[9px] font-black uppercase tracking-[.18em] min-[390px]:block sm:text-[10px] ${dark ? "text-[#5f8f2d]" : "text-white/65"}`}>Agentic local commerce</div></div></div>; }
