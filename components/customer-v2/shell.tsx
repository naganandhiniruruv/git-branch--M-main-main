"use client";
// Navigation chrome for the redesigned customer portal: six primary tabs shown
// as a top bar on desktop/tablet and a bottom bar on phones.
import { Camera, CalendarDays, MapPin, ShoppingBag, UserRound, Zap, Activity } from "lucide-react";

export const CUSTOMER_TABS = [
  { key: "Maps", icon: MapPin },
  { key: "Marketplace", icon: ShoppingBag },
  { key: "Schedules", icon: CalendarDays },
  { key: "Food Drops", icon: Zap },
  { key: "Stories", icon: Camera },
  { key: "Profile", icon: UserRound },
] as const;

const TAB_OF: Record<string, string> = {
  Orders: "Schedules", "My schedule": "Schedules",
  "Profile & food": "Profile", Wishlist: "Profile", "Monthly requirement": "Profile", "My quotations": "Profile", "Ticket centre": "Profile",
};
/** Which primary tab owns a page (legacy page names keep working as deep links). */
export const tabOf = (active: string) => TAB_OF[active] ?? active;

export function CustomerTopNav({ active, onNavigate }: { active: string; onNavigate: (key: string) => void }) {
  const current = tabOf(active);
  return <nav data-tour="nav-tabs" aria-label="Primary" className="mx-3 hidden min-w-0 flex-1 items-center justify-center gap-1 md:flex">
    {CUSTOMER_TABS.map(({ key, icon: Icon }) => <button key={key} type="button" aria-current={current === key ? "page" : undefined} onClick={() => onNavigate(key)} className={`flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-sm font-black transition lg:px-4 ${current === key ? "bg-[#e0194f] text-white shadow-[0_8px_20px_rgba(224,25,79,.28)]" : "text-stone-600 hover:bg-white/80"}`}><Icon className="size-4" />{key}</button>)}
  </nav>;
}

export function CustomerBottomNav({ active, onNavigate, onAgent }: { active: string; onNavigate: (key: string) => void; onAgent: () => void }) {
  const current = tabOf(active);
  return <>
    <button type="button" data-tour="agent-mobile" onClick={onAgent} aria-label="Open She Agent" className="sp-agent-launcher fixed bottom-[84px] right-3 z-[57] grid size-16 place-items-center rounded-full border p-2 text-white shadow-[0_14px_34px_rgba(17,22,17,.35)] md:hidden"><span className="sp-agent-orb relative grid size-12 place-items-center rounded-full text-white"><Activity className="size-5" /></span></button>
    <nav data-tour="nav-tabs-mobile" aria-label="Primary" className="fixed inset-x-0 bottom-0 z-[58] grid grid-cols-6 gap-0 border-t border-stone-200/80 bg-white/96 px-1 pb-[max(8px,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-10px_30px_rgba(35,10,20,.08)] backdrop-blur-xl md:hidden">
      {CUSTOMER_TABS.map(({ key, icon: Icon }) => <button key={key} type="button" aria-label={key} data-tour={key === "Profile" ? "account-mobile" : undefined} aria-current={current === key ? "page" : undefined} onClick={() => onNavigate(key)} className={`flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-xl text-[9px] font-black leading-[1.05] tracking-tight transition ${current === key ? "text-[#e0194f]" : "text-stone-500"}`}><Icon className={`size-[22px] ${current === key ? "stroke-[2.4]" : ""}`} /><span className="max-w-full px-0.5 text-center">{key === "Marketplace" ? "Market" : key}</span></button>)}
    </nav>
  </>;
}
