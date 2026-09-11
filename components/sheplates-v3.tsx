"use client";
/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type * as React from "react";
import {
  Activity, AlertTriangle, ArrowLeft, ArrowRight, BadgeCheck, Bell, CalendarDays,
  Check, ClipboardCheck, FileCheck2, HeartPulse,
  IndianRupee, LayoutDashboard, ListChecks, LocateFixed, LogOut, MapPin, Menu,
  MessageSquareText, Package, Pause, Percent, Play, Plus, RefreshCcw, Search, Send, Settings,
  ShieldCheck, ShoppingBag, Sparkles, Store, Truck, Upload, UserPlus, Users,
  WalletCards, X, MapPinned, TicketCheck, ShoppingCart, Building2, ImageUp,
  FileSpreadsheet, Download, CreditCard, UserCog, CheckCircle2, Lightbulb, Eye, EyeOff, Copy,
  ChevronDown, Filter, Megaphone, Star, Flame, CircleUserRound, Pencil, Trash2, FileUp, Volume2, Clock3, HelpCircle,
} from "lucide-react";
import { downloadWorkbook } from "@/lib/excel-export";
import { createStaffUser } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";
import { ShePlatesEntry } from "@/components/sheplates-entry";
import { categories } from "@/lib/sheplates-data";
import { demoAccounts, type DemoSession } from "@/lib/sheplates-v2-data";
import { nutritionLooksConsistent, type Nutrition } from "@/lib/nutrition";
import {
  decideLiveVendorVerification, getAccessToken, isLiveSupabaseMode, isSupabaseConfigured,
  loadLiveCustomerPreference, loadLiveCustomerMemory, clearLiveCustomerMemory, loadLiveMarketplace, loadLiveOperationsWorkspace, loadLiveVendorWorkspace, loadLiveCommerceSnapshot,
  loadLiveNotifications, markLiveNotificationsRead, saveLiveCustomerProfile,
  liveSignOut, saveLiveCustomerLocation, saveLiveVendorLocation, saveLiveVendorProduct,
  saveLiveMarketplaceHome, saveLiveCampaign, uploadLiveProductImage, submitLiveVendorApplication, updateLiveVendorControls, createLiveScheduledCheckout, syncLiveCart, checkoutLiveCart, markLiveOrderPaid, saveLiveDeliveryStaff, deleteLiveDeliveryStaff, assignLiveDeliveryStaff, resubmitLiveVendorVerification, saveLiveOutletCertificate, uploadLiveCertificate, updateLiveOrderStatus, rescheduleLiveOrder, notifyLiveNutritionReview, saveLiveTourCompleted,
  type LiveMarketplaceRow, type LiveMenuItemRow, type LiveVendorRow, type MarketplaceDiagnostics,
} from "@/lib/supabase";

type Role = DemoSession["role"];
type DeliveryMode = "Vendor delivery" | "Self pickup";
type Verification = "Draft" | "Submitted" | "Under review" | "Changes required" | "Verified" | "Rejected";
type Product = {
  id: string; vendorId: string; name: string; category: string; emoji: string; baseUnit: string;
  quantityStep: number; vendorPrice: number; stock: number; active: boolean; calories: number;
  protein: number; carbs: number; fat: number; fibre: number; dietaryTags: string[];
  packAmount?: number; packMeasure?: string; liveDistanceKm?: number; imageUrl?: string; originalImageUrl?: string;
  nutritionStatus?: "Verified" | "Estimated" | "Pending review"; nutritionConfidence?: number; nutritionNote?: string;
};
type AgentMemory = { lastBudget?: number; favoriteCategories?: string[]; lastComplaintAt?: string; calorieTarget?: number; minProtein?: number; preferredDietaryTags?: string[]; preferredDeliveryPeriod?: string; favoriteProducts?: string[] };
type AgentMessage = { role: "user" | "agent"; text: string; productIds?: string[]; basketTotal?: number; intent?: string };
type CustomerProfile = {
  email: string; address: string; latitude?: number; longitude?: number; householdSize: number;
  diet: string; allergies: string[]; goals: string[]; dislikes: string; onboardingComplete: boolean;
  phone?: string; addresses?: CustomerAddress[]; agentMemory?: AgentMemory;
};
type CustomerAddress = { id: string; label: string; address: string; latitude?: number; longitude?: number; phone?: string; isDefault: boolean };
type Vendor = {
  id: string; ownerEmail: string; ownerName: string; businessName: string; category: string;
  address: string; latitude?: number; longitude?: number; radiusKm: number; delivery: boolean;
  pickup: boolean; openToday: boolean; fssaiNumber: string; certificateName: string; expiryDate: string;
  verification: Verification; operational: "Inactive" | "Active" | "Paused"; plan: "Launch" | "Growth" | "Premium";
  logoUrl?: string; bannerUrl?: string; outlets?: VendorOutlet[];
};
type VendorOutlet = { id: string; name: string; address: string; latitude?: number; longitude?: number; radiusKm: number; openToday: boolean; certificateNumber?: string; certificateName?: string; certificateExpiry?: string };
type Schedule = {
  id: string; customerEmail: string; productId: string; vendorId: string; startDate: string;
  endDate: string; recurrence: "Once" | "Daily" | "Weekly" | "Custom"; weekdays: string[];
  timeSlot: string; quantity: number; unit: string; mode: DeliveryMode; estimatedOccurrences: number;
  status?: "Awaiting payment" | "Active" | "Paused" | "Cancelled" | "Completed"; nextDeliveryAt?: string; whatsappReminder?: boolean;
};
type Order = {
  id: string; scheduleId?: string; customerEmail: string; vendorId: string; productId?: string;
  description: string; quantity: number; unit: string; total: number; date: string; slot: string;
  mode: DeliveryMode; status: "Scheduled" | "Confirmed" | "Preparing" | "Ready" | "Out for delivery" | "Ready for pickup" | "Completed" | "Cancellation requested" | "Cancelled";
  payment: "Pending" | "Paid" | "Reversal pending" | "Refunded";
  trackingLatitude?: number; trackingLongitude?: number; cancellationFee?: number;
};
type Staff = { id: string; vendorId: string; name: string; phone: string; active: boolean };
type Assignment = { id: string; orderId: string; staffId: string; assignedAt: string };
type RequirementItem = { id: string; name: string; quantity: number; unit: string; brand: string };
type Requirement = { id: string; customerEmail: string; title: string; deliveryDate: string; closingDate?: string; sourceFileName?: string; items: RequirementItem[]; status: "Draft" | "Quoting" | "Quotes received" | "Awarded"; invitedVendorIds?: string[] };
type Quote = { id: string; requirementId: string; vendorId: string; total: number; deliveryFee: number; note: string; status: "Submitted" | "Selected" | "Not selected" };
type Notification = { id: string; recipient: string; recipientRole: Role; title: string; body: string; at: string; read: boolean; href?: string };
type Cancellation = { id: string; orderId: string; customerEmail: string; reason: string; aiDecision: string; confidence: number; status: "Awaiting operations" | "Approved" | "Rejected" | "Refunded"; kind?: "cancellation" | "quality_complaint"; recommendedRefundAmount?: number; attachmentName?: string };
type Audit = { id: string; actor: string; action: string; detail: string; at: string };
type CartItem = { id: string; customerEmail: string; productId: string; quantity: number };
type Ticket = { id: string; creatorEmail: string; creatorRole: Role; vendorId?: string; subject: string; category: string; priority: "Low" | "Normal" | "High" | "Urgent"; status: "Open" | "In progress" | "Waiting on user" | "Resolved"; description: string; attachmentName?: string; createdVia: "Portal" | "She Agent"; at: string };
type PayoutStatus = "Scheduled" | "Paid" | "Reversed";
type Transaction = {
  id: string; orderId: string; vendorId: string; customerEmail: string; method: string;
  grossAmount: number; commissionPercent: number; commissionAmount: number; vendorPayout: number;
  collectedAt: string; scheduledPayoutDate: string; payoutStatus: PayoutStatus; paidAt?: string; note?: string;
};
type StaffAccount = { id: string; email: string; name: string; role: "operations" | "admin"; createdBy: string; createdAt: string; mode: "live" | "local"; active: boolean };
type Campaign = { id: string; name: string; audience: string; offer: string; channel: string; status: "Draft" | "Active" | "Paused"; aiRationale: string; createdAt: string };
type MerchandisingConfig = { featuredProductIds: string[]; recommendationPopupEnabled: boolean; maxFeatured: number };
type V3State = {
  customers: CustomerProfile[]; vendors: Vendor[]; products: Product[]; schedules: Schedule[];
  orders: Order[]; staff: Staff[]; assignments: Assignment[]; requirements: Requirement[];
  quotes: Quote[]; markups: Record<string, number>; notifications: Notification[];
  cancellations: Cancellation[]; audit: Audit[];
  cart: CartItem[]; tickets: Ticket[]; transactions: Transaction[]; staffAccounts: StaffAccount[];
  campaigns: Campaign[]; merchandising: MerchandisingConfig; merchandisingError?: string | null;
};

const EMPTY_STATE: V3State = {
  customers: [], vendors: [], products: [], schedules: [], orders: [], staff: [], assignments: [],
  requirements: [], quotes: [], markups: {}, notifications: [], cancellations: [], audit: [], cart: [], tickets: [],
  transactions: [], staffAccounts: [], campaigns: [], merchandising: { featuredProductIds: [], recommendationPopupEnabled: true, maxFeatured: 6 },
};
const PLATFORM_COMMISSION_PERCENT = 8;
const PAYOUT_CYCLE_DAYS = 7;
const STAFF_KEY = "sheplates-v3-staff-accounts";
const STORE_KEY = "sheplates-v3-state";
const SESSION_KEY = "sheplates-v3-session";
const roleName: Record<Role, string> = { customer: "Customer", vendor: "Vendor", operations: "Operations", admin: "Super admin" };
const nav: Record<Role, string[]> = {
  customer: ["Marketplace", "Cart", "My schedule", "Monthly requirement", "My quotations", "Orders", "Profile & food", "Ticket centre"],
  vendor: ["Dashboard", "AI insights", "Online shop & POS", "Store & radius", "Verification", "Catalog", "Quote opportunities", "Orders", "Delivery team", "Settlements", "Ticket centre"],
  operations: ["Command centre", "AI insights", "Vendor onboarding", "Vendor verification", "Item pricing", "RFQ desk", "Orders", "Cancellations", "Vendor payments", "Reports", "Ticket centre"],
  admin: ["Executive view", "AI insights", "Homepage & campaigns", "Users", "Vendors", "Vendor plans", "Pricing policies", "Vendor payments", "Reports", "Ticket centre", "Audit log"],
};
const navIcons: Record<string, typeof Store> = {
  Marketplace: ShoppingBag, Cart: ShoppingCart, "My schedule": CalendarDays, "Monthly requirement": ListChecks, "My quotations": ClipboardCheck,
  Orders: Package, "Profile & food": HeartPulse, Dashboard: LayoutDashboard, "Store & radius": MapPin,
  Verification: BadgeCheck, Catalog: ShoppingBag, "Online shop & POS": Building2, "Quote opportunities": ClipboardCheck, "Delivery team": Truck,
  "Command centre": LayoutDashboard, "Vendor onboarding": UserPlus, "Vendor verification": FileCheck2,
  "Item pricing": Percent, "RFQ desk": ClipboardCheck, Cancellations: RefreshCcw, "Executive view": LayoutDashboard,
  Users, Vendors: Store, "Vendor plans": WalletCards, "Pricing policies": Settings, "Audit log": Activity, "Ticket centre": TicketCheck, "AI insights": Sparkles, "Homepage & campaigns": Megaphone,
  Settlements: WalletCards, "Vendor payments": IndianRupee, Reports: FileSpreadsheet,
};
type SellingSpec = { key: string; label: string; amount: number; measure: string; emoji: string };
const weightPacks = (emoji: string): SellingSpec[] => [
  { key: "250-g", label: "250 g pack", amount: 250, measure: "g", emoji },
  { key: "500-g", label: "500 g pack", amount: 500, measure: "g", emoji },
  { key: "1-kg", label: "1 kg pack", amount: 1, measure: "kg", emoji },
];
const volumePacks = (emoji: string): SellingSpec[] => [
  { key: "250-ml", label: "250 ml pouch/bottle", amount: 250, measure: "ml", emoji },
  { key: "500-ml", label: "500 ml pouch/bottle", amount: 500, measure: "ml", emoji },
  { key: "1-litre", label: "1 litre pouch/bottle", amount: 1, measure: "litre", emoji },
];
const unitsByCategory: Record<string, SellingSpec[]> = {
  "Milk & dairy": [...volumePacks("🥛"), ...weightPacks("🥣")],
  "Home food": [{ key: "meal", label: "1 complete meal", amount: 1, measure: "meal", emoji: "🍱" }, { key: "portion", label: "1 portion", amount: 1, measure: "portion", emoji: "🍲" }],
  "Meat & fish": [...weightPacks("🍗"), { key: "piece", label: "1 whole piece", amount: 1, measure: "piece", emoji: "🐟" }],
  Vegetables: [...weightPacks("🥬"), { key: "bundle", label: "1 bundle", amount: 1, measure: "pack", emoji: "🥦" }],
  Groceries: [...weightPacks("🛍️"), ...volumePacks("🫗"), { key: "piece", label: "1 retail pack/piece", amount: 1, measure: "pack", emoji: "📦" }],
  Eggs: [{ key: "egg", label: "1 egg", amount: 1, measure: "piece", emoji: "🥚" }, { key: "six-eggs", label: "Pack of 6 eggs", amount: 6, measure: "piece", emoji: "🥚" }, { key: "dozen", label: "Tray of 12 eggs", amount: 12, measure: "piece", emoji: "🥚" }],
  Bakery: [{ key: "piece", label: "1 piece", amount: 1, measure: "piece", emoji: "🥖" }, ...weightPacks("🍞")],
  "Rice & staples": [...weightPacks("🍚"), { key: "5-kg", label: "5 kg bag", amount: 5, measure: "kg", emoji: "🍚" }, { key: "25-kg", label: "25 kg bag", amount: 25, measure: "kg", emoji: "🍚" }],
};
const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const categoryNames = Object.keys(unitsByCategory);

function id(prefix: string) { return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`; }
function now() { return new Date().toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }); }
function localDateISO(date = new Date()) { const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60000); return shifted.toISOString().slice(0, 10); }
function tomorrow() { const date = new Date(); date.setDate(date.getDate() + 1); return localDateISO(date); }
function money(value: number) { return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value); }
function finalPrice(product: Product, state: V3State) { return Math.round(product.vendorPrice * (1 + (state.markups[product.id] || 0) / 100) * 100) / 100; }
function vendorFor(state: V3State, session: DemoSession) { return state.vendors.find((v) => v.ownerEmail === session.email); }
function notificationBelongsToSession(item: Notification, session: DemoSession) {
  return item.recipientRole === session.role && item.recipient.toLowerCase() === session.email.toLowerCase();
}
function hasPlaceholderAddress(address?: string) { return !address || /detected location|detected coordinates|saved address|add flat|add store address/i.test(address); }
function distanceKm(aLat?: number, aLng?: number, bLat?: number, bLng?: number) {
  if (![aLat, aLng, bLat, bLng].every(Number.isFinite)) return null;
  const radians = (value: number) => value * Math.PI / 180;
  const lat1 = radians(aLat!); const lat2 = radians(bLat!);
  const deltaLat = radians(bLat! - aLat!); const deltaLng = radians(bLng! - aLng!);
  const value = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}
function productServing(product: Product) {
  if (product.packAmount && product.packMeasure) return { amount: product.packAmount, unit: product.packMeasure };
  if (product.baseUnit === "kg") return { amount: 1, unit: "kg" };
  if (product.baseUnit === "litre") return { amount: 1, unit: "litre" };
  if (product.baseUnit === "dozen") return { amount: 12, unit: "piece" };
  return { amount: 1, unit: product.baseUnit };
}
function migrateLegacyProduct(product: Product): Product {
  if (product.packAmount && product.packMeasure) return product;
  const step = product.quantityStep || 1;
  if (product.baseUnit === "kg") {
    const amount = step < 1 ? step * 1000 : step;
    const measure = step < 1 ? "g" : "kg";
    return { ...product, baseUnit: `${amount} ${measure} pack`, packAmount: amount, packMeasure: measure, quantityStep: 1, vendorPrice: Math.round(product.vendorPrice * step * 100) / 100, stock: Math.max(0, Math.floor(product.stock / step)) };
  }
  if (product.baseUnit === "litre") {
    const amount = step < 1 ? step * 1000 : step;
    const measure = step < 1 ? "ml" : "litre";
    return { ...product, baseUnit: `${amount} ${measure} pouch/bottle`, packAmount: amount, packMeasure: measure, quantityStep: 1, vendorPrice: Math.round(product.vendorPrice * step * 100) / 100, stock: Math.max(0, Math.floor(product.stock / step)) };
  }
  const labels: Record<string, { label: string; amount: number; measure: string }> = {
    piece: { label: "1 piece", amount: 1, measure: "piece" }, meal: { label: "1 complete meal", amount: 1, measure: "meal" },
    portion: { label: "1 portion", amount: 1, measure: "portion" }, dozen: { label: "Tray of 12 eggs", amount: 12, measure: "piece" },
    bundle: { label: "1 bundle", amount: 1, measure: "pack" }, bag: { label: "1 retail bag", amount: 1, measure: "pack" },
  };
  const replacement = labels[product.baseUnit];
  return replacement ? { ...product, baseUnit: replacement.label, packAmount: replacement.amount, packMeasure: replacement.measure, quantityStep: 1 } : product;
}
function repairSavedState(raw: V3State): V3State {
  return {
    ...EMPTY_STATE,
    ...raw,
    customers: (raw.customers || []).map((profile) => ({
      ...profile,
      address: hasPlaceholderAddress(profile.address) ? (profile.latitude && profile.longitude ? `GPS pin ${profile.latitude.toFixed(5)}, ${profile.longitude.toFixed(5)} — confirm address` : "Location not confirmed") : profile.address,
      phone: profile.phone || "",
      addresses: profile.addresses?.length ? profile.addresses : [{ id: id("ADR"), label: "Home", address: profile.address, latitude: profile.latitude, longitude: profile.longitude, isDefault: true }],
    })),
    products: (raw.products || []).map((savedProduct) => {
      const product = migrateLegacyProduct(savedProduct);
      const current: Nutrition = { calories: product.calories, protein: product.protein, carbs: product.carbs, fat: product.fat, fibre: product.fibre };
      const hasNutrition = Object.values(current).some((value) => Number(value) > 0);
      return { ...product, nutritionStatus: product.nutritionStatus || (hasNutrition && nutritionLooksConsistent(current) ? "Estimated" : "Pending review") };
    }),
    // Notifications saved by earlier builds did not include a role boundary.
    // Discard those ambiguous entries instead of risking cross-role disclosure.
    notifications: (raw.notifications || []).filter((item) => Boolean(item.recipientRole)),
    cart: raw.cart || [],
    tickets: raw.tickets || [],
    transactions: raw.transactions || [],
    staffAccounts: raw.staffAccounts || [],
    campaigns: raw.campaigns || [],
    merchandising: raw.merchandising || { featuredProductIds: [], recommendationPopupEnabled: true, maxFeatured: 6 },
  };
}
function addDaysISO(dateISO: string, days: number) {
  const date = new Date(`${dateISO}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}
function todayISO() { return localDateISO(new Date()); }
function payoutDateFor(collectedDateISO: string) { return addDaysISO(collectedDateISO, PAYOUT_CYCLE_DAYS); }
function weekdayLabel(dateISO: string) { return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(`${dateISO}T12:00:00`).getDay()]; }
/** Every date within `rangeDates` on which this schedule actually delivers — used so the
 * calendar and reschedule preview show ALL chosen weekdays, not just the anchor start date. */
function occurrenceDatesInRange(schedule: Schedule, rangeDates: string[]): string[] {
  if ((schedule.status || "Active") !== "Active") return [];
  return rangeDates.filter((date) => {
    if (date < schedule.startDate) return false;
    if (schedule.endDate && date > schedule.endDate) return false;
    if (schedule.recurrence === "Once") return date === schedule.startDate;
    if (schedule.recurrence === "Daily") return true;
    if (schedule.recurrence === "Weekly") return weekdayLabel(date) === weekdayLabel(schedule.startDate);
    return schedule.weekdays.includes(weekdayLabel(date));
  });
}
function recordTransaction(order: Order, method: string): Transaction {
  const commissionAmount = Math.round(order.total * (PLATFORM_COMMISSION_PERCENT / 100) * 100) / 100;
  const collectedAt = todayISO();
  return {
    id: id("TXN"), orderId: order.id, vendorId: order.vendorId, customerEmail: order.customerEmail, method,
    grossAmount: order.total, commissionPercent: PLATFORM_COMMISSION_PERCENT, commissionAmount,
    vendorPayout: Math.round((order.total - commissionAmount) * 100) / 100,
    collectedAt, scheduledPayoutDate: payoutDateFor(collectedAt), payoutStatus: "Scheduled",
  };
}
function readLocalStaffAccounts(): (StaffAccount & { password: string })[] {
  try { return JSON.parse(localStorage.getItem(STAFF_KEY) || "[]"); } catch { return []; }
}
function writeLocalStaffAccounts(list: (StaffAccount & { password: string })[]) {
  try { localStorage.setItem(STAFF_KEY, JSON.stringify(list)); } catch { /* storage unavailable */ }
}
function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  let out = "";
  for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
function verificationFromLive(value: string): Verification {
  const labels: Record<string, Verification> = { draft: "Draft", submitted: "Submitted", under_review: "Under review", changes_required: "Changes required", verified: "Verified", rejected: "Rejected", expired: "Changes required" };
  return labels[value] || "Draft";
}
function operationalFromLive(value: string): Vendor["operational"] {
  return value === "active" ? "Active" : value === "paused" ? "Paused" : "Inactive";
}
function vendorFromLive(row: LiveVendorRow, identity?: { email?: string; name?: string }, document?: Record<string, unknown>): Vendor {
  return {
    id: row.id, ownerEmail: identity?.email || "vendor@sheplates.local", ownerName: identity?.name || "Vendor",
    businessName: row.name, category: row.category, address: row.address || row.locality,
    latitude: row.latitude === null ? undefined : Number(row.latitude), longitude: row.longitude === null ? undefined : Number(row.longitude),
    radiusKm: Number(row.service_radius_km), delivery: row.delivery_enabled, pickup: row.pickup_enabled,
    openToday: row.store_open_today, verification: verificationFromLive(row.verification_status),
    operational: operationalFromLive(row.operational_status), plan: "Launch",
    fssaiNumber: String(document?.document_number || "Submitted"),
    certificateName: String(document?.storage_path || "Private certificate"), expiryDate: String(document?.expiry_date || "—"),
  };
}
function productFromLive(row: LiveMenuItemRow): Product {
  return {
    id: row.id, vendorId: row.vendor_id, name: row.name, category: row.category,
    emoji: unitsByCategory[row.category]?.[0]?.emoji || "📦", baseUnit: row.unit,
    quantityStep: Number(row.quantity_step || 1), vendorPrice: Number(row.vendor_base_price),
    stock: Number(row.stock_quantity), active: row.active, calories: Number(row.calories_per_unit),
    protein: Number(row.protein_g), carbs: Number(row.carbs_g), fat: Number(row.fat_g), fibre: Number(row.fibre_g),
    dietaryTags: row.dietary_tags || [], packAmount: row.pack_amount === null ? undefined : Number(row.pack_amount),
    packMeasure: row.pack_measure || undefined, imageUrl: row.image_url || undefined,
    nutritionStatus: row.nutrition_status === "verified" ? "Verified" : row.nutrition_status === "estimated" ? "Estimated" : (Number(row.calories_per_unit) > 0 ? "Estimated" : "Pending review"),
    nutritionConfidence: row.nutrition_confidence == null ? undefined : Number(row.nutrition_confidence),
    nutritionNote: row.nutrition_note || undefined,
  };
}
function marketplaceProductFromLive(row: LiveMarketplaceRow): Product {
  return {
    id: row.item_id, vendorId: row.vendor_id, name: row.item_name, category: row.category,
    emoji: unitsByCategory[row.category]?.[0]?.emoji || "📦", baseUnit: row.unit,
    quantityStep: Number(row.quantity_step || 1), vendorPrice: Number(row.customer_price),
    stock: Number(row.stock_quantity), active: true, calories: Number(row.calories_per_unit),
    protein: Number(row.protein_g), carbs: Number(row.carbs_g), fat: Number(row.fat_g), fibre: Number(row.fibre_g),
    dietaryTags: row.dietary_tags || [], packAmount: row.pack_amount === null ? undefined : Number(row.pack_amount),
    packMeasure: row.pack_measure || undefined, liveDistanceKm: Number(row.distance_km), imageUrl: row.image_url || undefined,
    nutritionStatus: Number(row.calories_per_unit) > 0 ? "Estimated" : "Pending review",
  };
}

function liveOrderStatus(value: unknown): Order["status"] {
  const map: Record<string, Order["status"]> = {
    awarded: "Scheduled", confirmed: "Confirmed", preparing: "Preparing", ready: "Ready",
    out_for_delivery: "Out for delivery", ready_for_pickup: "Ready for pickup", completed: "Completed",
    cancellation_requested: "Cancellation requested", cancelled: "Cancelled",
  };
  return map[String(value || "")] || "Scheduled";
}
function livePaymentStatus(payments: unknown, orderStatus?: unknown): Order["payment"] {
  const rows = Array.isArray(payments) ? payments as Array<Record<string, unknown>> : [];
  const statuses = rows.map((row) => String(row.status || "").toLowerCase()).filter(Boolean);
  if (statuses.some((status) => status === "refunded")) return "Refunded";
  if (statuses.some((status) => status.includes("reversal"))) return "Reversal pending";
  if (statuses.some((status) => ["paid", "captured", "success", "succeeded"].includes(status))) return "Paid";
  const progressed = ["confirmed", "preparing", "ready", "out_for_delivery", "ready_for_pickup", "completed"].includes(String(orderStatus || "").toLowerCase());
  return progressed ? "Paid" : "Pending";
}
type LiveCommerceStateSnapshot = { orders?: Array<Record<string, unknown>>; schedules?: Array<Record<string, unknown>>; staff?: Array<Record<string, unknown>>; assignments?: Array<Record<string, unknown>>; cart?: Record<string, unknown> | null; cartItems?: Array<Record<string, unknown>> };
function mergeLiveCommerce(current: V3State, snapshot: LiveCommerceStateSnapshot, session: DemoSession): V3State {
  const orderRows = snapshot.orders || [];
  const orders: Order[] = orderRows.map((row) => {
    const items = Array.isArray(row.order_items) ? row.order_items as Array<Record<string, unknown>> : [];
    const first = items[0];
    return {
      id: String(row.id), scheduleId: row.schedule_id ? String(row.schedule_id) : undefined,
      customerEmail: session.role === "customer" ? session.email : String(row.customer_id || "customer"), vendorId: String(row.vendor_id),
      productId: first ? current.products.find((product) => product.vendorId === String(row.vendor_id) && product.name.trim().toLowerCase() === String(first.product_name || "").trim().toLowerCase())?.id : undefined,
      description: items.length ? items.map((item) => String(item.product_name || "Item")).join(", ") : String(row.order_number || "Order"),
      quantity: Number(first?.quantity || items.length || 1), unit: String(first?.unit || "items"), total: Number(row.customer_total || 0),
      date: String(row.scheduled_date || ""), slot: String(row.scheduled_slot || "Vendor to confirm"),
      mode: String(row.fulfilment_mode) === "self_pickup" ? "Self pickup" : "Vendor delivery",
      status: liveOrderStatus(row.status), payment: livePaymentStatus(row.payments, row.status),
      trackingLatitude: row.tracking_latitude == null ? undefined : Number(row.tracking_latitude),
      trackingLongitude: row.tracking_longitude == null ? undefined : Number(row.tracking_longitude),
      cancellationFee: Number(row.cancellation_fee || 0),
    };
  });
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const schedules: Schedule[] = (snapshot.schedules || []).map((row) => ({
    id: String(row.id), customerEmail: session.role === "customer" ? session.email : String(row.customer_id || "customer"), productId: String(row.menu_item_id), vendorId: String(row.vendor_id),
    startDate: String(row.start_date), endDate: row.end_date ? String(row.end_date) : "", recurrence: (String(row.recurrence || "once")[0].toUpperCase() + String(row.recurrence || "once").slice(1)) as Schedule["recurrence"],
    weekdays: Array.isArray(row.weekdays) ? (row.weekdays as number[]).map((day) => dayNames[Number(day)]).filter(Boolean) : [], timeSlot: String(row.scheduled_slot),
    quantity: Number(row.quantity || 1), unit: String(row.unit || "pack"), mode: String(row.fulfilment_mode) === "self_pickup" ? "Self pickup" : "Vendor delivery",
    estimatedOccurrences: 1, status: String(row.status || "active") === "paused" ? "Paused" : String(row.status || "active") === "cancelled" ? "Cancelled" : String(row.status || "active") === "completed" ? "Completed" : String(row.status || "active") === "awaiting_payment" ? "Awaiting payment" : "Active",
    nextDeliveryAt: row.next_delivery_at ? String(row.next_delivery_at) : undefined, whatsappReminder: row.whatsapp_reminder_enabled !== false,
  }));
  const orderScheduleIds = new Set(orders.map((order) => order.scheduleId).filter(Boolean) as string[]);
  const preservedSchedules = current.schedules.filter((schedule) => orderScheduleIds.has(schedule.id) && !schedules.some((live) => live.id === schedule.id));
  const mergedSchedules = [...schedules, ...preservedSchedules];
  const staff: Staff[] = (snapshot.staff || []).map((row) => ({ id: String(row.id), vendorId: String(row.vendor_id), name: String(row.full_name || "Delivery person"), phone: String(row.phone || ""), active: row.active !== false }));
  const assignments: Assignment[] = (snapshot.assignments || []).map((row) => ({ id: String(row.id), orderId: String(row.order_id), staffId: String(row.delivery_staff_id), assignedAt: String(row.assigned_at || "") }));
  const syncedCart: CartItem[] = session.role === "customer" ? (snapshot.cartItems || []).map((row) => ({ id: String(row.id), customerEmail: session.email, productId: String(row.menu_item_id), quantity: Math.max(0.001, Number(row.quantity || 1)) })) : [];
  const cart = session.role === "customer" ? [...current.cart.filter((item) => item.customerEmail !== session.email), ...syncedCart] : current.cart;
  return { ...current, orders, schedules: mergedSchedules, staff, assignments, cart };
}
async function findLocation(params: { lat?: number; lng?: number; address?: string }) {
  const query = params.address ? `q=${encodeURIComponent(params.address)}` : `lat=${params.lat}&lng=${params.lng}`;
  const response = await fetch(`/api/geocode?${query}`);
  const result = await response.json() as { address?: string; latitude?: number; longitude?: number; error?: string };
  if (!response.ok || !Number.isFinite(result.latitude) || !Number.isFinite(result.longitude)) throw new Error(result.error || "Location was not found");
  return result as { address: string; latitude: number; longitude: number };
}

type PlaceSuggestion = { address: string; latitude: number; longitude: number };

/** Debounced type-ahead over the same free Nominatim geocoder `findLocation` already
 * uses, so typing an address shows 3-5 real suggestions instead of requiring an
 * explicit "Find typed address" click. Selecting one still stores lat/lng as the
 * source of truth, exactly like the GPS and manual-search paths. */
function LocationSuggestions({ query, onSelect }: { query: string; onSelect: (place: PlaceSuggestion) => void }) {
  const trimmed = query.trim();
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [dismissed, setDismissed] = useState("");
  useEffect(() => {
    if (trimmed.length < 3 || trimmed === dismissed) { setSuggestions([]); return; }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/geocode?q=${encodeURIComponent(trimmed)}&suggest=1`);
        const data = await response.json() as { suggestions?: PlaceSuggestion[] };
        if (!cancelled) setSuggestions(data.suggestions || []);
      } catch { if (!cancelled) setSuggestions([]); }
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [trimmed, dismissed]);
  if (!suggestions.length) return null;
  return (
    <div className="relative z-10 -mt-2 space-y-1 rounded-2xl border border-stone-200 bg-white/95 p-1.5 shadow-lg backdrop-blur">
      {suggestions.map((item, index) => {
        const [primary, ...rest] = item.address.split(",");
        return (
          <button type="button" key={`${item.latitude}-${item.longitude}-${index}`} onClick={() => { onSelect(item); setSuggestions([]); setDismissed(trimmed); }} className="flex w-full items-start gap-2.5 rounded-xl p-2.5 text-left hover:bg-[#f1f6e8]">
            <MapPin className="mt-0.5 size-4 shrink-0 text-[#5f8f2d]" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-stone-800">{primary.trim()}</span>
              <span className="block truncate text-xs text-stone-500">{rest.join(",").trim()}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function ShePlatesV3() {
  const [session, setSession] = useState<DemoSession | null>(null);
  const [state, setState] = useState<V3State>(EMPTY_STATE);
  const [active, setActive] = useState("Marketplace");
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [customerMenuOpen, setCustomerMenuOpen] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [liveSync, setLiveSync] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [liveSyncError, setLiveSyncError] = useState("");
  const [syncVersion, setSyncVersion] = useState(0);
  const [tourOpen, setTourOpen] = useState<null | "customer" | "vendor">(null);
  const lastAlertedNotification = useRef<string>("");

  useEffect(() => {
    if (!hydrated || !session) return;
    const key = session.role === "customer" ? CUSTOMER_TOUR_KEY : session.role === "vendor" ? VENDOR_TOUR_KEY : null;
    if (!key || (session.toursCompleted || []).includes(key)) return;
    const timer = window.setTimeout(() => setTourOpen(session.role === "customer" ? "customer" : "vendor"), 900);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, session?.email, session?.role]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORE_KEY);
      const savedSession = localStorage.getItem(SESSION_KEY);
      queueMicrotask(() => {
        if (saved) setState(repairSavedState(JSON.parse(saved) as V3State));
        if (savedSession) { const parsed = JSON.parse(savedSession) as DemoSession; setSession(parsed); setActive(nav[parsed.role][0]); }
        setHydrated(true);
      });
    } catch { queueMicrotask(() => setHydrated(true)); }
  }, []);
  useEffect(() => { if (hydrated) localStorage.setItem(STORE_KEY, JSON.stringify(state)); }, [state, hydrated]);
  useEffect(() => { if (!hydrated) return; if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session)); else localStorage.removeItem(SESSION_KEY); }, [session, hydrated]);
  useEffect(() => { if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined); }, []);
  useEffect(() => {
    if (!session) return;
    const newest = state.notifications.find((item) => notificationBelongsToSession(item, session) && !item.read);
    if (!newest || newest.id === lastAlertedNotification.current) return;
    lastAlertedNotification.current = newest.id;
    const important = /order|payment|delivery|verification|quote|schedule/i.test(`${newest.title} ${newest.body}`);
    if (!important) return;
    playNotificationSound();
    toast(newest.title, { description: newest.body, duration: 7000 });
    showDeviceNotification(newest.title, newest.body);
  }, [state.notifications, session]);
  useEffect(() => {
    if (!session || !isLiveSupabaseMode()) return;
    let stopped = false;
    const refreshNotifications = async () => {
      try {
        const [rows, commerce] = await Promise.all([loadLiveNotifications(), loadLiveCommerceSnapshot()]);
        if (!stopped) setState((current) => {
          const synced = mergeLiveCommerce(current, commerce, session);
          return { ...synced, notifications: [
            ...rows.map((row) => ({ id: row.id, recipient: session.email, recipientRole: session.role, title: row.title, body: row.body, at: new Date(row.created_at).toLocaleString("en-IN"), read: Boolean(row.read_at) })),
            ...synced.notifications.filter((item) => !notificationBelongsToSession(item, session) || item.id.startsWith("NOT-")),
          ].filter((item, index, list) => list.findIndex((candidate) => candidate.id === item.id) === index) };
        });
      } catch { /* keep the last safe snapshot while offline */ }
    };
    void refreshNotifications();
    const timer = window.setInterval(refreshNotifications, 15000);
    return () => { stopped = true; window.clearInterval(timer); };
  }, [session]);
  useEffect(() => {
    if (!hydrated || !session) return;
    if (!isLiveSupabaseMode()) { queueMicrotask(() => setLiveSync("ready")); return; }
    let cancelled = false;
    const syncTimeout = window.setTimeout(() => {
      if (!cancelled) {
        setLiveSync("error");
        setLiveSyncError("The account service did not respond within 10 seconds. You can continue using the page and retry.");
      }
    }, 10000);
    queueMicrotask(() => { setLiveSync("loading"); setLiveSyncError(""); });
    (async () => {
      if (session.role === "customer") {
        const preference = session.userId ? await loadLiveCustomerPreference(session.userId) : null;
        const memoryRows = session.userId ? await loadLiveCustomerMemory(session.userId) : [];
        const liveMemory: AgentMemory = {};
        for (const row of memoryRows as Array<{ memory_key: string; memory_value: string }>) {
          if (row.memory_key === "preferred_budget") liveMemory.lastBudget = Number(row.memory_value) || undefined;
          if (row.memory_key === "favorite_categories") liveMemory.favoriteCategories = row.memory_value.split(",").map((item) => item.trim()).filter(Boolean);
          if (row.memory_key === "favorite_products") liveMemory.favoriteProducts = row.memory_value.split(",").map((item) => item.trim()).filter(Boolean);
          if (row.memory_key === "calorie_target") liveMemory.calorieTarget = Number(row.memory_value) || undefined;
          if (row.memory_key === "protein_preference") liveMemory.minProtein = Number(row.memory_value) || undefined;
          if (row.memory_key === "dietary_preference") liveMemory.preferredDietaryTags = row.memory_value.split(",").map((item) => item.trim()).filter(Boolean);
          if (row.memory_key === "delivery_window") liveMemory.preferredDeliveryPeriod = row.memory_value;
        }
        let products: Product[] = []; let vendors: Vendor[] = []; let merchandising = { featuredProductIds: [] as string[], recommendationPopupEnabled: true, maxFeatured: 6 }; let merchandisingError: string | null = null;
        if (preference && Number.isFinite(Number(preference.latitude)) && Number.isFinite(Number(preference.longitude))) {
          const marketplace = await loadLiveMarketplace(Number(preference.latitude), Number(preference.longitude));
          products = marketplace.items.map(marketplaceProductFromLive); merchandising = marketplace.merchandising; merchandisingError = marketplace.merchandisingError || null;
          const unique = new Map<string, Vendor>();
          marketplace.items.forEach((row) => unique.set(row.vendor_id, {
            id: row.vendor_id, ownerEmail: "vendor@sheplates.local", ownerName: "Verified vendor", businessName: row.vendor_name,
            category: row.category, address: "Serviceable near your delivery pin", radiusKm: Math.max(1, Number(row.distance_km)),
            delivery: row.delivery_enabled, pickup: row.pickup_enabled, openToday: true, fssaiNumber: "Verified",
            certificateName: "Private", expiryDate: "—", verification: "Verified", operational: "Active", plan: "Launch",
          }));
          vendors = [...unique.values()];
        }
        if (!cancelled) setState((current) => ({
          ...current,
          customers: preference ? [...current.customers.filter((item) => item.email !== session.email), {
            email: session.email, address: String(preference.address), latitude: Number(preference.latitude), longitude: Number(preference.longitude),
            householdSize: Number(preference.household_size || 1), diet: String(preference.diet || "No preference"),
            allergies: preference.allergies || [], goals: preference.health_goals || [], dislikes: String(preference.dislikes_and_instructions || ""),
            onboardingComplete: Boolean(preference.onboarding_complete), agentMemory: liveMemory,
          }] : current.customers.filter((item) => item.email !== session.email),
          vendors, products, markups: {}, merchandising, merchandisingError,
        }));
      } else if (session.role === "vendor" && session.vendorId) {
        const workspace = await loadLiveVendorWorkspace(session.vendorId);
        if (!cancelled) setState((current) => ({ ...current,
          vendors: [vendorFromLive(workspace.vendor, { email: session.email, name: session.name }, workspace.document || undefined)],
          products: workspace.products.map(productFromLive),
        }));
      } else {
        const workspace = await loadLiveOperationsWorkspace();
        if (!cancelled) setState((current) => ({ ...current,
          vendors: workspace.vendors.map((row) => {
            const profile = workspace.profiles.find((item) => item.vendor_id === row.id || item.id === row.owner_id);
            const document = workspace.documents.find((item) => item.vendor_id === row.id);
            return vendorFromLive(row, { name: profile?.full_name }, document);
          }),
          products: workspace.products.map(productFromLive),
          merchandising: workspace.merchandising || current.merchandising,
          merchandisingError: workspace.merchandisingError || null,
          campaigns: (workspace.campaigns || []).map((row: { id: string; name: string; audience: string; offer: string; channel: string; status: string; ai_rationale?: string; created_at: string }) => ({ id: row.id, name: row.name, audience: row.audience, offer: row.offer, channel: row.channel, status: row.status === "active" ? "Active" : row.status === "paused" ? "Paused" : "Draft", aiRationale: row.ai_rationale || "", createdAt: row.created_at })),
        }));
      }
      const commerce = await loadLiveCommerceSnapshot();
      if (!cancelled) setState((current) => mergeLiveCommerce(current, commerce, session));
      window.clearTimeout(syncTimeout);
      if (!cancelled) setLiveSync("ready");
    })().catch((error) => { window.clearTimeout(syncTimeout); if (!cancelled) { setLiveSync("error"); setLiveSyncError(error instanceof Error ? error.message : "Your latest account data could not be loaded"); } });
    return () => { cancelled = true; window.clearTimeout(syncTimeout); };
  }, [hydrated, session, syncVersion]);

  async function signOut() { await liveSignOut(); setSession(null); setActive("Marketplace"); toast.success("Signed out"); }
  function finishTour(skipped: boolean) {
    const key = tourOpen === "customer" ? CUSTOMER_TOUR_KEY : VENDOR_TOUR_KEY;
    setTourOpen(null);
    setSession((current) => {
      if (!current) return current;
      const toursCompleted = [...new Set([...(current.toursCompleted || []), key])];
      if (isLiveSupabaseMode() && current.userId) void saveLiveTourCompleted(current.userId, toursCompleted);
      return { ...current, toursCompleted };
    });
    if (skipped) toast("Tour skipped — replay it anytime from Help", { duration: 4000 });
  }
  function replayTour() { if (session?.role === "customer" || session?.role === "vendor") setTourOpen(session.role); }
  if (!session) return <ShePlatesEntry onLogin={(next) => { setSession(next); setActive(nav[next.role][0]); }} />;
  const role = session.role;
  const customer = state.customers.find((item) => item.email === session.email);
  const vendor = vendorFor(state, session);
  const needsRemoteIdentity = (role === "customer" && !customer) || (role === "vendor" && Boolean(session.vendorId) && !vendor);
  if (isLiveSupabaseMode() && liveSync === "loading" && needsRemoteIdentity) return <div className="sp-v7 grid min-h-screen place-items-center bg-[#f7f8f3] p-5"><div className="text-center"><RefreshCcw className="mx-auto size-8 animate-spin text-[#5ba400]" /><div className="mt-4 font-black">Loading your ShePlates profile…</div><p className="mt-1 text-sm text-stone-500">You can continue if the account service is temporarily unavailable.</p><Button variant="outline" onClick={() => setLiveSync("ready")} className="mt-5 rounded-xl">Continue to setup</Button></div></div>;
  if (isLiveSupabaseMode() && liveSync === "error" && needsRemoteIdentity) return <div className="sp-v7 grid min-h-screen place-items-center bg-[#f7f8f3] p-5"><div className="surface-card max-w-lg rounded-[28px] p-6 text-center"><AlertTriangle className="mx-auto text-amber-600" /><h1 className="mt-4 text-xl font-black">Account sync is unavailable</h1><p className="mt-2 text-sm text-stone-500">{liveSyncError}</p><div className="mt-5 flex justify-center gap-2"><Button onClick={() => setSyncVersion((value) => value + 1)} className="rounded-xl bg-[#5ba400]"><RefreshCcw />Try again</Button><Button variant="outline" onClick={() => setLiveSync("ready")} className="rounded-xl">Continue to setup</Button></div></div></div>;
  if (role === "customer" && !customer?.onboardingComplete) return <CustomerOnboarding session={session} onSave={(profile) => setState((s) => ({ ...s, customers: [...s.customers.filter((x) => x.email !== profile.email), profile], audit: [audit(session, "Completed customer food profile", profile.diet), ...s.audit] }))} onLogout={signOut} />;
  if (role === "vendor" && !vendor) return <VendorOnboarding session={session} setState={setState} onLogout={signOut} />;

  const unread = state.notifications.filter((item) => notificationBelongsToSession(item, session) && !item.read).length;
  const content = role === "customer"
    ? <CustomerArea active={active} session={session} state={state} setState={setState} navigate={setActive} openAgent={() => setAgentOpen(true)} />
    : role === "vendor"
      ? <VendorArea active={active} session={session} state={state} setState={setState} />
      : role === "operations"
        ? <OperationsArea active={active} session={session} state={state} setState={setState} />
        : <AdminArea active={active} session={session} state={state} setState={setState} />;

  const customerCartCount = role === "customer" ? state.cart.filter((item) => item.customerEmail === session.email).reduce((sum, item) => sum + item.quantity, 0) : 0;
  const customerQuoteCount = role === "customer" ? state.quotes.filter((quote) => {
    const requirement = state.requirements.find((item) => item.id === quote.requirementId);
    return requirement?.customerEmail === session.email && quote.status === "Submitted";
  }).length : 0;

  return <div className="app-shell-bg sp-v7 min-h-screen text-[#171312]">
    <Toaster position="top-center" richColors />
    <header className="glass sp-app-header sticky top-0 z-40 border-b border-white/70">
      <div className="mx-auto flex h-[78px] max-w-[1700px] items-center gap-3 px-4 lg:px-7">
        {role !== "customer" && <button className="grid size-10 place-items-center rounded-full border border-stone-200/70 bg-white/80 shadow-sm" onClick={() => { setSidebarCollapsed(false); setMenuOpen((v) => !v); }} aria-label="Toggle navigation"><Menu className="size-5" /></button>}
        <Logo />
        {role === "customer" ? <div className="relative ml-1 hidden sm:block">
          <button data-tour="account" onClick={() => setCustomerMenuOpen((value) => !value)} className="flex items-center gap-2 rounded-2xl px-2.5 py-2 text-left transition hover:bg-white/70">
            <div className="grid size-9 place-items-center rounded-full bg-[#171914] text-xs font-black text-white">{session.name.slice(0, 2).toUpperCase()}</div>
            <div className="hidden max-w-44 sm:block"><div className="truncate text-sm font-black">{session.name}</div><div className="truncate text-[11px] text-stone-500">Account & preferences</div></div>
            <ChevronDown className={`size-4 text-stone-500 transition ${customerMenuOpen ? "rotate-180" : ""}`} />
          </button>
          {customerMenuOpen && <div className="surface-card absolute left-0 top-[58px] z-50 w-72 rounded-[24px] p-2 shadow-2xl">
            <div className="rounded-2xl bg-[#f6f3ed] p-3"><div className="font-black">{session.name}</div><div className="truncate text-xs text-stone-500">{session.email}</div></div>
            <div className="mt-2 space-y-1">
              {[
                ["Profile & food", HeartPulse],
                ["Orders", Package],
                ["My schedule", CalendarDays],
                ["Monthly requirement", ListChecks],
                ["Ticket centre", TicketCheck],
              ].map(([label, Icon]) => <button key={String(label)} onClick={() => { setActive(String(label)); setCustomerMenuOpen(false); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold hover:bg-stone-50"><Icon className="size-4 text-stone-500" />{String(label)}</button>)}
              <button onClick={() => { replayTour(); setCustomerMenuOpen(false); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold hover:bg-stone-50"><HelpCircle className="size-4 text-stone-500" />Help · Product tour</button>
              <button onClick={signOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50"><LogOut className="size-4" />Sign out</button>
            </div>
          </div>}
        </div> : null}

        <div className="ml-auto flex items-center gap-1.5">
          {role === "customer" ? <>
            <button onClick={() => setNotificationsOpen(true)} className="relative grid size-10 place-items-center rounded-full border border-stone-200/70 bg-white/80 sm:hidden" aria-label="Notifications"><Bell className="size-[18px]" />{unread > 0 && <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-[#ef3d3d] px-1 text-[10px] font-black text-white">{unread}</span>}</button>
            <span className="sp-desktop-customer-actions contents">
            <button onClick={() => setActive("Marketplace")} className={`hidden rounded-xl px-3 py-2 text-sm font-black sm:block ${active === "Marketplace" ? "bg-[#eff6e6] text-[#50772a]" : "text-stone-500 hover:bg-white/70"}`}>Marketplace</button>
            <button data-tour="quotations" onClick={() => setActive("My quotations")} className="relative grid size-11 place-items-center rounded-full border border-stone-200/70 bg-white/70 hover:bg-white" title="My quotations"><ClipboardCheck className="size-5" />{customerQuoteCount > 0 && <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-[#5f8f2d] px-1 text-[10px] font-black text-white">{customerQuoteCount}</span>}</button>
            <button onClick={() => setNotificationsOpen(true)} className="relative grid size-11 place-items-center rounded-full border border-stone-200/70 bg-white/70 hover:bg-white" aria-label="Notifications"><Bell className="size-5" />{unread > 0 && <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-[#ef3d3d] px-1 text-[10px] font-black text-white">{unread}</span>}</button>
            <button data-tour="cart" onClick={() => setActive("Cart")} className="relative grid size-11 place-items-center rounded-full bg-[#171914] text-white shadow-lg" title="Cart"><ShoppingCart className="size-5" />{customerCartCount > 0 && <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-[#ef3d3d] px-1 text-[10px] font-black text-white">{customerCartCount}</span>}</button>
            </span>
          </> : <>
            <RolePill>{roleName[role]}</RolePill>
            <button onClick={() => setNotificationsOpen(true)} className="relative grid size-11 place-items-center rounded-full hover:bg-stone-100" aria-label="Notifications"><Bell className="size-5" />{unread > 0 && <span className="absolute right-1 top-1 grid min-w-5 place-items-center rounded-full bg-[#ef3d3d] px-1 text-[10px] font-black text-white">{unread}</span>}</button>
            <div className="hidden text-right sm:block"><div className="text-sm font-black">{session.name}</div><div className="text-xs text-stone-500">{session.email}</div></div>
            <button onClick={signOut} className="grid size-10 place-items-center rounded-full border" title="Sign out"><LogOut className="size-4" /></button>
          </>}
        </div>
      </div>
    </header>

    {role === "customer" ? <main className="sp-customer-main mx-auto min-w-0 max-w-[1540px] p-4 pb-28 sm:p-6 lg:p-8">
      {isLiveSupabaseMode() && liveSync === "loading" && <div className="surface-card mb-4 flex items-center gap-3 rounded-2xl border border-sky-200/70 bg-sky-50/90 p-3 text-sm text-sky-900"><RefreshCcw className="size-4 animate-spin" /><span className="flex-1 font-bold">Refreshing your latest data…</span></div>}
      {isLiveSupabaseMode() && liveSync === "error" && <div className="surface-card mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200/70 bg-amber-50/90 p-3 text-sm text-amber-900"><AlertTriangle className="size-4" /><span className="min-w-0 flex-1"><b>Account sync paused.</b> {liveSyncError}</span><Button size="sm" variant="outline" onClick={() => setSyncVersion((value) => value + 1)} className="rounded-lg"><RefreshCcw />Retry</Button></div>}
      {content}
      {!notificationsOpen && <nav className="sp-mobile-bottom-nav" aria-label="Customer navigation">
        <button data-active={active === "Marketplace"} onClick={() => { setActive("Marketplace"); setCustomerMenuOpen(false); }}><ShoppingBag className="size-5" /><span>Explore</span></button>
        <button data-tour="orders-mobile" data-active={active === "Orders"} onClick={() => { setActive("Orders"); setCustomerMenuOpen(false); }}><Package className="size-5" /><span>Orders</span></button>
        <button data-tour="agent-mobile" className="sp-nav-agent" onClick={() => { setAgentOpen(true); setCustomerMenuOpen(false); }} aria-label="Open She Agent"><Activity className="size-6" /><span>She Agent</span></button>
        <button data-tour="cart-mobile" data-active={active === "Cart"} className="relative" onClick={() => { setActive("Cart"); setCustomerMenuOpen(false); }}><ShoppingCart className="size-5" /><span>Cart</span>{customerCartCount > 0 && <span className="absolute right-2 top-1 grid min-w-4 place-items-center rounded-full bg-[#ff6248] px-1 text-[9px] font-black text-white">{customerCartCount}</span>}</button>
        <button data-tour="account-mobile" data-active={customerMenuOpen || ["Profile & food","My schedule","Monthly requirement","My quotations","Ticket centre"].includes(active)} onClick={() => setCustomerMenuOpen((value) => !value)}><CircleUserRound className="size-5" /><span>Account</span></button>
      </nav>}
      {customerMenuOpen && <><button className="fixed inset-0 z-[56] bg-black/25 backdrop-blur-[2px] sm:hidden" onClick={() => setCustomerMenuOpen(false)} aria-label="Close account menu" /><section className="sp-account-sheet fixed inset-x-3 bottom-[88px] z-[57] rounded-[28px] border border-white/70 bg-white/96 p-3 shadow-[0_28px_90px_rgba(18,21,16,.24)] backdrop-blur-xl sm:hidden">
        <div className="flex items-center gap-3 rounded-[22px] bg-[#f5f3ed] p-3"><div className="grid size-11 place-items-center rounded-2xl bg-[#171914] text-sm font-black text-white">{session.name.slice(0,2).toUpperCase()}</div><div className="min-w-0 flex-1"><div className="truncate font-black">{session.name}</div><div className="truncate text-xs text-stone-500">{session.email}</div></div><button onClick={() => setCustomerMenuOpen(false)} className="grid size-9 place-items-center rounded-full bg-white"><X className="size-4" /></button></div>
        <div className="mt-2 grid grid-cols-2 gap-2">{[["Profile & food",HeartPulse],["My schedule",CalendarDays],["Monthly requirement",ListChecks],["My quotations",ClipboardCheck],["Ticket centre",TicketCheck]].map(([label,Icon]) => <button key={String(label)} onClick={() => { setActive(String(label)); setCustomerMenuOpen(false); }} className="flex min-h-14 items-center gap-2 rounded-2xl border border-stone-200/70 bg-white px-3 text-left text-xs font-black"><Icon className="size-4 text-[#5f8f2d]" />{String(label)}</button>)}</div>
        <button onClick={() => { replayTour(); setCustomerMenuOpen(false); }} className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-stone-200/70 bg-white text-sm font-black text-stone-600"><HelpCircle className="size-4" />Help · Product tour</button>
        <button onClick={signOut} className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-red-50 text-sm font-black text-red-600"><LogOut className="size-4" />Sign out</button>
      </section></>}
    </main> : <div className="mx-auto flex max-w-[1700px] gap-0 lg:gap-4">
      {menuOpen && <button className="sp-mobile-nav-overlay lg:hidden" onClick={() => setMenuOpen(false)} aria-label="Close navigation" />}
      <aside className={`${menuOpen ? "fixed inset-y-[78px] left-0 z-30 flex" : "hidden"} nav-shell sp-portal-sidebar ${sidebarCollapsed ? "w-24" : "w-72"} shrink-0 flex-col p-4 text-white lg:sticky lg:top-[94px] lg:m-4 lg:flex lg:h-[calc(100vh-110px)] lg:rounded-[30px] lg:border lg:border-white/8 transition-[width]`}>
        <div className="mb-3 flex items-center justify-between lg:hidden"><div className="flex items-center gap-2"><img src="/sheplates-logo.png" alt="" className="size-9 rounded-xl bg-white p-1" /><div><div className="text-sm font-black">ShePlates</div><div className="text-[10px] uppercase tracking-wider text-white/45">{roleName[role]}</div></div></div><button onClick={() => setMenuOpen(false)} className="grid size-10 place-items-center rounded-full bg-white/10"><X className="size-4" /></button></div>
        <button onClick={() => setSidebarCollapsed((value) => !value)} className="mb-3 hidden items-center justify-center rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-black text-white/65 hover:bg-white/10 lg:flex">{sidebarCollapsed ? "→" : "← Collapse"}</button>
        <nav className="space-y-1.5">{nav[role].map((label) => { const Icon = navIcons[label] || Store; return <button key={label} data-tour-nav={label} title={sidebarCollapsed ? label : undefined} onClick={() => { setActive(label); setMenuOpen(false); }} className={`nav-item flex w-full items-center ${sidebarCollapsed ? "justify-center px-3" : "gap-3 px-4"} rounded-2xl py-3.5 text-left text-sm font-bold transition ${active === label ? "nav-item-active" : ""}`}><Icon className="size-[18px] shrink-0" />{!sidebarCollapsed && label}</button>; })}</nav>
        {role === "vendor" && <button onClick={() => { replayTour(); setMenuOpen(false); }} className={`nav-item mt-1.5 flex w-full items-center ${sidebarCollapsed ? "justify-center px-3" : "gap-3 px-4"} rounded-2xl py-3.5 text-left text-sm font-bold`} title={sidebarCollapsed ? "Help" : undefined}><HelpCircle className="size-[18px] shrink-0" />{!sidebarCollapsed && "Help · Product tour"}</button>}
      </aside>
      <main className="sp-portal-main min-w-0 flex-1 p-4 pb-28 sm:p-6 lg:p-8 lg:pl-0">
        {isLiveSupabaseMode() && liveSync === "loading" && <div className="surface-card mb-4 flex items-center gap-3 rounded-2xl border border-sky-200/70 bg-sky-50/90 p-3 text-sm text-sky-900"><RefreshCcw className="size-4 animate-spin" /><span className="flex-1 font-bold">Refreshing your latest data…</span></div>}
        {isLiveSupabaseMode() && liveSync === "error" && <div className="surface-card mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200/70 bg-amber-50/90 p-3 text-sm text-amber-900"><AlertTriangle className="size-4" /><span className="min-w-0 flex-1"><b>Account sync paused.</b> {liveSyncError}</span><Button size="sm" variant="outline" onClick={() => setSyncVersion((value) => value + 1)} className="rounded-lg"><RefreshCcw />Retry</Button></div>}
        {content}
      </main>
    </div>}

    <button data-tour="agent-desktop" onClick={() => setAgentOpen(true)} className={`${role === "customer" ? "sp-desktop-agent-launcher" : "sp-staff-agent-launcher"} sp-agent-launcher group fixed bottom-5 right-4 z-30 flex items-center gap-3 rounded-full border border-white/70 bg-white/92 p-2 pr-4 shadow-[0_22px_70px_rgba(17,22,17,.24)] backdrop-blur-xl transition hover:-translate-y-1 hover:shadow-[0_28px_90px_rgba(17,22,17,.30)] sm:right-6`} aria-label="Open She Agent">
      <span className="sp-agent-orb relative grid size-12 place-items-center rounded-full text-white"><Activity className="size-5" /><span className="sp-agent-orb-status absolute right-0 top-0 size-3 rounded-full" /></span>
      <span className="hidden text-left sm:block"><span className="block text-sm font-black leading-4">She Agent</span><span className="mt-1 block text-[11px] font-bold text-stone-500">{role === "customer" ? "Ask naturally · grounded in your marketplace" : "Ask your commerce copilot"}</span></span>
    </button>
    <NotificationDrawerV4 open={notificationsOpen} setOpen={setNotificationsOpen} session={session} state={state} setState={setState} />
    <SheAgent open={agentOpen} setOpen={setAgentOpen} session={session} state={state} setState={setState} navigate={setActive} />
    {tourOpen === "customer" && <ProductTour steps={CUSTOMER_TOUR_STEPS} onClose={finishTour} />}
    {tourOpen === "vendor" && <ProductTour steps={VENDOR_TOUR_STEPS} onClose={finishTour} />}
  </div>;
}

function audit(session: DemoSession, action: string, detail: string): Audit { return { id: id("AUD"), actor: `${session.name} · ${roleName[session.role]}`, action, detail, at: now() }; }
function Logo() { return <div className="flex min-w-0 items-center gap-2.5 sm:gap-3"><div className="surface-card-muted grid size-10 shrink-0 place-items-center rounded-[14px] sm:size-12 sm:rounded-2xl"><img src="/sheplates-logo.png" alt="ShePlates" className="size-8 rounded-full object-contain sm:size-10" /></div><div className="min-w-0"><div className="truncate text-lg font-black tracking-[-.04em] sm:text-xl">ShePlates</div><div className="hidden text-[9px] font-black uppercase tracking-[.18em] text-[#5f8f2d] min-[390px]:block sm:text-[10px]">Agentic local commerce</div></div></div>; }
function RolePill({ children }: { children: React.ReactNode }) { return <span className="soft-chip hidden sm:inline-flex">{children}</span>; }

type TourStep = { selectors: string[]; title: string; body: string };

const CUSTOMER_TOUR_KEY = "customer_v1";
const VENDOR_TOUR_KEY = "vendor_v1";

const CUSTOMER_TOUR_STEPS: TourStep[] = [
  { selectors: ['[data-tour="location"]'], title: "Your delivery location", body: "Set your delivery pin here — by GPS or by typing an address. Every product you see is matched to this exact location, not just the text." },
  { selectors: ['[data-tour="search"]'], title: "Search the marketplace", body: "Look up a product, vendor, category or dietary tag directly." },
  { selectors: ['[data-tour="categories"]'], title: "Browse categories", body: "Jump straight to milk, home food, vegetables, groceries and more." },
  { selectors: ['[data-tour="filters"]'], title: "Filters", body: "Narrow by budget, calories, protein and dietary preference." },
  { selectors: ['[data-tour="products"]'], title: "Add to Cart or Schedule", body: "Every product has two independent actions: Add puts it straight in your cart; Plan opens a one-off or recurring delivery schedule for it." },
  { selectors: ['[data-tour="agent-desktop"]', '[data-tour="agent-mobile"]'], title: "She Agent", body: "Ask in plain language — \"add milk to my cart\" or \"what did I order last week\" — and She Agent uses the same cart and order history you see here." },
  { selectors: ['[data-tour="cart"]', '[data-tour="cart-mobile"]'], title: "Cart", body: "Your saved basket — it persists across refresh, logout and devices, and is shared with She Agent." },
  { selectors: ['[data-tour="orders-mobile"]'], title: "Orders", body: "Track every order's status, from confirmed through to delivered." },
  { selectors: ['[data-tour="quotations"]'], title: "My Quotations", body: "Compare sealed vendor quotes after you publish a monthly requirement." },
  { selectors: ['[data-tour="account"]', '[data-tour="account-mobile"]'], title: "Profile & food, and more", body: "Your account menu holds Profile & Food, My Schedule, Monthly Requirement, My Quotations and Ticket Centre." },
];

const VENDOR_TOUR_STEPS: TourStep[] = [
  { selectors: ['[data-tour-nav="Dashboard"]'], title: "Dashboard", body: "Your daily fulfilment load, GMV and store health at a glance." },
  { selectors: ['[data-tour="store-open"]', '[data-tour-nav="Store & radius"]'], title: "Store open/close & radius", body: "Open or close for the day, and set your exact store pin and service radius — customer matching uses this coordinate, not your address text." },
  { selectors: ['[data-tour-nav="Verification"]'], title: "Verification", body: "Submit your food certification here. Operations must verify you before customers can see your products." },
  { selectors: ['[data-tour-nav="Catalog"]'], title: "Catalog", body: "Create products with an exact pack size, price and stock count." },
  { selectors: ['[data-tour-nav="Quote opportunities"]'], title: "Quote opportunities", body: "Respond to monthly requirement RFQs from eligible customers." },
  { selectors: ['[data-tour-nav="Orders"]'], title: "Orders", body: "Fulfil scheduled and one-off orders, and update their status." },
  { selectors: ['[data-tour-nav="Delivery team"]'], title: "Delivery team", body: "Add your delivery staff and assign them to orders." },
  { selectors: ['[data-tour-nav="Settlements"]'], title: "Settlements", body: "See your collected payments, commission and payout schedule." },
  { selectors: ['[data-tour-nav="AI insights"]'], title: "AI insights", body: "Explainable, data-grounded signals about stock risk and fulfilment load." },
  { selectors: ['[data-tour-nav="Ticket centre"]'], title: "Tickets", body: "Raise and track support tickets with Operations." },
];

/** Contextual coach-mark tour: darkens the page, spotlights one real UI element
 * at a time via a fixed-position ring (not a screenshot/mock), and steps
 * through Back/Next/Skip. Portalled to <body> so its fixed positioning is
 * never affected by an ancestor's transform/backdrop-filter. */
function ProductTour({ steps, onClose }: { steps: TourStep[]; onClose: (skipped: boolean) => void }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });

  useEffect(() => {
    function locate() {
      for (let i = index; i < steps.length; i++) {
        const el = steps[i].selectors.map((selector) => document.querySelector(selector) as HTMLElement | null).find((node) => node && node.offsetParent !== null);
        if (el) {
          if (i !== index) { setIndex(i); return; }
          setRect(el.getBoundingClientRect());
          setViewport({ w: window.innerWidth, h: window.innerHeight });
          if (i === index) el.scrollIntoView({ block: "center", behavior: "smooth" });
          return;
        }
      }
      onClose(false);
    }
    locate();
    window.addEventListener("resize", locate);
    window.addEventListener("scroll", locate, true);
    const timer = window.setInterval(locate, 500);
    return () => { window.removeEventListener("resize", locate); window.removeEventListener("scroll", locate, true); window.clearInterval(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  if (!rect || typeof document === "undefined") return null;
  const step = steps[index];
  const pad = 8;
  const spot = { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 };
  const cardWidth = 300;
  const spaceBelow = viewport.h - (spot.top + spot.height);
  const showBelow = spaceBelow > 190 || spot.top < 190;
  const cardTop = showBelow ? Math.min(spot.top + spot.height + 14, viewport.h - 200) : Math.max(14, spot.top - 190);
  const cardLeft = Math.min(Math.max(14, spot.left), Math.max(14, viewport.w - cardWidth - 14));

  return createPortal(
    <div className="fixed inset-0 z-[300]" role="dialog" aria-modal="true" aria-label="Product tour">
      <div className="absolute rounded-2xl transition-all duration-200" style={{ top: spot.top, left: spot.left, width: spot.width, height: spot.height, boxShadow: "0 0 0 9999px rgba(11,15,11,.58)", border: "2px solid rgba(255,255,255,.92)", pointerEvents: "none" }} />
      <div className="glass absolute rounded-[22px] border border-white/70 bg-white/95 p-4 shadow-2xl backdrop-blur-xl" style={{ top: cardTop, left: cardLeft, width: cardWidth }}>
        <div className="text-[10px] font-black uppercase tracking-[.12em] text-[#5f8f2d]">Step {index + 1} of {steps.length}</div>
        <h4 className="mt-1 text-base font-black text-[#171917]">{step.title}</h4>
        <p className="mt-1.5 text-sm leading-5 text-stone-600">{step.body}</p>
        <div className="mt-3.5 flex items-center justify-between">
          <button onClick={() => onClose(true)} className="text-xs font-bold text-stone-400 hover:text-stone-600">Skip</button>
          <div className="flex gap-2">
            {index > 0 && <Button size="sm" variant="outline" className="rounded-lg" onClick={() => setIndex((i) => i - 1)}>Back</Button>}
            <Button size="sm" className="rounded-lg bg-[#237a45] hover:bg-[#153d2a]" onClick={() => index === steps.length - 1 ? onClose(false) : setIndex((i) => i + 1)}>{index === steps.length - 1 ? "Finish" : "Next"}</Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
function Heading({ eyebrow, title, body, action }: { eyebrow: string; title: string; body: string; action?: React.ReactNode }) { return <div className="sp-page-heading flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-end lg:justify-between"><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[.19em] text-[#5f8f2d] sm:text-xs">{eyebrow}</p><h1 className="mt-1.5 text-[1.8rem] font-black leading-[1.04] tracking-[-.05em] sm:mt-2 sm:text-4xl">{title}</h1><p className="mt-2 max-w-3xl text-[13px] leading-5 text-stone-500 sm:text-sm sm:leading-6">{body}</p></div>{action}</div>; }
function Empty({ icon: Icon, title, body, action }: { icon: typeof Store; title: string; body: string; action?: React.ReactNode }) { return <div className="surface-card sp-empty-state rounded-[28px] border border-dashed p-10 text-center"><div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#f1f6e8] text-[#5f8f2d]"><Icon className="size-7" /></div><h3 className="mt-4 font-black">{title}</h3><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-stone-500">{body}</p>{action && <div className="mt-5">{action}</div>}</div>; }
function Metric({ label, value, icon: Icon, note }: { label: string; value: string; icon: typeof Store; note?: string }) { return <div className="surface-card sp-metric-card group rounded-[26px] p-5 transition hover:-translate-y-0.5"><div className="flex items-center justify-between"><div className="grid size-10 place-items-center rounded-[15px] bg-gradient-to-br from-[#edf7e3] to-[#fff3ec] text-[#5f8f2d] sm:size-11 sm:rounded-2xl"><Icon className="size-[18px] sm:size-5" /></div><ArrowRight className="size-4 text-stone-300 transition group-hover:translate-x-0.5" /></div><div className="mt-3 text-xl font-black tracking-[-.03em] sm:mt-4 sm:text-2xl">{value}</div><div className="mt-1 text-xs font-semibold text-stone-500 sm:text-sm">{label}</div>{note && <div className="mt-2 text-[10px] font-bold text-[#5f8f2d] sm:text-[11px]">{note}</div>}</div>; }
function Status({ children, className = "" }: { children: React.ReactNode; className?: string }) { return <span className={`sp-status inline-flex rounded-full border border-stone-200/80 bg-stone-50/90 px-3 py-1 text-[11px] font-black ${className}`}>{children}</span>; }
function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) { return <label className="sp-field block"><span className="mb-2 block text-xs font-black uppercase tracking-[.14em] text-stone-500">{label}</span>{children}{hint && <span className="mt-1 block text-xs text-stone-400">{hint}</span>}</label>; }
const inputClass = "h-11 w-full rounded-2xl border border-stone-200/80 bg-white/90 px-3.5 outline-none shadow-[inset_0_1px_0_rgba(255,255,255,.6)] focus:border-[#5f8f2d] focus:ring-2 focus:ring-[#5f8f2d]/10";

function CustomerOnboarding({ session, onSave, onLogout }: { session: DemoSession; onSave: (profile: CustomerProfile) => void; onLogout: () => void }) {
  const [step, setStep] = useState(1), [locating, setLocating] = useState(false), [mapBusy, setMapBusy] = useState(false);
  const [address, setAddress] = useState(""), [coords, setCoords] = useState<{ lat?: number; lng?: number }>({});
  const [household, setHousehold] = useState(2), [diet, setDiet] = useState("No preference"), [allergies, setAllergies] = useState<string[]>([]), [goals, setGoals] = useState<string[]>([]), [dislikes, setDislikes] = useState("");
  function detect() { if (!navigator.geolocation) return toast.error("Location is unavailable in this browser"); setLocating(true); navigator.geolocation.getCurrentPosition(async (position) => { const point = { lat: position.coords.latitude, lng: position.coords.longitude }; setCoords(point); setAddress(`GPS pin ${point.lat.toFixed(5)}, ${point.lng.toFixed(5)} — add flat/street details`); try { const place = await findLocation(point); setAddress(place.address); setCoords({ lat: place.latitude, lng: place.longitude }); toast.success(`Actual GPS location detected (±${Math.round(position.coords.accuracy)} m)`); } catch (error) { toast.info(error instanceof Error ? `${error.message} The exact GPS pin is still saved.` : "The exact GPS pin is saved; add the street details."); } finally { setLocating(false); } }, () => { setLocating(false); toast.info("Allow precise location in Chrome, or search your full address manually"); }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }); }
  async function locateAddress() { if (!address.trim()) return toast.error("Enter the delivery address first"); setMapBusy(true); try { const place = await findLocation({ address }); setAddress(place.address); setCoords({ lat: place.latitude, lng: place.longitude }); toast.success("Address pinned on the map"); } catch (error) { toast.error(error instanceof Error ? error.message : "Address was not found"); } finally { setMapBusy(false); } }
  async function finish() { if (!Number.isFinite(coords.lat) || !Number.isFinite(coords.lng)) return toast.error("Detect your GPS location or find the typed address on the map first"); try { if (session.userId && process.env.NEXT_PUBLIC_DEMO_MODE === "false" && isSupabaseConfigured()) await saveLiveCustomerLocation({ userId: session.userId, address, latitude: coords.lat!, longitude: coords.lng! }); onSave({ email: session.email, address, latitude: coords.lat, longitude: coords.lng, householdSize: household, diet, allergies, goals, dislikes, onboardingComplete: true }); toast.success("Your food profile and exact service pin are ready"); } catch (error) { toast.error(error instanceof Error ? error.message : "Location could not be saved"); } }
  return <div className="app-shell-bg sp-v7 min-h-screen p-4 sm:p-8"><div className="mx-auto flex max-w-5xl items-center justify-between"><Logo /><button onClick={onLogout} className="text-sm font-bold text-stone-500">Sign out</button></div><div className="mx-auto mt-5 grid max-w-5xl overflow-hidden rounded-[30px] surface-card sm:mt-8 sm:rounded-[36px] lg:grid-cols-[.82fr_1.18fr]"><div className="sp-onboarding-side surface-dark p-8 text-white sm:p-10"><div className="grid size-12 place-items-center rounded-2xl bg-[#5f8f2d]"><HeartPulse /></div><h1 className="mt-8 text-4xl font-black tracking-[-.05em]">Help She Agent understand your home.</h1><p className="mt-4 leading-7 text-white/60">Your address finds serviceable vendors. Your food preferences help personalize products and calorie guidance. You remain in control of every purchase.</p><div className="mt-8 space-y-3 text-sm">{["Location & household", "Diet, allergies & goals", "Review your private profile"].map((item, index) => <div key={item} className={`flex items-center gap-3 rounded-xl p-3 ${step === index + 1 ? "bg-white/10 text-white" : "text-white/45"}`}><span className={`grid size-7 place-items-center rounded-full ${step > index + 1 ? "bg-[#5ba400]" : "border border-white/25"}`}>{step > index + 1 ? <Check className="size-4" /> : index + 1}</span>{item}</div>)}</div></div><div className="p-7 sm:p-10"><p className="text-xs font-black uppercase tracking-[.16em] text-[#ef3d3d]">Customer setup · {step}/3</p>{step === 1 && <div className="mt-5 space-y-5"><h2 className="text-2xl font-black">Where should we serve you?</h2><Field label="Delivery address"><Textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Flat, street, landmark, area, city and PIN" className="min-h-24 rounded-xl" /></Field><LocationSuggestions query={address} onSelect={(place) => { setAddress(place.address); setCoords({ lat: place.latitude, lng: place.longitude }); }} /><div className="flex flex-wrap gap-2"><Button onClick={detect} disabled={locating} variant="outline" className="h-11 rounded-xl"><LocateFixed className={locating ? "animate-spin" : ""} />{locating ? "Finding current address…" : "Use my current location"}</Button><Button onClick={locateAddress} disabled={mapBusy} variant="outline" className="h-11 rounded-xl"><Search className={mapBusy ? "animate-pulse" : ""} />{mapBusy ? "Finding…" : "Find typed address"}</Button></div><MapPreview lat={coords.lat} lng={coords.lng} radius={2} label="Delivery location" /><Field label="Household size"><input type="number" min="1" max="20" value={household} onChange={(e) => setHousehold(Number(e.target.value))} className={inputClass} /></Field></div>}
  {step === 2 && <div className="mt-5 space-y-5"><h2 className="text-2xl font-black">Food preferences</h2><Field label="Diet"><Select value={diet} onValueChange={setDiet}><SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{["No preference", "Vegetarian", "Vegan", "Eggetarian", "Non-vegetarian", "Jain", "Low carb", "High protein"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></Field><ChoiceGroup label="Allergies" options={["Milk", "Egg", "Peanut", "Tree nuts", "Gluten", "Soy", "Fish", "Shellfish"]} value={allergies} setValue={setAllergies} /><ChoiceGroup label="Health goals" options={["Balanced meals", "Weight management", "High protein", "Low sodium", "Diabetes aware", "Heart friendly"]} value={goals} setValue={setGoals} /><Field label="Dislikes or instructions"><input value={dislikes} onChange={(e) => setDislikes(e.target.value)} className={inputClass} placeholder="Example: no coriander, mild spice" /></Field></div>}
  {step === 3 && <div className="mt-5"><h2 className="text-2xl font-black">Review your food profile</h2><div className="mt-5 space-y-3 rounded-2xl bg-[#f6f8f2] p-5 text-sm"><Review label="Address" value={address} /><Review label="Household" value={`${household} people`} /><Review label="Diet" value={diet} /><Review label="Allergies" value={allergies.join(", ") || "None selected"} /><Review label="Goals" value={goals.join(", ") || "None selected"} /></div><div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"><b>Important:</b> calorie and nutrition values are estimates, not medical advice. Verify labels and allergens with the vendor.</div></div>}
  <div className="mt-8 flex justify-between"><Button variant="outline" disabled={step === 1} onClick={() => setStep((s) => s - 1)} className="rounded-xl"><ArrowLeft />Back</Button>{step < 3 ? <Button onClick={() => address.trim() || step > 1 ? setStep((s) => s + 1) : toast.error("Add your address first")} className="rounded-xl bg-[#5ba400] hover:bg-[#4c8c00]">Continue<ArrowRight /></Button> : <Button onClick={finish} className="rounded-xl bg-[#5ba400] hover:bg-[#4c8c00]"><Check />Save profile</Button>}</div></div></div></div>;
}

function ChoiceGroup({ label, options, value, setValue }: { label: string; options: string[]; value: string[]; setValue: (next: string[]) => void }) { return <div><div className="mb-2 text-xs font-black uppercase tracking-[.1em] text-stone-500">{label}</div><div className="flex flex-wrap gap-2">{options.map((option) => <button type="button" key={option} onClick={() => setValue(value.includes(option) ? value.filter((x) => x !== option) : [...value, option])} className={`rounded-full border px-3 py-2 text-sm font-bold ${value.includes(option) ? "border-[#5ba400] bg-[#eff7e5] text-[#477f00]" : "bg-white text-stone-500"}`}>{option}</button>)}</div></div>; }
function Review({ label, value }: { label: string; value: string }) { return <div className="sp-review flex min-w-0 justify-between gap-4 border-b border-stone-200/70 pb-3 last:border-0 last:pb-0"><span className="shrink-0 text-stone-500">{label}</span><b className="min-w-0 break-words text-right">{value}</b></div>; }

function VendorOnboarding({ session, setState, onLogout, operationsCreated = false, close }: { session: DemoSession; setState: React.Dispatch<React.SetStateAction<V3State>>; onLogout?: () => void; operationsCreated?: boolean; close?: () => void }) {
  const [step, setStep] = useState(1), [locating, setLocating] = useState(false), [mapBusy, setMapBusy] = useState(false), [file, setFile] = useState<File | null>(null), [busy, setBusy] = useState(false);
  const firstVendorAccount = demoAccounts.find((account) => account.role === "vendor")!;
  const [form, setForm] = useState({ businessName: "", ownerName: operationsCreated ? firstVendorAccount.name : session.name, ownerEmail: operationsCreated ? firstVendorAccount.email : session.email, category: "Groceries", address: "", lat: undefined as number | undefined, lng: undefined as number | undefined, radius: 5, delivery: true, pickup: true, fssai: "", expiry: "" });
  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) { setForm((f) => ({ ...f, [key]: value })); }
  function detect() { if (!navigator.geolocation) return toast.error("Location is unavailable"); setLocating(true); navigator.geolocation.getCurrentPosition(async (position) => { const point = { lat: position.coords.latitude, lng: position.coords.longitude }; set("lat", point.lat); set("lng", point.lng); set("address", `GPS pin ${point.lat.toFixed(5)}, ${point.lng.toFixed(5)} — add store details`); try { const place = await findLocation(point); set("address", place.address); set("lat", place.latitude); set("lng", place.longitude); toast.success(`Actual store GPS location detected (±${Math.round(position.coords.accuracy)} m)`); } catch (error) { toast.info(error instanceof Error ? `${error.message} The exact GPS pin is still saved.` : "The exact GPS pin is saved; add the store details."); } finally { setLocating(false); } }, () => { setLocating(false); toast.info("Allow precise location in Chrome, or search the complete store address"); }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }); }
  async function locateAddress() { if (!form.address.trim()) return toast.error("Enter the store address first"); setMapBusy(true); try { const place = await findLocation({ address: form.address }); set("address", place.address); set("lat", place.latitude); set("lng", place.longitude); toast.success("Store address pinned on the map"); } catch (error) { toast.error(error instanceof Error ? error.message : "Address was not found"); } finally { setMapBusy(false); } }
  async function submit() {
    if (!form.businessName || !form.ownerEmail || !form.address || !form.fssai || !form.expiry || !file) return toast.error("Complete all business and certification fields");
    if (!Number.isFinite(form.lat) || !Number.isFinite(form.lng)) return toast.error("Detect the store GPS location or find its typed address on the map first");
    if (!form.delivery && !form.pickup) return toast.error("Enable delivery or pickup");
    setBusy(true);
    let vendorId = id("VEN");
    try {
      if (!operationsCreated && session.userId && process.env.NEXT_PUBLIC_DEMO_MODE === "false" && isSupabaseConfigured()) vendorId = await submitLiveVendorApplication({ userId: session.userId, businessName: form.businessName, category: form.category, locality: form.address, fssaiNumber: form.fssai, expiryDate: form.expiry, certificate: file, address: form.address, latitude: form.lat, longitude: form.lng, radiusKm: form.radius, delivery: form.delivery, pickup: form.pickup });
      const vendor: Vendor = { id: vendorId, ownerEmail: form.ownerEmail, ownerName: form.ownerName, businessName: form.businessName, category: form.category, address: form.address, latitude: form.lat, longitude: form.lng, radiusKm: form.radius, delivery: form.delivery, pickup: form.pickup, openToday: false, fssaiNumber: form.fssai, certificateName: file.name, expiryDate: form.expiry, verification: "Submitted", operational: "Inactive", plan: "Launch" };
      setState((s) => ({ ...s, vendors: [vendor, ...s.vendors.filter((v) => v.ownerEmail !== vendor.ownerEmail)], notifications: [notice(form.ownerEmail, "vendor", "Application submitted", "Operations will verify your certificate and business details."), ...s.notifications], audit: [audit(session, operationsCreated ? "Operations onboarded vendor" : "Submitted vendor application", form.businessName), ...s.audit] }));
      toast.success("Vendor application sent to Operations"); close?.();
    } catch (caught) { toast.error(caught instanceof Error ? caught.message : "Application could not be submitted"); } finally { setBusy(false); }
  }
  return <div className={operationsCreated ? "sp-v7" : "sp-v7 min-h-screen bg-[#f2f4ed] p-4 sm:p-8"}>{!operationsCreated && <div className="mx-auto flex max-w-6xl items-center justify-between"><Logo /><button onClick={onLogout} className="text-sm font-bold text-stone-500">Sign out</button></div>}<div className={`${operationsCreated ? "" : "mx-auto mt-8 max-w-6xl"}`}><div className="surface-card rounded-[34px] p-6 shadow-xl sm:p-8"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.15em] text-[#5ba400]">Vendor onboarding · {step}/4</p><h1 className="mt-2 text-3xl font-black">{["Business profile", "Location & service radius", "Fulfilment controls", "Food certification"][step - 1]}</h1></div><div className="flex gap-1">{[1, 2, 3, 4].map((n) => <span key={n} className={`h-2 w-12 rounded-full ${n <= step ? "bg-[#5ba400]" : "bg-stone-200"}`} />)}</div></div>
  {step === 1 && <div className="mt-7 grid gap-5 md:grid-cols-2"><Field label="Business name"><input value={form.businessName} onChange={(e) => set("businessName", e.target.value)} className={inputClass} /></Field><Field label="Category"><Select value={form.category} onValueChange={(value) => set("category", value)}><SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{categoryNames.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></Field><Field label="Owner name"><input value={form.ownerName} disabled={operationsCreated} onChange={(e) => set("ownerName", e.target.value)} className={inputClass} /></Field>{operationsCreated ? <Field label="Assign to vendor login" hint="The vendor will appear when this exact account signs in."><Select value={form.ownerEmail} onValueChange={(email) => { const account = demoAccounts.find((item) => item.email === email)!; set("ownerEmail", email); set("ownerName", account.name); }}><SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{demoAccounts.filter((account) => account.role === "vendor").map((account) => <SelectItem key={account.email} value={account.email}>{account.name} · {account.email}</SelectItem>)}</SelectContent></Select></Field> : <Field label="Owner email"><input type="email" value={form.ownerEmail} disabled className={inputClass} /></Field>}</div>}
  {step === 2 && <div className="mt-7 grid gap-6 lg:grid-cols-[.85fr_1.15fr]"><div className="space-y-4"><Field label="Full store address"><Textarea value={form.address} onChange={(e) => set("address", e.target.value)} className="min-h-28 rounded-xl" placeholder="Street, landmark, area, city and PIN" /></Field><LocationSuggestions query={form.address} onSelect={(place) => { set("address", place.address); set("lat", place.latitude); set("lng", place.longitude); }} /><div className="flex flex-wrap gap-2"><Button onClick={detect} disabled={locating} variant="outline" className="rounded-xl"><LocateFixed className={locating ? "animate-spin" : ""} />{locating ? "Finding current address…" : "Use current location"}</Button><Button onClick={locateAddress} disabled={mapBusy} variant="outline" className="rounded-xl"><Search className={mapBusy ? "animate-pulse" : ""} />{mapBusy ? "Finding…" : "Find typed address"}</Button></div><Field label={`Supply radius · ${form.radius} km`} hint="You can adjust this daily after onboarding"><Slider value={[form.radius]} min={1} max={30} step={1} onValueChange={(value) => set("radius", value[0])} /></Field></div><MapPreview lat={form.lat} lng={form.lng} radius={form.radius} label="Store service location" /></div>}
  {step === 3 && <div className="mt-7 grid gap-4 md:grid-cols-3"><ToggleCard icon={Truck} title="Vendor delivery" body="Your own staff delivers orders" checked={form.delivery} setChecked={(v) => set("delivery", v)} /><ToggleCard icon={ShoppingBag} title="Self pickup" body="Customer collects from your store" checked={form.pickup} setChecked={(v) => set("pickup", v)} /><div className="surface-card-muted rounded-[24px] p-5"><Store className="text-[#5ba400]" /><h3 className="mt-4 font-black">Closed until verified</h3><p className="mt-2 text-sm leading-6 text-stone-500">After approval, you can open or close for the day without changing your profile.</p></div></div>}
  {step === 4 && <div className="mt-7 grid gap-5 md:grid-cols-2"><Field label="Food certificate / FSSAI number"><input value={form.fssai} onChange={(e) => set("fssai", e.target.value)} className={inputClass} /></Field><Field label="Expiry date"><input type="date" min={tomorrow()} value={form.expiry} onChange={(e) => set("expiry", e.target.value)} className={inputClass} /></Field><label className="surface-card-muted md:col-span-2 grid min-h-36 cursor-pointer place-items-center rounded-[24px] border-2 border-dashed p-5 text-center"><input type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} /><Upload className="mx-auto text-[#ef3d3d]" /><div className="mt-2 font-black">{file?.name || "Upload certificate PDF or image"}</div><div className="text-xs text-stone-500">Private document; accessible only to this vendor and authorised Operations/Admin users.</div></label></div>}
  <div className="mt-8 flex justify-between"><Button variant="outline" disabled={step === 1} onClick={() => setStep((s) => s - 1)} className="rounded-xl"><ArrowLeft />Back</Button>{step < 4 ? <Button onClick={() => setStep((s) => s + 1)} className="rounded-xl bg-[#5ba400] hover:bg-[#4c8c00]">Continue<ArrowRight /></Button> : <Button onClick={submit} disabled={busy} className="rounded-xl bg-[#ef3d3d] hover:bg-[#d92f2f]"><FileCheck2 />{busy ? "Submitting…" : "Submit for verification"}</Button>}</div></div></div></div>;
}

function MapPreview({ lat, lng, radius, label = "Selected location" }: { lat?: number; lng?: number; radius: number; label?: string }) {
  const latitude = lat ?? 11.0168;
  const longitude = lng ?? 76.9558;
  const latDelta = Math.max(.012, radius / 111 * 1.35);
  const lngDelta = Math.max(.012, radius / (111 * Math.max(.25, Math.cos(latitude * Math.PI / 180))) * 1.35);
  const bbox = [longitude - lngDelta, latitude - latDelta, longitude + lngDelta, latitude + latDelta].join(",");
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${latitude}%2C${longitude}`;
  const fullMapUrl = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=15/${latitude}/${longitude}`;
  const googleMapUrl = `https://www.google.com/maps/search/?api=1&query=${latitude}%2C${longitude}`;
  return <div className="surface-card overflow-hidden rounded-[22px]"><div className="relative h-72 bg-stone-100"><iframe key={mapUrl} title={`${label} on OpenStreetMap`} src={mapUrl} loading="lazy" className="h-full w-full border-0" /><div className="pointer-events-none absolute left-3 top-3 rounded-xl bg-white/95 px-3 py-2 text-xs font-black shadow-lg backdrop-blur">{lat ? label : "Coimbatore preview — detect or search to place pin"}</div>{radius > 0 && <div className="pointer-events-none absolute bottom-3 right-3 rounded-xl bg-[#111611]/90 px-3 py-2 text-xs font-black text-white shadow-lg">Service view: {radius} km</div>}</div><div className="flex flex-wrap items-center gap-3 p-3 text-xs text-stone-500"><span className="mr-auto font-mono">{lat ? `Exact pin ${lat.toFixed(6)}, ${lng?.toFixed(6)}` : "No confirmed pin yet"}</span><a href={googleMapUrl} target="_blank" rel="noreferrer" className="font-black text-[#477f00] hover:underline">Verify in Google Maps ↗</a><a href={fullMapUrl} target="_blank" rel="noreferrer" className="font-black text-[#477f00] hover:underline">OpenStreetMap ↗</a><span className="w-full text-[11px] text-stone-400">Map © OpenStreetMap contributors</span></div></div>;
}
function ToggleCard({ icon: Icon, title, body, checked, setChecked }: { icon: typeof Store; title: string; body: string; checked: boolean; setChecked: (v: boolean) => void }) { return <div className={`rounded-2xl border p-5 ${checked ? "border-[#5ba400] bg-[#f4faed]" : "bg-white"}`}><div className="flex items-center justify-between"><Icon className="text-[#5ba400]" /><Switch checked={checked} onCheckedChange={setChecked} /></div><h3 className="mt-4 font-black">{title}</h3><p className="mt-2 text-sm text-stone-500">{body}</p></div>; }

function CustomerArea({ active, session, state, setState, navigate, openAgent }: { active: string; session: DemoSession; state: V3State; setState: React.Dispatch<React.SetStateAction<V3State>>; navigate: (page: string) => void; openAgent: () => void }) {
  if (active === "Cart") return <CartView session={session} state={state} setState={setState} navigate={navigate} />;
  if (active === "My schedule") return <SchedulesV4 session={session} state={state} setState={setState} navigate={navigate} />;
  if (active === "Monthly requirement") return <RequirementsV4 session={session} state={state} setState={setState} />;
  if (active === "My quotations") return <CustomerQuotesV4 session={session} state={state} setState={setState} />;
  if (active === "Orders") return <OrdersV4 session={session} state={state} setState={setState} scope="customer" />;
  if (active === "Profile & food") return <CustomerProfileV4 session={session} state={state} setState={setState} />;
  if (active === "Ticket centre") return <TicketCentre session={session} state={state} setState={setState} />;
  return <Marketplace session={session} state={state} setState={setState} navigate={navigate} openAgent={openAgent} />;
}

function Marketplace({ session, state, setState, navigate, openAgent }: { session: DemoSession; state: V3State; setState: React.Dispatch<React.SetStateAction<V3State>>; navigate: (page: string) => void; openAgent: () => void }) {
  const profile = state.customers.find((x) => x.email === session.email)!;
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [selected, setSelected] = useState<Product | null>(null);
  const [locationOpen, setLocationOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [mapBusy, setMapBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [diagnostics, setDiagnostics] = useState<MarketplaceDiagnostics | null>(null);
  const [catalogueError, setCatalogueError] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [maxPrice, setMaxPrice] = useState(profile.agentMemory?.lastBudget || 0);
  const [maxCalories, setMaxCalories] = useState(profile.agentMemory?.calorieTarget || 0);
  const [minProtein, setMinProtein] = useState(profile.agentMemory?.minProtein || 0);
  const [dietary, setDietary] = useState("All");
  const [sortBy, setSortBy] = useState("Recommended");
  const [deliveryDate, setDeliveryDate] = useState(tomorrow());
  const [periodDays, setPeriodDays] = useState(1);
  const [showAiPicks, setShowAiPicks] = useState(true);
  const [aiPickIds, setAiPickIds] = useState<string[]>([]);
  const [aiPickMessage, setAiPickMessage] = useState("");
  const [aiPicksLoading, setAiPicksLoading] = useState(false);
  const [draftAddress, setDraftAddress] = useState(profile.address);
  const [draftCoords, setDraftCoords] = useState<{ lat?: number; lng?: number }>({ lat: profile.latitude, lng: profile.longitude });
  const locationConfirmed = Number.isFinite(profile.latitude) && Number.isFinite(profile.longitude);

  async function refreshMarketplace(showSuccess = false) {
    if (!isLiveSupabaseMode() || !locationConfirmed) return;
    setRefreshing(true); setCatalogueError("");
    try {
      const live = await loadLiveMarketplace(profile.latitude!, profile.longitude!);
      const products = live.items.map(marketplaceProductFromLive);
      const vendorMap = new Map<string, Vendor>();
      live.items.forEach((row) => vendorMap.set(row.vendor_id, { id: row.vendor_id, ownerEmail: "vendor@sheplates.local", ownerName: "Verified vendor", businessName: row.vendor_name, category: row.category, address: "Serviceable near your delivery pin", radiusKm: Math.max(1, Number(row.distance_km)), delivery: row.delivery_enabled, pickup: row.pickup_enabled, openToday: true, fssaiNumber: "Verified", certificateName: "Private", expiryDate: "—", verification: "Verified", operational: "Active", plan: "Launch" }));
      setDiagnostics(live.diagnostics);
      setState((current) => ({ ...current, products, vendors: [...vendorMap.values()], markups: {}, merchandising: live.merchandising || current.merchandising, merchandisingError: live.merchandisingError || null }));
      if (showSuccess) toast.success(products.length ? `${products.length} serviceable product pack(s) refreshed` : "Marketplace checked; see the eligibility explanation below");
    } catch (error) { setCatalogueError(error instanceof Error ? error.message : "Marketplace could not be refreshed"); }
    finally { setRefreshing(false); }
  }
  function detectLocation() { if (!navigator.geolocation) return toast.error("Location is unavailable in this browser"); setLocating(true); navigator.geolocation.getCurrentPosition(async (position) => { const point = { lat: position.coords.latitude, lng: position.coords.longitude }; setDraftCoords(point); setDraftAddress(`GPS pin ${point.lat.toFixed(5)}, ${point.lng.toFixed(5)} — add flat/street details`); try { const place = await findLocation(point); setDraftAddress(place.address); setDraftCoords({ lat: place.latitude, lng: place.longitude }); toast.success(`Actual GPS location detected (±${Math.round(position.coords.accuracy)} m)`); } catch (error) { toast.info(error instanceof Error ? `${error.message} The exact GPS pin is still shown.` : "The exact GPS pin is shown; add street details."); } finally { setLocating(false); } }, (error) => { setLocating(false); toast.error(error.code === 1 ? "Allow precise location for localhost in Chrome, then try again" : "GPS could not get a fresh position. Search your complete address instead."); }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }); }
  async function findTypedLocation() { if (!draftAddress.trim()) return toast.error("Enter your complete address first"); setMapBusy(true); try { const place = await findLocation({ address: draftAddress }); setDraftAddress(place.address); setDraftCoords({ lat: place.latitude, lng: place.longitude }); toast.success("Address located on the map"); } catch (error) { toast.error(error instanceof Error ? error.message : "Address was not found"); } finally { setMapBusy(false); } }
  async function saveLocation() { if (!Number.isFinite(draftCoords.lat) || !Number.isFinite(draftCoords.lng)) return toast.error("Detect GPS or find the typed address before saving"); try { if (session.userId && process.env.NEXT_PUBLIC_DEMO_MODE === "false" && isSupabaseConfigured()) await saveLiveCustomerLocation({ userId: session.userId, address: draftAddress, latitude: draftCoords.lat!, longitude: draftCoords.lng! }); setState((current) => ({ ...current, customers: current.customers.map((item) => item.email === session.email ? { ...item, address: draftAddress, latitude: draftCoords.lat, longitude: draftCoords.lng } : item) })); setLocationOpen(false); toast.success("Delivery location and service pin updated"); } catch (error) { toast.error(error instanceof Error ? error.message : "Location could not be saved"); } }
  async function addToCart(product: Product) {
    const own = state.cart.filter((item) => item.customerEmail === session.email);
    const existing = own.find((item) => item.productId === product.id);
    const nextOwn = existing ? own.map((item) => item.id === existing.id ? { ...item, quantity: item.quantity + 1 } : item) : [{ id: id("CART"), customerEmail: session.email, productId: product.id, quantity: 1 }, ...own];
    setState((current) => ({ ...current, cart: [...current.cart.filter((item) => item.customerEmail !== session.email), ...nextOwn] }));
    try {
      if (isLiveSupabaseMode()) {
        const saved = await syncLiveCart({ items: nextOwn.map((item) => ({ productId: item.productId, quantity: item.quantity })) });
        if (saved.snapshot) setState((current) => mergeLiveCommerce(current, saved.snapshot as LiveCommerceStateSnapshot, session));
      }
      toast.success(`${product.name} added to cart`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Cart could not be saved");
      if (isLiveSupabaseMode()) { try { const snapshot = await loadLiveCommerceSnapshot(); setState((current) => mergeLiveCommerce(current, snapshot, session)); } catch {} }
    }
  }

  const serviceable = locationConfirmed ? state.products.filter((product) => {
    const vendor = state.vendors.find((v) => v.id === product.vendorId);
    const distance = product.liveDistanceKm ?? distanceKm(profile.latitude, profile.longitude, vendor?.latitude, vendor?.longitude);
    const allergyText = `${product.name} ${product.dietaryTags.join(" ")}`.toLowerCase();
    const obviousAllergyConflict = profile.allergies.some((allergy) => allergy && allergyText.includes(allergy.toLowerCase()));
    return product.active && product.stock > 0 && vendor?.verification === "Verified" && vendor.operational === "Active" && vendor.openToday && distance !== null && distance <= vendor.radiusKm && !obviousAllergyConflict;
  }) : [];

  const serviceableSignature = serviceable.map((product) => `${product.id}:${product.stock}:${finalPrice(product, state)}`).sort().join("|");
  useEffect(() => {
    if (!showAiPicks || !state.merchandising.recommendationPopupEnabled || !serviceable.length) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setAiPicksLoading(true);
      try {
        const token = await getAccessToken();
        const context = !token ? { availableProducts: serviceable.map((product) => ({ item_id: product.id, item_name: product.name, category: product.category, customer_price: finalPrice(product, state), calories_per_unit: product.calories, protein_g: product.protein, dietary_tags: product.dietaryTags })) } : undefined;
        const response = await fetch("/api/agent", { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ task: "commerce", role: "customer", message: "Give me up to three useful picks from what is available now. Use what you remember about my shopping preferences, but do not invent anything.", context }) });
        const json = await response.json() as { result?: { selectedProductIds?: string[]; summary?: string } };
        if (cancelled) return;
        const valid = (json.result?.selectedProductIds || []).filter((productId) => serviceable.some((product) => product.id === productId)).slice(0, 3);
        setAiPickIds(valid);
        setAiPickMessage(json.result?.summary || "");
      } catch { if (!cancelled) { setAiPickIds([]); setAiPickMessage(""); } }
      finally { if (!cancelled) setAiPicksLoading(false); }
    }, 350);
    return () => { cancelled = true; window.clearTimeout(timer); };
  // Serviceability, stock and price are the grounding boundary for this recommendation call.
  }, [serviceableSignature, showAiPicks, state.merchandising.recommendationPopupEnabled]);

  const dietaryOptions = Array.from(new Set(serviceable.flatMap((product) => product.dietaryTags))).filter(Boolean).slice(0, 10);
  const filtered = serviceable.filter((product) => {
    const vendor = state.vendors.find((v) => v.id === product.vendorId)!;
    const text = `${product.name} ${product.category} ${vendor.businessName} ${product.dietaryTags.join(" ")}`.toLowerCase();
    return (category === "All" || product.category === category)
      && (!query || text.includes(query.toLowerCase()))
      && (!maxPrice || finalPrice(product, state) <= maxPrice)
      && (!maxCalories || product.calories <= maxCalories)
      && (!minProtein || product.protein >= minProtein)
      && (dietary === "All" || product.dietaryTags.includes(dietary));
  });

  const preferenceScore = (product: Product) => {
    let score = 0;
    if (state.merchandising.featuredProductIds.includes(product.id)) score += 100;
    if (profile.agentMemory?.favoriteCategories?.includes(product.category)) score += 12;
    if (profile.agentMemory?.favoriteProducts?.includes(product.id)) score += 14;
    if (profile.agentMemory?.lastBudget && finalPrice(product, state) <= profile.agentMemory.lastBudget) score += 6;
    if (profile.goals.some((goal) => /protein/i.test(goal))) score += Math.min(10, product.protein / 4);
    if (profile.diet && product.dietaryTags.some((tag) => profile.diet.toLowerCase().includes(tag.toLowerCase()))) score += 8;
    return score;
  };

  const visible = [...filtered].sort((a, b) => {
    if (sortBy === "Price low") return finalPrice(a, state) - finalPrice(b, state);
    if (sortBy === "Protein high") return b.protein - a.protein;
    if (sortBy === "Calories low") return a.calories - b.calories;
    if (sortBy === "Nearest") return (a.liveDistanceKm || 999) - (b.liveDistanceKm || 999);
    return preferenceScore(b) - preferenceScore(a);
  });
  const groundedAiPicks = aiPickIds.map((productId) => serviceable.find((product) => product.id === productId)).filter(Boolean) as Product[];
  const aiPicks = groundedAiPicks.length ? groundedAiPicks : [...serviceable].sort((a, b) => preferenceScore(b) - preferenceScore(a) || finalPrice(a, state) - finalPrice(b, state)).slice(0, 3);
  const featured = state.merchandising.featuredProductIds.map((productId) => serviceable.find((product) => product.id === productId)).filter(Boolean) as Product[];
  const periodEndDate = addDaysISO(deliveryDate, Math.max(0, periodDays - 1));
  const activeFilterCount = [category !== "All", maxPrice > 0, maxCalories > 0, minProtein > 0, dietary !== "All", deliveryDate !== tomorrow(), periodDays !== 1].filter(Boolean).length;
  const emptyReason = !diagnostics ? "Refresh to check verification, store status, stock and service radius from the live marketplace."
    : diagnostics.verified_vendors === 0 ? "No vendor has been verified by Operations yet."
      : diagnostics.open_vendors === 0 ? "A verified vendor exists, but its store is closed or marketplace access is not enabled."
        : diagnostics.vendors_with_products === 0 ? "The verified vendor has no active in-stock product packs."
          : diagnostics.vendors_in_radius === 0 ? "The vendor pin is outside its saved service radius from your delivery pin."
            : "A product exists but did not pass every marketplace eligibility rule. Refresh after the vendor updates it.";

  return <div className="sp-marketplace space-y-6">
    <div className="sp-market-toolbar rounded-[28px] p-3">
      <div className="sp-market-toolbar-grid grid grid-cols-[minmax(0,1fr)_auto] gap-2.5 md:grid-cols-[.8fr_1.2fr_auto] xl:grid-cols-[.72fr_1.28fr_auto]">
        <button data-tour="location" onClick={() => { setDraftAddress(profile.address); setDraftCoords({ lat: profile.latitude, lng: profile.longitude }); setLocationOpen(true); }} className={`col-span-2 flex h-12 min-w-0 items-center rounded-2xl px-3 text-left md:col-span-1 ${locationConfirmed ? "bg-[#f1f6eb]" : "bg-amber-50 ring-1 ring-amber-300"}`}><MapPin className={`mr-2 size-5 shrink-0 ${locationConfirmed ? "text-[#5ba400]" : "text-amber-700"}`} /><span className="min-w-0 flex-1 truncate text-sm font-bold">{locationConfirmed ? profile.address : "Confirm your delivery location"}</span><LocateFixed className="ml-2 size-4 shrink-0 text-[#5ba400]" /></button>
        <div data-tour="search" className="flex h-12 items-center rounded-2xl bg-stone-100/90 px-3"><Search className="mr-2 size-5 text-stone-500" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search food, vendor, category, dietary tag…" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />{query && <button onClick={() => setQuery("")}><X className="size-4" /></button>}</div>
        <button data-tour="filters" onClick={() => setFiltersOpen((value) => !value)} className={`flex h-12 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-black ${filtersOpen || activeFilterCount ? "border-[#5f8f2d] bg-[#eff6e6] text-[#50772a]" : "bg-white"}`}><Filter className="size-4" />Filters {activeFilterCount > 0 && <span className="grid size-5 place-items-center rounded-full bg-[#5f8f2d] text-[10px] text-white">{activeFilterCount}</span>}</button>
      </div>
      {filtersOpen && <div className="sp-filter-drawer mt-3 grid gap-3 rounded-[22px] p-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <Field label="Planning from"><input type="date" min={tomorrow()} value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className={inputClass} /></Field>
        <Field label="Planning period"><Select value={String(periodDays)} onValueChange={(value) => setPeriodDays(Number(value))}><SelectTrigger className="h-11 rounded-2xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">This date</SelectItem><SelectItem value="7">Next 7 days</SelectItem><SelectItem value="14">Next 14 days</SelectItem><SelectItem value="30">Next 30 days</SelectItem></SelectContent></Select></Field>
        <Field label="Max budget"><input type="number" min="0" value={maxPrice || ""} onChange={(e) => setMaxPrice(Number(e.target.value))} placeholder="Any ₹" className={inputClass} /></Field>
        <Field label="Max calories / pack"><input type="number" min="0" value={maxCalories || ""} onChange={(e) => setMaxCalories(Number(e.target.value))} placeholder="Any kcal" className={inputClass} /></Field>
        <Field label="Min protein"><input type="number" min="0" value={minProtein || ""} onChange={(e) => setMinProtein(Number(e.target.value))} placeholder="Any grams" className={inputClass} /></Field>
        <Field label="Dietary tag"><Select value={dietary} onValueChange={setDietary}><SelectTrigger className="h-11 rounded-2xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="All">All dietary options</SelectItem>{dietaryOptions.map((tag) => <SelectItem key={tag} value={tag}>{tag}</SelectItem>)}</SelectContent></Select></Field>
        <Field label="Sort"><Select value={sortBy} onValueChange={setSortBy}><SelectTrigger className="h-11 rounded-2xl"><SelectValue /></SelectTrigger><SelectContent>{["Recommended", "Price low", "Protein high", "Calories low", "Nearest"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></Field>
        <div className="sm:col-span-2 lg:col-span-4 xl:col-span-6 flex flex-wrap items-center gap-2"><span className="text-xs font-black text-stone-500">Quick:</span>{[150, 300, 500, 1000].map((budget) => <button key={budget} onClick={() => setMaxPrice(budget)} className="rounded-full border bg-white px-3 py-1.5 text-xs font-black">Under ₹{budget}</button>)}<button onClick={() => { setMaxPrice(0); setMaxCalories(0); setMinProtein(0); setDietary("All"); setCategory("All"); setDeliveryDate(tomorrow()); setPeriodDays(1); setSortBy("Recommended"); }} className="ml-auto rounded-full px-3 py-1.5 text-xs font-black text-red-600">Clear filters</button></div>
      </div>}
    </div>

    {showAiPicks && state.merchandising.recommendationPopupEnabled && aiPicks.length > 0 && <section className="sp-ai-card relative overflow-hidden rounded-[30px] p-5 sm:p-6">
      <button onClick={() => setShowAiPicks(false)} className="absolute right-4 top-4 grid size-9 place-items-center rounded-full bg-stone-100" aria-label="Close recommendations"><X className="size-4" /></button>
      <div className="pr-12"><div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-[#5f8f2d]"><Sparkles className="size-4" />She Agent · for you {aiPicksLoading && <RefreshCcw className="size-3 animate-spin" />}</div><h2 className="mt-2 text-2xl font-black tracking-[-.04em]">A few useful picks, based on your marketplace and preferences.</h2><p className="mt-1 max-w-3xl text-sm text-stone-500">{aiPickMessage || "These are grounded in currently serviceable products. She Agent can refine by budget, calories, protein, diet, schedule or anything you ask naturally."}</p></div>
      <div className="mt-5 flex snap-x gap-3 overflow-x-auto pb-2 hide-scrollbar md:grid md:grid-cols-3">{aiPicks.map((product) => <button key={product.id} onClick={() => setSelected(product)} className="surface-card-muted min-w-[82%] snap-start flex items-center gap-3 rounded-[22px] p-3 text-left transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md md:min-w-0"><div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white text-3xl">{product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" /> : product.emoji}</div><div className="min-w-0 flex-1"><div className="truncate font-black">{product.name}</div><div className="mt-1 text-xs text-stone-500">{money(finalPrice(product, state))} · {product.nutritionStatus === "Pending review" || product.calories <= 0 ? "nutrition pending" : `${product.calories} kcal · ${product.protein}g protein`}</div></div><ArrowRight className="size-4 text-stone-400" /></button>)}</div>
      <div className="mt-4 flex flex-wrap gap-2"><Button onClick={openAgent} className="rounded-xl bg-[#171914]"><Sparkles />Ask She Agent to refine</Button><Button onClick={() => { setMaxPrice(profile.agentMemory?.lastBudget || 300); setFiltersOpen(true); }} variant="outline" className="rounded-xl">Use my usual budget</Button></div>
    </section>}
    {!showAiPicks && <div className="flex justify-end"><button onClick={() => setShowAiPicks(true)} className="soft-chip"><Sparkles className="size-3.5" />Show AI picks</button></div>}

    {featured.length > 0 && <section><div className="flex items-end justify-between"><div><p className="text-xs font-black uppercase tracking-[.16em] text-[#e55a41]">Featured today</p><h2 className="mt-1 text-2xl font-black">Picked by ShePlates</h2></div><span className="text-xs text-stone-400">Curated by Super Admin</span></div><div className="mt-4 flex gap-3 overflow-x-auto pb-2 hide-scrollbar">{featured.map((product) => <button key={product.id} onClick={() => setSelected(product)} className="surface-card min-w-[240px] rounded-[24px] p-3 text-left"><div className="flex items-center gap-3"><div className="grid size-14 place-items-center overflow-hidden rounded-2xl bg-[#f4f7ef] text-3xl">{product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" /> : product.emoji}</div><div><div className="font-black">{product.name}</div><div className="text-xs text-stone-500">{money(finalPrice(product, state))}</div></div></div></button>)}</div></section>}

    <section data-tour="categories"><div className="flex items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.14em] text-[#5ba400]">Browse categories</p><h2 className="mt-1 text-2xl font-black">Find what fits today</h2></div>{category !== "All" && <button onClick={() => setCategory("All")} className="text-sm font-bold text-[#5ba400]">View all</button>}</div><div className="sp-category-strip mt-4 flex gap-2 overflow-x-auto pb-2 hide-scrollbar"><button onClick={() => setCategory("All")} className={`sp-category-chip min-w-24 rounded-2xl border px-4 py-3 text-sm font-black ${category === "All" ? "border-[#5ba400] bg-[#eff6e6] text-[#50772a]" : "bg-white"}`}>All</button>{categories.map((item) => <button key={item.name} onClick={() => setCategory(category === item.name ? "All" : item.name)} className={`sp-category-chip min-w-28 rounded-2xl border bg-white p-2.5 text-center ${category === item.name ? "border-[#5ba400] ring-2 ring-[#5ba400]/10" : ""}`}><div className="mx-auto grid size-10 place-items-center rounded-xl text-xl" style={{ background: item.color }}>{item.emoji}</div><div className="mt-1.5 text-[11px] font-black">{item.name}</div></button>)}</div></section>

    <section><div className="flex flex-wrap items-end justify-between gap-3"><Heading eyebrow="MARKETPLACE" title={`${visible.length} option${visible.length === 1 ? "" : "s"} · ${deliveryDate}${periodDays > 1 ? ` to ${periodEndDate}` : ""}`} body="Verified, open and serviceable vendors only. Use search and filters for budget, calories, protein, dietary preferences and your planning window. Current stock is shown; final slot capacity is confirmed when you schedule." /><Button variant="outline" onClick={() => void refreshMarketplace(true)} disabled={refreshing || !isLiveSupabaseMode()} className="rounded-xl"><RefreshCcw className={refreshing ? "animate-spin" : ""} />Refresh</Button></div>{catalogueError && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{catalogueError}</div>}
      <div data-tour="products" className="sp-market-grid mt-5 grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">{visible.map((product) => { const vendor = state.vendors.find((v) => v.id === product.vendorId)!; const distance = product.liveDistanceKm ?? distanceKm(profile.latitude, profile.longitude, vendor.latitude, vendor.longitude); const personalized = preferenceScore(product) > 5; return <article key={product.id} className="sp-product-card group rounded-[28px] p-4"><div className="sp-product-image relative grid h-36 place-items-center overflow-hidden rounded-[22px] text-6xl">{product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover transition group-hover:scale-[1.03]" /> : product.emoji}{personalized && <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-black text-[#50772a] shadow"><Sparkles className="mr-1 inline size-3" />For you</span>}</div><div className="mt-4 flex items-start justify-between gap-2"><div><h3 className="font-black">{product.name}</h3><p className="mt-1 text-xs text-stone-500">{vendor.businessName} · {product.baseUnit}</p><p className="mt-1 text-xs font-bold text-[#5ba400]">{distance?.toFixed(1)} km · schedule {deliveryDate}</p></div><BadgeCheck className="size-5 shrink-0 text-[#5ba400]" /></div><div className="mt-3 flex flex-wrap gap-1">{product.nutritionStatus === "Pending review" || product.calories <= 0 ? <Status className="border-amber-200 bg-amber-50 text-amber-800">Nutrition pending</Status> : <><Status>{product.calories} kcal</Status><Status>{product.protein}g protein</Status></>}{product.dietaryTags.slice(0, 2).map((tag) => <Status key={tag}>{tag}</Status>)}</div><div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><div className="text-lg font-black sm:text-xl">{money(finalPrice(product, state))}</div><div className="text-[10px] text-stone-500 sm:text-xs">per pack</div></div><div className="sp-card-actions flex min-w-0 gap-1.5 sm:gap-2"><Button size="sm" variant="outline" onClick={() => addToCart(product)} className="min-w-0 flex-1 rounded-xl px-2 sm:px-3"><ShoppingCart /><span>Add</span></Button><Button size="sm" onClick={() => setSelected(product)} className="min-w-0 flex-1 rounded-xl bg-[#ef3d3d] px-2 hover:bg-[#d92f2f] sm:px-3"><CalendarDays /><span>Plan</span></Button></div></div></article>; })}</div>
      {!visible.length && (locationConfirmed ? <div className="mt-5 space-y-4"><Empty icon={Store} title="No matching products" body={serviceable.length ? "Your filters are narrowing the currently serviceable marketplace. Clear one or more filters, or ask She Agent for alternatives." : emptyReason} action={serviceable.length ? <Button onClick={() => { setMaxPrice(0); setMaxCalories(0); setMinProtein(0); setDietary("All"); setCategory("All"); setQuery(""); }} variant="outline" className="rounded-xl">Clear marketplace filters</Button> : undefined} /><div className="grid gap-3 sm:grid-cols-5">{diagnostics && [["Verified", diagnostics.verified_vendors], ["Open", diagnostics.open_vendors], ["With stock", diagnostics.vendors_with_products], ["In radius", diagnostics.vendors_in_radius], ["Products", diagnostics.serviceable_products]].map(([label, value]) => <div key={String(label)} className="surface-card rounded-2xl p-3 text-center"><div className="text-xl font-black">{value}</div><div className="text-xs text-stone-500">{label}</div></div>)}</div></div> : <Empty icon={LocateFixed} title="Confirm your actual location first" body="Products are hidden until GPS or a searched address creates a real service pin." action={<Button onClick={() => setLocationOpen(true)} className="rounded-xl bg-[#5ba400]"><LocateFixed />Detect my location</Button>} />)}
    </section>

    <ScheduleDialog product={selected} close={() => setSelected(null)} session={session} state={state} setState={setState} initialStartDate={deliveryDate} onCreated={() => navigate("Cart")} />
    <Dialog open={locationOpen} onOpenChange={setLocationOpen}><DialogContent className="max-h-[92vh] overflow-y-auto rounded-[26px] sm:max-w-3xl"><DialogHeader><DialogTitle className="text-2xl font-black">Confirm your delivery location</DialogTitle><DialogDescription>Use fresh GPS for your actual position, or search a complete address. Products are matched using the saved coordinates—not the address text.</DialogDescription></DialogHeader><Field label="Full delivery address"><Textarea value={draftAddress} onChange={(event) => setDraftAddress(event.target.value)} placeholder="Flat, street, landmark, area, city and PIN" className="min-h-24 rounded-xl" /></Field><LocationSuggestions query={draftAddress} onSelect={(place) => { setDraftAddress(place.address); setDraftCoords({ lat: place.latitude, lng: place.longitude }); }} /><div className="flex flex-wrap gap-2"><Button onClick={detectLocation} disabled={locating} className="rounded-xl bg-[#5ba400]"><LocateFixed className={locating ? "animate-spin" : ""} />{locating ? "Getting fresh GPS…" : "Use my actual GPS location"}</Button><Button onClick={findTypedLocation} disabled={mapBusy} variant="outline" className="rounded-xl"><Search className={mapBusy ? "animate-pulse" : ""} />{mapBusy ? "Searching…" : "Find typed address"}</Button></div><MapPreview lat={draftCoords.lat} lng={draftCoords.lng} radius={2} label="Customer delivery pin" /><Button onClick={saveLocation} className="h-12 rounded-xl bg-[#ef3d3d] font-black"><Check />Save this delivery pin</Button></DialogContent></Dialog>
  </div>;
}

function ScheduleDialog({ product, close, session, state, setState, initialStartDate, onCreated }: { product: Product | null; close: () => void; session: DemoSession; state: V3State; setState: React.Dispatch<React.SetStateAction<V3State>>; initialStartDate?: string; onCreated?: () => void }) {
  const [startDate, setStartDate] = useState(tomorrow());
  const [endDate, setEndDate] = useState("");
  const [recurrence, setRecurrence] = useState<Schedule["recurrence"]>("Once");
  const [days, setDays] = useState<string[]>([]);
  const [slot, setSlot] = useState("06:00–07:00 AM");
  const [quantity, setQuantity] = useState(1);
  const [mode, setMode] = useState<DeliveryMode>("Vendor delivery");
  useEffect(() => { if (product) queueMicrotask(() => { setQuantity(product.quantityStep); setRecurrence("Once"); setDays([]); setStartDate(initialStartDate && initialStartDate >= tomorrow() ? initialStartDate : tomorrow()); setEndDate(""); }); }, [product, initialStartDate]);
  if (!product) return null;
  const scheduledProduct = product;
  const vendor = state.vendors.find((v) => v.id === scheduledProduct.vendorId)!;
  const modes = [vendor.delivery && "Vendor delivery", vendor.pickup && "Self pickup"].filter(Boolean) as DeliveryMode[];
  const effectiveEnd = endDate || (recurrence === "Once" ? startDate : addDaysISO(startDate || tomorrow(), 29));
  const startMs = new Date(`${startDate || tomorrow()}T12:00:00`).getTime();
  const endMs = new Date(`${effectiveEnd}T12:00:00`).getTime();
  const rangeLength = Math.max(1, Math.min(366, Math.floor((endMs - startMs) / 86400000) + 1));
  const rangeDates = Array.from({ length: rangeLength }, (_, index) => addDaysISO(startDate || tomorrow(), index));
  const previewSchedule: Schedule = { id: "preview", customerEmail: session.email, productId: product.id, vendorId: product.vendorId, startDate: startDate || tomorrow(), endDate: effectiveEnd, recurrence, weekdays: days, timeSlot: slot, quantity, unit: product.baseUnit, mode, estimatedOccurrences: 0, status: "Active" };
  const deliveryDates = occurrenceDatesInRange(previewSchedule, rangeDates);
  const occurrences = deliveryDates.length;
  const perDelivery = finalPrice(scheduledProduct, state) * quantity;
  const price = perDelivery * occurrences;
  const hasNutrition = scheduledProduct.nutritionStatus !== "Pending review" && scheduledProduct.calories > 0;
  const calories = hasNutrition ? Math.round(scheduledProduct.calories * quantity * occurrences) : 0;

  async function save() {
    if (!startDate || startDate < tomorrow()) return toast.error("Choose tomorrow or a future date");
    if (endDate && endDate < startDate) return toast.error("End date must be after the start date");
    if (recurrence === "Custom" && !days.length) return toast.error("Choose at least one weekday");
    if (!occurrences) return toast.error("This schedule has no delivery dates. Adjust the dates or repeat pattern.");
    try {
      let scheduleId = id("SCH"); let orderId = id("ORD");
      if (isLiveSupabaseMode()) {
        const saved = await createLiveScheduledCheckout({ productId: scheduledProduct.id, startDate, endDate: endDate || undefined, recurrence, weekdays: days, slot, quantity, unit: scheduledProduct.baseUnit, mode, customerPrice: finalPrice(scheduledProduct, state), perDeliveryTotal: perDelivery, total: price, whatsappReminder: true });
        scheduleId = String(saved.scheduleId); orderId = String(saved.orderId);
      }
      const schedule: Schedule = { id: scheduleId, customerEmail: session.email, productId: scheduledProduct.id, vendorId: scheduledProduct.vendorId, startDate, endDate, recurrence, weekdays: days, timeSlot: slot, quantity, unit: scheduledProduct.baseUnit, mode, estimatedOccurrences: occurrences, status: "Active", nextDeliveryAt: deliveryDates[0], whatsappReminder: true };
      const order: Order = { id: orderId, scheduleId, customerEmail: session.email, vendorId: scheduledProduct.vendorId, productId: scheduledProduct.id, description: scheduledProduct.name, quantity, unit: scheduledProduct.baseUnit, total: price, date: deliveryDates[0], slot, mode, status: "Scheduled", payment: "Pending" };
      setState((s) => ({ ...s, schedules: [schedule, ...s.schedules.filter((x) => x.id !== schedule.id)], orders: [order, ...s.orders.filter((x) => x.id !== order.id)], notifications: [notice(session.email, "customer", "Schedule ready for payment", `${scheduledProduct.name} has ${occurrences} planned deliver${occurrences === 1 ? "y" : "ies"}. Complete payment to activate it.`), ...s.notifications], audit: [audit(session, "Created product schedule", `${scheduledProduct.name} · ${recurrence} · ${occurrences} deliveries`), ...s.audit] }));
      showDeviceNotification("Schedule ready for payment", `${scheduledProduct.name} · ${occurrences} planned deliver${occurrences === 1 ? "y" : "ies"}`);
      toast.success("Schedule saved. Complete payment to activate it."); close(); onCreated?.();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Schedule could not be saved"); }
  }

  return <Dialog open onOpenChange={(open) => !open && close()}><DialogContent className="max-h-[94vh] overflow-y-auto rounded-[28px] p-0 sm:max-w-5xl"><div className="border-b bg-[#111611] p-6 text-white"><DialogHeader><DialogTitle className="flex items-center gap-3 text-2xl font-black"><span className="grid size-11 place-items-center rounded-xl bg-[#5ba400]"><CalendarDays /></span>Schedule {product.name}</DialogTitle><DialogDescription className="text-white/60">Choose the actual delivery period, repeat pattern, time and pack quantity.</DialogDescription></DialogHeader></div><div className="grid gap-0 lg:grid-cols-[1.2fr_.8fr]"><div className="space-y-6 p-6"><div className="grid gap-4 sm:grid-cols-2"><Field label="Starts"><input type="date" min={tomorrow()} value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} /></Field><Field label="Ends (optional)"><input type="date" min={startDate || tomorrow()} value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} /></Field></div><div><div className="mb-2 text-xs font-black uppercase tracking-[.1em] text-stone-500">Repeat</div><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{(["Once", "Daily", "Weekly", "Custom"] as const).map((item) => <button key={item} type="button" onClick={() => setRecurrence(item)} className={`rounded-xl border p-3 text-sm font-black ${recurrence === item ? "border-[#5ba400] bg-[#eff7e5] text-[#477f00]" : ""}`}>{item}</button>)}</div></div>{recurrence === "Custom" && <div><div className="mb-2 text-xs font-black uppercase tracking-[.1em] text-stone-500">Delivery days</div><div className="flex flex-wrap gap-2">{weekdays.map((day) => <button type="button" key={day} onClick={() => setDays(days.includes(day) ? days.filter((x) => x !== day) : [...days, day])} className={`grid size-11 place-items-center rounded-full border text-xs font-black ${days.includes(day) ? "border-[#5ba400] bg-[#5ba400] text-white" : ""}`}>{day}</button>)}</div></div>}<Field label="Preferred time"><Select value={slot} onValueChange={setSlot}><SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{["06:00–07:00 AM", "07:00–08:00 AM", "08:00–09:00 AM", "12:00–01:00 PM", "05:00–06:00 PM", "07:00–08:00 PM"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></Field><div><div className="mb-2 text-xs font-black uppercase tracking-[.1em] text-stone-500">Number of packs per delivery</div><div className="flex flex-wrap items-center gap-3"><Button variant="outline" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="size-11 rounded-xl">−</Button><div className="min-w-40 rounded-2xl border border-stone-200/80 bg-white/90 px-4 py-3 text-center text-base font-black shadow-sm">{quantity} × {product.baseUnit}</div><Button variant="outline" onClick={() => setQuantity(quantity + 1)} className="size-11 rounded-xl">+</Button></div></div><Field label="Fulfilment"><Select value={modes.includes(mode) ? mode : modes[0]} onValueChange={(v) => setMode(v as DeliveryMode)}><SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{modes.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></Field><div className="rounded-2xl bg-[#f6f8f2] p-4"><div className="text-xs font-black uppercase tracking-[.1em] text-stone-500">Delivery dates</div><div className="mt-2 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">{deliveryDates.slice(0, 60).map((date) => <span key={date} className="rounded-full border bg-white px-2.5 py-1 text-xs font-bold">{new Date(`${date}T12:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>)}{deliveryDates.length > 60 && <span className="px-2 py-1 text-xs text-stone-500">+{deliveryDates.length - 60} more</span>}</div></div></div><div className="bg-[#f5f7f1] p-6"><div className="surface-card rounded-[24px] p-5"><div className="text-5xl">{product.emoji}</div><h3 className="mt-4 text-xl font-black">{product.name}</h3><p className="text-sm text-stone-500">{vendor.businessName} · {product.baseUnit}</p><div className="mt-5 space-y-3 text-sm"><Review label="Frequency" value={recurrence} /><Review label="Confirmed delivery dates" value={String(occurrences)} />{hasNutrition ? <Review label="Calories (all planned packs)" value={`${calories.toLocaleString("en-IN")} kcal`} /> : <Review label="Nutrition" value="Pending review" />}<Review label="Per delivery" value={money(perDelivery)} /><Review label="Total to activate schedule" value={money(price)} /></div><div className="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">The schedule remains in checkout until payment. After payment, all confirmed delivery dates appear in My Schedule and Orders, and the vendor receives the order.</div><Button onClick={save} className="mt-5 h-12 w-full rounded-xl bg-[#ef3d3d] font-black hover:bg-[#d92f2f]"><CreditCard />Continue to payment</Button></div></div></div></DialogContent></Dialog>;
}
function Schedules({ session, state }: { session: DemoSession; state: V3State }) { const items = state.schedules.filter((x) => x.customerEmail === session.email); return <div className="space-y-6"><Heading eyebrow="RECURRING PLAN" title="My product schedules" body="Each product keeps its own quantity unit, recurrence, dates and time window." />{items.length ? <div className="grid gap-4 lg:grid-cols-2">{items.map((schedule) => { const product = state.products.find((x) => x.id === schedule.productId); return <div key={schedule.id} className="surface-card rounded-[26px] p-5"><div className="flex items-center gap-3"><div className="text-4xl">{product?.emoji || "📦"}</div><div className="flex-1"><div className="font-black">{product?.name || "Product"}</div><div className="text-xs text-stone-500">{schedule.id}</div></div><Status>{schedule.recurrence}</Status></div><div className="mt-5 grid grid-cols-2 gap-3 text-sm"><Review label="Starts" value={schedule.startDate} /><Review label="Quantity" value={`${schedule.quantity} ${schedule.unit}`} /><Review label="Time" value={schedule.timeSlot} /><Review label="Mode" value={schedule.mode} /></div></div>; })}</div> : <Empty icon={CalendarDays} title="No schedules yet" body="Open Marketplace and schedule a product from a verified vendor." />}</div>; }

function Requirements({ session, state, setState }: { session: DemoSession; state: V3State; setState: React.Dispatch<React.SetStateAction<V3State>> }) {
  const [title, setTitle] = useState("Monthly household groceries"), [deliveryDate, setDeliveryDate] = useState(tomorrow()), [items, setItems] = useState<RequirementItem[]>([{ id: id("ITM"), name: "", quantity: 1, unit: "kg", brand: "Any" }]);
  function add() { setItems((list) => [...list, { id: id("ITM"), name: "", quantity: 1, unit: "kg", brand: "Any" }]); }
  function submit() { if (!items.some((x) => x.name.trim())) return toast.error("Add at least one item"); const requirement: Requirement = { id: id("RFQ"), customerEmail: session.email, title, deliveryDate, items: items.filter((x) => x.name.trim()), status: "Quoting" }; const eligible = state.vendors.filter((v) => v.verification === "Verified" && v.operational === "Active" && v.plan === "Premium"); setState((s) => ({ ...s, requirements: [requirement, ...s.requirements], notifications: [notice(session.email, "customer", "Requirement sent", `${eligible.length} eligible premium vendor(s) can quote.`), ...eligible.map((v) => notice(v.ownerEmail, "vendor", "New quote opportunity", `${title} has ${requirement.items.length} items.`)), ...s.notifications], audit: [audit(session, "Submitted monthly requirement", `${requirement.id} · ${eligible.length} vendors eligible`), ...s.audit] })); toast.success("Monthly requirement opened for quotations"); }
  return <div className="space-y-6"><Heading eyebrow="MONTHLY REQUIREMENT" title="Request local quotations" body="Add your real household list. Eligible verified vendors on a quotation-enabled plan can submit their best price." action={<Button onClick={add} variant="outline" className="rounded-xl"><Plus />Add item</Button>} /><div className="surface-card rounded-[28px] p-5"><div className="grid gap-4 md:grid-cols-2"><Field label="Request title"><input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} /></Field><Field label="Needed on"><input type="date" min={tomorrow()} value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className={inputClass} /></Field></div><div className="mt-5 space-y-3">{items.map((item, index) => <div key={item.id} className="grid gap-2 rounded-[24px] bg-[#f8f5ef] p-3.5 md:grid-cols-[1.5fr_.5fr_.55fr_1fr_auto]"><input aria-label={`Item ${index + 1}`} value={item.name} onChange={(e) => setItems((list) => list.map((x) => x.id === item.id ? { ...x, name: e.target.value } : x))} placeholder="Product name" className={inputClass} /><input type="number" min=".1" step=".1" value={item.quantity} onChange={(e) => setItems((list) => list.map((x) => x.id === item.id ? { ...x, quantity: Number(e.target.value) } : x))} className={inputClass} /><Select value={item.unit} onValueChange={(value) => setItems((list) => list.map((x) => x.id === item.id ? { ...x, unit: value } : x))}><SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{["kg", "litre", "piece", "pack", "dozen"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select><input value={item.brand} onChange={(e) => setItems((list) => list.map((x) => x.id === item.id ? { ...x, brand: e.target.value } : x))} placeholder="Preferred brand" className={inputClass} /><Button variant="ghost" onClick={() => setItems((list) => list.filter((x) => x.id !== item.id))}><X /></Button></div>)}</div><Button onClick={submit} className="mt-5 h-12 rounded-xl bg-[#ef3d3d] font-black hover:bg-[#d92f2f]"><Send />Send for local quotes</Button></div></div>;
}

function CustomerQuotes({ session, state, setState }: { session: DemoSession; state: V3State; setState: React.Dispatch<React.SetStateAction<V3State>> }) { const requirements = state.requirements.filter((x) => x.customerEmail === session.email); function selectQuote(quote: Quote) { const req = state.requirements.find((x) => x.id === quote.requirementId)!; setState((s) => ({ ...s, quotes: s.quotes.map((x) => x.requirementId === quote.requirementId ? { ...x, status: x.id === quote.id ? "Selected" : "Not selected" } : x), requirements: s.requirements.map((x) => x.id === req.id ? { ...x, status: "Awarded" } : x), orders: [{ id: id("ORD"), customerEmail: session.email, vendorId: quote.vendorId, description: req.title, quantity: req.items.length, unit: "items", total: quote.total + quote.deliveryFee, date: req.deliveryDate, slot: "Vendor to confirm", mode: "Vendor delivery", status: "Scheduled", payment: "Pending" }, ...s.orders], notifications: [notice(session.email, "customer", "Quotation selected", `${money(quote.total + quote.deliveryFee)} order created.`), ...s.notifications] })); toast.success("Quotation selected and order created"); } return <div className="space-y-6"><Heading eyebrow="SEALED QUOTATIONS" title="Compare vendor offers" body="Vendor offers remain independent. Choose based on price, fulfilment and trust." />{requirements.length ? requirements.map((req) => <div key={req.id} className="surface-card rounded-[28px] p-5"><div className="flex justify-between"><div><h3 className="font-black">{req.title}</h3><p className="text-xs text-stone-500">{req.id} · {req.items.length} items · {req.deliveryDate}</p></div><Status>{req.status}</Status></div><div className="mt-4 grid gap-3 lg:grid-cols-3">{state.quotes.filter((x) => x.requirementId === req.id).map((quote) => { const vendor = state.vendors.find((x) => x.id === quote.vendorId); return <div key={quote.id} className="surface-card rounded-[24px] p-4"><BadgeCheck className="text-[#5ba400]" /><h4 className="mt-3 font-black">{vendor?.businessName}</h4><div className="mt-2 text-2xl font-black">{money(quote.total + quote.deliveryFee)}</div><p className="mt-2 text-xs text-stone-500">{quote.note || "No vendor note"}</p><Button disabled={quote.status !== "Submitted"} onClick={() => selectQuote(quote)} className="mt-4 w-full rounded-xl bg-[#5ba400] hover:bg-[#4c8c00]">Select quote</Button></div>; })}</div>{!state.quotes.some((x) => x.requirementId === req.id) && <div className="surface-card-muted mt-4 rounded-2xl p-4 text-sm text-stone-500">Waiting for eligible local vendors to quote.</div>}</div>) : <Empty icon={ClipboardCheck} title="No quotation requests" body="Create a monthly requirement first." />}</div>; }

function CustomerProfileView({ session, state, setState }: { session: DemoSession; state: V3State; setState: React.Dispatch<React.SetStateAction<V3State>> }) { const profile = state.customers.find((x) => x.email === session.email)!; const [dislikes, setDislikes] = useState(profile.dislikes); return <div className="space-y-6"><Heading eyebrow="PRIVATE PROFILE" title="Location, diet & preferences" body="She Agent uses this information only within your customer context to personalize suggestions." /><div className="grid gap-5 lg:grid-cols-2"><div className="surface-card rounded-[28px] p-6"><h3 className="font-black">Household</h3><div className="mt-5 space-y-3"><Review label="Address" value={profile.address} /><Review label="Household size" value={String(profile.householdSize)} /><Review label="Diet" value={profile.diet} /><Review label="Allergies" value={profile.allergies.join(", ") || "None selected"} /><Review label="Goals" value={profile.goals.join(", ") || "None selected"} /></div></div><div className="surface-card rounded-[28px] p-6"><h3 className="font-black">Instructions for She Agent</h3><Textarea value={dislikes} onChange={(e) => setDislikes(e.target.value)} className="mt-4 min-h-32 rounded-xl" /><Button onClick={() => { setState((s) => ({ ...s, customers: s.customers.map((x) => x.email === session.email ? { ...x, dislikes } : x) })); toast.success("Preferences updated"); }} className="mt-4 rounded-xl bg-[#5ba400]">Save changes</Button></div></div></div>; }

function CartView({ session, state, setState, navigate }: { session: DemoSession; state: V3State; setState: React.Dispatch<React.SetStateAction<V3State>>; navigate: (page: string) => void }) {
  const items = state.cart.filter((item) => item.customerEmail === session.email);
  const pendingOrders = state.orders.filter((item) => item.customerEmail === session.email && item.payment === "Pending" && item.status !== "Cancelled");
  const [paying, setPaying] = useState<Order | null>(null);
  const [savingCart, setSavingCart] = useState(false);
  const total = items.reduce((sum, item) => { const product = state.products.find((x) => x.id === item.productId); return sum + (product ? finalPrice(product, state) * item.quantity : 0); }, 0);
  useEffect(() => { if (!paying && pendingOrders.length === 1) queueMicrotask(() => setPaying(pendingOrders[0])); }, [pendingOrders.length]);

  async function persistOwnCart(nextOwn: CartItem[], createdBy: "customer" | "she_agent" = "customer") {
    setState((current) => ({ ...current, cart: [...current.cart.filter((item) => item.customerEmail !== session.email), ...nextOwn] }));
    if (!isLiveSupabaseMode()) return;
    setSavingCart(true);
    try {
      const saved = await syncLiveCart({ items: nextOwn.map((item) => ({ productId: item.productId, quantity: item.quantity })), createdBy });
      if (saved.snapshot) setState((current) => mergeLiveCommerce(current, saved.snapshot as LiveCommerceStateSnapshot, session));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Cart could not be saved");
      try { const snapshot = await loadLiveCommerceSnapshot(); setState((current) => mergeLiveCommerce(current, snapshot, session)); } catch {}
      throw error;
    } finally { setSavingCart(false); }
  }

  async function changeQuantity(item: CartItem, delta: number) {
    const nextOwn = items.map((row) => row.id === item.id ? { ...row, quantity: Math.max(1, row.quantity + delta) } : row);
    try { await persistOwnCart(nextOwn); } catch { /* toast handled above */ }
  }

  async function removeItem(item: CartItem) {
    const nextOwn = items.filter((row) => row.id !== item.id);
    try { await persistOwnCart(nextOwn); toast.success("Item removed from cart"); } catch { /* toast handled above */ }
  }

  async function confirm() {
    if (!items.length || savingCart) return;
    if (isLiveSupabaseMode()) {
      setSavingCart(true);
      try {
        // Sync first so carts created on another device / older build are reconciled before checkout.
        await syncLiveCart({ items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })) });
        const result = await checkoutLiveCart({ scheduledDate: tomorrow(), slot: "07:00–08:00 AM" });
        const snapshot = result.snapshot as LiveCommerceStateSnapshot | undefined;
        if (!snapshot) throw new Error("Checkout did not return the latest order state.");
        const next = mergeLiveCommerce(state, snapshot, session);
        setState(next);
        const ids = Array.isArray(result.orderIds) ? result.orderIds.map(String) : [];
        const createdOrders = next.orders.filter((order) => ids.includes(order.id) && order.payment === "Pending");
        if (createdOrders.length === 1) setPaying(createdOrders[0]);
        toast.success(createdOrders.length > 1 ? `${createdOrders.length} vendor checkouts are ready for payment.` : "Checkout is ready for payment.");
      } catch (error) { toast.error(error instanceof Error ? error.message : "Checkout could not be created"); }
      finally { setSavingCart(false); }
      return;
    }
    const first = state.products.find((x) => x.id === items[0].productId); if (!first) return;
    const vendor = state.vendors.find((x) => x.id === first.vendorId);
    const order: Order = { id: id("ORD"), customerEmail: session.email, vendorId: first.vendorId, description: items.map((item) => state.products.find((x) => x.id === item.productId)?.name).filter(Boolean).join(", "), quantity: items.reduce((sum, x) => sum + x.quantity, 0), unit: "packs", total, date: tomorrow(), slot: "07:00–08:00 AM", mode: vendor?.delivery ? "Vendor delivery" : "Self pickup", status: "Scheduled", payment: "Pending", cancellationFee: 0 };
    setState((current) => ({ ...current, orders: [order, ...current.orders], cart: current.cart.filter((item) => item.customerEmail !== session.email), notifications: [notice(session.email, "customer", "Checkout ready", `${order.description} is ready for payment.`), ...current.notifications] }));
    setPaying(order);
  }
  return <div className="space-y-6"><Heading eyebrow="CHECKOUT" title="Your cart" body="Your basket is saved with your account. She Agent, Marketplace and Cart all use the same basket, including when you switch devices." />
    {pendingOrders.length > 0 && <div className="space-y-3"><h3 className="text-lg font-black">Awaiting payment</h3>{pendingOrders.map((order) => <div key={order.id} className="surface-card flex flex-col gap-4 rounded-[24px] p-5 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><b>{order.description}</b><div className="mt-1 text-sm text-stone-500">{order.date} · {order.slot} · {order.mode}</div><div className="mt-2 text-xl font-black">{money(order.total)}</div></div><Button onClick={() => setPaying(order)} className="rounded-xl bg-[#5ba400]"><CreditCard />Pay & place order</Button></div>)}</div>}
    {items.length ? <div className="grid gap-5 lg:grid-cols-[1fr_340px]"><div className="space-y-3">{items.map((item) => { const product = state.products.find((x) => x.id === item.productId); if (!product) return null; return <div key={item.id} className="surface-card flex flex-wrap items-center gap-3 rounded-[22px] p-4 sm:flex-nowrap sm:gap-4"><div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[#f8f6f0] text-4xl">{product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" /> : product.emoji}</div><div className="min-w-[140px] flex-1"><b>{product.name}</b><div className="text-xs text-stone-500">{product.baseUnit} · {money(finalPrice(product, state))} each</div></div><div className="ml-auto flex items-center gap-2"><Button disabled={savingCart} variant="outline" size="sm" onClick={() => void changeQuantity(item, -1)}>−</Button><b className="min-w-6 text-center">{item.quantity}</b><Button disabled={savingCart} variant="outline" size="sm" onClick={() => void changeQuantity(item, 1)}>+</Button><button disabled={savingCart} onClick={() => void removeItem(item)} className="grid size-9 place-items-center rounded-xl hover:bg-red-50 hover:text-red-600"><X className="size-4" /></button></div></div>; })}</div><div className="surface-dark h-fit rounded-[28px] p-6 text-white"><h3 className="text-xl font-black">Review basket</h3><Review label="Products" value={String(items.length)} /><Review label="Delivery" value={tomorrow()} /><Review label="Estimated total" value={money(total)} /><Button disabled={savingCart} onClick={() => void confirm()} className="mt-5 w-full rounded-xl bg-[#ef3d3d]"><CreditCard />{savingCart ? "Saving…" : "Continue to payment"}</Button></div></div> : pendingOrders.length === 0 ? <Empty icon={ShoppingCart} title="Your cart is empty" body="Ask She Agent to add products or add them from the marketplace. The same saved basket appears everywhere." /> : null}
    <PaymentDialog order={paying} close={() => setPaying(null)} state={state} setState={setState} onPaid={() => navigate(paying?.scheduleId ? "My schedule" : "Orders")} />
  </div>;
}

function SchedulesV4({ session, state, setState, navigate }: { session: DemoSession; state: V3State; setState: React.Dispatch<React.SetStateAction<V3State>>; navigate: (page: string) => void }) {
  const customerOrders = state.orders.filter((order) => order.customerEmail === session.email && order.status !== "Cancelled");
  const paidDeliveries = customerOrders.filter((order) => order.payment === "Paid").sort((a, b) => a.date.localeCompare(b.date));
  const pendingOrders = customerOrders.filter((order) => order.payment === "Pending");
  const paidScheduleIds = new Set(paidDeliveries.map((order) => order.scheduleId).filter(Boolean) as string[]);
  const storedSchedules = state.schedules.filter((schedule) => schedule.customerEmail === session.email && paidScheduleIds.has(schedule.id));
  const groupedOrders = new Map<string, Order[]>();
  for (const order of paidDeliveries) {
    if (!order.scheduleId) continue;
    const list = groupedOrders.get(order.scheduleId) || [];
    list.push(order); groupedOrders.set(order.scheduleId, list);
  }
  const syntheticSchedules: Schedule[] = [...groupedOrders.entries()].filter(([scheduleId]) => !storedSchedules.some((schedule) => schedule.id === scheduleId)).map(([scheduleId, orders]) => {
    const sorted = [...orders].sort((a, b) => a.date.localeCompare(b.date));
    const first = sorted[0];
    const product = first.productId ? state.products.find((item) => item.id === first.productId) : state.products.find((item) => item.vendorId === first.vendorId && first.description.toLowerCase().includes(item.name.toLowerCase()));
    const uniqueDays = [...new Set(sorted.map((order) => weekdayLabel(order.date)))];
    return { id: scheduleId, customerEmail: session.email, productId: product?.id || "", vendorId: first.vendorId, startDate: first.date, endDate: sorted.at(-1)?.date || first.date, recurrence: sorted.length === 1 ? "Once" : "Custom", weekdays: uniqueDays, timeSlot: first.slot, quantity: first.quantity, unit: first.unit, mode: first.mode, estimatedOccurrences: sorted.length, status: "Active", nextDeliveryAt: sorted.find((order) => order.date >= todayISO())?.date || first.date, whatsappReminder: true };
  });
  const items = [...storedSchedules, ...syntheticSchedules].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const firstUpcoming = paidDeliveries.find((order) => order.date >= todayISO())?.date || todayISO();
  const [selectedDate, setSelectedDate] = useState(firstUpcoming);
  const [rescheduling, setRescheduling] = useState<Schedule | null>(null);
  const calendarAnchor = new Date(`${todayISO()}T12:00:00`);
  calendarAnchor.setDate(calendarAnchor.getDate() - calendarAnchor.getDay());
  const anchorISO = localDateISO(calendarAnchor);
  const calendar = Array.from({ length: 28 }, (_, index) => addDaysISO(anchorISO, index));
  const ordersByDate = new Map<string, Order[]>();
  for (const date of calendar) ordersByDate.set(date, paidDeliveries.filter((order) => order.date === date));
  const selectedOrders = paidDeliveries.filter((order) => order.date === selectedDate);

  function change(schedule: Schedule, action: "pause" | "resume" | "cancel") {
    if (!state.schedules.some((item) => item.id === schedule.id)) return toast.info("Schedule details are syncing. You can manage the individual delivery from Orders in the meantime.");
    let patch: Partial<Schedule> = {}; let message = "";
    if (action === "pause") { patch = { status: "Paused" }; message = "Schedule paused"; }
    if (action === "resume") { patch = { status: "Active" }; message = "Schedule resumed"; }
    if (action === "cancel") { if (!confirm("Cancel this recurring schedule? Existing prepared orders may still have a cancellation charge.")) return; patch = { status: "Cancelled" }; message = "Schedule cancelled"; }
    setState((s) => ({ ...s, schedules: s.schedules.map((x) => x.id === schedule.id ? { ...x, ...patch } : x), notifications: [notice(session.email, "customer", message, `${schedule.id} was updated.`), ...s.notifications] })); toast.success(message);
  }

  return <div className="space-y-6"><Heading eyebrow="CALENDAR" title="My schedule" body="Only paid, active schedules appear here. Every confirmed delivery date is taken from your actual orders, so recurring deliveries remain visible after payment and across future days." />
    {pendingOrders.length > 0 && <button onClick={() => navigate("Cart")} className="flex w-full items-center gap-3 rounded-[22px] border border-amber-200 bg-amber-50 p-4 text-left text-sm text-amber-950"><CreditCard className="size-5 shrink-0" /><span className="flex-1"><b>{pendingOrders.length} schedule{pendingOrders.length === 1 ? "" : "s"} waiting for payment.</b> Complete checkout to activate the delivery calendar.</span><ArrowRight className="size-4" /></button>}
    <div className="surface-card rounded-[28px] p-4 sm:p-5"><div className="mb-4 flex items-center justify-between gap-3"><div><div className="text-xs font-black uppercase tracking-[.12em] text-[#5f8f2d]">Next 4 weeks</div><div className="mt-1 text-sm text-stone-500">Tap a date to see confirmed paid deliveries.</div></div>{paidDeliveries.length > 0 && <Status>{paidDeliveries.filter((order) => order.date >= todayISO()).length} upcoming</Status>}</div><div className="grid grid-cols-7 gap-1.5 sm:gap-2">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((day) => <div key={day} className="pb-1 text-center text-[10px] font-black uppercase text-stone-400 sm:text-[11px]">{day}</div>)}{calendar.map((date) => { const dayOrders = ordersByDate.get(date) || []; const isToday = date === todayISO(); return <button key={date} onClick={() => setSelectedDate(date)} className={`sp-calendar-day relative min-h-16 rounded-2xl border p-1.5 text-center sm:min-h-20 sm:p-2 ${selectedDate === date ? "border-[#5f8f2d] bg-[#eff7e5]" : isToday ? "border-stone-300 bg-stone-50" : "bg-white hover:bg-stone-50"}`}><span className="text-sm font-black sm:text-base">{new Date(`${date}T12:00:00`).getDate()}</span>{dayOrders.length > 0 && <span className="mx-auto mt-1 grid size-5 place-items-center rounded-full bg-[#ef3d3d] text-[9px] font-black text-white sm:size-auto sm:min-h-5 sm:w-fit sm:px-2">{dayOrders.length}<span className="hidden sm:inline"> {dayOrders.length === 1 ? "delivery" : "deliveries"}</span></span>}</button>; })}</div>
      {selectedOrders.length > 0 ? <div className="mt-4 rounded-[22px] bg-[#f6f8f2] p-4"><b>{new Date(`${selectedDate}T12:00:00`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</b><div className="mt-3 space-y-2">{selectedOrders.map((order) => <button key={order.id} onClick={() => navigate("Orders")} className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left"><div className="grid size-10 place-items-center rounded-xl bg-[#eff6e6] text-[#50772a]"><Package className="size-4" /></div><div className="min-w-0 flex-1"><div className="truncate text-sm font-black">{order.description}</div><div className="text-xs text-stone-500">{order.slot} · {order.mode}</div></div><Status>{order.status}</Status></button>)}</div></div> : <div className="mt-4 rounded-2xl bg-stone-50 p-3 text-sm text-stone-500">No confirmed delivery on this date.</div>}
    </div>
    {items.length ? <div className="grid gap-4 lg:grid-cols-2">{items.map((schedule) => { const product = schedule.productId ? state.products.find((x) => x.id === schedule.productId) : undefined; const scheduleOrders = groupedOrders.get(schedule.id) || []; const status = schedule.status || "Active"; const upcoming = scheduleOrders.filter((order) => order.date >= todayISO()).map((order) => order.date); const persisted = state.schedules.some((item) => item.id === schedule.id); const displayName = product?.name || scheduleOrders[0]?.description || "Scheduled product"; return <div key={schedule.id} className="surface-card rounded-[26px] p-5"><div className="flex items-start gap-3"><div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#eff6e6] text-2xl">{product?.emoji || "📦"}</div><div className="min-w-0 flex-1"><div className="font-black">{displayName}</div><div className="mt-1 text-xs text-stone-500">{schedule.recurrence}{schedule.recurrence === "Custom" && schedule.weekdays.length ? ` · ${schedule.weekdays.join(", ")}` : ""} · {schedule.timeSlot}</div></div><Status>{status}</Status></div><div className="mt-4 grid grid-cols-2 gap-2 rounded-[20px] bg-[#f8f5ef] p-3 text-xs"><div><span className="text-stone-400">Paid deliveries</span><div className="mt-1 font-black">{scheduleOrders.length || schedule.estimatedOccurrences}</div></div><div><span className="text-stone-400">Next delivery</span><div className="mt-1 font-black">{upcoming[0] || schedule.nextDeliveryAt || "Completed"}</div></div></div><div className="mt-3 rounded-2xl bg-[#f1f6e8] p-3 text-xs text-[#477f00]"><CalendarDays className="mr-2 inline size-4" />{upcoming.length ? `Upcoming: ${upcoming.slice(0, 5).join(", ")}${upcoming.length > 5 ? ` +${upcoming.length - 5} more` : ""}` : "No future paid deliveries remain."}</div><div className="mt-2 rounded-2xl bg-[#f7f3ed] p-3 text-xs text-stone-500"><MessageSquareText className="mr-2 inline size-4" />Reminder is prepared for one hour before each delivery.</div>{persisted ? <div className="mt-4 flex flex-wrap gap-2">{status === "Paused" ? <Button size="sm" onClick={() => change(schedule, "resume")} className="bg-[#5ba400]"><Play />Resume</Button> : <Button size="sm" variant="outline" disabled={status === "Cancelled"} onClick={() => change(schedule, "pause")}><Pause />Pause</Button>}<Button size="sm" variant="outline" disabled={status === "Cancelled"} onClick={() => setRescheduling(schedule)}><CalendarDays />Reschedule</Button><Button size="sm" variant="outline" disabled={status === "Cancelled"} onClick={() => change(schedule, "cancel")} className="text-red-600">Cancel</Button></div> : <div className="mt-4 text-xs font-bold text-stone-400">Schedule definition is syncing; the confirmed delivery dates above are already active.</div>}</div>; })}</div> : <Empty icon={CalendarDays} title="No active paid schedules" body={pendingOrders.length ? "You have a schedule waiting in Cart for payment." : "Schedule a product, complete payment, and every confirmed delivery date will appear here."} action={pendingOrders.length ? <Button onClick={() => navigate("Cart")} className="rounded-xl bg-[#5f8f2d]"><CreditCard />Go to checkout</Button> : <Button onClick={() => navigate("Marketplace")} variant="outline" className="rounded-xl"><ShoppingBag />Explore marketplace</Button>} />}
    <RescheduleDialog schedule={rescheduling} close={() => setRescheduling(null)} session={session} setState={setState} />
  </div>;
}
function RescheduleDialog({ schedule, close, session, setState }: { schedule: Schedule | null; close: () => void; session: DemoSession; setState: React.Dispatch<React.SetStateAction<V3State>> }) {
  const [startDate, setStartDate] = useState(tomorrow());
  const [recurrence, setRecurrence] = useState<Schedule["recurrence"]>("Once");
  const [days, setDays] = useState<string[]>([]);
  const [slot, setSlot] = useState("06:00–07:00 AM");
  useEffect(() => { if (schedule) queueMicrotask(() => { setStartDate(schedule.startDate < tomorrow() ? tomorrow() : schedule.startDate); setRecurrence(schedule.recurrence); setDays(schedule.weekdays); setSlot(schedule.timeSlot); }); }, [schedule]);
  if (!schedule) return null;
  const preview = occurrenceDatesInRange({ ...schedule, startDate, recurrence, weekdays: days }, Array.from({ length: 30 }, (_, index) => addDaysISO(todayISO(), index + 1)));
  function save() {
    if (!schedule) return;
    if (!startDate || startDate < tomorrow()) return toast.error("Choose tomorrow or a later date");
    if (recurrence === "Custom" && !days.length) return toast.error("Choose at least one delivery day");
    setState((s) => ({
      ...s,
      schedules: s.schedules.map((x) => x.id === schedule.id ? { ...x, startDate, recurrence, weekdays: days, timeSlot: slot, nextDeliveryAt: startDate } : x),
      notifications: [notice(session.email, "customer", "Schedule rescheduled", `${schedule.id} now starts ${startDate}${recurrence === "Custom" ? ` on ${days.join(", ")}` : ""}.`), ...s.notifications],
      audit: [audit(session, "Rescheduled product schedule", `${schedule.id} → ${startDate} · ${recurrence}`), ...s.audit],
    }));
    toast.success("Schedule updated"); close();
  }
  return <Dialog open onOpenChange={(open) => !open && close()}><DialogContent className="max-h-[92vh] overflow-y-auto rounded-[28px] sm:max-w-xl"><DialogHeader><DialogTitle className="text-2xl font-black">Reschedule delivery</DialogTitle><DialogDescription>Pick the new date, repeat pattern and delivery days. The preview below shows every date this will actually fall on.</DialogDescription></DialogHeader>
    <div className="space-y-5">
      <Field label="New start date"><input type="date" min={tomorrow()} value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} /></Field>
      <div><div className="mb-2 text-xs font-black uppercase tracking-[.1em] text-stone-500">Repeat</div><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{(["Once", "Daily", "Weekly", "Custom"] as const).map((item) => <button key={item} type="button" onClick={() => setRecurrence(item)} className={`rounded-xl border p-3 text-sm font-black ${recurrence === item ? "border-[#5ba400] bg-[#eff7e5] text-[#477f00]" : ""}`}>{item}</button>)}</div></div>
      {recurrence === "Custom" && <div><div className="mb-2 text-xs font-black uppercase tracking-[.1em] text-stone-500">Delivery days</div><div className="flex flex-wrap gap-2">{weekdays.map((day) => <button type="button" key={day} onClick={() => setDays(days.includes(day) ? days.filter((x) => x !== day) : [...days, day])} className={`grid size-11 place-items-center rounded-full border text-xs font-black ${days.includes(day) ? "border-[#5ba400] bg-[#5ba400] text-white" : ""}`}>{day}</button>)}</div></div>}
      <Field label="Preferred time"><Select value={slot} onValueChange={setSlot}><SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{["06:00–07:00 AM", "07:00–08:00 AM", "08:00–09:00 AM", "12:00–01:00 PM", "05:00–06:00 PM", "07:00–08:00 PM"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></Field>
      <div className="rounded-2xl bg-[#f6f8f2] p-4 text-sm"><b>{preview.length} deliver{preview.length === 1 ? "y" : "ies"} in the next 30 days</b>{preview.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{preview.slice(0, 12).map((date) => <span key={date} className="rounded-full border border-[#5f8f2d]/25 bg-white/90 px-2.5 py-1 text-xs font-bold text-[#50772a] shadow-sm">{new Date(`${date}T12:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>)}{preview.length > 12 && <span className="text-xs text-stone-500">+{preview.length - 12} more</span>}</div>}{!preview.length && <p className="mt-1 text-xs text-amber-700">No dates match this combination yet — choose different days or a start date.</p>}</div>
      <Button onClick={save} className="h-12 w-full rounded-xl bg-[#ef3d3d] font-black hover:bg-[#d92f2f]"><Check />Save new schedule</Button>
    </div>
  </DialogContent></Dialog>;
}

function parseRequirementText(text: string) {
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 100).map((line) => {
    const parts = line.split(/,|\t|\s+-\s+/).map((x) => x.trim());
    const match = (parts[1] || "1 pack").match(/([\d.]+)\s*(kg|g|litre|l|ml|piece|pack|dozen)?/i);
    return { id: id("ITM"), name: parts[0], quantity: Number(match?.[1] || 1), unit: (match?.[2] || "pack").toLowerCase().replace(/^l$/, "litre"), brand: parts[2] || "Any" } as RequirementItem;
  });
}

function RequirementsV4({ session, state, setState }: { session: DemoSession; state: V3State; setState: React.Dispatch<React.SetStateAction<V3State>> }) {
  const [title, setTitle] = useState("Monthly household groceries"), [deliveryDate, setDeliveryDate] = useState(tomorrow()), [closingDate, setClosingDate] = useState(tomorrow()), [sourceFileName, setSourceFileName] = useState(""), [items, setItems] = useState<RequirementItem[]>([{ id: id("ITM"), name: "", quantity: 1, unit: "kg", brand: "Any" }]);
  async function upload(file?: File) { if (!file) return; setSourceFileName(file.name); const text = await file.text(); const parsed = parseRequirementText(text); if (!parsed.length) return toast.error("No list rows were found. Use CSV/TXT with one product per line."); setItems(parsed); toast.success(`${parsed.length} item(s) extracted. Review before sending.`); }
  function submit() { const valid = items.filter((x) => x.name.trim()); if (!valid.length) return toast.error("Add at least one item"); if (closingDate > deliveryDate) return toast.error("RFQ closing date must be on or before the required date"); const profile = state.customers.find((x) => x.email === session.email); const eligible = state.vendors.filter((v) => v.verification === "Verified" && v.operational === "Active" && v.plan === "Premium" && (!profile || distanceKm(profile.latitude, profile.longitude, v.latitude, v.longitude) === null || distanceKm(profile.latitude, profile.longitude, v.latitude, v.longitude)! <= v.radiusKm)); const requirement: Requirement = { id: id("RFQ"), customerEmail: session.email, title, deliveryDate, closingDate, sourceFileName, items: valid, status: "Quoting", invitedVendorIds: eligible.map((x) => x.id) }; setState((s) => ({ ...s, requirements: [requirement, ...s.requirements], notifications: [notice(session.email, "customer", "RFQ published", `${eligible.length} serviceable Premium vendor(s) were invited. Quotes close ${closingDate}.`), ...eligible.map((v) => notice(v.ownerEmail, "vendor", "New local RFQ", `${title} closes ${closingDate}.`)), ...s.notifications] })); toast.success("RFQ sent to eligible local vendors"); }
  return <div className="space-y-6"><Heading eyebrow="MONTHLY RFQ" title="Upload or build your monthly list" body="She Agent structures CSV/TXT lists, you review them, set the quote closing date, then eligible local Premium vendors are invited." /><label className="surface-card-muted grid min-h-32 cursor-pointer place-items-center rounded-[28px] border-2 border-dashed p-5 text-center"><input type="file" accept=".csv,.txt,.tsv" className="hidden" onChange={(e) => void upload(e.target.files?.[0])} /><Upload className="text-[#ef3d3d]" /><b>{sourceFileName || "Upload monthly list (CSV, TXT or TSV)"}</b><span className="text-xs text-stone-500">Example: Rice, 5 kg, preferred brand</span></label><div className="surface-card rounded-[28px] p-5"><div className="grid gap-4 md:grid-cols-3"><Field label="Request title"><input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} /></Field><Field label="Quotes close on"><input type="date" min={tomorrow()} value={closingDate} onChange={(e) => setClosingDate(e.target.value)} className={inputClass} /></Field><Field label="Delivery needed on"><input type="date" min={closingDate || tomorrow()} value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className={inputClass} /></Field></div><div className="mt-5 space-y-3">{items.map((item, index) => <div key={item.id} className="grid gap-2 rounded-[24px] bg-[#f8f5ef] p-3.5 md:grid-cols-[1.5fr_.5fr_.55fr_1fr_auto]"><input aria-label={`Item ${index + 1}`} value={item.name} onChange={(e) => setItems((list) => list.map((x) => x.id === item.id ? { ...x, name: e.target.value } : x))} placeholder="Product name" className={inputClass} /><input type="number" min=".1" step=".1" value={item.quantity} onChange={(e) => setItems((list) => list.map((x) => x.id === item.id ? { ...x, quantity: Number(e.target.value) } : x))} className={inputClass} /><Select value={item.unit} onValueChange={(value) => setItems((list) => list.map((x) => x.id === item.id ? { ...x, unit: value } : x))}><SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{["kg","g","litre","ml","piece","pack","dozen"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select><input value={item.brand} onChange={(e) => setItems((list) => list.map((x) => x.id === item.id ? { ...x, brand: e.target.value } : x))} className={inputClass} /><Button variant="ghost" onClick={() => setItems((list) => list.filter((x) => x.id !== item.id))}><X /></Button></div>)}</div><div className="mt-4 flex gap-2"><Button variant="outline" onClick={() => setItems((x) => [...x, { id: id("ITM"), name: "", quantity: 1, unit: "pack", brand: "Any" }])}><Plus />Add row</Button><Button onClick={submit} className="bg-[#ef3d3d]"><Send />Publish RFQ</Button></div></div></div>;
}

function CustomerQuotesV4({ session, state, setState }: { session: DemoSession; state: V3State; setState: React.Dispatch<React.SetStateAction<V3State>> }) {
  const requirements = state.requirements.filter((x) => x.customerEmail === session.email);
  function selectQuote(quote: Quote) { const req = state.requirements.find((x) => x.id === quote.requirementId); if (!req) return; const order: Order = { id: id("ORD"), customerEmail: session.email, vendorId: quote.vendorId, description: req.title, quantity: req.items.length, unit: "items", total: quote.total + quote.deliveryFee, date: req.deliveryDate, slot: "Vendor to confirm", mode: "Vendor delivery", status: "Scheduled", payment: "Pending", cancellationFee: 0 }; const vendor = state.vendors.find((x) => x.id === quote.vendorId); setState((s) => ({ ...s, quotes: s.quotes.map((x) => x.requirementId === quote.requirementId ? { ...x, status: x.id === quote.id ? "Selected" : "Not selected" } : x), requirements: s.requirements.map((x) => x.id === req.id ? { ...x, status: "Awarded" } : x), orders: [order, ...s.orders], notifications: [notice(session.email, "customer", "Quotation selected", `${money(order.total)} order created for ${order.date}.`), ...(vendor ? [notice(vendor.ownerEmail, "vendor", "RFQ awarded", `${order.id} was awarded to your store.`)] : []), ...s.notifications] })); toast.success("Quotation selected. Review payment and delivery before fulfilment."); }
  return <div className="space-y-6"><Heading eyebrow="RFP / RFQ TRACKING" title="Vendor participation & quotations" body="Track which invited vendors accepted, compare sealed offers after submission, and choose the winner yourself." />{requirements.length ? requirements.map((req) => { const invited = req.invitedVendorIds || []; const quotes = state.quotes.filter((x) => x.requirementId === req.id); return <div key={req.id} className="surface-card rounded-[28px] p-5"><div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-black">{req.title}</h3><p className="text-xs text-stone-500">{req.id} · closes {req.closingDate || "not set"} · delivery {req.deliveryDate} · {req.sourceFileName || "manually entered"}</p></div><Status>{req.status}</Status></div><div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-[#f7f3ed] p-3"><b>{invited.length}</b><div className="text-xs text-stone-500">Invited vendors</div></div><div className="rounded-2xl bg-[#eff6e6] p-3"><b>{quotes.length}</b><div className="text-xs text-stone-500">Accepted / quoted</div></div><div className="rounded-2xl bg-[#f7f3ed] p-3"><b>{Math.max(0, invited.length - quotes.length)}</b><div className="text-xs text-stone-500">Awaiting response</div></div></div><div className="mt-4 grid gap-3 lg:grid-cols-3">{quotes.map((quote) => { const vendor = state.vendors.find((x) => x.id === quote.vendorId); return <div key={quote.id} className="surface-card rounded-[24px] p-4"><BadgeCheck className="text-[#5ba400]" /><h4 className="mt-2 font-black">{vendor?.businessName || "Verified vendor"}</h4><div className="mt-2 text-2xl font-black">{money(quote.total + quote.deliveryFee)}</div><p className="mt-1 text-xs text-stone-500">{quote.note}</p><Button disabled={quote.status !== "Submitted"} onClick={() => selectQuote(quote)} className="mt-4 w-full bg-[#5ba400]">Choose this quote</Button></div>; })}</div>{!quotes.length && <div className="mt-4 rounded-2xl border border-amber-200/70 bg-amber-50/85 p-4 text-sm text-amber-900">No vendor has accepted yet. Responses remain open until {req.closingDate || "the closing date"}.</div>}</div>; }) : <Empty icon={ClipboardCheck} title="No RFQs yet" body="Upload a monthly list and publish it to serviceable local vendors." />}</div>;
}

function CustomerProfileV4({ session, state, setState }: { session: DemoSession; state: V3State; setState: React.Dispatch<React.SetStateAction<V3State>> }) {
  const profile = state.customers.find((x) => x.email === session.email)!;
  const memory = profile.agentMemory || {};
  const [phone, setPhone] = useState(profile.phone || ""), [address, setAddress] = useState(profile.address), [diet, setDiet] = useState(profile.diet), [allergies, setAllergies] = useState(profile.allergies.join(", ")), [goals, setGoals] = useState(profile.goals.join(", ")), [instructions, setInstructions] = useState(profile.dislikes), [coords, setCoords] = useState({ lat: profile.latitude, lng: profile.longitude });
  const [clearingMemory, setClearingMemory] = useState(false);
  function detect() { navigator.geolocation?.getCurrentPosition(async (position) => { const point = { lat: position.coords.latitude, lng: position.coords.longitude }; setCoords(point); try { const place = await findLocation(point); setAddress(place.address); } catch { setAddress(`GPS pin ${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}`); } }, () => toast.error("Allow precise location in your browser"), { enableHighAccuracy: true, maximumAge: 0 }); }
  async function save() { const next = { ...profile, phone, address, latitude: coords.lat, longitude: coords.lng, diet, allergies: allergies.split(",").map((x) => x.trim()).filter(Boolean), goals: goals.split(",").map((x) => x.trim()).filter(Boolean), dislikes: instructions, addresses: [{ id: profile.addresses?.[0]?.id || id("ADR"), label: "Home", address, latitude: coords.lat, longitude: coords.lng, phone, isDefault: true }, ...(profile.addresses || []).filter((x) => !x.isDefault)] }; try { if (session.userId && isLiveSupabaseMode() && Number.isFinite(coords.lat) && Number.isFinite(coords.lng)) await saveLiveCustomerProfile({ userId: session.userId, phone, address, latitude: coords.lat!, longitude: coords.lng!, householdSize: profile.householdSize, diet, allergies: next.allergies, goals: next.goals, instructions }); setState((s) => ({ ...s, customers: s.customers.map((x) => x.email === session.email ? next : x) })); toast.success("Profile and default address saved"); } catch (error) { toast.error(error instanceof Error ? error.message : "Profile could not be saved"); } }
  function addAddress() { const value = prompt("Enter another complete delivery address"); if (!value) return; setState((s) => ({ ...s, customers: s.customers.map((x) => x.email === session.email ? { ...x, addresses: [...(x.addresses || []), { id: id("ADR"), label: `Address ${(x.addresses?.length || 0) + 1}`, address: value, isDefault: false }] } : x) })); }
  async function clearMemory() {
    if (!confirm("Clear She Agent's learned shopping preferences? Your profile, orders, addresses and explicit food settings will stay unchanged.")) return;
    setClearingMemory(true);
    try {
      if (session.userId && isLiveSupabaseMode()) await clearLiveCustomerMemory(session.userId);
      setState((current) => ({ ...current, customers: current.customers.map((item) => item.email === session.email ? { ...item, agentMemory: {} } : item) }));
      toast.success("She Agent memory cleared");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Memory could not be cleared"); }
    finally { setClearingMemory(false); }
  }
  const remembered = [
    ["Typical budget", memory.lastBudget ? money(memory.lastBudget) : "Not learned"],
    ["Favourite categories", memory.favoriteCategories?.join(", ") || "Not learned"],
    ["Favourite products", memory.favoriteProducts?.join(", ") || "Not learned"],
    ["Calorie preference", memory.calorieTarget ? `Up to ${memory.calorieTarget} kcal / pack` : "Not learned"],
    ["Protein preference", memory.minProtein ? `At least ${memory.minProtein} g / pack` : "Not learned"],
    ["Dietary preference", memory.preferredDietaryTags?.join(", ") || "Not learned"],
    ["Delivery preference", memory.preferredDeliveryPeriod || "Not learned"],
  ];
  return <div className="space-y-6"><Heading eyebrow="YOUR PROFILE" title="Addresses, food preferences & She Agent memory" body="Your explicit profile and the shopping preferences She Agent remembers are separated. Learned shopping preferences are kept privately with your account and can be cleared here at any time." action={<Button variant="outline" onClick={addAddress}><Plus />Add address</Button>} />
    <div className="grid gap-5 lg:grid-cols-2"><div className="surface-card space-y-4 rounded-[28px] p-6"><Field label="Phone / WhatsApp"><input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} placeholder="+91 ..." /></Field><Field label="Default delivery address"><Textarea value={address} onChange={(e) => setAddress(e.target.value)} className="rounded-xl" /></Field><LocationSuggestions query={address} onSelect={(place) => { setAddress(place.address); setCoords({ lat: place.latitude, lng: place.longitude }); }} /><Button variant="outline" onClick={detect}><LocateFixed />Use actual location</Button><MapPreview lat={coords.lat} lng={coords.lng} radius={0} label="Default delivery address" /><div className="space-y-2">{(profile.addresses || []).filter((x) => !x.isDefault).map((item) => <div key={item.id} className="rounded-2xl bg-[#f7f3ed] p-3 text-sm"><b>{item.label}</b><div>{item.address}</div></div>)}</div></div>
      <div className="surface-card space-y-4 rounded-[28px] p-6"><Field label="Diet"><input value={diet} onChange={(e) => setDiet(e.target.value)} className={inputClass} /></Field><Field label="Allergies (comma separated)"><input value={allergies} onChange={(e) => setAllergies(e.target.value)} className={inputClass} /></Field><Field label="Health goals (comma separated)"><input value={goals} onChange={(e) => setGoals(e.target.value)} className={inputClass} /></Field><Field label="Instructions for She Agent"><Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} className="min-h-28 rounded-xl" /></Field><Button onClick={() => void save()} className="bg-[#5ba400]"><Check />Save profile</Button></div></div>
    <section className="surface-card rounded-[28px] p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2"><Sparkles className="size-5 text-[#5f8f2d]" /><h3 className="text-lg font-black">What She Agent remembers</h3></div><p className="mt-2 max-w-3xl text-sm leading-6 text-stone-500">Only durable commerce preferences should be learned from natural conversations. Sensitive attributes, payment data and precise location are excluded from this memory layer.</p></div><Button variant="outline" disabled={clearingMemory} onClick={() => void clearMemory()} className="rounded-xl text-red-600">{clearingMemory ? <RefreshCcw className="animate-spin" /> : <X />}{clearingMemory ? "Clearing…" : "Clear learned memory"}</Button></div><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{remembered.map(([label, value]) => <div key={label} className="rounded-[20px] bg-[#f8f5ef] p-4"><div className="text-[11px] font-black uppercase tracking-[.12em] text-stone-400">{label}</div><div className="mt-2 text-sm font-black">{value}</div></div>)}</div></section>
  </div>;
}

function VendorArea({ active, session, state, setState }: { active: string; session: DemoSession; state: V3State; setState: React.Dispatch<React.SetStateAction<V3State>> }) {
  const vendor = vendorFor(state, session)!;
  if (active === "AI insights") return <VendorAIInsights vendor={vendor} state={state} session={session} />;
  if (active === "Online shop & POS") return <StorefrontPos vendor={vendor} state={state} setState={setState} session={session} />;
  if (active === "Store & radius") return <StoreRadius vendor={vendor} setState={setState} session={session} />;
  if (active === "Verification") return <VerificationView vendor={vendor} setState={setState} session={session} />;
  if (active === "Catalog") return <Catalog vendor={vendor} state={state} setState={setState} session={session} />;
  if (active === "Quote opportunities") return <VendorQuotes vendor={vendor} state={state} setState={setState} session={session} />;
  if (active === "Orders") return <OrdersV4 session={session} state={state} setState={setState} scope="vendor" vendor={vendor} />;
  if (active === "Delivery team") return <DeliveryTeam vendor={vendor} state={state} setState={setState} session={session} />;
  if (active === "Settlements") return <VendorSettlements vendor={vendor} state={state} />;
  if (active === "Ticket centre") return <TicketCentre session={session} state={state} setState={setState} vendor={vendor} />;
  const products = state.products.filter((x) => x.vendorId === vendor.id), orders = state.orders.filter((x) => x.vendorId === vendor.id);
  return <div className="space-y-7"><Heading eyebrow="VENDOR WORKSPACE" title={vendor.businessName} body="Manage verification, daily service area, product nutrition, scheduled orders, quotes and delivery accountability." action={<Status>{vendor.verification}</Status>} /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Active products" value={String(products.filter((x) => x.active).length)} icon={ShoppingBag} /><Metric label="Upcoming orders" value={String(orders.filter((x) => !["Completed", "Cancelled"].includes(x.status)).length)} icon={CalendarDays} /><Metric label="Delivery staff" value={String(state.staff.filter((x) => x.vendorId === vendor.id && x.active).length)} icon={Truck} /><Metric label="Quote opportunities" value={String(state.requirements.filter((r) => r.status === "Quoting").length)} icon={ClipboardCheck} note={vendor.plan === "Premium" ? "Enabled" : "Premium feature"} /></div><div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]"><div className="surface-card rounded-[28px] p-6"><h3 className="font-black">Today&apos;s operating controls</h3><div className="mt-5 grid gap-3 sm:grid-cols-2"><Review label="Store" value={vendor.openToday ? "Open today" : "Closed today"} /><Review label="Service radius" value={`${vendor.radiusKm} km`} /><Review label="Delivery" value={vendor.delivery ? "Enabled" : "Disabled"} /><Review label="Pickup" value={vendor.pickup ? "Enabled" : "Disabled"} /></div>{vendor.verification !== "Verified" && <div className="mt-5 rounded-2xl border border-amber-200/70 bg-amber-50/85 p-4 text-sm text-amber-900"><AlertTriangle className="mr-2 inline size-4" />Marketplace remains locked until Operations verifies the food certification.</div>}</div><div className="surface-dark rounded-[28px] p-6 text-white"><Sparkles className="text-[#91c747]" /><h3 className="mt-4 text-xl font-black">She Agent for your store</h3><p className="mt-2 text-sm leading-6 text-white/55">Ask about only your products, inventory, delivery staff, quotations and orders. Another vendor&apos;s information is outside your access scope.</p></div></div></div>;
}


function VendorAIInsights({ vendor, state, session }: { vendor: Vendor; state: V3State; session: DemoSession }) {
  const products = state.products.filter((item) => item.vendorId === vendor.id);
  const orders = state.orders.filter((item) => item.vendorId === vendor.id);
  const openOrders = orders.filter((item) => !["Completed", "Cancelled"].includes(item.status));
  const lowStock = products.filter((item) => item.active && item.stock <= 5);
  const unassigned = openOrders.filter((item) => item.mode === "Vendor delivery" && !state.assignments.some((assignment) => assignment.orderId === item.id));
  const quoteOpportunities = state.requirements.filter((requirement) => requirement.status === "Quoting" && (!requirement.invitedVendorIds?.length || requirement.invitedVendorIds.includes(vendor.id)));
  const [insight, setInsight] = useState<{ summary: string; recommendedAction: string; wentWell?: string[]; needsAttention?: string[]; recovery?: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  async function askAI() {
    setBusy(true);
    try {
      const token = await getAccessToken();
      const context = { vendor: { id: vendor.id, name: vendor.businessName, openToday: vendor.openToday, radiusKm: vendor.radiusKm, verification: vendor.verification }, products: products.map((item) => ({ id: item.id, name: item.name, stock: item.stock, active: item.active, price: item.vendorPrice })), orders: orders.map((item) => ({ id: item.id, date: item.date, status: item.status, mode: item.mode, total: item.total })), quoteOpportunities: quoteOpportunities.length };
      const response = await fetch("/api/agent", { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ task: "business_insights", role: "vendor", message: "Review my store and tell me what to prioritise today", context }) });
      const json = await response.json() as { result?: { summary?: string; recommendedAction?: string; insights?: { wentWell?: string[]; needsAttention?: string[]; recovery?: string[] } } };
      if (!json.result) return toast.error("She Agent could not analyse your store right now");
      setInsight({ summary: json.result.summary || "Store analysis ready.", recommendedAction: json.result.recommendedAction || "Review the highest-priority operational signal.", wentWell: json.result.insights?.wentWell, needsAttention: json.result.insights?.needsAttention, recovery: json.result.insights?.recovery });
    } catch { toast.error("She Agent is unavailable right now"); }
    finally { setBusy(false); }
  }
  return <div className="space-y-6"><Heading eyebrow="VENDOR AI" title="Store intelligence" body="She Agent analyses only your store workspace: your catalogue, stock, upcoming orders and delivery capacity. It cannot inspect another vendor's information or make payments, pricing or verification decisions for you." action={<Button onClick={() => void askAI()} disabled={busy} className="rounded-xl bg-[#171914]"><Sparkles />{busy ? "Analysing…" : "Ask She Agent"}</Button>} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Open orders" value={String(openOrders.length)} icon={Package} /><Metric label="Low-stock items" value={String(lowStock.length)} icon={AlertTriangle} /><Metric label="Unassigned deliveries" value={String(unassigned.length)} icon={Truck} /><Metric label="RFQ opportunities" value={String(quoteOpportunities.length)} icon={ClipboardCheck} /></div>
    <div className="grid gap-5 xl:grid-cols-[1.05fr_.95fr]"><section className="surface-card rounded-[28px] p-6"><h3 className="font-black">Signals from your store</h3><div className="mt-5 space-y-3"><Review label="Store status" value={vendor.openToday ? "Open" : "Closed"} /><Review label="Published products" value={String(products.filter((item) => item.active).length)} /><Review label="Products needing stock attention" value={lowStock.map((item) => item.name).slice(0, 3).join(", ") || "None"} /><Review label="Delivery queue without assignee" value={String(unassigned.length)} /></div></section>
      <section className="surface-dark rounded-[28px] p-6 text-white"><Activity className="text-[#a8db69]" /><h3 className="mt-4 text-xl font-black">AI daily recommendation</h3>{insight ? <><p className="mt-3 text-sm leading-6 text-white/70">{insight.summary}</p><div className="mt-4 rounded-2xl bg-white/8 p-4 text-sm font-bold text-[#bfe58f]">{insight.recommendedAction}</div></> : <p className="mt-3 text-sm leading-6 text-white/60">Ask She Agent for a grounded daily review. It can flag stock risk, fulfilment load and quote opportunities using your own store data.</p>}</section></div>
    {insight && (insight.wentWell?.length || insight.needsAttention?.length || insight.recovery?.length) ? <div className="grid gap-4 lg:grid-cols-3"><div className="rounded-[24px] border border-emerald-200 bg-emerald-50/60 p-5"><h4 className="font-black text-emerald-800">Going well</h4><ul className="mt-3 space-y-2 text-sm text-emerald-900">{(insight.wentWell || []).map((line, index) => <li key={index}>• {line}</li>)}</ul></div><div className="rounded-[24px] border border-amber-200 bg-amber-50/60 p-5"><h4 className="font-black text-amber-900">Attention</h4><ul className="mt-3 space-y-2 text-sm text-amber-950">{(insight.needsAttention || []).map((line, index) => <li key={index}>• {line}</li>)}</ul></div><div className="rounded-[24px] border border-sky-200 bg-sky-50/60 p-5"><h4 className="font-black text-sky-900">Next actions</h4><ul className="mt-3 space-y-2 text-sm text-sky-950">{(insight.recovery || []).map((line, index) => <li key={index}>• {line}</li>)}</ul></div></div> : null}
  </div>;
}

function readImage(file: File, done: (value: string) => void) { const reader = new FileReader(); reader.onload = () => done(String(reader.result || "")); reader.readAsDataURL(file); }

function StorefrontPos({ vendor, state, setState, session }: { vendor: Vendor; state: V3State; setState: React.Dispatch<React.SetStateAction<V3State>>; session: DemoSession }) {
  const outlets = vendor.outlets || [{ id: `${vendor.id}-main`, name: "Main outlet", address: vendor.address, latitude: vendor.latitude, longitude: vendor.longitude, radiusKm: vendor.radiusKm, openToday: vendor.openToday, certificateNumber: vendor.fssaiNumber, certificateName: vendor.certificateName, certificateExpiry: vendor.expiryDate }];
  function asset(kind: "logoUrl" | "bannerUrl", file?: File) { if (!file) return; readImage(file, (value) => { setState((s) => ({ ...s, vendors: s.vendors.map((x) => x.id === vendor.id ? { ...x, [kind]: value } : x), audit: [audit(session, `Updated storefront ${kind === "logoUrl" ? "logo" : "banner"}`, vendor.businessName), ...s.audit] })); toast.success("Storefront image updated"); }); }
  function addOutlet() { const name = prompt("Outlet / POS name"); const address = prompt("Complete outlet address"); if (!name || !address) return; const outlet: VendorOutlet = { id: id("POS"), name, address, radiusKm: vendor.radiusKm, openToday: false }; setState((s) => ({ ...s, vendors: s.vendors.map((x) => x.id === vendor.id ? { ...x, outlets: [...outlets, outlet] } : x) })); toast.success("Outlet added. Add its certification and exact location before opening."); }
  function updateOutlet(outletId: string, patch: Partial<VendorOutlet>) { setState((s) => ({ ...s, vendors: s.vendors.map((x) => x.id === vendor.id ? { ...x, outlets: outlets.map((outlet) => outlet.id === outletId ? { ...outlet, ...patch } : outlet) } : x), audit: [audit(session, "Updated outlet", `${vendor.businessName} · ${outletId}`), ...s.audit] })); }
  function editCertification(outlet: VendorOutlet) { const number = prompt("Certification / licence number", outlet.certificateNumber || "") ?? (outlet.certificateNumber || ""); const expiry = prompt("Expiry date (YYYY-MM-DD)", outlet.certificateExpiry || "") ?? (outlet.certificateExpiry || ""); updateOutlet(outlet.id, { certificateNumber: number, certificateExpiry: expiry }); toast.success("Outlet certification saved"); }
  return <div className="space-y-6"><Heading eyebrow="ONLINE SHOP" title="Brand storefront & POS locations" body="Manage the brand and each physical POS/outlet. Each outlet can keep its own certification details." action={<Button onClick={addOutlet} className="bg-[#5ba400]"><Plus />Add POS / outlet</Button>} />
    <div className="surface-card overflow-hidden rounded-[32px]"><div className="relative h-40 bg-gradient-to-r from-[#111611] to-[#34520d] sm:h-52">{vendor.bannerUrl && <img src={vendor.bannerUrl} alt="Store banner" className="h-full w-full object-cover" />}<div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" /><label className="absolute right-3 top-3 flex cursor-pointer items-center gap-2 rounded-full border border-white/60 bg-white/92 px-3 py-2 text-[11px] font-black text-[#171914] shadow-lg backdrop-blur"><input type="file" accept="image/*" className="hidden" onChange={(e) => asset("bannerUrl", e.target.files?.[0])} /><ImageUp className="size-4" /><span className="hidden sm:inline">Update cover</span></label></div><div className="relative p-5 pt-12 sm:p-6 sm:pt-14"><div className="absolute -top-10 left-5 size-20 sm:-top-12 sm:left-6 sm:size-24"><div className="grid h-full w-full place-items-center overflow-hidden rounded-[24px] border-4 border-white bg-[#eff7e5] text-3xl font-black text-[#5ba400] shadow-xl">{vendor.logoUrl ? <img src={vendor.logoUrl} alt="Store logo" className="h-full w-full object-cover" /> : vendor.businessName[0]}</div><label className="absolute -bottom-2 -right-2 grid size-9 cursor-pointer place-items-center rounded-full border-2 border-white bg-[#171914] text-white shadow-lg" title="Update logo"><input type="file" accept="image/*" className="hidden" onChange={(e) => asset("logoUrl", e.target.files?.[0])} /><Pencil className="size-3.5" /></label></div><h2 className="text-2xl font-black">{vendor.businessName}</h2><p className="text-sm text-stone-500">{vendor.category} · {state.products.filter((x) => x.vendorId === vendor.id && x.active).length} published products</p></div></div>
    <div className="grid gap-4 lg:grid-cols-2">{outlets.map((outlet) => <div key={outlet.id} className="surface-card rounded-[26px] p-5"><div className="flex items-start gap-3"><div className="grid size-11 place-items-center rounded-xl bg-[#eff7e5] text-[#5ba400]"><Building2 /></div><div className="min-w-0 flex-1"><b>{outlet.name}</b><p className="mt-1 text-sm text-stone-500">{outlet.address}</p></div><Status>{outlet.openToday ? "Open" : "Closed"}</Status></div><div className="mt-3 text-xs text-stone-500">Service radius: {outlet.radiusKm} km · {Number.isFinite(outlet.latitude) ? "Pinned" : "Needs map pin"}</div><div className="mt-4 rounded-2xl bg-[#f7f5f1] p-3 text-sm"><div className="flex items-center justify-between gap-3"><div><b>Outlet certification</b><div className="mt-1 text-xs text-stone-500">{outlet.certificateNumber || "Not added"}{outlet.certificateExpiry ? ` · expires ${outlet.certificateExpiry}` : ""}</div></div><Button size="sm" variant="outline" onClick={() => editCertification(outlet)}><Pencil />Edit</Button></div><label className="mt-3 inline-flex cursor-pointer items-center text-xs font-black text-[#50772a]"><input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => updateOutlet(outlet.id, { certificateName: e.target.files?.[0]?.name || outlet.certificateName })} /><Upload className="mr-1 size-3.5" />{outlet.certificateName || "Upload certificate"}</label></div></div>)}</div>
  </div>;
}

function cancellationCharge(order: Order) { if (["Out for delivery", "Ready", "Ready for pickup"].includes(order.status)) return order.total; if (order.status === "Preparing") return Math.round(order.total * .25); return Math.min(25, Math.round(order.total * .05)); }

function OrdersV4({ session, state, setState, scope, vendor }: { session: DemoSession; state: V3State; setState: React.Dispatch<React.SetStateAction<V3State>>; scope: "customer" | "vendor" | "operations"; vendor?: Vendor }) {
  const baseOrders = scope === "customer"
    ? state.orders.filter((x) => x.customerEmail === session.email && x.payment !== "Pending")
    : scope === "vendor"
      ? state.orders.filter((x) => x.vendorId === vendor?.id && x.payment === "Paid")
      : state.orders;
  const [rescheduling, setRescheduling] = useState<Order | null>(null);
  const [paying, setPaying] = useState<Order | null>(null);
  const [dateMode, setDateMode] = useState<"today" | "tomorrow" | "all" | "custom">(scope === "customer" ? "all" : "today");
  const [customDate, setCustomDate] = useState(todayISO());
  const targetDate = dateMode === "today" ? todayISO() : dateMode === "tomorrow" ? tomorrow() : dateMode === "custom" ? customDate : "";
  const orders = targetDate ? baseOrders.filter((item) => item.date === targetDate) : baseOrders;
  const dayValue = orders.reduce((sum, item) => sum + item.total, 0);
  const totalValue = baseOrders.reduce((sum, item) => sum + item.total, 0);

  async function update(order: Order, status: Order["status"]) { try { if (isLiveSupabaseMode()) await updateLiveOrderStatus(order.id, status); setState((s) => ({ ...s, orders: s.orders.map((x) => x.id === order.id ? { ...x, status } : x) })); showDeviceNotification(`Order ${status}`, order.description); toast.success("Order status updated"); } catch (error) { toast.error(error instanceof Error ? error.message : "Order status could not be saved"); } }
  function cancel(order: Order) { const fee = cancellationCharge(order); if (!confirm(`Cancellation charge: ${money(fee)} based on the current fulfilment stage. Send to Operations for final review?`)) return; const reason = prompt("Cancellation reason"); if (!reason) return; setState((s) => ({ ...s, orders: s.orders.map((x) => x.id === order.id ? { ...x, status: "Cancellation requested", cancellationFee: fee } : x), cancellations: [{ id: id("CAN"), orderId: order.id, customerEmail: session.email, reason, aiDecision: `Review with estimated charge ${money(fee)}`, confidence: 91, status: "Awaiting operations" }, ...s.cancellations], notifications: [notice("operations@sheplates.demo", "operations", "Cancellation review", `${order.id}: proposed charge ${money(fee)}.`), ...s.notifications] })); }
  function locate(order: Order) { navigator.geolocation?.getCurrentPosition((position) => { setState((s) => ({ ...s, orders: s.orders.map((x) => x.id === order.id ? { ...x, trackingLatitude: position.coords.latitude, trackingLongitude: position.coords.longitude } : x), notifications: [notice(order.customerEmail, "customer", "Live location updated", `${order.id} location was refreshed by the vendor.`), ...s.notifications] })); toast.success("Live delivery position updated"); }, () => toast.error("Allow location access on the delivery device"), { enableHighAccuracy: true, maximumAge: 0 }); }
  async function assign(order: Order, staffId: string) { try { if (isLiveSupabaseMode()) await assignLiveDeliveryStaff(order.id, staffId === "unassigned" ? undefined : staffId); const nextAssignments = staffId === "unassigned" ? state.assignments.filter((x) => x.orderId !== order.id) : [{ id: id("ASN"), orderId: order.id, staffId, assignedAt: now() }, ...state.assignments.filter((x) => x.orderId !== order.id)]; setState((s) => ({ ...s, assignments: nextAssignments, notifications: staffId === "unassigned" ? s.notifications : [notice(order.customerEmail, "customer", "Delivery person assigned", `${state.staff.find((x) => x.id === staffId)?.name || "Your delivery person"} will handle ${order.id}.`), ...s.notifications] })); toast.success(staffId === "unassigned" ? "Delivery assignment cleared" : "Delivery person assigned"); } catch (error) { toast.error(error instanceof Error ? error.message : "Delivery assignment could not be saved"); } }

  const customerSchedules = scope === "customer" ? state.schedules.filter((item) => item.customerEmail === session.email && (item.status || "Active") === "Active").length : 0;
  const customerOpenRequirements = scope === "customer" ? state.requirements.filter((item) => item.customerEmail === session.email && item.status !== "Awarded").length : 0;

  return <div className="space-y-6"><Heading eyebrow="ORDER JOURNEY" title={scope === "customer" ? "Orders & live tracking" : scope === "vendor" ? "Fulfilment & tracking" : "Platform order control"} body={scope === "vendor" ? "Paid orders remain visible for every future delivery date. Use Today, Tomorrow or a date filter to plan fulfilment and assign an active delivery person." : "Track paid orders, fulfilment status and delivery progress."} />
    {scope === "customer" ? <div className="sp-mobile-metric-grid grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Paid orders" value={String(baseOrders.length)} icon={Package} /><Metric label="Active schedules" value={String(customerSchedules)} icon={CalendarDays} /><Metric label="Open requirements" value={String(customerOpenRequirements)} icon={ListChecks} /><Metric label="Order value" value={money(totalValue)} icon={CreditCard} /></div> : <><div className="sp-mobile-metric-grid grid gap-3 sm:grid-cols-3"><Metric label="Orders in view" value={String(orders.length)} icon={Package} /><Metric label="Value in view" value={money(dayValue)} icon={IndianRupee} /><Metric label="All future order value" value={money(totalValue)} icon={CalendarDays} /></div><div className="surface-card flex flex-wrap items-center gap-2 rounded-[24px] p-3">{([['today','Today'],['tomorrow','Tomorrow'],['all','All dates'],['custom','Choose date']] as const).map(([value,label]) => <button key={value} onClick={() => setDateMode(value)} className={`rounded-xl px-4 py-2 text-sm font-black ${dateMode === value ? "bg-[#171914] text-white" : "bg-stone-50 text-stone-600"}`}>{label}</button>)}{dateMode === "custom" && <input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} className={`${inputClass} max-w-48`} />}</div></>}
    {orders.length ? <div className="space-y-4">{orders.sort((a,b) => a.date.localeCompare(b.date)).map((order) => { const assignment = state.assignments.find((x) => x.orderId === order.id); const person = state.staff.find((x) => x.id === assignment?.staffId); const available = state.staff.filter((x) => x.vendorId === order.vendorId && x.active); const product = order.productId ? state.products.find((x) => x.id === order.productId) : undefined; return <div key={order.id} className="surface-card rounded-[28px] p-5"><div className="flex flex-col gap-4 xl:flex-row xl:items-start"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><b>{order.description}</b><Status>{order.status}</Status><Status className={order.payment === "Paid" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : ""}>{order.payment}</Status><span className="font-mono text-xs text-stone-400">{order.id}</span></div><div className="mt-3 grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-5"><Review label="Delivery" value={`${order.date} · ${order.slot}`} /><Review label="Items" value={`${order.quantity} × ${product?.name || order.description}`} /><Review label="Total" value={money(order.total)} /><Review label="Mode" value={order.mode} /><Review label="Delivery person" value={person ? `${person.name} · ${person.phone}` : "Not assigned"} /></div>{order.status === "Out for delivery" && <div className="mt-4"><MapPreview lat={order.trackingLatitude || vendor?.latitude} lng={order.trackingLongitude || vendor?.longitude} radius={0} label="Live delivery position" /></div>}</div><div className="flex flex-wrap gap-2 xl:max-w-sm">{scope === "customer" ? <><Button size="sm" variant="outline" disabled={["Completed","Cancelled","Cancellation requested","Preparing","Out for delivery"].includes(order.status)} onClick={() => setRescheduling(order)}><CalendarDays />Reschedule</Button><Button size="sm" variant="outline" disabled={["Completed","Cancelled","Cancellation requested"].includes(order.status)} onClick={() => cancel(order)} className="text-red-600">Cancel</Button></> : <><Select value={person?.id || "unassigned"} onValueChange={(staffId) => void assign(order, staffId)}><SelectTrigger className="w-44"><SelectValue placeholder="Assign delivery" /></SelectTrigger><SelectContent><SelectItem value="unassigned">Not assigned</SelectItem>{available.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select><Select value={order.status} onValueChange={(value) => void update(order, value as Order["status"])}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent>{["Scheduled","Confirmed","Preparing","Ready","Out for delivery","Ready for pickup","Completed"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select>{scope === "vendor" && order.status === "Out for delivery" && <Button size="sm" onClick={() => locate(order)} className="bg-[#5ba400]"><MapPinned />Share live position</Button>}</>}</div></div></div>; })}</div> : <Empty icon={Package} title="No orders for this selection" body={scope === "vendor" ? "Try Tomorrow or All dates. Unpaid schedules stay with the customer until payment is completed." : "No paid orders are available in this view."} />}
    <OrderRescheduleDialog order={rescheduling} close={() => setRescheduling(null)} state={state} setState={setState} />
    <PaymentDialog order={paying} close={() => setPaying(null)} state={state} setState={setState} />
  </div>;
}

function OrderRescheduleDialog({ order, close, state, setState }: { order: Order | null; close: () => void; state: V3State; setState: React.Dispatch<React.SetStateAction<V3State>> }) {
  const [date, setDate] = useState(tomorrow());
  const [slot, setSlot] = useState("06:00–07:00 AM");
  useEffect(() => { if (order) queueMicrotask(() => { setDate(order.date < tomorrow() ? tomorrow() : order.date); setSlot(order.slot); }); }, [order]);
  if (!order) return null;
  async function save() {
    if (!order) return;
    if (!date || date < tomorrow()) return toast.error("Choose tomorrow or a later date");
    try { if (isLiveSupabaseMode()) await rescheduleLiveOrder(order.id, date, slot); setState((s) => ({ ...s, orders: s.orders.map((x) => x.id === order.id ? { ...x, date, slot } : x) })); toast.success(`Order moved to ${date}`); close(); } catch (error) { toast.error(error instanceof Error ? error.message : "Order could not be rescheduled"); }
  }
  return <Dialog open onOpenChange={(open) => !open && close()}><DialogContent className="rounded-[26px] sm:max-w-md"><DialogHeader><DialogTitle className="text-xl font-black">Reschedule order</DialogTitle><DialogDescription>Choose a new future delivery date and time window for {order.id}.</DialogDescription></DialogHeader><div className="space-y-4"><Field label="New delivery date"><input type="date" min={tomorrow()} value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} /></Field><Field label="Preferred time"><Select value={slot} onValueChange={setSlot}><SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{["06:00–07:00 AM", "07:00–08:00 AM", "08:00–09:00 AM", "12:00–01:00 PM", "05:00–06:00 PM", "07:00–08:00 PM"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></Field><Button onClick={save} className="h-11 w-full rounded-xl bg-[#ef3d3d] font-black"><Check />Save new date</Button></div></DialogContent></Dialog>;
}

function PaymentDialog({ order, close, state, setState, onPaid }: { order: Order | null; close: () => void; state: V3State; setState: React.Dispatch<React.SetStateAction<V3State>>; onPaid?: () => void }) {
  const [method, setMethod] = useState<"UPI" | "Card" | "Net banking">("UPI");
  const [busy, setBusy] = useState(false);
  if (!order) return null;
  const vendor = state.vendors.find((x) => x.id === order.vendorId);
  async function pay() {
    if (!order) return;
    setBusy(true);
    await new Promise((resolve) => setTimeout(resolve, 350));
    try {
      const transaction = recordTransaction(order, method);
      let liveSnapshot: { orders?: Array<Record<string, unknown>>; schedules?: Array<Record<string, unknown>>; staff?: Array<Record<string, unknown>>; assignments?: Array<Record<string, unknown>> } | null = null;
      if (isLiveSupabaseMode()) {
        const result = await markLiveOrderPaid({ orderId: order.id, method });
        liveSnapshot = (result.snapshot || null) as typeof liveSnapshot;
      }
      setState((s) => {
        const base = liveSnapshot ? mergeLiveCommerce(s, liveSnapshot, { email: order.customerEmail, name: order.customerEmail, role: "customer" }) : { ...s, orders: s.orders.map((x) => x.id === order.id ? { ...x, payment: "Paid" as const, status: "Confirmed" as const } : x) };
        return {
          ...base,
          transactions: [transaction, ...base.transactions],
          notifications: [notice(order.customerEmail, "customer", "Payment successful", `${money(order.total)} collected. Your scheduled deliveries are now confirmed.`), ...base.notifications],
          audit: [audit({ email: order.customerEmail, name: order.customerEmail, role: "customer" }, "Customer paid for schedule", `${order.id} · ${money(order.total)} via ${method}`), ...base.audit],
        };
      });
      toast.success(`Payment confirmed. Your delivery schedule is active.`); close(); onPaid?.();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Payment could not be confirmed"); }
    finally { setBusy(false); }
  }
  return <Dialog open onOpenChange={(open) => !open && close()}><DialogContent className="rounded-[26px] sm:max-w-md"><DialogHeader><DialogTitle className="text-xl font-black">Pay for {order.id}</DialogTitle><DialogDescription>Simulated secure checkout for this environment. Confirming here records a real transaction and schedules the vendor payout — no external gateway is charged.</DialogDescription></DialogHeader>
    <div className="space-y-4">
      <div className="rounded-2xl bg-[#f6f8f2] p-4 text-sm"><Review label="Order" value={order.description} /><Review label="Vendor" value={vendor?.businessName || "—"} /><Review label="Amount payable" value={money(order.total)} /></div>
      <div><div className="mb-2 text-xs font-black uppercase tracking-[.1em] text-stone-500">Payment method</div><div className="grid grid-cols-3 gap-2">{(["UPI", "Card", "Net banking"] as const).map((item) => <button type="button" key={item} onClick={() => setMethod(item)} className={`rounded-xl border p-3 text-sm font-black ${method === item ? "border-[#5ba400] bg-[#eff7e5] text-[#477f00]" : ""}`}>{item}</button>)}</div></div>
      <Button onClick={() => void pay()} disabled={busy} className="h-12 w-full rounded-xl bg-[#5ba400] font-black hover:bg-[#4c8c00]"><CreditCard />{busy ? "Processing…" : `Pay ${money(order.total)}`}</Button>
      <p className="text-[11px] leading-5 text-stone-400">A {PLATFORM_COMMISSION_PERCENT}% platform commission is retained; the rest is scheduled to reach the vendor {PAYOUT_CYCLE_DAYS} days after collection.</p>
    </div>
  </DialogContent></Dialog>;
}

function TicketCentre({ session, state, setState, vendor, mode = "manage" }: { session: DemoSession; state: V3State; setState: React.Dispatch<React.SetStateAction<V3State>>; vendor?: Vendor; mode?: "manage" | "oversight" }) {
  const visible = session.role === "operations" || session.role === "admin" ? state.tickets : state.tickets.filter((x) => x.creatorEmail === session.email || (vendor && x.vendorId === vendor.id));
  const [subject, setSubject] = useState(""), [description, setDescription] = useState(""), [category, setCategory] = useState("Order"), [file, setFile] = useState<File | null>(null);
  const canResolve = session.role === "operations";
  const open = visible.filter((x) => x.status !== "Resolved").length;
  function create() { if (!subject.trim() || !description.trim()) return toast.error("Add a subject and details"); const ticket: Ticket = { id: id("TKT"), creatorEmail: session.email, creatorRole: session.role, vendorId: vendor?.id, subject, description, category, priority: "Normal", status: "Open", attachmentName: file?.name, createdVia: "Portal", at: now() }; setState((s) => ({ ...s, tickets: [ticket, ...s.tickets], notifications: [notice(session.email, session.role, "Ticket created", `${ticket.id} is open.`), notice("operations@sheplates.demo", "operations", "New support ticket", `${ticket.id}: ${subject}`), ...s.notifications] })); setSubject(""); setDescription(""); setFile(null); toast.success(`${ticket.id} created`); }
  return <div className="space-y-6"><Heading eyebrow="SUPPORT" title="Ticket centre" body={mode === "oversight" ? "Operations owns day-to-day ticket triage and resolution for customers and vendors. This is a platform-wide oversight view — escalate or intervene only when needed." : "Raise and track account, order, catalogue, payment or delivery issues raised by customers and vendors. She Agent can create a ticket in the same role scope."} />{mode === "oversight" && <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900"><b>{open}</b> ticket(s) currently open across the platform. Operations is the owning team for resolution; Super Admin has full read access for governance and can step in on escalations.</div>}<div className={mode === "oversight" ? "" : "grid gap-5 xl:grid-cols-[380px_1fr]"}>{mode !== "oversight" && <div className="surface-card space-y-3 rounded-[28px] p-5"><Field label="Category"><Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Order","Delivery","Payment","Account","Catalogue","Verification","Other"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></Field><Field label="Subject"><input value={subject} onChange={(e) => setSubject(e.target.value)} className={inputClass} /></Field><Field label="Details"><Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-28 rounded-xl" /></Field><label className="block rounded-xl border border-dashed p-3 text-sm"><input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} /><Upload className="mr-2 inline size-4" />{file?.name || "Attach document"}</label><Button onClick={create} className="w-full bg-[#ef3d3d]"><TicketCheck />Create ticket</Button></div>}<div className="space-y-3">{visible.length ? visible.map((ticket) => <div key={ticket.id} className="surface-card rounded-[24px] p-5"><div className="flex flex-wrap items-center gap-2"><b>{ticket.subject}</b><Status>{ticket.status}</Status><Status>{ticket.creatorRole}</Status><span className="ml-auto font-mono text-xs">{ticket.id}</span></div><p className="mt-2 text-sm text-stone-500">{ticket.description}</p><div className="mt-3 text-xs text-stone-400">{ticket.category} · {ticket.createdVia} · {ticket.attachmentName || "No attachment"} · {ticket.at}</div>{canResolve && ticket.status !== "Resolved" && <Button size="sm" variant="outline" className="mt-3" onClick={() => setState((s) => ({ ...s, tickets: s.tickets.map((x) => x.id === ticket.id ? { ...x, status: "Resolved" } : x) }))}>Resolve</Button>}</div>) : <Empty icon={TicketCheck} title="No tickets in your scope" body="New support requests will appear here." />}</div></div></div>;
}

function computeBusinessHealth(state: V3State) {
  const wentWell: string[] = []; const needsAttention: string[] = []; const recovery: string[] = [];
  const completed = state.orders.filter((x) => x.status === "Completed").length;
  const cancelled = state.orders.filter((x) => x.status === "Cancelled").length;
  const totalOrders = state.orders.length;
  const gmv = state.orders.reduce((sum, x) => sum + x.total, 0);
  const paidRatio = totalOrders ? state.orders.filter((x) => x.payment === "Paid").length / totalOrders : 0;
  const verifiedVendors = state.vendors.filter((x) => x.verification === "Verified").length;
  const verificationBacklog = state.vendors.filter((x) => ["Submitted", "Under review"].includes(x.verification)).length;
  const openTickets = state.tickets.filter((x) => x.status !== "Resolved").length;
  const overduePayouts = state.transactions.filter((x) => x.payoutStatus === "Scheduled" && x.scheduledPayoutDate <= todayISO()).length;
  const cancellationRate = totalOrders ? cancelled / totalOrders : 0;
  const topVendorShare = (() => {
    if (!state.orders.length) return 0;
    const byVendor = new Map<string, number>();
    state.orders.forEach((o) => byVendor.set(o.vendorId, (byVendor.get(o.vendorId) || 0) + o.total));
    const max = Math.max(0, ...byVendor.values());
    return gmv ? max / gmv : 0;
  })();

  if (state.vendors.length && verifiedVendors / state.vendors.length >= 0.6) wentWell.push(`${verifiedVendors} of ${state.vendors.length} vendors are verified and trading — a healthy trust base.`);
  if (completed > 0) wentWell.push(`${completed} order(s) completed successfully out of ${totalOrders} placed.`);
  if (paidRatio >= 0.7 && totalOrders > 0) wentWell.push(`${Math.round(paidRatio * 100)}% of orders are already paid, keeping vendor payouts on schedule.`);
  if (openTickets === 0 && state.tickets.length > 0) wentWell.push("Every support ticket raised so far has been resolved.");
  if (cancellationRate <= 0.1 && totalOrders > 0) wentWell.push(`Cancellation rate is low at ${Math.round(cancellationRate * 100)}% of all orders.`);
  if (!wentWell.length) wentWell.push("Not enough activity yet to highlight a strength — check back once vendors, orders and payments start flowing.");

  if (verificationBacklog > 0) { needsAttention.push(`${verificationBacklog} vendor(s) are waiting on verification.`); recovery.push("Clear the vendor verification queue within 48 hours — a stuck queue directly blocks new supply from going live."); }
  if (overduePayouts > 0) { needsAttention.push(`${overduePayouts} vendor payout(s) have passed their scheduled date and are not yet marked paid.`); recovery.push("Release overdue payouts from Vendor payments today; late payouts are the fastest way to lose good vendors."); }
  if (openTickets > 0) { needsAttention.push(`${openTickets} support ticket(s) are still open.`); recovery.push("Ask Operations to triage tickets daily and close the oldest ones first — ageing tickets erode trust fastest."); }
  if (cancellationRate > 0.15 && totalOrders >= 5) { needsAttention.push(`Cancellation rate is elevated at ${Math.round(cancellationRate * 100)}%.`); recovery.push("Review the top cancellation reasons and the vendors involved; tighten fulfilment SLAs where a pattern appears."); }
  if (topVendorShare > 0.5 && gmv > 0) { needsAttention.push(`One vendor accounts for ${Math.round(topVendorShare * 100)}% of GMV — concentration risk.`); recovery.push("Actively onboard and promote 2–3 more verified vendors in the same category to diversify supply."); }
  if (paidRatio < 0.5 && totalOrders >= 3) { needsAttention.push("Less than half of all orders have been paid."); recovery.push("Prompt customers with pending payments — a stuck payment blocks the vendor's payout entirely."); }
  if (!needsAttention.length) { needsAttention.push("No urgent operational issues detected right now."); recovery.push("Maintain the current verification, payout and ticket-response cadence — it is working."); }
  recovery.push("Best practice: review this panel weekly alongside Vendor payments and Reports so nothing drifts unnoticed between check-ins.");
  return { wentWell, needsAttention, recovery, snapshot: { gmv, totalOrders, completed, cancelled, verifiedVendors, vendorCount: state.vendors.length, verificationBacklog, openTickets, overduePayouts, cancellationRate: Math.round(cancellationRate * 100), paidRatio: Math.round(paidRatio * 100), topVendorShare: Math.round(topVendorShare * 100) } };
}

function AIInsights({ role, state }: { role: "operations" | "admin"; state: V3State }) {
  const fulfilmentRisk = state.orders.filter((x) => ["Scheduled","Confirmed"].includes(x.status) && x.date <= tomorrow()).length;
  const lowStock = state.products.filter((x) => x.stock <= 5).length;
  const unassigned = state.orders.filter((x) => x.mode === "Vendor delivery" && !state.assignments.some((a) => a.orderId === x.id) && !["Completed","Cancelled"].includes(x.status)).length;
  const overdueTickets = state.tickets.filter((x) => !["Resolved"].includes(x.status)).length;
  const health = useMemo(() => computeBusinessHealth(state), [state]);
  const [narrative, setNarrative] = useState<{ summary: string; recommendedAction: string } | null>(null);
  const [loadingNarrative, setLoadingNarrative] = useState(false);
  async function askSheAgent() {
    setLoadingNarrative(true);
    try {
      const token = await getAccessToken();
      const response = await fetch("/api/agent", { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ task: "business_insights", role, message: "Summarise current business health", context: health.snapshot }) });
      const json = await response.json();
      if (json?.result) setNarrative({ summary: json.result.summary, recommendedAction: json.result.recommendedAction });
      else toast.error("She Agent could not generate a narrative right now");
    } catch { toast.error("She Agent is unavailable right now"); }
    finally { setLoadingNarrative(false); }
  }
  return <div className="space-y-6"><Heading eyebrow="AI-ASSISTED ANALYTICS" title={role === "admin" ? "Executive intelligence" : "Operational intelligence"} body="Explainable risk signals from authorised platform data. She Agent recommends; humans approve verification, price, refunds and access changes." /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Fulfilments at risk" value={String(fulfilmentRisk)} icon={AlertTriangle} note="Due tomorrow without preparation" /><Metric label="Low-stock products" value={String(lowStock)} icon={Package} /><Metric label="Unassigned deliveries" value={String(unassigned)} icon={Truck} /><Metric label="Open support tickets" value={String(overdueTickets)} icon={TicketCheck} /></div><div className="grid gap-4 lg:grid-cols-2"><div className="surface-card rounded-[28px] p-6"><h3 className="font-black">Recommended attention</h3><div className="mt-4 space-y-3"><Review label="Vendor verification backlog" value={String(state.vendors.filter((x) => ["Submitted","Under review"].includes(x.verification)).length)} /><Review label="RFQs without quotes" value={String(state.requirements.filter((x) => !state.quotes.some((q) => q.requirementId === x.id)).length)} /><Review label="Cancellation reviews" value={String(state.cancellations.filter((x) => x.status === "Awaiting operations").length)} /><Review label="Closed stores" value={String(state.vendors.filter((x) => x.verification === "Verified" && !x.openToday).length)} /></div></div><div className="surface-dark rounded-[28px] p-6 text-white"><Sparkles className="text-[#91c747]" /><h3 className="mt-3 text-xl font-black">{role === "admin" ? "Ask She Agent for a deeper narrative" : "Ask She Agent to explain a signal"}</h3><p className="mt-2 text-sm leading-6 text-white/60">{role === "admin" ? "Analyse vendor concentration, plan adoption, GMV, audit anomalies, role access and policy impact across the platform." : "Prioritise delayed fulfilments, certificate expiry, delivery coverage, RFQ response and support queues."}</p>{role === "admin" && <Button onClick={() => void askSheAgent()} disabled={loadingNarrative} className="mt-4 rounded-xl bg-[#5ba400] hover:bg-[#4c8c00]"><Activity />{loadingNarrative ? "Thinking…" : "Generate narrative"}</Button>}{narrative && <div className="mt-4 rounded-xl bg-white/10 p-4 text-sm leading-6"><p>{narrative.summary}</p><p className="mt-2 font-black text-[#91c747]">{narrative.recommendedAction}</p></div>}</div></div>
  {role === "admin" && <div className="grid gap-4 lg:grid-cols-3">
    <div className="rounded-[24px] border border-emerald-200 bg-emerald-50/60 p-6"><div className="flex items-center gap-2 text-emerald-700"><CheckCircle2 className="size-5" /><h3 className="font-black">What&apos;s going well</h3></div><ul className="mt-4 space-y-2 text-sm leading-6 text-emerald-900">{health.wentWell.map((line, index) => <li key={index} className="flex gap-2"><span>•</span><span>{line}</span></li>)}</ul></div>
    <div className="rounded-[24px] border border-amber-200 bg-amber-50/60 p-6"><div className="flex items-center gap-2 text-amber-800"><AlertTriangle className="size-5" /><h3 className="font-black">Needs attention</h3></div><ul className="mt-4 space-y-2 text-sm leading-6 text-amber-900">{health.needsAttention.map((line, index) => <li key={index} className="flex gap-2"><span>•</span><span>{line}</span></li>)}</ul></div>
    <div className="rounded-[24px] border border-sky-200 bg-sky-50/60 p-6"><div className="flex items-center gap-2 text-sky-800"><Lightbulb className="size-5" /><h3 className="font-black">Recovery & best practices</h3></div><ul className="mt-4 space-y-2 text-sm leading-6 text-sky-900">{health.recovery.map((line, index) => <li key={index} className="flex gap-2"><span>•</span><span>{line}</span></li>)}</ul></div>
  </div>}
  </div>;
}

function StoreRadius({ vendor, setState, session }: { vendor: Vendor; setState: React.Dispatch<React.SetStateAction<V3State>>; session: DemoSession }) {
  const [radius, setRadius] = useState(vendor.radiusKm), [address, setAddress] = useState(vendor.address), [coords, setCoords] = useState<{ lat?: number; lng?: number }>({ lat: vendor.latitude, lng: vendor.longitude }), [locating, setLocating] = useState(false), [mapBusy, setMapBusy] = useState(false);
  async function update(patch: Partial<Vendor>, message: string) { try { if (isLiveSupabaseMode()) await updateLiveVendorControls(vendor.id, { ...(patch.openToday !== undefined ? { store_open_today: patch.openToday } : {}), ...(patch.operational ? { operational_status: patch.operational.toLowerCase() } : {}), ...(patch.delivery !== undefined ? { delivery_enabled: patch.delivery } : {}), ...(patch.pickup !== undefined ? { pickup_enabled: patch.pickup } : {}), ...(patch.openToday === true && vendor.verification === "Verified" ? { marketplace_visible: true } : {}) }); setState((s) => ({ ...s, vendors: s.vendors.map((x) => x.id === vendor.id ? { ...x, ...patch } : x), audit: [audit(session, message, vendor.businessName), ...s.audit] })); toast.success(message); } catch (error) { toast.error(error instanceof Error ? error.message : "Store control could not be saved"); } }
  function detectStore() { if (!navigator.geolocation) return toast.error("Location is unavailable"); setLocating(true); navigator.geolocation.getCurrentPosition(async (position) => { const point = { lat: position.coords.latitude, lng: position.coords.longitude }; setCoords(point); setAddress(`GPS pin ${point.lat.toFixed(5)}, ${point.lng.toFixed(5)} — add store details`); try { const place = await findLocation(point); setAddress(place.address); setCoords({ lat: place.latitude, lng: place.longitude }); toast.success(`Actual store GPS location detected (±${Math.round(position.coords.accuracy)} m)`); } catch (error) { toast.info(error instanceof Error ? `${error.message} The exact GPS pin is still shown.` : "The exact GPS pin is shown."); } finally { setLocating(false); } }, () => { setLocating(false); toast.error("Allow precise location for localhost in Chrome, or search the store address"); }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }); }
  async function findStore() { if (!address.trim()) return toast.error("Enter the complete store address first"); setMapBusy(true); try { const place = await findLocation({ address }); setAddress(place.address); setCoords({ lat: place.latitude, lng: place.longitude }); toast.success("Store address located on the map"); } catch (error) { toast.error(error instanceof Error ? error.message : "Store address was not found"); } finally { setMapBusy(false); } }
  async function saveStorePin() { if (!Number.isFinite(coords.lat) || !Number.isFinite(coords.lng)) return toast.error("Detect GPS or find the store address before saving"); try { if (session.userId && process.env.NEXT_PUBLIC_DEMO_MODE === "false" && isSupabaseConfigured()) await saveLiveVendorLocation({ vendorId: vendor.id, address, latitude: coords.lat!, longitude: coords.lng!, radiusKm: radius }); update({ address, latitude: coords.lat, longitude: coords.lng, radiusKm: radius }, "Store pin and service radius updated"); } catch (error) { toast.error(error instanceof Error ? error.message : "Store location could not be saved"); } }
  return <div className="space-y-6"><Heading eyebrow="DAILY SERVICE CONTROL" title="Store location, radius & fulfilment" body="Customer matching uses this exact store pin and the saved service radius—not the address text alone." /><div className="grid gap-5 lg:grid-cols-[.85fr_1.15fr]"><div className="surface-card space-y-4 rounded-[28px] p-6"><div data-tour="store-open"><ToggleCard icon={Store} title={vendor.openToday ? "Open today" : "Closed today"} body={vendor.verification === "Verified" ? "Customers inside your saved radius can see active in-stock items while open." : "Verification is still required before customers can see items."} checked={vendor.openToday} setChecked={(value) => update({ openToday: value, operational: value && vendor.verification === "Verified" ? "Active" : value ? "Inactive" : "Paused" }, value ? "Store opened for today" : "Store closed for today")} /></div><Field label="Full store address"><Textarea value={address} onChange={(event) => setAddress(event.target.value)} className="min-h-24 rounded-xl" /></Field><LocationSuggestions query={address} onSelect={(place) => { setAddress(place.address); setCoords({ lat: place.latitude, lng: place.longitude }); }} /><div className="flex flex-wrap gap-2"><Button onClick={detectStore} disabled={locating} className="rounded-xl bg-[#5ba400]"><LocateFixed className={locating ? "animate-spin" : ""} />{locating ? "Getting fresh GPS…" : "Use actual store GPS"}</Button><Button onClick={findStore} disabled={mapBusy} variant="outline" className="rounded-xl"><Search />{mapBusy ? "Searching…" : "Find typed address"}</Button></div><Field label={`Supply radius · ${radius} km`} hint="This is measured from the exact store pin shown on the map."><Slider value={[radius]} min={1} max={30} step={1} onValueChange={(v) => setRadius(v[0])} /></Field><Button onClick={saveStorePin} className="w-full rounded-xl bg-[#ef3d3d]"><Check />Save store pin & radius</Button><div className="grid grid-cols-2 gap-3"><ToggleCard icon={Truck} title="Delivery" body="Your own team" checked={vendor.delivery} setChecked={(v) => update({ delivery: v }, "Delivery mode updated")} /><ToggleCard icon={ShoppingBag} title="Pickup" body="At your store" checked={vendor.pickup} setChecked={(v) => update({ pickup: v }, "Pickup mode updated")} /></div></div><MapPreview lat={coords.lat} lng={coords.lng} radius={radius} label="Exact store pin" /></div></div>;
}
function VerificationView({ vendor, setState, session }: { vendor: Vendor; setState: React.Dispatch<React.SetStateAction<V3State>>; session: DemoSession }) {
  const [editing, setEditing] = useState(false);
  const [certificate, setCertificate] = useState(vendor.fssaiNumber || "");
  const [fileName, setFileName] = useState(vendor.certificateName || "");
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [expiry, setExpiry] = useState(vendor.expiryDate || "");
  async function save(resubmit = false) {
    if (!certificate.trim()) return toast.error("Enter the certification / licence number");
    try {
      if (isLiveSupabaseMode()) {
        if (certificateFile) { const uploaded = await uploadLiveCertificate({ vendorId: vendor.id, file: certificateFile }); setFileName(uploaded.fileName || certificateFile.name); }
        if (resubmit) await resubmitLiveVendorVerification({ documentNumber: certificate.trim(), expiryDate: expiry || undefined });
      }
      const nextStatus: Verification = resubmit ? "Submitted" : vendor.verification;
      setState((s) => ({ ...s, vendors: s.vendors.map((x) => x.id === vendor.id ? { ...x, fssaiNumber: certificate.trim(), certificateName: fileName || x.certificateName, expiryDate: expiry, verification: nextStatus, operational: resubmit ? "Inactive" : x.operational } : x), audit: [audit(session, resubmit ? "Resubmitted verification" : "Edited verification details", vendor.businessName), ...s.audit] }));
      setEditing(false); toast.success(resubmit ? "Verification resubmitted for review" : "Verification details saved");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Verification details could not be saved"); }
  }
  return <div className="space-y-6"><Heading eyebrow="TRUST & COMPLIANCE" title="Vendor verification" body="Review your certification details at any time. If information changes, edit and resubmit it for Operations review." action={<Button variant="outline" onClick={() => setEditing((v) => !v)} className="rounded-xl"><Pencil />{editing ? "Close editor" : "Edit details"}</Button>} />
    <div className="surface-card rounded-[28px] p-6"><div className="flex items-center gap-4"><div className="grid size-12 place-items-center rounded-2xl bg-[#eff7e5] text-[#5ba400]"><FileCheck2 /></div><div className="flex-1"><h3 className="font-black">{vendor.businessName}</h3><p className="text-sm text-stone-500">{vendor.address}</p></div><Status>{vendor.verification}</Status></div>
      {editing ? <div className="mt-6 grid gap-4 sm:grid-cols-2"><Field label="Certification / licence number"><input value={certificate} onChange={(e) => setCertificate(e.target.value)} className={inputClass} /></Field><Field label="Expiry date"><input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} className={inputClass} /></Field><Field label="Certificate file"><label className="flex h-11 cursor-pointer items-center rounded-2xl border bg-white px-3.5 text-sm font-bold"><input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => { const next = e.target.files?.[0] || null; setCertificateFile(next); setFileName(next?.name || fileName); }} /><Upload className="mr-2 size-4" />{fileName || "Choose file"}</label></Field><div className="flex items-end gap-2"><Button onClick={() => void save(false)} variant="outline" className="h-11 rounded-xl">Save only</Button><Button onClick={() => void save(true)} className="h-11 rounded-xl bg-[#5ba400]">Resubmit for review</Button></div></div> : <div className="mt-6 grid gap-3 sm:grid-cols-3"><Review label="Certificate" value={vendor.fssaiNumber || "Not added"} /><Review label="Uploaded file" value={vendor.certificateName || "Not added"} /><Review label="Expires" value={vendor.expiryDate || "Not set"} /></div>}
    </div></div>;
}

function Catalog({ vendor, state, setState, session }: { vendor: Vendor; state: V3State; setState: React.Dispatch<React.SetStateAction<V3State>>; session: DemoSession }) {
  const [open, setOpen] = useState(false); const [bulkOpen, setBulkOpen] = useState(false); const items = state.products.filter((x) => x.vendorId === vendor.id);
  const readiness = [{ label: "Exact store pin", ready: Number.isFinite(vendor.latitude) && Number.isFinite(vendor.longitude) }, { label: "Operations verified", ready: vendor.verification === "Verified" }, { label: "Store open today", ready: vendor.openToday && vendor.operational === "Active" }, { label: "Active product with stock", ready: items.some((item) => item.active && item.stock > 0) }];
  return <div className="space-y-6"><Heading eyebrow="PRODUCT CATALOG" title="Items, packs & nutrition" body="Add one item manually or upload a grocery/product list. AI can structure the catalogue and create optional product images; nothing is published until you approve it." action={<div className="flex flex-wrap gap-2"><Button onClick={() => setBulkOpen(true)} variant="outline" className="rounded-xl"><FileUp />Upload product list</Button><Button onClick={() => setOpen(true)} className="rounded-xl bg-[#ef3d3d]"><Plus />Add product pack</Button></div>} /><div className="surface-card rounded-[22px] p-4"><div className="text-sm font-black">Customer marketplace readiness</div><div className="mt-3 flex flex-wrap gap-2">{readiness.map((item) => <span key={item.label} className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-black ${item.ready ? "bg-[#eff7e5] text-[#477f00]" : "bg-amber-50 text-amber-800"}`}>{item.ready ? <Check className="size-3" /> : <AlertTriangle className="size-3" />}{item.label}</span>)}</div>{readiness.some((item) => !item.ready) && <p className="mt-3 text-xs text-stone-500">The product will not appear to customers until all three checks are green.</p>}</div>{items.length ? <div className="surface-card overflow-hidden rounded-[28px]"><Table><TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Selling pack</TableHead><TableHead>Pack stock</TableHead><TableHead>Price / pack</TableHead><TableHead>Nutrition / pack</TableHead><TableHead>Active</TableHead></TableRow></TableHeader><TableBody>{items.map((product) => <TableRow key={product.id}><TableCell><div className="flex items-center gap-3"><span className="grid size-12 place-items-center overflow-hidden rounded-xl bg-[#f4f7ef] text-3xl">{product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" /> : product.emoji}</span><div><b>{product.name}</b><div className="text-xs text-stone-500">{product.category}</div></div></div></TableCell><TableCell><b>{product.baseUnit}</b></TableCell><TableCell>{product.stock} packs</TableCell><TableCell className="font-black">{money(product.vendorPrice)}</TableCell><TableCell>{product.nutritionStatus === "Pending review" || product.calories <= 0 ? <div><Status className="border-amber-200 bg-amber-50 text-amber-800">Pending review</Status><div className="mt-1 text-xs text-stone-500">Product can stay active while Operations reviews nutrition.</div></div> : <div><b>{product.calories} kcal</b><div className="text-xs text-stone-500">P {product.protein}g · C {product.carbs}g · F {product.fat}g</div><div className="mt-1 text-[10px] font-bold text-[#5f8f2d]">{product.nutritionStatus || "Estimated"}</div></div>}</TableCell><TableCell><Switch checked={product.active} disabled={vendor.verification !== "Verified" || product.stock <= 0} onCheckedChange={(value) => setState((s) => ({ ...s, products: s.products.map((x) => x.id === product.id ? { ...x, active: value } : x) }))} /></TableCell></TableRow>)}</TableBody></Table></div> : <Empty icon={ShoppingBag} title="Your catalogue is empty" body="Add the first sellable product pack. Nothing is seeded in V3." action={<Button onClick={() => setOpen(true)} className="rounded-xl bg-[#5ba400]"><Plus />Add first product pack</Button>} />}<ProductDialog open={open} close={() => setOpen(false)} vendor={vendor} setState={setState} session={session} /><BulkCatalogDialog open={bulkOpen} close={() => setBulkOpen(false)} vendor={vendor} state={state} setState={setState} session={session} /></div>;
}


type BulkCatalogDraft = { id: string; name: string; category: string; pack: string; price: number; stock: number; imageUrl?: string; generating?: boolean };
function BulkCatalogDialog({ open, close, vendor, state, setState, session }: { open: boolean; close: () => void; vendor: Vendor; state: V3State; setState: React.Dispatch<React.SetStateAction<V3State>>; session: DemoSession }) {
  const [rows, setRows] = useState<BulkCatalogDraft[]>([]);
  const [busy, setBusy] = useState(false);
  async function readList(file?: File) {
    if (!file) return;
    const text = await file.text();
    const fallback = parseRequirementText(text).map((item) => ({ id: id("BULK"), name: item.name, category: vendor.category in unitsByCategory ? vendor.category : "Groceries", pack: `${item.quantity || 1} ${item.unit || "pack"}`, price: 0, stock: 1 }));
    try {
      const token = await getAccessToken();
      const response = await fetch("/api/catalogue-import", { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ text, defaultCategory: vendor.category }) });
      const json = await response.json() as { items?: Array<{ name: string; category: string; pack: string; price: number; stock: number }>; error?: string };
      const items = response.ok && json.items?.length ? json.items.map((item) => ({ id: id("BULK"), name: item.name, category: item.category in unitsByCategory ? item.category : (vendor.category in unitsByCategory ? vendor.category : "Groceries"), pack: item.pack || "1 pack", price: Number(item.price || 0), stock: Math.max(1, Number(item.stock || 1)) })) : fallback;
      setRows(items); toast.success(`${items.length} item(s) prepared. Review every row before publishing.`);
    } catch { setRows(fallback); toast.info(`${fallback.length} item(s) extracted for manual review.`); }
  }
  async function generateImage(row: BulkCatalogDraft) {
    setRows((current) => current.map((item) => item.id === row.id ? { ...item, generating: true } : item));
    try { const token = await getAccessToken(); const response = await fetch("/api/product-image-generate", { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ productName: row.name, category: row.category, pack: row.pack }) }); const json = await response.json() as { imageDataUrl?: string; imageUrl?: string; error?: string }; if (!response.ok) throw new Error(json.error || "Image creation failed"); setRows((current) => current.map((item) => item.id === row.id ? { ...item, imageUrl: json.imageDataUrl || json.imageUrl, generating: false } : item)); } catch (error) { setRows((current) => current.map((item) => item.id === row.id ? { ...item, generating: false } : item)); toast.error(error instanceof Error ? error.message : "Image creation failed"); }
  }
  async function publishAll() {
    const valid = rows.filter((row) => row.name.trim() && row.price > 0 && row.stock > 0);
    if (!valid.length) return toast.error("Add a price and stock for at least one item");
    setBusy(true);
    try {
      const created: Product[] = [];
      for (const row of valid) {
        const options = unitsByCategory[row.category] || unitsByCategory.Groceries; const spec = options[0];
        const nutrition: Nutrition = { calories: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 };
        const nutritionNote = "Bulk-imported product published without verified nutrition. Operations review requested.";
        let imageUrl = row.imageUrl;
        if (imageUrl?.startsWith("data:") && isLiveSupabaseMode()) imageUrl = await uploadLiveProductImage(vendor.id, imageUrl);
        const productId = isLiveSupabaseMode() ? await saveLiveVendorProduct({ vendorId: vendor.id, name: row.name, category: row.category, unit: row.pack || spec.label, price: row.price, stock: Math.round(row.stock), active: vendor.verification === "Verified", ...nutrition, dietaryTags: [], packAmount: spec.amount, packMeasure: spec.measure, imageUrl, nutritionStatus: "pending_review", nutritionNote }) : id("PRD");
        if (isLiveSupabaseMode()) { try { await notifyLiveNutritionReview({ productId, productName: row.name, reason: nutritionNote }); } catch (error) { console.error("Bulk nutrition review notification", error); } }
        created.push({ id: productId, vendorId: vendor.id, name: row.name, category: row.category, emoji: spec.emoji, baseUnit: row.pack || spec.label, quantityStep: 1, vendorPrice: row.price, stock: Math.round(row.stock), active: vendor.verification === "Verified", ...nutrition, dietaryTags: [], packAmount: spec.amount, packMeasure: spec.measure, imageUrl, nutritionStatus: "Pending review", nutritionNote });
      }
      setState((current) => ({ ...current, products: [...created, ...current.products.filter((item) => !created.some((next) => next.id === item.id))], audit: [audit(session, "Bulk catalogue approved", `${created.length} item(s) published by human approval`), ...current.audit] }));
      toast.success(`${created.length} item(s) published`); setRows([]); close();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Catalogue could not be published"); }
    finally { setBusy(false); }
  }
  return <Dialog open={open} onOpenChange={(value) => !value && close()}><DialogContent className="max-h-[92vh] overflow-y-auto rounded-[28px] sm:max-w-5xl"><DialogHeader><DialogTitle className="text-2xl font-black">Build catalogue from a product list</DialogTitle><DialogDescription>Upload CSV or TXT. The list is structured into draft products. Review every row, optionally create an image, then approve the final catalogue yourself.</DialogDescription></DialogHeader>
    <label className="surface-card flex cursor-pointer items-center justify-center rounded-[24px] border-dashed p-7 text-sm font-black"><input type="file" className="hidden" accept=".csv,.txt,.tsv" onChange={(e) => void readList(e.target.files?.[0])} /><FileUp className="mr-2" />Upload product list</label>
    {rows.length > 0 && <div className="space-y-3">{rows.map((row) => <div key={row.id} className="surface-card grid gap-3 rounded-[24px] p-4 lg:grid-cols-[1.2fr_.8fr_.7fr_.55fr_.55fr_auto]"><input value={row.name} onChange={(e) => setRows((current) => current.map((item) => item.id === row.id ? { ...item, name: e.target.value } : item))} className={inputClass} placeholder="Product" /><Select value={row.category} onValueChange={(value) => setRows((current) => current.map((item) => item.id === row.id ? { ...item, category: value } : item))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{categoryNames.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent></Select><input value={row.pack} onChange={(e) => setRows((current) => current.map((item) => item.id === row.id ? { ...item, pack: e.target.value } : item))} className={inputClass} placeholder="Pack" /><input type="number" min="0" value={row.price || ""} onChange={(e) => setRows((current) => current.map((item) => item.id === row.id ? { ...item, price: Number(e.target.value) } : item))} className={inputClass} placeholder="₹" /><input type="number" min="1" value={row.stock} onChange={(e) => setRows((current) => current.map((item) => item.id === row.id ? { ...item, stock: Number(e.target.value) } : item))} className={inputClass} placeholder="Stock" /><div className="flex gap-2"><button onClick={() => void generateImage(row)} className="grid size-11 place-items-center rounded-xl border" title="Create optional image">{row.generating ? <RefreshCcw className="size-4 animate-spin" /> : row.imageUrl ? <img src={row.imageUrl} alt="" className="size-9 rounded-lg object-cover" /> : <Sparkles className="size-4" />}</button><button onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))} className="grid size-11 place-items-center rounded-xl border text-red-600"><Trash2 className="size-4" /></button></div></div>)}</div>}
    <Button onClick={() => void publishAll()} disabled={busy || !rows.length} className="h-12 w-full rounded-xl bg-[#5ba400] font-black"><Check />{busy ? "Publishing…" : "Approve & publish selected catalogue"}</Button>
  </DialogContent></Dialog>;
}

function ProductDialog({ open, close, vendor, setState, session }: { open: boolean; close: () => void; vendor: Vendor; setState: React.Dispatch<React.SetStateAction<V3State>>; session: DemoSession }) {
  const initialCategory = vendor.category in unitsByCategory ? vendor.category : "Groceries";
  const [name, setName] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [packKey, setPackKey] = useState(unitsByCategory[initialCategory][0].key);
  const [price, setPrice] = useState(0);
  const [stock, setStock] = useState(0);
  const [nutrition, setNutrition] = useState<Nutrition>({ calories: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 });
  const [confirmed, setConfirmed] = useState(false);
  const [nutritionConfidence, setNutritionConfidence] = useState<number | undefined>();
  const [nutritionNote, setNutritionNote] = useState("");
  const [nutritionSource, setNutritionSource] = useState("");
  const [nutritionLabelImage, setNutritionLabelImage] = useState("");
  const [busy, setBusy] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [originalImageUrl, setOriginalImageUrl] = useState("");
  const options = unitsByCategory[category] || unitsByCategory.Groceries;
  const spec = options.find((x) => x.key === packKey) || options[0];
  useEffect(() => { if (!options.some((x) => x.key === packKey)) queueMicrotask(() => setPackKey(options[0].key)); }, [category, options, packKey]);

  const nutritionPresent = Object.values(nutrition).some((value) => Number(value) > 0);
  const nutritionConsistent = nutritionPresent && nutritionLooksConsistent(nutrition);
  const nutritionStatus: Product["nutritionStatus"] = confirmed && nutritionConsistent ? "Verified" : nutritionConsistent ? "Estimated" : "Pending review";
  const baseReady = Boolean(name.trim()) && price > 0 && Number.isInteger(stock) && stock > 0;
  const measurable = nutritionPresent && ["g","kg","ml","litre"].includes(spec.measure);
  const packBase = spec.measure === "kg" || spec.measure === "litre" ? spec.amount * 1000 : spec.amount;
  const per100 = measurable && packBase > 0 ? Object.fromEntries(Object.entries(nutrition).map(([key, value]) => [key, Math.round(Number(value) * 100 / packBase * 10) / 10])) as Nutrition : null;

  async function calculate() {
    if (!name.trim()) return toast.error("Enter the exact product name");
    setBusy(true);
    try {
      const token = await getAccessToken();
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ task: "nutrition", message: name, context: { productName: name, category, amount: spec.amount, measurementUnit: spec.measure, servingLabel: spec.label, nutritionSource }, imageBase64: nutritionLabelImage || undefined }),
      });
      const json = await response.json() as { result?: { nutritionAvailable?: boolean; nutrition?: Nutrition | null; confidence?: number; summary?: string; recommendedAction?: string }; error?: string };
      if (!response.ok) throw new Error(json.error || "Nutrition could not be estimated");
      const result = json.result;
      if (result?.nutritionAvailable && result.nutrition && nutritionLooksConsistent(result.nutrition)) {
        setNutrition(result.nutrition);
        setNutritionConfidence(Number(result.confidence || 0));
        setNutritionNote(result.summary || "Estimated for this selling pack. Verify against a label or recipe when possible.");
        setConfirmed(false);
        toast.success("Nutrition estimate added for this pack");
      } else {
        setNutritionConfidence(undefined);
        setNutritionNote(result?.summary || "Nutrition could not be estimated reliably from the information provided.");
        toast.info("Nutrition is pending. You can still publish this product.");
      }
    } catch (error) {
      setNutritionConfidence(undefined);
      setNutritionNote(error instanceof Error ? error.message : "Nutrition could not be estimated reliably.");
      toast.info("Nutrition is pending. You can still publish this product.");
    } finally { setBusy(false); }
  }

  function chooseImage(file?: File) {
    if (!file) return;
    readImage(file, (value) => { setOriginalImageUrl(value); setImageUrl(value); toast.success("Product image ready. You can publish it as-is or improve its presentation."); });
  }

  async function enhanceImage() {
    if (!imageUrl) return toast.error("Upload a product image first");
    if (!name.trim()) return toast.error("Enter the product name before image enhancement");
    setImageBusy(true);
    try {
      const token = await getAccessToken();
      const response = await fetch("/api/image-enhance", { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ imageDataUrl: imageUrl, productName: name, category }) });
      const json = await response.json() as { imageDataUrl?: string; imageUrl?: string; error?: string };
      if (!response.ok) throw new Error(json.error || "Image enhancement failed");
      setImageUrl(json.imageDataUrl || json.imageUrl || imageUrl);
      toast.success("Marketplace image is ready. Review it before publishing.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Image enhancement failed"); }
    finally { setImageBusy(false); }
  }

  async function save() {
    if (!baseReady) return toast.error("Enter the product, price and whole pack stock");
    setBusy(true);
    try {
      const active = vendor.verification === "Verified";
      let publishedImage = imageUrl || undefined;
      if (publishedImage && isLiveSupabaseMode()) publishedImage = await uploadLiveProductImage(vendor.id, publishedImage);
      const statusForDb = nutritionStatus === "Verified" ? "verified" : nutritionStatus === "Estimated" ? "estimated" : "pending_review";
      const note = nutritionStatus === "Pending review" ? (nutritionNote || (nutritionPresent ? "Entered nutrition needs review." : "Nutrition was not supplied or could not be estimated reliably.")) : (nutritionNote || "Nutrition supplied for this selling pack.");
      const productId = isLiveSupabaseMode() ? await saveLiveVendorProduct({
        vendorId: vendor.id, name, category, unit: spec.label, price, stock, active,
        calories: nutrition.calories, protein: nutrition.protein, carbs: nutrition.carbs, fat: nutrition.fat, fibre: nutrition.fibre,
        dietaryTags: [], packAmount: spec.amount, packMeasure: spec.measure, imageUrl: publishedImage,
        nutritionStatus: statusForDb, nutritionConfidence, nutritionNote: note,
      }) : id("PRD");
      const product: Product = {
        id: productId, vendorId: vendor.id, name, category, emoji: spec.emoji, baseUnit: spec.label,
        quantityStep: 1, vendorPrice: price, stock, active, ...nutrition, dietaryTags: [], packAmount: spec.amount,
        packMeasure: spec.measure, imageUrl: publishedImage, originalImageUrl: originalImageUrl || undefined,
        nutritionStatus, nutritionConfidence, nutritionNote: note,
      };
      setState((current) => ({
        ...current,
        products: [product, ...current.products.filter((x) => x.id !== product.id)],
        markups: { ...current.markups, [product.id]: 0 },
        audit: [audit(session, "Published product pack", `${name} · ${spec.label} · nutrition ${nutritionStatus?.toLowerCase()}${publishedImage ? " · image attached" : ""}`), ...current.audit],
      }));
      if (nutritionStatus === "Pending review") {
        if (isLiveSupabaseMode()) {
          try { await notifyLiveNutritionReview({ productId, productName: name, reason: note }); } catch (error) { console.error("Nutrition review notification", error); }
        }
        toast.info("Product published. Operations has been flagged to review nutrition.");
      } else toast.success("Product pack saved");
      close();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Product could not be saved"); }
    finally { setBusy(false); }
  }

  const metrics: Array<[keyof Nutrition, string]> = [["calories","Calories"],["protein","Protein g"],["carbs","Carbs g"],["fat","Fat g"],["fibre","Fibre g"]];
  return <Dialog open={open} onOpenChange={(value) => !value && close()}><DialogContent className="sp-product-dialog max-h-[94vh] overflow-y-auto rounded-[26px] sm:max-w-4xl"><DialogHeader><DialogTitle className="text-2xl font-black">Add a sellable product pack</DialogTitle><DialogDescription>Set the exact pack and price. Nutrition is helpful but not mandatory; uncertain or missing nutrition is automatically marked for Operations review.</DialogDescription></DialogHeader>
    <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
      <div className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="Exact product name"><input value={name} onChange={(e) => { setName(e.target.value); setConfirmed(false); }} className={inputClass} placeholder="Example: Full cream cow milk" /></Field><Field label="Category"><Select value={category} onValueChange={(value) => { setCategory(value); setConfirmed(false); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{categoryNames.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></Field><Field label="Customer selling pack" hint="Example: 250 ml pouch = one pack. Customers choose 1, 2, 3 packs."><Select value={spec.key} onValueChange={(value) => { setPackKey(value); setConfirmed(false); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{options.map((x) => <SelectItem key={x.key} value={x.key}>{x.label}</SelectItem>)}</SelectContent></Select></Field><Field label={`Your price for one ${spec.label}`}><input type="number" min="1" value={price || ""} onChange={(e) => setPrice(Number(e.target.value))} className={inputClass} /></Field><Field label="Available sealed packs" hint={`20 = twenty ${spec.label} packs.`}><input type="number" min="1" step="1" value={stock || ""} onChange={(e) => setStock(Number(e.target.value))} className={inputClass} /></Field><div className="flex items-end"><Button onClick={calculate} disabled={busy} variant="outline" title="Calculate for this pack" className="h-11 w-full"><Sparkles />{busy ? "Calculating…" : "Calculate with She Agent"}</Button></div></div>
        <div className="rounded-[22px] border border-stone-200/80 bg-[#faf8f4] p-4"><div className="flex items-center justify-between gap-3"><div><div className="text-xs font-black uppercase tracking-[.12em] text-stone-500">Nutrition source · optional</div><p className="mt-1 text-xs leading-5 text-stone-500">For a better estimate, paste package-label values or recipe/ingredient details, or upload a nutrition-label photo. You can also publish without nutrition.</p></div><Sparkles className="size-5 shrink-0 text-[#5f8f2d]" /></div><Textarea value={nutritionSource} onChange={(e) => setNutritionSource(e.target.value)} className="mt-3 min-h-20 rounded-xl bg-white" placeholder="Example: 250 g cooked rice, 120 g chicken, 15 g oil... or paste label text" /><label className="mt-3 flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border bg-white px-3 text-sm font-black"><input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) readImage(file, setNutritionLabelImage); }} /><ImageUp className="size-4" />{nutritionLabelImage ? "Nutrition label attached" : "Upload nutrition-label photo"}</label></div>
        <div className="grid gap-4 lg:grid-cols-2"><div className={`rounded-2xl p-4 ${nutritionStatus === "Pending review" ? "bg-amber-50/80" : "bg-[#f3f7ed]"}`}><div className={`text-xs font-black uppercase tracking-wider ${nutritionStatus === "Pending review" ? "text-amber-800" : "text-[#477f00]"}`}>Per selected pack: {spec.label}</div><div className="mt-3 grid grid-cols-2 gap-2">{metrics.map(([key,label]) => <Field key={key} label={label}><input type="number" min="0" step="0.1" value={nutrition[key] || ""} placeholder="Optional" onChange={(e) => { setNutrition((x) => ({ ...x, [key]: Number(e.target.value || 0) })); setNutritionConfidence(undefined); setNutritionNote("Nutrition entered manually; Operations review may be required."); setConfirmed(false); }} className={inputClass} /></Field>)}</div></div><div className="surface-card rounded-[22px] p-4"><div className="flex items-center justify-between gap-2"><div className="text-xs font-black uppercase tracking-wider text-stone-500">Nutrition status</div><Status className={nutritionStatus === "Pending review" ? "border-amber-200 bg-amber-50 text-amber-800" : nutritionStatus === "Verified" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : ""}>{nutritionStatus}</Status></div>{nutritionConfidence !== undefined && <p className="mt-2 text-xs text-stone-500">Estimate confidence: {Math.round(nutritionConfidence)}%</p>}{nutritionNote && <p className="mt-2 text-sm leading-5 text-stone-600">{nutritionNote}</p>}{per100 ? <div className="mt-3 space-y-2 text-sm"><div className="text-[10px] font-black uppercase tracking-[.12em] text-stone-400">Comparable basis</div><Review label={`Calories / 100 ${["ml","litre"].includes(spec.measure) ? "ml" : "g"}`} value={`${per100.calories} kcal`} /><Review label="Protein" value={`${per100.protein} g`} /><Review label="Carbs" value={`${per100.carbs} g`} /><Review label="Fat" value={`${per100.fat} g`} /></div> : <p className="mt-3 text-sm text-stone-500">Nutrition can be left blank. Customers will see “Nutrition pending” until it is reviewed.</p>}{nutritionConsistent && <label className="mt-5 flex items-start gap-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900"><Switch checked={confirmed} onCheckedChange={setConfirmed} /><span><b>I verified these values.</b><br />I checked the estimate against the package label or recipe.</span></label>}</div></div>
      </div>
      <div className="surface-card-muted rounded-[28px] p-4"><div className="flex items-center justify-between"><div><div className="text-xs font-black uppercase tracking-[.14em] text-[#5f8f2d]">Product media</div><h3 className="mt-1 font-black">Marketplace image</h3></div><ImageUp className="text-[#5f8f2d]" /></div><div className="mt-4 grid aspect-square place-items-center overflow-hidden rounded-[24px] bg-white text-6xl shadow-inner">{imageUrl ? <img src={imageUrl} alt="Product preview" className="h-full w-full object-cover" /> : spec.emoji}</div><label className="mt-4 flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border bg-white text-sm font-black"><input type="file" accept="image/*" className="hidden" onChange={(e) => chooseImage(e.target.files?.[0])} /><ImageUp className="size-4" />Upload real product photo</label><Button onClick={enhanceImage} disabled={!imageUrl || imageBusy} variant="outline" className="mt-2 h-11 w-full rounded-xl"><Sparkles />{imageBusy ? "Enhancing…" : "AI enhance for marketplace"}</Button>{originalImageUrl && imageUrl !== originalImageUrl && <button onClick={() => setImageUrl(originalImageUrl)} className="mt-2 w-full text-center text-xs font-black text-stone-500">Restore original image</button>}<p className="mt-3 text-[11px] leading-5 text-stone-500">Image enhancement preserves the real product and pack while improving presentation. Review the result before publishing.</p></div>
    </div>
    {nutritionPresent && !nutritionConsistent && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900">The entered calories and macros do not align. This does not block publishing; the product will be marked “Nutrition pending” and Operations will be notified.</div>}
    {!nutritionPresent && <div className="rounded-2xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900"><b>Nutrition is optional.</b> Publish now if you do not have it. Operations will receive a review notification and the marketplace will show nutrition as pending.</div>}
    <Button onClick={save} disabled={!baseReady || busy} className="h-12 bg-[#5ba400]"><Check />{busy ? "Publishing…" : "Publish product pack"}</Button>
  </DialogContent></Dialog>;
}

function VendorQuotes({ vendor, state, setState, session }: { vendor: Vendor; state: V3State; setState: React.Dispatch<React.SetStateAction<V3State>>; session: DemoSession }) { const opportunities = state.requirements.filter((x) => x.status === "Quoting" || x.status === "Quotes received").filter((x) => !x.invitedVendorIds?.length || x.invitedVendorIds.includes(vendor.id)); const [draft, setDraft] = useState<Record<string, number>>({}); function quote(req: Requirement) { if (req.closingDate && req.closingDate < new Date().toISOString().slice(0,10)) return toast.error("This RFQ is closed"); const total = draft[req.id]; if (!total) return toast.error("Enter your best total"); const item: Quote = { id: id("QTE"), requirementId: req.id, vendorId: vendor.id, total, deliveryFee: 0, note: "Best local price", status: "Submitted" }; setState((s) => ({ ...s, quotes: [item, ...s.quotes.filter((x) => !(x.vendorId === vendor.id && x.requirementId === req.id))], requirements: s.requirements.map((x) => x.id === req.id ? { ...x, status: "Quotes received" } : x), notifications: [notice(req.customerEmail, "customer", "Vendor accepted your RFQ", `${vendor.businessName} submitted ${money(total)}.`), ...s.notifications], audit: [audit(session, "Accepted RFQ and submitted quote", `${req.id} · ${money(total)}`), ...s.audit] })); toast.success("RFQ accepted and quotation submitted"); } return <div className="space-y-6"><Heading eyebrow="PREMIUM FEATURE" title="Local RFQ opportunities" body="Only RFQs explicitly matched to this vendor are visible. Submit an independent best price before the customer closing date." />{vendor.plan !== "Premium" ? <Empty icon={WalletCards} title="Quotation access is on Premium" body="Ask Super Admin to assign the Premium plan for testing." /> : opportunities.length ? opportunities.map((req) => <div key={req.id} className="surface-card rounded-[28px] p-5"><div className="flex justify-between"><div><h3 className="font-black">{req.title}</h3><p className="text-xs text-stone-500">{req.items.length} items · closes {req.closingDate || "not set"} · needed {req.deliveryDate}</p></div><Status>{state.quotes.some((x) => x.requirementId === req.id && x.vendorId === vendor.id) ? "Accepted / quoted" : "Invited"}</Status></div><div className="mt-4 flex flex-wrap gap-2">{req.items.map((item) => <span key={item.id} className="rounded-full bg-stone-100 px-3 py-2 text-xs font-bold">{item.name} · {item.quantity} {item.unit}</span>)}</div><div className="mt-5 flex max-w-md gap-2"><input type="number" value={draft[req.id] || ""} onChange={(e) => setDraft((x) => ({ ...x, [req.id]: Number(e.target.value) }))} placeholder="Your best total ₹" className={inputClass} /><Button onClick={() => quote(req)} className="rounded-xl bg-[#5ba400]">Accept & quote</Button></div></div>) : <Empty icon={ClipboardCheck} title="No RFQs matched to your store" body="Only serviceable customer requests sent to this vendor account will appear here." />}</div>; }

function DeliveryTeam({ vendor, state, setState, session }: { vendor: Vendor; state: V3State; setState: React.Dispatch<React.SetStateAction<V3State>>; session: DemoSession }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [editing, setEditing] = useState<Staff | null>(null);
  const people = state.staff.filter((x) => x.vendorId === vendor.id);
  async function savePerson() {
    if (!name || !/^\+?[0-9 ]{10,15}$/.test(phone)) return toast.error("Enter a staff name and valid phone number");
    try {
      let staffId = editing?.id || id("STF");
      if (isLiveSupabaseMode()) { const result = await saveLiveDeliveryStaff({ staffId: editing?.id, name, phone, active: editing?.active ?? true }); staffId = String(result.id); }
      if (editing) setState((s) => ({ ...s, staff: s.staff.map((x) => x.id === editing.id ? { ...x, id: staffId, name, phone } : x), audit: [audit(session, "Updated delivery staff", `${name} · ${phone}`), ...s.audit] }));
      else { const person: Staff = { id: staffId, vendorId: vendor.id, name, phone, active: true }; setState((s) => ({ ...s, staff: [person, ...s.staff], audit: [audit(session, "Added delivery staff", `${name} · ${phone}`), ...s.audit] })); }
      toast.success(editing ? "Delivery person updated" : "Delivery person added"); setName(""); setPhone(""); setEditing(null);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Delivery person could not be saved"); }
  }
  async function remove(person: Staff) {
    if (!confirm(`Delete ${person.name} from the delivery team? Existing completed-order history is retained.`)) return;
    try { if (isLiveSupabaseMode()) await deleteLiveDeliveryStaff(person.id); setState((s) => ({ ...s, staff: s.staff.filter((x) => x.id !== person.id), assignments: s.assignments.filter((x) => x.staffId !== person.id), audit: [audit(session, "Deleted delivery staff", `${person.name} · ${person.phone}`), ...s.audit] })); toast.success("Delivery person deleted"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Delivery person could not be deleted"); }
  }
  return <div className="space-y-6"><Heading eyebrow="DELIVERY ACCOUNTABILITY" title="Your delivery team" body="Add, edit or remove delivery people. Active staff can be assigned to upcoming delivery orders." />
    <div className="surface-card rounded-[28px] p-5"><div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Staff name" className={inputClass} /><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" className={inputClass} /><Button onClick={savePerson} className="h-11 rounded-xl bg-[#5ba400]">{editing ? <Pencil /> : <Plus />}{editing ? "Save changes" : "Add staff"}</Button></div>{editing && <button onClick={() => { setEditing(null); setName(""); setPhone(""); }} className="mt-3 text-xs font-black text-stone-500">Cancel editing</button>}</div>
    {people.length ? <div className="grid gap-3 md:grid-cols-2">{people.map((person) => <div key={person.id} className="surface-card flex items-center gap-3 rounded-[22px] p-4"><div className="grid size-11 place-items-center rounded-full bg-[#eff7e5] font-black text-[#5ba400]">{person.name[0]}</div><div className="min-w-0 flex-1"><b className="block truncate">{person.name}</b><div className="text-xs text-stone-500">{person.phone}</div></div><button onClick={() => { setEditing(person); setName(person.name); setPhone(person.phone); }} className="grid size-9 place-items-center rounded-xl hover:bg-stone-100" title="Edit"><Pencil className="size-4" /></button><button onClick={() => remove(person)} className="grid size-9 place-items-center rounded-xl text-red-600 hover:bg-red-50" title="Delete"><Trash2 className="size-4" /></button><Switch checked={person.active} onCheckedChange={(value) => { void (async () => { try { if (isLiveSupabaseMode()) await saveLiveDeliveryStaff({ staffId: person.id, name: person.name, phone: person.phone, active: value }); setState((s) => ({ ...s, staff: s.staff.map((x) => x.id === person.id ? { ...x, active: value } : x) })); } catch (error) { toast.error(error instanceof Error ? error.message : "Staff status could not be changed"); } })(); }} /></div>)}</div> : <Empty icon={Truck} title="No delivery staff" body="Add the first delivery person above." />}
  </div>;
}

function Orders({ session, state, setState, scope, vendor }: { session: DemoSession; state: V3State; setState: React.Dispatch<React.SetStateAction<V3State>>; scope: "customer" | "vendor" | "operations"; vendor?: Vendor }) { const orders = scope === "customer" ? state.orders.filter((x) => x.customerEmail === session.email) : scope === "vendor" ? state.orders.filter((x) => x.vendorId === vendor?.id) : state.orders; function update(order: Order, status: Order["status"]) { const productVendor = state.vendors.find((x) => x.id === order.vendorId); setState((s) => ({ ...s, orders: s.orders.map((x) => x.id === order.id ? { ...x, status } : x), notifications: [notice(order.customerEmail, "customer", `Order ${status.toLowerCase()}`, `${order.description} is now ${status.toLowerCase()}.`), ...(productVendor ? [notice(productVendor.ownerEmail, "vendor", "Order updated", `${order.id} is ${status}.`)] : []), ...s.notifications], audit: [audit(session, "Updated order status", `${order.id} → ${status}`), ...s.audit] })); showDeviceNotification(`Order ${status}`, order.description); toast.success("Order status updated"); } function cancel(order: Order) { const reason = prompt("Why do you need to cancel this order?"); if (!reason) return; setState((s) => ({ ...s, orders: s.orders.map((x) => x.id === order.id ? { ...x, status: "Cancellation requested" } : x), cancellations: [{ id: id("CAN"), orderId: order.id, customerEmail: session.email, reason, aiDecision: "Eligible if before vendor preparation cut-off", confidence: 91, status: "Awaiting operations" }, ...s.cancellations], notifications: [notice("operations@sheplates.demo", "operations", "Cancellation needs review", `${order.id} was pre-screened by She Agent.`), ...s.notifications] })); toast.success("She Agent screened the request; Operations has the final decision"); } return <div className="space-y-6"><Heading eyebrow="ORDER CONTROL" title={scope === "customer" ? "Track your orders" : scope === "vendor" ? "Fulfil scheduled orders" : "Platform order tracking"} body="Every future order keeps a status, scheduled slot, payment state and accountable delivery person." />{orders.length ? <div className="surface-card overflow-x-auto rounded-[28px]"><Table><TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Schedule</TableHead><TableHead>Quantity</TableHead><TableHead>Status</TableHead><TableHead>Delivery person</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader><TableBody>{orders.map((order) => { const assignment = state.assignments.find((x) => x.orderId === order.id); const person = state.staff.find((x) => x.id === assignment?.staffId); const available = state.staff.filter((x) => x.vendorId === order.vendorId && x.active); return <TableRow key={order.id}><TableCell><b className="font-mono text-xs">{order.id}</b><div className="text-xs text-stone-500">{order.description}</div></TableCell><TableCell><b>{order.date}</b><div className="text-xs text-stone-500">{order.slot}</div></TableCell><TableCell>{order.quantity} {order.unit}<div className="text-xs font-bold">{money(order.total)}</div></TableCell><TableCell><Status>{order.status}</Status><div className="mt-1 text-xs text-stone-500">{order.payment}</div></TableCell><TableCell>{scope === "vendor" ? <Select value={person?.id || "unassigned"} onValueChange={(staffId) => { if (staffId === "unassigned") return; const next: Assignment = { id: id("ASN"), orderId: order.id, staffId, assignedAt: now() }; setState((s) => ({ ...s, assignments: [next, ...s.assignments.filter((x) => x.orderId !== order.id)], notifications: [notice(order.customerEmail, "customer", "Delivery person assigned", `${state.staff.find((x) => x.id === staffId)?.name} will handle ${order.id}.`), ...s.notifications] })); }}><SelectTrigger className="w-44 rounded-xl"><SelectValue placeholder="Assign staff" /></SelectTrigger><SelectContent><SelectItem value="unassigned">Not assigned</SelectItem>{available.map((x) => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}</SelectContent></Select> : person ? <div><b>{person.name}</b><div className="text-xs text-[#5ba400]">{person.phone}</div></div> : <span className="text-xs text-stone-400">Not assigned</span>}</TableCell><TableCell className="text-right">{scope === "customer" ? <Button variant="outline" size="sm" disabled={["Completed", "Cancelled", "Cancellation requested"].includes(order.status)} onClick={() => cancel(order)} className="rounded-lg">Cancel</Button> : <Select value={order.status} onValueChange={(value) => void update(order, value as Order["status"])}><SelectTrigger className="ml-auto w-44 rounded-lg"><SelectValue /></SelectTrigger><SelectContent>{["Scheduled", "Confirmed", "Preparing", "Ready", "Out for delivery", "Ready for pickup", "Completed"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select>}</TableCell></TableRow>; })}</TableBody></Table></div> : <Empty icon={Package} title="No orders yet" body="Orders will appear when customers schedule a product or select a monthly quotation." />}</div>; }

function OperationsArea({ active, session, state, setState }: { active: string; session: DemoSession; state: V3State; setState: React.Dispatch<React.SetStateAction<V3State>> }) {
  if (active === "AI insights") return <AIInsights role="operations" state={state} />;
  if (active === "Vendor onboarding") return <OperationsOnboard session={session} state={state} setState={setState} />;
  if (active === "Vendor verification") return <OperationsVerification session={session} state={state} setState={setState} />;
  if (active === "Item pricing") return <ItemPricing session={session} state={state} setState={setState} />;
  if (active === "RFQ desk") return <RFQDesk state={state} />;
  if (active === "Orders") return <OrdersV4 session={session} state={state} setState={setState} scope="operations" />;
  if (active === "Cancellations") return <Cancellations session={session} state={state} setState={setState} />;
  if (active === "Vendor payments") return <VendorPayments state={state} setState={setState} session={session} canManage />;
  if (active === "Reports") return <ReportsCentre state={state} />;
  if (active === "Ticket centre") return <TicketCentre session={session} state={state} setState={setState} mode="manage" />;
  const activeOrders = state.orders.filter((x) => !["Completed", "Cancelled"].includes(x.status)); const gmv = state.orders.reduce((sum, x) => sum + x.total, 0); const openVendors = state.vendors.filter((x) => x.openToday && x.verification === "Verified").length;
  return <div className="space-y-7"><Heading eyebrow="OPERATIONS COMMAND CENTRE" title="Live platform control" body="Verify vendors, control item-level percentages, track fulfilment, review cancellations and onboard vendors on their behalf." /><div className="sp-mobile-metric-grid grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><Metric label="Verification queue" value={String(state.vendors.filter((x) => ["Submitted", "Under review"].includes(x.verification)).length)} icon={FileCheck2} /><Metric label="Open vendors" value={String(openVendors)} icon={Store} /><Metric label="Active orders" value={String(activeOrders.length)} icon={Package} /><Metric label="GMV" value={money(gmv)} icon={IndianRupee} /><Metric label="Cancellation queue" value={String(state.cancellations.filter((x) => x.status === "Awaiting operations").length)} icon={RefreshCcw} /></div><div className="grid gap-5 xl:grid-cols-2"><div className="surface-card rounded-[28px] p-6"><h3 className="font-black">Operational health</h3><div className="mt-5 space-y-3"><Review label="Verified vendors" value={String(state.vendors.filter((x) => x.verification === "Verified").length)} /><Review label="Marketplace products" value={String(state.products.filter((x) => x.active).length)} /><Review label="Scheduled fulfilments" value={String(state.schedules.length)} /><Review label="Unassigned deliveries" value={String(state.orders.filter((o) => o.mode === "Vendor delivery" && !state.assignments.some((a) => a.orderId === o.id)).length)} /><Review label="Quote conversion" value={`${state.requirements.length ? Math.round(state.requirements.filter((x) => x.status === "Awarded").length / state.requirements.length * 100) : 0}%`} /></div></div><div className="surface-dark rounded-[28px] p-6 text-white"><Activity className="text-[#91c747]" /><h3 className="mt-4 text-xl font-black">Operations She Agent</h3><p className="mt-2 text-sm leading-6 text-white/55">Ask across vendors, orders, delivery exceptions, certification queues and cancellation evidence. Operations can recommend actions; final payment reversals remain human-controlled.</p></div></div></div>;
}

function OperationsOnboard({ session, state, setState }: { session: DemoSession; state: V3State; setState: React.Dispatch<React.SetStateAction<V3State>> }) {
  const [open, setOpen] = useState(false);
  return <div className="space-y-6"><Heading eyebrow="ASSISTED ONBOARDING" title="Create a vendor from Operations" body="Assign every vendor to an existing vendor login. After submission, the record stays visible below and appears to that exact vendor account." action={<Button onClick={() => setOpen(true)} className="rounded-xl bg-[#5ba400]"><UserPlus />Start onboarding</Button>} />
    <div className="surface-card rounded-[22px] border border-sky-200/70 bg-sky-50/85 p-4 text-sm leading-6 text-sky-900"><b>Testing rule:</b> choose either <code>vendor@sheplates.demo</code> or <code>newvendor@sheplates.demo</code> in the onboarding form. Sign in with the selected account to see that vendor. The vendor remains unavailable to customers until Operations verifies it, the vendor opens the store, and at least one product is active.</div>
    {state.vendors.length ? <div className="surface-card overflow-x-auto rounded-[28px]"><Table><TableHeader><TableRow><TableHead>Created vendor</TableHead><TableHead>Assigned login</TableHead><TableHead>Location</TableHead><TableHead>Status</TableHead><TableHead>Customer visibility</TableHead></TableRow></TableHeader><TableBody>{state.vendors.map((vendor) => { const products = state.products.filter((item) => item.vendorId === vendor.id && item.active && item.stock > 0).length; const hasPin = Number.isFinite(vendor.latitude) && Number.isFinite(vendor.longitude); const visible = hasPin && vendor.verification === "Verified" && vendor.operational === "Active" && vendor.openToday && products > 0; return <TableRow key={vendor.id}><TableCell><b>{vendor.businessName}</b><div className="text-xs text-stone-500">{vendor.id}</div></TableCell><TableCell><Select value={vendor.ownerEmail} onValueChange={(email) => { const account = demoAccounts.find((item) => item.email === email)!; setState((current) => ({ ...current, vendors: current.vendors.map((item) => item.id === vendor.id ? { ...item, ownerEmail: email, ownerName: account.name } : item), audit: [audit(session, "Reassigned vendor login", `${vendor.businessName} → ${email}`), ...current.audit] })); toast.success(`Vendor assigned to ${email}`); }}><SelectTrigger className="w-60 rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{demoAccounts.filter((account) => account.role === "vendor").map((account) => <SelectItem key={account.email} value={account.email}>{account.email}</SelectItem>)}</SelectContent></Select><div className="mt-1 text-xs text-stone-500">Sign in with this exact vendor account</div></TableCell><TableCell>{vendor.address}<div className="text-xs text-stone-500">{hasPin ? `${vendor.latitude?.toFixed(5)}, ${vendor.longitude?.toFixed(5)}` : "No store pin"} · {vendor.radiusKm} km radius</div></TableCell><TableCell><Status>{vendor.verification}</Status></TableCell><TableCell>{visible ? <span className="font-black text-[#477f00]">Eligible by store status</span> : <span className="text-xs text-amber-700">Waiting: {!hasPin ? "exact store pin" : vendor.verification !== "Verified" ? "verification" : !vendor.openToday ? "store closed" : products === 0 ? "active product with stock" : "activation"}</span>}</TableCell></TableRow>; })}</TableBody></Table></div> : <Empty icon={UserPlus} title="No vendor has been created yet" body="Start onboarding and assign it to one of the existing vendor login identities." />}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[94vh] overflow-y-auto rounded-[28px] sm:max-w-5xl"><DialogHeader><DialogTitle className="sr-only">Operations vendor onboarding</DialogTitle><DialogDescription className="sr-only">Create a vendor application</DialogDescription></DialogHeader><VendorOnboarding operationsCreated session={session} setState={setState} close={() => setOpen(false)} /></DialogContent></Dialog></div>;
}
function OperationsVerification({ session, state, setState }: { session: DemoSession; state: V3State; setState: React.Dispatch<React.SetStateAction<V3State>> }) {
  async function decide(vendor: Vendor, verification: Verification) {
    try {
      if (isLiveSupabaseMode()) await decideLiveVendorVerification(vendor.id, verification.toLowerCase().replaceAll(" ", "_"));
      setState((s) => ({ ...s, vendors: s.vendors.map((x) => x.id === vendor.id ? { ...x, verification, operational: verification === "Verified" ? "Active" : "Inactive", openToday: verification === "Verified" ? x.openToday : false } : x), notifications: [notice(vendor.ownerEmail, "vendor", `Vendor ${verification.toLowerCase()}`, verification === "Verified" ? "Your store is approved. Open for the day and publish products." : "Review the Operations decision in Verification."), ...s.notifications], audit: [audit(session, `Vendor ${verification.toLowerCase()}`, vendor.businessName), ...s.audit] }));
      toast.success(`${vendor.businessName}: ${verification} saved`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Verification decision could not be saved"); }
  }
  return <div className="space-y-6"><Heading eyebrow="VENDOR TRUST" title="Verification queue" body="Open each vendor to inspect their certification, business location, service radius and fulfilment modes." />{state.vendors.length ? <div className="space-y-3">{state.vendors.map((vendor) => <div key={vendor.id} className="surface-card rounded-[26px] p-5"><div className="flex flex-col gap-4 xl:flex-row xl:items-center"><div className="grid size-12 place-items-center rounded-2xl bg-[#eff7e5] text-[#5ba400]"><Store /></div><div className="flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-black">{vendor.businessName}</h3><Status>{vendor.verification}</Status><Status>{vendor.plan}</Status></div><p className="mt-1 text-xs text-stone-500">{vendor.ownerName} · {vendor.ownerEmail} · {vendor.category}</p><div className="mt-3 grid gap-2 text-sm md:grid-cols-4"><span><b>Address:</b> {vendor.address}</span><span><b>Radius:</b> {vendor.radiusKm} km</span><span><b>Modes:</b> {[vendor.delivery && "Delivery", vendor.pickup && "Pickup"].filter(Boolean).join(" + ")}</span><span><b>Certificate:</b> {vendor.fssaiNumber}</span></div></div>{vendor.verification !== "Verified" && <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => void decide(vendor, "Changes required")} className="rounded-xl">Request changes</Button><Button variant="outline" onClick={() => void decide(vendor, "Rejected")} className="rounded-xl text-red-600">Reject</Button><Button onClick={() => void decide(vendor, "Verified")} className="rounded-xl bg-[#5ba400]"><BadgeCheck />Verify</Button></div>}</div></div>)}</div> : <Empty icon={FileCheck2} title="Verification queue is empty" body="A self-onboarded or Operations-created vendor will appear here." />}</div>;
}
function ItemPricing({ session, state, setState }: { session: DemoSession; state: V3State; setState: React.Dispatch<React.SetStateAction<V3State>> }) { const [vendorId, setVendorId] = useState(state.vendors[0]?.id || ""); const products = state.products.filter((x) => x.vendorId === vendorId); return <div className="space-y-6"><Heading eyebrow="ITEM-LEVEL PRICING" title="Operational percentage by vendor item" body="Select a vendor, inspect its menu and add a percentage on top of each vendor base price. Customer prices update only for future schedules." /><div className="surface-card rounded-[24px] p-4"><Select value={vendorId} onValueChange={setVendorId}><SelectTrigger className="w-full max-w-sm rounded-xl"><SelectValue placeholder="Select vendor" /></SelectTrigger><SelectContent>{state.vendors.map((x) => <SelectItem key={x.id} value={x.id}>{x.businessName}</SelectItem>)}</SelectContent></Select></div>{products.length ? <div className="surface-card overflow-x-auto rounded-[28px]"><Table><TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Vendor base</TableHead><TableHead>Operations %</TableHead><TableHead>Customer price</TableHead></TableRow></TableHeader><TableBody>{products.map((product) => <TableRow key={product.id}><TableCell><b>{product.name}</b><div className="text-xs text-stone-500">per {product.baseUnit}</div></TableCell><TableCell>{money(product.vendorPrice)}</TableCell><TableCell><div className="flex items-center gap-2"><input type="number" min="0" max="100" step=".5" value={state.markups[product.id] || 0} onChange={(e) => { const value = Number(e.target.value); setState((s) => ({ ...s, markups: { ...s.markups, [product.id]: value }, audit: [audit(session, "Updated item percentage", `${product.name} → ${value}%`), ...s.audit] })); }} className="h-10 w-24 rounded-xl border px-3 font-black" />%</div></TableCell><TableCell className="text-lg font-black text-[#ef3d3d]">{money(finalPrice(product, state))}</TableCell></TableRow>)}</TableBody></Table></div> : <Empty icon={Percent} title="No vendor products selected" body="Choose a vendor with products, or wait for a vendor to add their catalogue." />}</div>; }
function RFQDesk({ state }: { state: V3State }) { return <div className="space-y-6"><Heading eyebrow="RFQ CONTROL" title="Monthly requirement desk" body="Monitor open customer requirements, participating vendors and quotation conversion." />{state.requirements.length ? state.requirements.map((req) => <div key={req.id} className="surface-card rounded-[26px] p-5"><div className="flex justify-between"><div><b>{req.title}</b><div className="text-xs text-stone-500">{req.id} · {req.items.length} items</div></div><Status>{req.status}</Status></div><div className="mt-4 text-sm">{state.quotes.filter((x) => x.requirementId === req.id).length} vendor quotations received</div></div>) : <Empty icon={ClipboardCheck} title="No RFQs yet" body="Customer monthly requirements will appear here." />}</div>; }
function Cancellations({ session, state, setState }: { session: DemoSession; state: V3State; setState: React.Dispatch<React.SetStateAction<V3State>> }) {
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  function decide(item: Cancellation, status: "Approved" | "Rejected") {
    const order = state.orders.find((x) => x.id === item.orderId);
    const transaction = state.transactions.find((x) => x.orderId === item.orderId);
    const isQuality = item.kind === "quality_complaint";
    const refundAmount = Math.max(0, Math.min(order?.total ?? Infinity, amounts[item.id] ?? item.recommendedRefundAmount ?? order?.total ?? 0));
    const fullRefund = order ? refundAmount >= order.total : true;
    setState((s) => ({
      ...s,
      cancellations: s.cancellations.map((x) => x.id === item.id ? { ...x, status, recommendedRefundAmount: isQuality ? refundAmount : x.recommendedRefundAmount } : x),
      orders: s.orders.map((x) => x.id === item.orderId ? {
        ...x,
        status: status === "Approved" ? (isQuality ? x.status : "Cancelled") : (isQuality ? x.status : "Confirmed"),
        payment: status === "Approved" && transaction ? (isQuality && !fullRefund ? "Reversal pending" : "Reversal pending") : x.payment,
      } : x),
      transactions: status === "Approved" && transaction ? s.transactions.map((x) => {
        if (x.id !== transaction.id) return x;
        if (x.payoutStatus === "Paid") return { ...x, note: `Already paid to vendor — recover ${money(refundAmount)} manually` };
        if (isQuality && !fullRefund) return { ...x, vendorPayout: Math.max(0, Math.round((x.vendorPayout - refundAmount) * 100) / 100), note: `Vendor payout reduced by ${money(refundAmount)} for an approved quality-complaint refund` };
        return { ...x, payoutStatus: "Reversed", note: isQuality ? "Voided: full refund approved for quality complaint" : "Voided: order cancelled before payout" };
      }) : s.transactions,
      notifications: order ? [
        notice(order.customerEmail, "customer", `${isQuality ? "Quality complaint" : "Cancellation"} ${status.toLowerCase()}`, status === "Approved" ? `Operations approved a refund of ${money(refundAmount)}; it is now processing.` : "Operations reviewed this and did not approve a refund."),
        ...s.notifications,
      ] : s.notifications,
      audit: [audit(session, `${status} ${isQuality ? "quality complaint" : "cancellation"}`, `${item.orderId}${status === "Approved" ? ` · refund ${money(refundAmount)}` : ""}`), ...s.audit],
    }));
    toast.success(`${isQuality ? "Quality complaint" : "Cancellation"} ${status.toLowerCase()}`);
  }
  return <div className="space-y-6"><Heading eyebrow="AI-ASSISTED REVIEW" title="Cancellations & quality-complaint refunds" body="She Agent checks evidence — including a customer-attached photo for quality complaints — and proposes a decision and refund amount first. Operations always owns the final call." />{state.cancellations.length ? state.cancellations.map((item) => { const order = state.orders.find((x) => x.id === item.orderId); const isQuality = item.kind === "quality_complaint"; return <div key={item.id} className="surface-card rounded-[26px] p-5"><div className="flex flex-col gap-4 lg:flex-row"><div className={`grid size-12 place-items-center rounded-2xl ${isQuality ? "bg-amber-50 text-amber-700" : "bg-[#eff7e5] text-[#5ba400]"}`}><Activity /></div><div className="flex-1"><div className="flex flex-wrap items-center gap-2"><b>{item.orderId}</b><Status>{item.status}</Status><Status className={isQuality ? "border-amber-200 bg-amber-50 text-amber-800" : ""}>{isQuality ? "Quality complaint" : "Cancellation"}</Status>{item.attachmentName && <Status>📷 {item.attachmentName}</Status>}</div><p className="mt-2 text-sm text-stone-500">Customer: {item.reason}</p><div className="mt-3 rounded-2xl bg-[#f7f3ed] p-3 text-sm"><b>She Agent: {item.aiDecision}</b> · {item.confidence}% confidence</div>{order && <p className="mt-2 text-xs text-stone-400">Order total {money(order.total)} · current payment {order.payment}</p>}</div>{item.status === "Awaiting operations" && <div className="flex flex-col gap-2 lg:items-end"><Field label="Refund amount (₹)"><input type="number" min={0} max={order?.total ?? undefined} value={amounts[item.id] ?? item.recommendedRefundAmount ?? order?.total ?? 0} onChange={(e) => setAmounts((a) => ({ ...a, [item.id]: Number(e.target.value) }))} className={`${inputClass} w-40`} /></Field><div className="flex gap-2"><Button variant="outline" onClick={() => decide(item, "Rejected")} className="rounded-xl">Reject</Button><Button onClick={() => decide(item, "Approved")} className="rounded-xl bg-[#5ba400]">{isQuality ? "Approve refund" : "Approve & reverse"}</Button></div></div>}</div></div>; }) : <Empty icon={RefreshCcw} title="No cancellation or quality-complaint reviews" body="Customer requests screened by She Agent — including photo-backed quality complaints — will appear here." />}</div>;
}

function vendorPayoutSummary(state: V3State, vendorId: string) {
  const rows = state.transactions.filter((x) => x.vendorId === vendorId);
  const gross = rows.reduce((sum, x) => sum + x.grossAmount, 0);
  const commission = rows.reduce((sum, x) => sum + x.commissionAmount, 0);
  const paidOut = rows.filter((x) => x.payoutStatus === "Paid").reduce((sum, x) => sum + x.vendorPayout, 0);
  const pending = rows.filter((x) => x.payoutStatus === "Scheduled").reduce((sum, x) => sum + x.vendorPayout, 0);
  const overdue = rows.filter((x) => x.payoutStatus === "Scheduled" && x.scheduledPayoutDate <= todayISO());
  const nextPayoutDate = rows.filter((x) => x.payoutStatus === "Scheduled").map((x) => x.scheduledPayoutDate).sort()[0];
  return { rows, gross, commission, paidOut, pending, overdueCount: overdue.length, nextPayoutDate };
}

function VendorSettlements({ vendor, state }: { vendor: Vendor; state: V3State }) {
  const summary = vendorPayoutSummary(state, vendor.id);
  return <div className="space-y-6"><Heading eyebrow="PAYMENTS" title="Settlements & payouts" body="Every customer payment collected on your orders, the platform commission retained and exactly when the remaining amount reaches you." /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Total collected" value={money(summary.gross)} icon={IndianRupee} /><Metric label="Already paid to you" value={money(summary.paidOut)} icon={CheckCircle2} /><Metric label="Pending payout" value={money(summary.pending)} icon={WalletCards} note={summary.nextPayoutDate ? `Next: ${summary.nextPayoutDate}` : undefined} /><Metric label="Platform commission" value={money(summary.commission)} icon={Percent} note={`${PLATFORM_COMMISSION_PERCENT}% per order`} /></div>{summary.overdueCount > 0 && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><AlertTriangle className="mr-2 inline size-4" />{summary.overdueCount} payout(s) have reached their scheduled date and are awaited from Operations.</div>}{summary.rows.length ? <div className="surface-card overflow-x-auto rounded-[28px]"><Table><TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Collected</TableHead><TableHead>Gross</TableHead><TableHead>Commission</TableHead><TableHead>Your payout</TableHead><TableHead>Status</TableHead><TableHead>Expected / paid on</TableHead></TableRow></TableHeader><TableBody>{summary.rows.map((row) => <TableRow key={row.id}><TableCell className="font-mono text-xs">{row.orderId}</TableCell><TableCell>{row.collectedAt}</TableCell><TableCell>{money(row.grossAmount)}</TableCell><TableCell>{money(row.commissionAmount)}</TableCell><TableCell className="font-black">{money(row.vendorPayout)}</TableCell><TableCell><Status className={row.payoutStatus === "Paid" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : row.payoutStatus === "Reversed" ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-800"}>{row.payoutStatus}</Status></TableCell><TableCell>{row.paidAt || row.scheduledPayoutDate}</TableCell></TableRow>)}</TableBody></Table></div> : <Empty icon={WalletCards} title="No payments yet" body="Payouts appear here once a customer pays for one of your orders." />}</div>;
}

function VendorPayments({ state, setState, session, canManage }: { state: V3State; setState: React.Dispatch<React.SetStateAction<V3State>>; session: DemoSession; canManage: boolean }) {
  const rows = state.vendors.map((vendor) => ({ vendor, ...vendorPayoutSummary(state, vendor.id) })).filter((row) => row.rows.length > 0);
  const totals = rows.reduce((acc, row) => ({ gross: acc.gross + row.gross, commission: acc.commission + row.commission, pending: acc.pending + row.pending, paidOut: acc.paidOut + row.paidOut }), { gross: 0, commission: 0, pending: 0, paidOut: 0 });
  function markPaid(vendorId: string) {
    const due = state.transactions.filter((x) => x.vendorId === vendorId && x.payoutStatus === "Scheduled" && x.scheduledPayoutDate <= todayISO());
    if (!due.length) return toast.error("No payouts have reached their scheduled date yet");
    const vendor = state.vendors.find((x) => x.id === vendorId);
    const total = due.reduce((sum, x) => sum + x.vendorPayout, 0);
    setState((s) => ({
      ...s,
      transactions: s.transactions.map((x) => due.some((d) => d.id === x.id) ? { ...x, payoutStatus: "Paid", paidAt: todayISO() } : x),
      notifications: vendor ? [notice(vendor.ownerEmail, "vendor", "Payout sent", `${money(total)} across ${due.length} order(s) was marked paid.`), ...s.notifications] : s.notifications,
      audit: [audit(session, "Marked vendor payout as paid", `${vendor?.businessName || vendorId} · ${money(total)} · ${due.length} order(s)`), ...s.audit],
    }));
    toast.success(`${money(total)} marked paid to ${vendor?.businessName || "vendor"}`);
  }
  function downloadLedger() {
    downloadWorkbook("sheplates-vendor-payments", [{
      name: "Vendor payments",
      rows: rows.flatMap((row) => row.rows.map((t) => ({ Vendor: row.vendor.businessName, "Order ID": t.orderId, "Collected on": t.collectedAt, "Gross amount": t.grossAmount, "Commission %": t.commissionPercent, "Commission amount": t.commissionAmount, "Vendor payout": t.vendorPayout, "Payout status": t.payoutStatus, "Expected / paid date": t.paidAt || t.scheduledPayoutDate }))),
    }]);
  }
  return <div className="space-y-6"><Heading eyebrow="VENDOR SETTLEMENTS" title="Vendor-wise income & payouts" body={canManage ? "See exactly what each vendor earned, the platform's commission profit, and release payouts once they reach their scheduled date." : "Read-only oversight of vendor income, platform profit and payout status across the marketplace."} action={<Button variant="outline" onClick={downloadLedger} className="rounded-xl"><Download />Download Excel</Button>} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Total collected (GMV)" value={money(totals.gross)} icon={IndianRupee} /><Metric label="Platform profit (commission)" value={money(totals.commission)} icon={Percent} /><Metric label="Pending vendor payouts" value={money(totals.pending)} icon={WalletCards} /><Metric label="Already paid to vendors" value={money(totals.paidOut)} icon={CheckCircle2} /></div>
    {rows.length ? <div className="surface-card overflow-x-auto rounded-[28px]"><Table><TableHeader><TableRow><TableHead>Vendor</TableHead><TableHead>Income (gross)</TableHead><TableHead>Platform profit</TableHead><TableHead>Paid to vendor</TableHead><TableHead>Pending payout</TableHead><TableHead>Next payout</TableHead><TableHead>Status</TableHead>{canManage && <TableHead>Action</TableHead>}</TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.vendor.id}><TableCell><b>{row.vendor.businessName}</b><div className="text-xs text-stone-500">{row.vendor.ownerEmail}</div></TableCell><TableCell className="font-black">{money(row.gross)}</TableCell><TableCell className="text-[#5ba400] font-black">{money(row.commission)}</TableCell><TableCell>{money(row.paidOut)}</TableCell><TableCell>{money(row.pending)}</TableCell><TableCell>{row.nextPayoutDate || "—"}</TableCell><TableCell>{row.overdueCount > 0 ? <Status className="border-amber-200 bg-amber-50 text-amber-800">Payout due</Status> : row.pending > 0 ? <Status className="border-sky-200 bg-sky-50 text-sky-700">Scheduled</Status> : <Status className="border-emerald-200 bg-emerald-50 text-emerald-700">Paid up</Status>}</TableCell>{canManage && <TableCell><Button size="sm" disabled={row.overdueCount === 0} onClick={() => markPaid(row.vendor.id)} className="rounded-xl bg-[#5ba400] disabled:opacity-40"><WalletCards />Mark payout paid</Button></TableCell>}</TableRow>)}</TableBody></Table></div> : <Empty icon={WalletCards} title="No vendor payments yet" body="Vendor income and payouts will appear here once customers start paying for orders." />}
  </div>;
}

function AdminArea({ active, session, state, setState }: { active: string; session: DemoSession; state: V3State; setState: React.Dispatch<React.SetStateAction<V3State>> }) {
  if (active === "AI insights") return <AIInsights role="admin" state={state} />;
  if (active === "Homepage & campaigns") return <HomepageCampaigns session={session} state={state} setState={setState} />;
  if (active === "Users") return <UsersView session={session} state={state} setState={setState} />;
  if (active === "Vendors") return <AdminVendors state={state} setState={setState} />;
  if (active === "Vendor plans") return <Plans state={state} setState={setState} />;
  if (active === "Pricing policies") return <AdminPricing state={state} />;
  if (active === "Ticket centre") return <TicketCentre session={session} state={state} setState={setState} mode="oversight" />;
  if (active === "Vendor payments") return <VendorPayments state={state} setState={setState} session={session} canManage={false} />;
  if (active === "Reports") return <ReportsCentre state={state} />;
  if (active === "Audit log") return <AuditLog items={state.audit} />;
  const revenue = state.orders.reduce((sum, x) => sum + x.total, 0), markup = state.products.reduce((sum, x) => sum + (finalPrice(x, state) - x.vendorPrice), 0);
  return <div className="space-y-7"><Heading eyebrow="SUPER ADMIN" title="Platform executive view" body="Commercial, trust, access and operating metrics across the complete ShePlates platform." /><div className="sp-mobile-metric-grid grid gap-4 sm:grid-cols-2 xl:grid-cols-6"><Metric label="Customers onboarded" value={String(state.customers.length)} icon={Users} /><Metric label="Vendors" value={String(state.vendors.length)} icon={Store} /><Metric label="Verified" value={String(state.vendors.filter((x) => x.verification === "Verified").length)} icon={BadgeCheck} /><Metric label="Products" value={String(state.products.length)} icon={ShoppingBag} /><Metric label="Order value" value={money(revenue)} icon={IndianRupee} /><Metric label="Markup potential" value={money(markup)} icon={Percent} /></div><div className="grid gap-5 xl:grid-cols-2"><div className="surface-card rounded-[28px] p-6"><h3 className="font-black">Marketplace funnel</h3><div className="mt-5 space-y-3"><Review label="Customer profiles" value={String(state.customers.length)} /><Review label="Verified / total vendors" value={`${state.vendors.filter((x) => x.verification === "Verified").length} / ${state.vendors.length}`} /><Review label="Open stores" value={String(state.vendors.filter((x) => x.openToday).length)} /><Review label="Schedules" value={String(state.schedules.length)} /><Review label="Orders completed" value={String(state.orders.filter((x) => x.status === "Completed").length)} /><Review label="RFQs awarded" value={String(state.requirements.filter((x) => x.status === "Awarded").length)} /></div></div><div className="surface-dark rounded-[28px] p-6 text-white"><Activity className="text-[#91c747]" /><h3 className="mt-4 text-xl font-black">Platform-wide She Agent</h3><p className="mt-2 text-sm leading-6 text-white/55">Super Admin can ask across role counts, vendor plans, audit activity, order health and marketplace performance. Sensitive actions still require explicit human confirmation.</p></div></div></div>;
}
function HomepageCampaigns({ session, state, setState }: { session: DemoSession; state: V3State; setState: React.Dispatch<React.SetStateAction<V3State>> }) {
  const [busy, setBusy] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manual, setManual] = useState({ name: "", audience: "", offer: "", channel: "In-app" });
  const [suggestions, setSuggestions] = useState<Array<{ name: string; audience: string; offer: string; rationale: string; channel: string }>>([]);
  const eligibleProducts = state.products.filter((product) => product.active && product.stock > 0).slice(0, 80);
  const featured = state.merchandising.featuredProductIds;
  async function saveHome(next = state.merchandising) {
    // Persist first: the UI must not show a featured product as saved when the write
    // actually failed (this previously happened silently whenever platform_settings
    // was missing/unreachable — the toggle looked successful and reverted on next load
    // with no explanation).
    if (isLiveSupabaseMode()) {
      try { await saveLiveMarketplaceHome(next); }
      catch (error) { toast.error(error instanceof Error ? error.message : "Marketplace settings could not be saved"); return; }
    }
    setState((current) => ({ ...current, merchandising: next, merchandisingError: null, audit: [audit(session, "Updated customer marketplace merchandising", `${next.featuredProductIds.length} featured products · AI popup ${next.recommendationPopupEnabled ? "on" : "off"}`), ...current.audit] }));
    toast.success(isLiveSupabaseMode() ? "Marketplace home settings saved" : "Marketplace home settings saved locally");
  }
  function toggleFeatured(productId: string) {
    const already = featured.includes(productId);
    if (!already && featured.length >= state.merchandising.maxFeatured) return toast.error(`Choose up to ${state.merchandising.maxFeatured} featured products`);
    const next = { ...state.merchandising, featuredProductIds: already ? featured.filter((id) => id !== productId) : [...featured, productId] };
    void saveHome(next);
  }
  async function generateCampaigns() {
    setBusy(true);
    try {
      const token = await getAccessToken();
      const response = await fetch("/api/agent", { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ task: "campaign_strategy", message: "Analyse current marketplace and purchase behaviour and suggest responsible campaigns for useful customer segments.", role: "admin" }) });
      const json = await response.json() as { result?: { campaigns?: Array<{ name: string; audience: string; offer: string; rationale: string; channel: string }> }; error?: string };
      if (!response.ok) throw new Error(json.error || "AI campaign analysis failed");
      const result = json.result?.campaigns || [];
      if (result.length) setSuggestions(result);
      else {
        const topCategory = [...state.products].sort((a,b) => b.stock - a.stock)[0]?.category || "Groceries";
        setSuggestions([{ name: `${topCategory} discovery`, audience: `Customers who have not purchased ${topCategory} recently`, offer: "Personalised discovery bundle or limited introductory offer", rationale: "Uses non-sensitive commerce behaviour only and gives customers a relevant reason to explore an available category.", channel: "In-app + WhatsApp opt-in" }]);
      }
    } catch (error) { toast.error(error instanceof Error ? error.message : "Campaign suggestions could not be generated"); }
    finally { setBusy(false); }
  }
  async function createDraft(suggestion: { name: string; audience: string; offer: string; rationale: string; channel: string }) {
    const draft: Campaign = { id: id("CMP"), name: suggestion.name, audience: suggestion.audience, offer: suggestion.offer, channel: suggestion.channel, status: "Draft", aiRationale: suggestion.rationale, createdAt: now() };
    try {
      let final = draft;
      if (isLiveSupabaseMode()) { const liveId = await saveLiveCampaign({ name: draft.name, audience: draft.audience, offer: draft.offer, channel: draft.channel, status: draft.status, aiRationale: draft.aiRationale }); final = { ...draft, id: liveId }; }
      setState((current) => ({ ...current, campaigns: [final, ...current.campaigns.filter((campaign) => campaign.id !== final.id)], audit: [audit(session, "Created campaign draft", `${final.name} · ${final.audience}`), ...current.audit] }));
      toast.success("Campaign saved as a draft for human review");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Campaign could not be saved"); }
  }
  async function updateCampaign(campaign: Campaign, status: Campaign["status"]) {
    const next = { ...campaign, status };
    try { if (isLiveSupabaseMode()) await saveLiveCampaign({ id: campaign.id, name: campaign.name, audience: campaign.audience, offer: campaign.offer, channel: campaign.channel, status, aiRationale: campaign.aiRationale }); setState((current) => ({ ...current, campaigns: current.campaigns.map((item) => item.id === campaign.id ? next : item) })); toast.success(`Campaign ${status.toLowerCase()}`); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Campaign could not be updated"); }
  }
  return <div className="space-y-7"><Heading eyebrow="MARKETPLACE GROWTH" title="Homepage & campaigns" body="Super Admin controls which products are featured on the customer marketplace, can create offers manually, and can ask AI to propose behaviour-based campaigns. AI never sends a campaign automatically; a human approves every activation." action={<div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setManualOpen(true)} className="rounded-xl"><Plus />Create campaign</Button><Button onClick={generateCampaigns} disabled={busy} className="rounded-xl bg-[#171914]"><Sparkles />{busy ? "Analysing…" : "AI suggest campaigns"}</Button></div>} />
    {state.merchandisingError && <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><AlertTriangle className="mt-0.5 size-5 shrink-0" /><div><b>Homepage merchandising is not connected to the database.</b><p className="mt-1 leading-5">Featuring a product will not save and featured products will not appear to customers until this is fixed. Ask an engineer to run <code className="rounded bg-red-100 px-1 py-0.5 font-mono text-xs">supabase/V4_6_AGENTIC_COMMERCE.sql</code> in the Supabase SQL Editor. Database says: “{state.merchandisingError}”.</p></div></div>}
    <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]"><section className="surface-card rounded-[28px] p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-black">Customer home merchandising</h3><p className="mt-1 text-sm text-stone-500">Feature up to {state.merchandising.maxFeatured} active products. Featured products appear before algorithmic recommendations.</p></div><label className="flex items-center gap-2 rounded-full bg-[#f2f7eb] px-3 py-2 text-xs font-black text-[#50772a]"><Switch checked={state.merchandising.recommendationPopupEnabled} onCheckedChange={(value) => void saveHome({ ...state.merchandising, recommendationPopupEnabled: value })} />AI recommendation popup</label></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{eligibleProducts.map((product) => { const selected = featured.includes(product.id); const vendor = state.vendors.find((item) => item.id === product.vendorId); return <button key={product.id} onClick={() => toggleFeatured(product.id)} className={`rounded-[22px] border p-3 text-left transition ${selected ? "border-[#5f8f2d] bg-[#f2f7eb] ring-2 ring-[#5f8f2d]/10" : "bg-white hover:border-stone-300"}`}><div className="flex items-center gap-3"><div className="grid size-12 place-items-center overflow-hidden rounded-xl bg-[#f4f7ef] text-2xl">{product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" /> : product.emoji}</div><div className="min-w-0 flex-1"><div className="truncate font-black">{product.name}</div><div className="truncate text-xs text-stone-500">{vendor?.businessName || "Vendor"} · {money(finalPrice(product, state))}</div></div><span className={`grid size-6 place-items-center rounded-full ${selected ? "bg-[#5f8f2d] text-white" : "border"}`}>{selected ? <Check className="size-3" /> : <Plus className="size-3" />}</span></div></button>; })}</div>{!eligibleProducts.length && <Empty icon={ShoppingBag} title="No active products" body="Verify vendors and publish products before choosing homepage features." />}</section>
      <section className="surface-dark rounded-[28px] p-6 text-white"><Megaphone className="text-[#a8db69]" /><h3 className="mt-4 text-xl font-black">AI campaign guardrails</h3><p className="mt-2 text-sm leading-6 text-white/60">Campaign suggestions use commerce behaviour such as category affinity, purchase recency, frequency and budget bands. ShePlates does not ask AI to infer sensitive personal traits. Every draft requires Super Admin approval before activation.</p><div className="mt-5 space-y-2 text-xs text-white/70"><div className="rounded-xl bg-white/8 p-3">✓ Behavioural segmentation only</div><div className="rounded-xl bg-white/8 p-3">✓ Offers remain editable</div><div className="rounded-xl bg-white/8 p-3">✓ No automatic send or payment action</div></div></section></div>
    {suggestions.length > 0 && <section><div className="flex items-end justify-between"><div><p className="text-xs font-black uppercase tracking-[.16em] text-[#5f8f2d]">AI suggestions</p><h3 className="mt-1 text-2xl font-black">Campaign drafts to consider</h3></div><button onClick={() => setSuggestions([])} className="text-xs font-black text-stone-500">Clear suggestions</button></div><div className="mt-4 grid gap-4 lg:grid-cols-3">{suggestions.map((suggestion, index) => <div key={`${suggestion.name}-${index}`} className="surface-card rounded-[26px] p-5"><div className="flex items-center gap-2"><Sparkles className="size-4 text-[#5f8f2d]" /><Status>AI proposed</Status></div><h4 className="mt-3 text-lg font-black">{suggestion.name}</h4><div className="mt-4 space-y-3 text-sm"><Review label="Audience" value={suggestion.audience} /><Review label="Offer" value={suggestion.offer} /><Review label="Channel" value={suggestion.channel} /></div><p className="mt-4 rounded-xl bg-[#f8f5ef] p-3 text-xs leading-5 text-stone-600">{suggestion.rationale}</p><Button onClick={() => void createDraft(suggestion)} className="mt-4 w-full rounded-xl bg-[#5f8f2d]"><Plus />Save as draft</Button></div>)}</div></section>}
    <section className="surface-card overflow-hidden rounded-[28px]"><div className="flex items-center justify-between p-5 pb-2"><div><h3 className="font-black">Campaign control</h3><p className="text-xs text-stone-500">Only activate after reviewing audience, offer, stock and fulfilment capacity.</p></div></div>{state.campaigns.length ? <Table><TableHeader><TableRow><TableHead>Campaign</TableHead><TableHead>Audience</TableHead><TableHead>Offer</TableHead><TableHead>Channel</TableHead><TableHead>Status</TableHead><TableHead>Control</TableHead></TableRow></TableHeader><TableBody>{state.campaigns.map((campaign) => <TableRow key={campaign.id}><TableCell><b>{campaign.name}</b><div className="mt-1 max-w-xs text-xs text-stone-500">{campaign.aiRationale}</div></TableCell><TableCell>{campaign.audience}</TableCell><TableCell>{campaign.offer}</TableCell><TableCell>{campaign.channel}</TableCell><TableCell><Status>{campaign.status}</Status></TableCell><TableCell><Select value={campaign.status} onValueChange={(value) => void updateCampaign(campaign, value as Campaign["status"])}><SelectTrigger className="w-28"><SelectValue /></SelectTrigger><SelectContent>{["Draft","Active","Paused"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></TableCell></TableRow>)}</TableBody></Table> : <div className="p-5"><Empty icon={Megaphone} title="No campaigns yet" body="Ask AI for responsible segment ideas or create a campaign after you identify a business need." /></div>}</section>
    <Dialog open={manualOpen} onOpenChange={setManualOpen}><DialogContent className="rounded-[28px] sm:max-w-lg"><DialogHeader><DialogTitle className="text-xl font-black">Create campaign draft</DialogTitle><DialogDescription>Define a commerce-behaviour audience and offer. The campaign stays Draft until you explicitly activate it.</DialogDescription></DialogHeader><div className="space-y-4"><Field label="Campaign name"><input value={manual.name} onChange={(event) => setManual((current) => ({ ...current, name: event.target.value }))} className={inputClass} placeholder="Weekend breakfast discovery" /></Field><Field label="Audience"><Textarea value={manual.audience} onChange={(event) => setManual((current) => ({ ...current, audience: event.target.value }))} className="rounded-xl" placeholder="Customers who bought milk in the last 30 days but not breakfast products" /></Field><Field label="Offer"><input value={manual.offer} onChange={(event) => setManual((current) => ({ ...current, offer: event.target.value }))} className={inputClass} placeholder="₹50 off a breakfast bundle above ₹299" /></Field><Field label="Channel"><Select value={manual.channel} onValueChange={(value) => setManual((current) => ({ ...current, channel: value }))}><SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{["In-app","WhatsApp opt-in","Email opt-in","In-app + WhatsApp opt-in"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></Field><Button onClick={async () => { if (!manual.name.trim() || !manual.audience.trim() || !manual.offer.trim()) return toast.error("Add campaign name, audience and offer"); await createDraft({ ...manual, rationale: "Created manually by Super Admin for human-reviewed commerce targeting." }); setManual({ name: "", audience: "", offer: "", channel: "In-app" }); setManualOpen(false); }} className="h-11 w-full rounded-xl bg-[#5f8f2d]"><Check />Save draft</Button></div></DialogContent></Dialog>
  </div>;
}

function UsersView({ session, state, setState }: { session: DemoSession; state: V3State; setState: React.Dispatch<React.SetStateAction<V3State>> }) {
  const [open, setOpen] = useState(false);
  const live = isSupabaseConfigured();
  return <div className="space-y-6">
    <Heading eyebrow="ACCESS" title="Team & user access" body="Only Super Admin can create logins for the Operations team from this portal. New accounts sign in from the Vendor / Team entry point." action={<Button onClick={() => setOpen(true)} className="rounded-xl bg-[#ef3d3d]"><UserCog />Create user</Button>} />
    <div className="surface-card rounded-[22px] border border-sky-200/70 bg-sky-50/85 p-4 text-sm leading-6 text-sky-900">{live ? "Live account access is connected — new users are created as active role-based accounts." : "Live account access is not connected in this deployment, so new users are created as local test accounts for testing."}</div>
    <div className="surface-card overflow-x-auto rounded-[28px]"><div className="p-5 pb-0 text-sm font-black">Team accounts created from this portal</div>{state.staffAccounts.length ? <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Created by</TableHead><TableHead>Created</TableHead><TableHead>Mode</TableHead></TableRow></TableHeader><TableBody>{state.staffAccounts.map((account) => <TableRow key={account.id}><TableCell><b>{account.name}</b></TableCell><TableCell>{account.email}</TableCell><TableCell className="capitalize">{account.role}</TableCell><TableCell>{account.createdBy}</TableCell><TableCell>{account.createdAt}</TableCell><TableCell><Status className={account.mode === "live" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : ""}>{account.mode === "live" ? "Live account" : "Local test"}</Status></TableCell></TableRow>)}</TableBody></Table> : <div className="p-5"><Empty icon={UserCog} title="No team users created yet" body="Use Create user to give Operations teammates their own login." /></div>}</div>
    <div className="surface-card overflow-x-auto rounded-[28px]"><div className="p-5 pb-0 text-sm font-black">Demo login identities (testing only)</div><Table><TableHeader><TableRow><TableHead>User</TableHead><TableHead>Role</TableHead><TableHead>Purpose</TableHead><TableHead>Password</TableHead></TableRow></TableHeader><TableBody>{demoAccounts.map((account) => <TableRow key={account.email}><TableCell><b>{account.name}</b><div className="text-xs text-stone-500">{account.email}</div></TableCell><TableCell className="capitalize">{account.role}</TableCell><TableCell>{account.detail}</TableCell><TableCell className="font-mono text-xs">{account.password}</TableCell></TableRow>)}</TableBody></Table></div>
    <CreateUserDialog open={open} close={() => setOpen(false)} session={session} setState={setState} live={live} />
  </div>;
}

function CreateUserDialog({ open, close, session, setState, live }: { open: boolean; close: () => void; session: DemoSession; setState: React.Dispatch<React.SetStateAction<V3State>>; live: boolean }) {
  const [name, setName] = useState(""), [email, setEmail] = useState(""), [role, setRole] = useState<"operations" | "admin">("operations"), [busy, setBusy] = useState(false);
  const [issuedPassword, setIssuedPassword] = useState<{ email: string; password: string } | null>(null);
  const [showPassword, setShowPassword] = useState(true);
  async function create() {
    if (!name.trim() || !/^\S+@\S+\.\S+$/.test(email)) return toast.error("Enter a valid name and email address");
    setBusy(true);
    try {
      let password: string;
      let mode: "live" | "local";
      if (live) {
        const result = await createStaffUser({ name: name.trim(), email: email.trim().toLowerCase(), role });
        password = result.temporaryPassword; mode = "live";
      } else {
        password = generatePassword(); mode = "local";
        const existing = readLocalStaffAccounts();
        if (existing.some((x) => x.email.toLowerCase() === email.trim().toLowerCase())) throw new Error("A local test account with this email already exists");
        writeLocalStaffAccounts([...existing, { id: id("USR"), email: email.trim().toLowerCase(), name: name.trim(), role, password, createdBy: session.email, createdAt: now(), mode: "local", active: true }]);
      }
      const account: StaffAccount = { id: id("USR"), email: email.trim().toLowerCase(), name: name.trim(), role, createdBy: session.email, createdAt: now(), mode, active: true };
      setState((s) => ({ ...s, staffAccounts: [account, ...s.staffAccounts], audit: [audit(session, "Created team user", `${account.name} · ${account.email} · ${role}`), ...s.audit] }));
      setIssuedPassword({ email: account.email, password });
      toast.success(`${account.email} created as ${role}`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "User could not be created"); }
    finally { setBusy(false); }
  }
  function reset() { setName(""); setEmail(""); setRole("operations"); setIssuedPassword(null); setShowPassword(true); close(); }
  return <Dialog open={open} onOpenChange={(value) => !value && reset()}><DialogContent className="rounded-[26px] sm:max-w-md"><DialogHeader><DialogTitle className="text-xl font-black">Create a team user</DialogTitle><DialogDescription>Only Super Admin can create Operations (or additional Super Admin) logins.</DialogDescription></DialogHeader>
    {issuedPassword ? <div className="space-y-4">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><CheckCircle2 className="mb-2 inline size-5" /><p><b>{issuedPassword.email}</b> was created.</p><p className="mt-1">Share this temporary password securely — it will not be shown again.</p></div>
      <div className="surface-card-muted flex items-center gap-2 rounded-xl p-3 font-mono text-sm"><span className="flex-1">{showPassword ? issuedPassword.password : "•".repeat(issuedPassword.password.length)}</span><button onClick={() => setShowPassword((v) => !v)}>{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button><button onClick={() => { navigator.clipboard?.writeText(issuedPassword.password); toast.success("Password copied"); }}><Copy className="size-4" /></button></div>
      <Button onClick={reset} className="h-11 w-full rounded-xl bg-[#5ba400] font-black">Done</Button>
    </div> : <div className="space-y-4">
      <Field label="Full name"><input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} /></Field>
      <Field label="Work email"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} /></Field>
      <Field label="Role"><Select value={role} onValueChange={(v) => setRole(v as "operations" | "admin")}><SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="operations">Operations</SelectItem><SelectItem value="admin">Super admin</SelectItem></SelectContent></Select></Field>
      <Button onClick={() => void create()} disabled={busy} className="h-11 w-full rounded-xl bg-[#ef3d3d] font-black">{busy ? "Creating…" : "Create user"}</Button>
    </div>}
  </DialogContent></Dialog>;
}
function AdminVendors({ state, setState }: { state: V3State; setState: React.Dispatch<React.SetStateAction<V3State>> }) { return <div className="space-y-6"><Heading eyebrow="VENDOR GOVERNANCE" title="All vendors" body="Inspect verification, operating mode, radius, product count and subscription plan." />{state.vendors.length ? <div className="surface-card overflow-x-auto rounded-[28px]"><Table><TableHeader><TableRow><TableHead>Vendor</TableHead><TableHead>Trust</TableHead><TableHead>Daily service</TableHead><TableHead>Products</TableHead><TableHead>Plan</TableHead></TableRow></TableHeader><TableBody>{state.vendors.map((vendor) => <TableRow key={vendor.id}><TableCell><b>{vendor.businessName}</b><div className="text-xs text-stone-500">{vendor.ownerEmail}</div></TableCell><TableCell><Status>{vendor.verification}</Status></TableCell><TableCell>{vendor.openToday ? "Open" : "Closed"} · {vendor.radiusKm} km</TableCell><TableCell>{state.products.filter((x) => x.vendorId === vendor.id).length}</TableCell><TableCell><Select value={vendor.plan} onValueChange={(value) => setState((s) => ({ ...s, vendors: s.vendors.map((x) => x.id === vendor.id ? { ...x, plan: value as Vendor["plan"] } : x) }))}><SelectTrigger className="w-32 rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{["Launch", "Growth", "Premium"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></TableCell></TableRow>)}</TableBody></Table></div> : <Empty icon={Store} title="No vendors" body="Self-onboard a vendor or ask Operations to create one." />}</div>; }
function Plans({ state, setState }: { state: V3State; setState: React.Dispatch<React.SetStateAction<V3State>> }) { return <div className="space-y-6"><Heading eyebrow="VENDOR SUBSCRIPTIONS" title="Plans and future pricing" body="Customers are not subscribed. Vendor entitlements are ready; monthly charges can be decided later." /><div className="grid gap-4 lg:grid-cols-3">{[{ name: "Launch", text: "Profile, catalogue, schedules and fulfilment" }, { name: "Growth", text: "Delivery team, analytics and operational tools" }, { name: "Premium", text: "Customer RFQ opportunities and AI-assisted quotations" }].map((plan) => <div key={plan.name} className="surface-card rounded-[28px] p-6"><div className="flex justify-between"><h3 className="text-xl font-black">{plan.name}</h3><Switch defaultChecked /></div><div className="mt-5 text-2xl font-black">Price later</div><p className="mt-3 text-sm leading-6 text-stone-500">{plan.text}</p></div>)}</div><AdminVendors state={state} setState={setState} /></div>; }
function AdminPricing({ state }: { state: V3State }) { return <div className="space-y-6"><Heading eyebrow="PRICING GOVERNANCE" title="Published item percentages" body="Operations owns per-item percentages; Super Admin can inspect the full policy footprint." />{state.products.length ? <div className="surface-card overflow-x-auto rounded-[28px]"><Table><TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Vendor base</TableHead><TableHead>Operations %</TableHead><TableHead>Customer price</TableHead></TableRow></TableHeader><TableBody>{state.products.map((x) => <TableRow key={x.id}><TableCell><b>{x.name}</b></TableCell><TableCell>{money(x.vendorPrice)}</TableCell><TableCell>{state.markups[x.id] || 0}%</TableCell><TableCell className="font-black">{money(finalPrice(x, state))}</TableCell></TableRow>)}</TableBody></Table></div> : <Empty icon={Percent} title="No product pricing" body="Pricing rows appear after vendors add products." />}</div>; }
function AuditLog({ items }: { items: Audit[] }) {
  function download() { downloadWorkbook("sheplates-audit-log", [{ name: "Audit log", rows: items.map((item) => ({ ID: item.id, Actor: item.actor, Action: item.action, Detail: item.detail, "At": item.at })) }]); }
  return <div className="space-y-6"><Heading eyebrow="AUDITABILITY" title="Platform activity trail" body="Verification, pricing, catalogue, schedule and order actions are recorded for governance." action={<Button variant="outline" onClick={download} disabled={!items.length} className="rounded-xl"><Download />Download Excel</Button>} />{items.length ? <div className="surface-card divide-y rounded-[28px]">{items.map((item) => <div key={item.id} className="flex gap-3 p-5"><div className="mt-1 size-2 rounded-full bg-[#ef3d3d]" /><div><b className="text-sm">{item.action}</b><div className="mt-1 text-xs text-stone-500">{item.detail}</div><div className="mt-1 text-[11px] text-stone-400">{item.actor} · {item.at}</div></div></div>)}</div> : <Empty icon={Activity} title="No audit events" body="Actions across the new data flow will appear here." />}</div>;
}

type ReportKey = "orders" | "zoho_orders" | "payments" | "tickets" | "vendors" | "cancellations" | "customers";
const reportDefinitions: { key: ReportKey; label: string; dateField: string }[] = [
  { key: "orders", label: "Orders", dateField: "date" },
  { key: "zoho_orders", label: "Zoho Books daily order export", dateField: "date" },
  { key: "payments", label: "Vendor payments", dateField: "collectedAt" },
  { key: "tickets", label: "Support tickets", dateField: "at" },
  { key: "vendors", label: "Vendor directory", dateField: "" },
  { key: "cancellations", label: "Cancellations", dateField: "" },
  { key: "customers", label: "Customers", dateField: "" },
];
function buildReportRows(key: ReportKey, state: V3State, from: string, to: string): Record<string, unknown>[] {
  const inRange = (value?: string) => { if (!value) return true; const day = value.slice(0, 10); if (from && day < from) return false; if (to && day > to) return false; return true; };
  if (key === "orders") return state.orders.filter((o) => inRange(o.date)).map((o) => ({ "Order ID": o.id, Customer: o.customerEmail, Vendor: state.vendors.find((v) => v.id === o.vendorId)?.businessName || o.vendorId, Description: o.description, Total: o.total, Date: o.date, Slot: o.slot, Status: o.status, Payment: o.payment }));
  if (key === "zoho_orders") return state.orders.filter((o) => o.payment === "Paid" && inRange(o.date)).map((o) => ({ "Reference Number": o.id, "Customer Name": o.customerEmail, "Order Date": o.date, "Item Name": o.description, Quantity: o.quantity, Rate: o.quantity ? Math.round((o.total / o.quantity) * 100) / 100 : o.total, "Line Total": o.total, "Payment Status": o.payment, "Fulfilment Status": o.status, Vendor: state.vendors.find((v) => v.id === o.vendorId)?.businessName || o.vendorId, "Delivery Slot": o.slot }));
  if (key === "payments") return state.transactions.filter((t) => inRange(t.collectedAt)).map((t) => ({ "Order ID": t.orderId, Vendor: state.vendors.find((v) => v.id === t.vendorId)?.businessName || t.vendorId, "Collected on": t.collectedAt, Gross: t.grossAmount, Commission: t.commissionAmount, "Vendor payout": t.vendorPayout, Status: t.payoutStatus, "Expected / paid": t.paidAt || t.scheduledPayoutDate }));
  if (key === "tickets") return state.tickets.filter((t) => inRange(t.at)).map((t) => ({ "Ticket ID": t.id, "Raised by": t.creatorEmail, Role: t.creatorRole, Category: t.category, Subject: t.subject, Status: t.status, "Created via": t.createdVia, At: t.at }));
  if (key === "vendors") return state.vendors.map((v) => ({ Vendor: v.businessName, Owner: v.ownerEmail, Category: v.category, Verification: v.verification, Operational: v.operational, Plan: v.plan, "Open today": v.openToday ? "Yes" : "No", "Radius (km)": v.radiusKm }));
  if (key === "cancellations") return state.cancellations.map((c) => ({ "Cancellation ID": c.id, "Order ID": c.orderId, Customer: c.customerEmail, Reason: c.reason, "AI decision": c.aiDecision, "Confidence %": c.confidence, Status: c.status }));
  return state.customers.map((c) => ({ Email: c.email, Address: c.address, "Household size": c.householdSize, Diet: c.diet, Allergies: c.allergies.join(", "), Goals: c.goals.join(", ") }));
}
function ReportsCentre({ state }: { state: V3State }) {
  const [key, setKey] = useState<ReportKey>("orders");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const definition = reportDefinitions.find((x) => x.key === key)!;
  const rows = buildReportRows(key, state, from, to);
  function download() { downloadWorkbook(`sheplates-${key}-report`, [{ name: definition.label, rows }]); toast.success(`${definition.label} report downloaded (${rows.length} row(s))`); }
  return <div className="space-y-6"><Heading eyebrow="REPORTING" title="Custom reports" body="Choose a dataset, narrow it by date if needed, then download it as an Excel workbook for offline analysis or sharing." />
    <div className="surface-card grid gap-4 rounded-[28px] p-5 lg:grid-cols-[1.2fr_.8fr_.8fr_auto]">
      <Field label="Report"><Select value={key} onValueChange={(v) => setKey(v as ReportKey)}><SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{reportDefinitions.map((r) => <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>)}</SelectContent></Select></Field>
      <Field label="From" hint={definition.dateField ? undefined : "Not date-filterable"}><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} disabled={!definition.dateField} className={inputClass} /></Field>
      <Field label="To"><input type="date" value={to} onChange={(e) => setTo(e.target.value)} disabled={!definition.dateField} className={inputClass} /></Field>
      <div className="flex items-end"><Button onClick={download} className="h-11 w-full rounded-xl bg-[#ef3d3d] font-black hover:bg-[#d92f2f]"><Download />Download Excel</Button></div>
    </div>
    <div className="surface-card rounded-[28px] p-5"><div className="flex items-center justify-between"><h3 className="font-black">{definition.label} preview</h3><Status>{rows.length} row(s)</Status></div>{rows.length ? <div className="mt-4 overflow-x-auto"><Table><TableHeader><TableRow>{Object.keys(rows[0]).map((column) => <TableHead key={column}>{column}</TableHead>)}</TableRow></TableHeader><TableBody>{rows.slice(0, 8).map((row, index) => <TableRow key={index}>{Object.keys(rows[0]).map((column) => <TableCell key={column}>{String(row[column] ?? "")}</TableCell>)}</TableRow>)}</TableBody></Table>{rows.length > 8 && <p className="mt-2 text-xs text-stone-400">Showing 8 of {rows.length} rows. Download the Excel file for the full dataset.</p>}</div> : <Empty icon={FileSpreadsheet} title="No rows for this selection" body="Widen the date range or choose a different report." />}</div>
  </div>;
}

function NotificationDrawer({ open, setOpen, session, state, setState }: { open: boolean; setOpen: (v: boolean) => void; session: DemoSession; state: V3State; setState: React.Dispatch<React.SetStateAction<V3State>> }) { const items = state.notifications.filter((item) => notificationBelongsToSession(item, session)); async function enable() { if (!("Notification" in window)) return toast.error("Notifications are unavailable in this browser"); const permission = await Notification.requestPermission(); if (permission === "granted") { new Notification("ShePlates notifications enabled", { body: "Order and schedule updates can now reach this device.", icon: "/sheplates-logo.png" }); toast.success("Device notifications enabled"); } else toast.info("Notification permission was not granted"); } return <Sheet open={open} onOpenChange={setOpen}><SheetContent className="sp-notification-sheet w-full p-0 sm:max-w-md"><SheetHeader className="border-b bg-[#111611] p-6 text-left text-white"><SheetTitle className="text-white">Notifications</SheetTitle><SheetDescription className="text-white/55">In-app updates plus optional device notifications for this installed web app.</SheetDescription></SheetHeader><div className="p-5"><Button onClick={enable} variant="outline" className="mb-5 w-full rounded-xl"><Bell />Enable device notifications</Button><button onClick={() => setState((s) => ({ ...s, notifications: s.notifications.map((item) => notificationBelongsToSession(item, session) ? { ...item, read: true } : item) }))} className="mb-3 text-xs font-black text-[#5ba400]">Mark all as read</button><div className="space-y-3">{items.map((item) => <div key={item.id} className={`rounded-2xl border p-4 ${item.read ? "bg-white" : "border-[#5ba400]/30 bg-[#f4faed]"}`}><div className="flex justify-between gap-3"><b className="text-sm">{item.title}</b>{!item.read && <span className="mt-1 size-2 rounded-full bg-[#ef3d3d]" />}</div><p className="mt-1 text-sm leading-6 text-stone-500">{item.body}</p><div className="mt-2 text-[11px] text-stone-400">{item.at}</div></div>)}{!items.length && <Empty icon={Bell} title="No notifications" body="Schedule, quote, verification and order updates will appear here." />}</div></div></SheetContent></Sheet>; }
function NotificationDrawerV4({ open, setOpen, session, state, setState }: { open: boolean; setOpen: (v: boolean) => void; session: DemoSession; state: V3State; setState: React.Dispatch<React.SetStateAction<V3State>> }) {
  const items = state.notifications.filter((item) => notificationBelongsToSession(item, session));
  async function enable() { if (!("Notification" in window)) return toast.error("Notifications are unavailable in this browser"); const permission = await Notification.requestPermission(); if (permission === "granted") { new Notification("ShePlates notifications enabled", { body: "Verification, quote, schedule and tracking updates can reach this device.", icon: "/sheplates-logo.png" }); toast.success("Device notifications enabled"); } }
  async function markAll() { try { if (isLiveSupabaseMode()) await markLiveNotificationsRead(); setState((s) => ({ ...s, notifications: s.notifications.map((item) => notificationBelongsToSession(item, session) ? { ...item, read: true } : item) })); } catch (error) { toast.error(error instanceof Error ? error.message : "Notifications could not be updated"); } }
  return <Sheet open={open} onOpenChange={setOpen}><SheetContent className="w-full p-0 sm:max-w-md"><SheetHeader className="border-b bg-[#111611] p-6 text-left text-white"><SheetTitle className="text-white">Notifications</SheetTitle><SheetDescription className="text-white/55">Private updates for {session.email}. Vendor and customer events are never mixed.</SheetDescription></SheetHeader><div className="p-5"><Button onClick={enable} variant="outline" className="mb-5 w-full rounded-xl"><Bell />Enable device notifications</Button><button onClick={() => void markAll()} className="mb-3 text-xs font-black text-[#5ba400]">Mark all as read</button><div className="space-y-3">{items.map((item) => <div key={item.id} className={`rounded-2xl border p-4 ${item.read ? "bg-white" : "border-[#5ba400]/30 bg-[#f4faed]"}`}><div className="flex justify-between gap-3"><b className="text-sm">{item.title}</b>{!item.read && <span className="mt-1 size-2 rounded-full bg-[#ef3d3d]" />}</div><p className="mt-1 text-sm leading-6 text-stone-500">{item.body}</p><div className="mt-2 text-[11px] text-stone-400">{item.at}</div></div>)}{!items.length && <Empty icon={Bell} title="No notifications" body="Verification, quote, schedule and order updates will appear here." />}</div></div></SheetContent></Sheet>;
}
function notice(recipient: string, recipientRole: Role, title: string, body: string): Notification { return { id: id("NOT"), recipient, recipientRole, title, body, at: now(), read: false }; }
function playNotificationSound() {
  try {
    const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    const ctx = new AudioContextCtor(); const oscillator = ctx.createOscillator(); const gain = ctx.createGain();
    oscillator.frequency.value = 880; gain.gain.setValueAtTime(0.0001, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02); gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    oscillator.connect(gain); gain.connect(ctx.destination); oscillator.start(); oscillator.stop(ctx.currentTime + 0.36);
  } catch { /* sound is best-effort and requires browser interaction on some devices */ }
}
function showDeviceNotification(title: string, body: string) { if (typeof Notification !== "undefined" && Notification.permission === "granted") new Notification(title, { body, icon: "/sheplates-logo.png" }); }

function findRelevantOrderForComplaint(state: V3State, session: DemoSession): Order | undefined {
  const orders = state.orders.filter((order) => order.customerEmail === session.email);
  const delivered = orders.filter((order) => order.status === "Completed" || order.status === "Out for delivery" || order.status === "Ready for pickup");
  const pool = delivered.length ? delivered : orders;
  return [...pool].sort((a, b) => b.date.localeCompare(a.date))[0];
}
function availableCommerceProducts(state: V3State) {
  return state.products.filter((product) => product.active && product.stock > 0 && state.vendors.some((vendor) => vendor.id === product.vendorId && vendor.verification === "Verified" && vendor.operational === "Active" && vendor.openToday));
}
function withAgentMemory(state: V3State, email: string, patch: Partial<AgentMemory>): V3State {
  return { ...state, customers: state.customers.map((customer) => customer.email === email ? { ...customer, agentMemory: { ...customer.agentMemory, ...patch } } : customer) };
}
function rememberCategory(setState: React.Dispatch<React.SetStateAction<V3State>>, email: string, category: string) {
  setState((state) => {
    const existing = state.customers.find((customer) => customer.email === email)?.agentMemory?.favoriteCategories || [];
    const next = existing.includes(category) ? existing : [...existing, category].slice(-5);
    return withAgentMemory(state, email, { favoriteCategories: next });
  });
}

function SheAgent({ open, setOpen, session, state, setState, navigate }: { open: boolean; setOpen: (v: boolean) => void; session: DemoSession; state: V3State; setState: React.Dispatch<React.SetStateAction<V3State>>; navigate: (page: string) => void }) {
  const customer = state.customers.find((c) => c.email === session.email);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<AgentMessage[]>([{ role: "agent", text: session.role === "customer" ? `Hi ${session.name.split(" ")[0]} 👋 Tell me what you're planning and I'll turn it into a local basket you can review.` : `Hello ${session.name}. I can analyse your ${roleName[session.role].toLowerCase()} workspace and recommend the next action.` }]);
  const [busy, setBusy] = useState(false);
  const [awaitingPhoto, setAwaitingPhoto] = useState<{ orderId: string; complaintText: string } | null>(null);
  const bottom = useRef<HTMLDivElement>(null); const fileInputRef = useRef<HTMLInputElement>(null);
  const scope = useMemo(() => scopedContext(session, state), [session, state]);
  const cartItems = state.cart.filter((item) => item.customerEmail === session.email);
  const cartTotal = cartItems.reduce((sum, item) => { const product = state.products.find((p) => p.id === item.productId); return sum + (product ? finalPrice(product, state) * item.quantity : 0); }, 0);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);
  useEffect(() => { if (!open) setMessage(""); }, [open]);

  async function syncAgentCart(addProductIds: string[] = [], removeProductIds: string[] = [], announce?: string) {
    const own = state.cart.filter((item) => item.customerEmail === session.email);
    const byProduct = new Map(own.map((item) => [item.productId, { ...item }]));
    for (const productId of addProductIds) {
      const product = state.products.find((item) => item.id === productId);
      if (!product) continue;
      const existing = byProduct.get(productId);
      byProduct.set(productId, existing ? { ...existing, quantity: existing.quantity + 1 } : { id: id("CRT"), customerEmail: session.email, productId, quantity: 1 });
      rememberCategory(setState, session.email, product.category);
    }
    for (const productId of removeProductIds) byProduct.delete(productId);
    const nextOwn = [...byProduct.values()];
    setState((current) => ({ ...current, cart: [...current.cart.filter((item) => item.customerEmail !== session.email), ...nextOwn] }));
    if (isLiveSupabaseMode()) {
      const saved = await syncLiveCart({ items: nextOwn.map((item) => ({ productId: item.productId, quantity: item.quantity })), createdBy: "she_agent" });
      if (saved.snapshot) setState((current) => mergeLiveCommerce(current, saved.snapshot as LiveCommerceStateSnapshot, session));
    }
    if (announce) toast.success(announce);
  }
  async function addProduct(productId: string, announce = true) {
    const product = state.products.find((item) => item.id === productId); if (!product) return;
    try { await syncAgentCart([productId], [], announce ? `${product.name} added to your basket` : undefined); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Cart could not be saved"); }
  }
  async function addSuggestedBasket(productIds: string[]) {
    try { await syncAgentCart(productIds, [], `${productIds.length} suggested item${productIds.length === 1 ? "" : "s"} added to your basket`); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Basket could not be saved"); }
  }

  async function submitQualityComplaint(orderId: string, complaintText: string, fileName: string, imageDataUrl: string) {
    const order = state.orders.find((o) => o.id === orderId); let aiDecision = "I reviewed the photo but could not reach live vision analysis, so this needs a careful manual look."; let confidence = 65; let recommendedRefundAmount = order ? Math.round(order.total * 0.5 * 100) / 100 : 0;
    try { const token = await getAccessToken(); const response = await fetch("/api/agent", { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ task: "quality_complaint", message: complaintText, context: { ...scope, order }, imageBase64: imageDataUrl, role: session.role }) }); const json = await response.json() as { result?: { summary?: string; recommendedAction?: string; confidence?: number; quality?: { spoilageLikely?: boolean; recommendedRefundPercent?: number } } }; if (response.ok && json.result) { aiDecision = [json.result.summary, json.result.recommendedAction].filter(Boolean).join(" ") || aiDecision; if (typeof json.result.confidence === "number") confidence = json.result.confidence; const percent = json.result.quality?.recommendedRefundPercent; if (order && typeof percent === "number") recommendedRefundAmount = Math.max(0, Math.min(order.total, Math.round(order.total * (percent / 100) * 100) / 100)); } } catch { /* conservative fallback */ }
    const cancellation: Cancellation = { id: id("CAN"), orderId, customerEmail: session.email, reason: complaintText, aiDecision, confidence, status: "Awaiting operations", kind: "quality_complaint", recommendedRefundAmount, attachmentName: fileName };
    const ticket: Ticket = { id: id("TKT"), creatorEmail: session.email, creatorRole: session.role, subject: `Quality complaint — ${orderId}`, description: complaintText, category: "Order", priority: "High", status: "Open", attachmentName: fileName, createdVia: "She Agent", at: now() };
    setState((current) => withAgentMemory({ ...current, cancellations: [cancellation, ...current.cancellations], tickets: [ticket, ...current.tickets], notifications: [notice("operations@sheplates.demo", "operations", "Quality complaint needs review", `${cancellation.id} for ${orderId} · She Agent suggests ${money(recommendedRefundAmount)}.`), ...current.notifications], audit: [audit(session, "Quality complaint submitted", `${orderId} · photo attached (${fileName})`), ...current.audit] }, session.email, { lastComplaintAt: now() }));
    setMessages((x) => [...x, { role: "agent", text: `I've reviewed the photo for ${orderId}. ${aiDecision} I sent the evidence and a ${money(recommendedRefundAmount)} refund recommendation to Operations for final approval.` }]);
  }
  async function handlePhotoSelected(file: File) { if (!awaitingPhoto) return; const { orderId, complaintText } = awaitingPhoto; setAwaitingPhoto(null); setMessages((x) => [...x, { role: "user", text: `📷 Attached: ${file.name}` }]); setBusy(true); try { const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("The photo could not be read. Please try again.")); reader.readAsDataURL(file); }); await submitQualityComplaint(orderId, complaintText, file.name, dataUrl); } catch (error) { setMessages((x) => [...x, { role: "agent", text: error instanceof Error ? error.message : "The photo could not be processed. Please try again." }]); } finally { setBusy(false); } }

  async function send(prefill?: string) {
    const text = (prefill ?? message).trim();
    if (!text || busy) return;
    setMessage("");
    const userMessage: AgentMessage = { role: "user", text };
    setMessages((current) => [...current, userMessage]);
    setBusy(true);
    try {
      const token = await getAccessToken();
      const history = [...messages, userMessage].slice(-12).map((item) => ({ role: item.role, text: item.text, productIds: item.productIds || [] }));
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ task: "commerce", message: text, context: scope, history, role: session.role }),
      });
      const json = await response.json() as {
        result?: {
          reply?: string;
          intent?: string;
          budget?: number;
          selectedProductIds?: string[];
          basketProductIds?: string[];
          removeProductIds?: string[];
          navigateTo?: string;
          clarifyingQuestion?: string;
          requiresPhoto?: boolean;
          targetOrderId?: string;
          createTicket?: boolean;
          ticketSubject?: string;
          ticketCategory?: Ticket["category"];
          ticketPriority?: Ticket["priority"];
          memoryUpdates?: Array<{ key: string; value: string; confidence: number }>;
        };
        error?: string;
      };
      if (!response.ok || !json.result) throw new Error(json.error || "She Agent is temporarily unavailable. Please try again shortly.");
      const result = json.result;

      if (session.role === "customer" && result.memoryUpdates?.length) {
        const patch: Partial<AgentMemory> = {};
        for (const memory of result.memoryUpdates) {
          if (memory.key === "preferred_budget") patch.lastBudget = Number(memory.value) || customer?.agentMemory?.lastBudget;
          if (memory.key === "favorite_categories") patch.favoriteCategories = memory.value.split(",").map((item) => item.trim()).filter(Boolean);
          if (memory.key === "favorite_products") patch.favoriteProducts = memory.value.split(",").map((item) => item.trim()).filter(Boolean);
          if (memory.key === "calorie_target") patch.calorieTarget = Number(memory.value) || undefined;
          if (memory.key === "protein_preference") patch.minProtein = Number(memory.value) || undefined;
          if (memory.key === "dietary_preference") patch.preferredDietaryTags = memory.value.split(",").map((item) => item.trim()).filter(Boolean);
          if (memory.key === "delivery_window") patch.preferredDeliveryPeriod = memory.value;
        }
        if (Object.keys(patch).length) setState((current) => withAgentMemory(current, session.email, patch));
      }

      const permittedProducts = new Map(availableCommerceProducts(state).map((product) => [product.id, product]));
      const selectedProducts = [...new Set(result.selectedProductIds || [])].map((productId) => permittedProducts.get(productId)).filter((product): product is Product => Boolean(product)).slice(0, 8);
      const basketProducts = [...new Set(result.basketProductIds || [])].map((productId) => permittedProducts.get(productId)).filter((product): product is Product => Boolean(product)).slice(0, 8);
      const removeIds = new Set((result.removeProductIds || []).filter((productId) => permittedProducts.has(productId)));

      if (basketProducts.length || removeIds.size) {
        await syncAgentCart(basketProducts.map((product) => product.id), [...removeIds]);
      }

      if (result.createTicket) {
        const vendor = session.role === "vendor" ? vendorFor(state, session) : undefined;
        const ticket: Ticket = {
          id: id("TKT"),
          creatorEmail: session.email,
          creatorRole: session.role,
          vendorId: vendor?.id,
          subject: (result.ticketSubject || text).slice(0, 80),
          description: text,
          category: result.ticketCategory || "Other",
          priority: result.ticketPriority || "Normal",
          status: "Open",
          createdVia: "She Agent",
          at: now(),
        };
        setState((current) => ({
          ...current,
          tickets: [ticket, ...current.tickets],
          notifications: [notice(session.email, session.role, "Support request created", `${ticket.id} is open.`), notice("operations@sheplates.demo", "operations", "New support request", `${ticket.id}: ${ticket.subject}`), ...current.notifications],
        }));
      }

      if (session.role === "customer" && result.requiresPhoto) {
        const order = state.orders.find((item) => item.customerEmail === session.email && (item.id === result.targetOrderId || item.description === result.targetOrderId)) || findRelevantOrderForComplaint(state, session);
        if (order) setAwaitingPhoto({ orderId: order.id, complaintText: text });
      }

      const destination = result.navigateTo || "";
      if (destination && nav[session.role].includes(destination)) {
        navigate(destination);
        if (destination !== "Marketplace") setOpen(false);
      }

      const productIds = selectedProducts.map((product) => product.id);
      const basketTotal = result.intent === "recommend" && selectedProducts.length ? selectedProducts.reduce((sum, product) => sum + finalPrice(product, state), 0) : undefined;
      let reply = result.clarifyingQuestion?.trim() || result.reply?.trim() || "I couldn't complete that request just now. Please try again.";
      if (result.requiresPhoto && awaitingPhoto === null) reply = `${reply} You can attach the photo below.`;
      setMessages((current) => [...current, { role: "agent", text: reply, productIds: productIds.length ? productIds : undefined, basketTotal, intent: result.intent }]);
    } catch (error) {
      setMessages((current) => [...current, { role: "agent", text: error instanceof Error ? error.message : "She Agent is temporarily unavailable. Please try again shortly." }]);
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;
  const scopeCopy = session.role === "customer" ? "Uses only your profile, nearby catalogue, basket, schedules and orders." : session.role === "vendor" ? "Uses only your vendor catalogue, staff and orders." : "Uses authorised platform operational data.";
  return <div className="fixed inset-0 z-[70] sm:pointer-events-none"><button onClick={() => setOpen(false)} className="absolute inset-0 bg-[#111611]/35 backdrop-blur-[2px] sm:hidden" aria-label="Close She Agent" /><section className="sp-agent-panel pointer-events-auto absolute inset-x-0 bottom-0 flex h-[92dvh] flex-col overflow-hidden rounded-t-[30px] border border-white/60 bg-[#fbfcf8] shadow-[0_-20px_80px_rgba(17,22,17,.22)] sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[min(790px,calc(100vh-36px))] sm:w-[480px] sm:rounded-[32px] sm:shadow-[0_24px_90px_rgba(17,22,17,.28)]">
    <div className="relative overflow-hidden bg-[#131611] px-5 pb-5 pt-5 text-white"><div className="absolute -right-12 -top-16 size-44 rounded-full bg-[#6cab1b]/30 blur-3xl" /><div className="absolute -bottom-20 left-12 size-40 rounded-full bg-[#ef3d3d]/20 blur-3xl" /><div className="relative flex items-center gap-3"><div className="sp-agent-orb sp-agent-orb-large relative grid size-12 place-items-center rounded-[18px] text-white"><Activity className="size-5" /><span className="sp-agent-orb-status absolute -right-1 -top-1 size-3 rounded-full" /></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h2 className="text-lg font-black">She Agent</h2><span className="rounded-full border border-white/10 bg-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-white/70">Commerce assistant</span></div><p className="mt-0.5 truncate text-xs text-white/55">{session.role === "customer" ? "Your local shopping copilot" : `${roleName[session.role]} copilot`}</p></div><button onClick={() => setOpen(false)} className="grid size-10 place-items-center rounded-full bg-white/10 transition hover:bg-white/15" aria-label="Close"><X className="size-4" /></button></div>{session.role === "customer" && <div className="relative mt-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/8 px-3 py-2.5 text-xs"><ShoppingCart className="size-4 text-[#a9dc67]" /><span className="font-bold">Review basket</span><span className="text-white/45">{cartItems.length} item{cartItems.length === 1 ? "" : "s"}</span><span className="ml-auto font-black">{money(cartTotal)}</span>{cartItems.length > 0 && <button onClick={() => { navigate("Cart"); setOpen(false); }} className="rounded-lg bg-white px-2.5 py-1.5 font-black text-[#111611]">View</button>}</div>}</div>
    <div className="border-b border-stone-200/70 bg-white/80 px-5 py-3 text-[11px] font-semibold leading-5 text-stone-500 backdrop-blur"><ShieldCheck className="mr-1.5 inline size-3.5 text-[#5ba400]" />{scopeCopy} Sensitive payments, refunds and approvals remain human-confirmed.</div>
    <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-5">{messages.length === 1 && session.role === "customer" && <div className="mb-5 grid grid-cols-2 gap-2">{[["Nearby now", "What products are available near me?"], ["Plan for me", "Plan something useful for me today"], ["Food preferences", "Show options that fit my preferences"], ["Track order", "Where is my next order?"]].map(([label, prompt]) => <button key={label} onClick={() => void send(prompt)} className="surface-card rounded-[22px] p-3 text-left transition hover:-translate-y-0.5 hover:border-[#6cab1b]/40 hover:shadow-md"><Sparkles className="size-4 text-[#5ba400]" /><div className="mt-2 text-xs font-black">{label}</div><div className="mt-1 text-[10px] leading-4 text-stone-400">{prompt}</div></button>)}</div>}<div className="space-y-4">{messages.map((item, index) => <div key={index} className={`flex ${item.role === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[92%] ${item.role === "user" ? "rounded-[22px_22px_8px_22px] bg-[#171914] text-white shadow-[0_16px_36px_rgba(17,19,15,.18)]" : "rounded-[22px_22px_22px_8px] border border-stone-200/80 bg-white/96 text-stone-700 shadow-[0_16px_40px_rgba(35,26,21,.08)]"} px-4 py-3 text-sm leading-6`}><div>{item.text}</div>{item.productIds?.length ? <div className="mt-3 space-y-2">{item.productIds.map((productId) => { const product = state.products.find((p) => p.id === productId); const vendor = product ? state.vendors.find((v) => v.id === product.vendorId) : undefined; if (!product) return null; const inCart = state.cart.some((x) => x.customerEmail === session.email && x.productId === product.id); return <div key={product.id} className="surface-card-muted rounded-[22px] p-3"><div className="flex items-center gap-3"><div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white text-3xl shadow-sm ring-1 ring-stone-100">{product.emoji}</div><div className="min-w-0 flex-1"><div className="truncate text-xs font-black text-[#171312]">{product.name}</div><div className="mt-0.5 truncate text-[10px] text-stone-500">{vendor?.businessName || "Verified vendor"} · {product.baseUnit}</div><div className="mt-1 flex items-center gap-2"><span className="text-sm font-black text-[#171312]">{money(finalPrice(product, state))}</span><span className="text-[10px] font-bold text-[#5b9417]">{product.protein}g protein</span></div></div><button onClick={() => void addProduct(product.id)} className={`grid min-w-14 place-items-center rounded-xl px-2.5 py-2 text-[11px] font-black ${inCart ? "bg-[#e8f4da] text-[#477f00]" : "bg-[#ef3d3d] text-white"}`}>{inCart ? "Add +" : "+ Add"}</button></div></div>; })}{item.basketTotal !== undefined && <div className="flex items-center justify-between gap-2 pt-1"><span className="text-[11px] font-bold text-stone-400">Suggested total {money(item.basketTotal)}</span><button onClick={() => void addSuggestedBasket(item.productIds || [])} className="rounded-xl bg-[#171914] px-3 py-2 text-[11px] font-black text-white">Add suggested basket</button></div>}</div> : null}</div></div>)}{busy && <div className="flex justify-start"><div className="inline-flex items-center gap-2 rounded-[22px_22px_22px_8px] border border-stone-200/80 bg-white/96 px-4 py-3 text-sm text-stone-500 shadow-[0_14px_36px_rgba(35,26,21,.08)]"><span className="flex gap-1"><span className="size-1.5 animate-bounce rounded-full bg-[#6cab1b]" /><span className="size-1.5 animate-bounce rounded-full bg-[#6cab1b] [animation-delay:120ms]" /><span className="size-1.5 animate-bounce rounded-full bg-[#6cab1b] [animation-delay:240ms]" /></span>Working on the best options…</div></div>}<div ref={bottom} /></div></div>
    <div className="border-t border-stone-200/80 bg-white/96 p-3.5 backdrop-blur sm:p-4"><input ref={fileInputRef} type="file" accept="image/*" hidden onChange={(e) => { const file = e.target.files?.[0]; if (file) void handlePhotoSelected(file); e.target.value = ""; }} />{awaitingPhoto && <div className="mb-3 flex gap-2"><Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="flex-1 rounded-xl border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"><ImageUp />Attach photo for {awaitingPhoto.orderId}</Button><Button type="button" variant="ghost" onClick={() => setAwaitingPhoto(null)} className="rounded-xl">Cancel</Button></div>}<div className="mb-3 flex gap-2 overflow-x-auto pb-1">{agentPrompts(session.role).map((prompt) => <button key={prompt} onClick={() => void send(prompt)} disabled={busy} className="whitespace-nowrap rounded-full border border-stone-200 bg-[#fafbf8] px-3 py-2 text-[11px] font-bold text-stone-600 transition hover:border-[#6cab1b]/40 hover:bg-[#f2f8e9]">{prompt}</button>)}</div><div className="flex items-end gap-2 rounded-[20px] border border-stone-200 bg-[#f8f9f6] p-2 focus-within:border-[#6cab1b]/50 focus-within:ring-4 focus-within:ring-[#6cab1b]/10"><Textarea value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }} placeholder={session.role === "customer" ? "Ask naturally about food, products, orders or your plans…" : "Ask She Agent…"} className="min-h-10 max-h-28 resize-none border-0 bg-transparent px-2 py-2 shadow-none focus-visible:ring-0" /><Button onClick={() => void send()} disabled={busy || !message.trim()} className="size-10 shrink-0 rounded-xl bg-[#ef3d3d] p-0 hover:bg-[#d92f2f]" aria-label="Send"><Send className="size-4" /></Button></div><p className="mt-2 px-1 text-[10px] leading-4 text-stone-400">She Agent can prepare and modify a proposal. You confirm checkout, payment and sensitive actions.</p></div>
  </section></div>;
}
function scopedContext(session: DemoSession, state: V3State) {
  if (session.role === "customer") return {
    scope: "customer_self",
    profile: state.customers.find((x) => x.email === session.email),
    cart: state.cart.filter((x) => x.customerEmail === session.email),
    tickets: state.tickets.filter((x) => x.creatorEmail === session.email),
    schedules: state.schedules.filter((x) => x.customerEmail === session.email),
    orders: state.orders.filter((x) => x.customerEmail === session.email),
    requirements: state.requirements.filter((x) => x.customerEmail === session.email),
    quotations: state.quotes.filter((quote) => state.requirements.some((requirement) => requirement.id === quote.requirementId && requirement.customerEmail === session.email)),
    availableProducts: state.products.filter((product) => state.vendors.some((vendor) => vendor.id === product.vendorId && vendor.verification === "Verified" && vendor.openToday)),
  };
  if (session.role === "vendor") {
    const vendor = vendorFor(state, session);
    return {
      scope: "vendor_self",
      vendor,
      products: state.products.filter((x) => x.vendorId === vendor?.id),
      orders: state.orders.filter((x) => x.vendorId === vendor?.id),
      deliveryStaff: state.staff.filter((x) => x.vendorId === vendor?.id),
      tickets: state.tickets.filter((x) => x.vendorId === vendor?.id || x.creatorEmail === session.email),
      opportunities: vendor?.plan === "Premium" ? state.requirements.filter((x) => (x.status === "Quoting" || x.status === "Quotes received") && (!x.invitedVendorIds?.length || x.invitedVendorIds.includes(vendor.id))) : [],
      quotations: state.quotes.filter((x) => x.vendorId === vendor?.id),
      payouts: state.transactions.filter((x) => x.vendorId === vendor?.id),
    };
  }
  const operationsContext = {
    scope: "operations_authorised",
    metrics: {
      customers: state.customers.length,
      vendors: state.vendors.length,
      products: state.products.length,
      schedules: state.schedules.length,
      orders: state.orders.length,
      openTickets: state.tickets.filter((x) => x.status !== "Resolved").length,
    },
    customers: state.customers,
    vendors: state.vendors,
    products: state.products,
    orders: state.orders,
    requirements: state.requirements,
    cancellations: state.cancellations,
    tickets: state.tickets,
    payouts: state.transactions,
  };
  if (session.role === "operations") return operationsContext;
  return {
    ...operationsContext,
    scope: "super_admin_authorised",
    audit: state.audit.slice(0, 100),
    campaigns: state.campaigns,
    platformSettings: state.merchandising,
    staffAccounts: state.staffAccounts,
  };
}

function agentPrompts(role: Role) { return role === "customer" ? ["What’s available near me?", "Plan something for me", "Healthy options", "Track my next order"] : role === "vendor" ? ["What must I fulfil next?", "Summarise my inventory", "Create a delivery issue ticket"] : role === "operations" ? ["Show operational risks", "Prioritise open tickets", "Find unassigned deliveries"] : ["Summarise marketplace health", "Detect governance risks", "Compare vendor plan adoption"]; }
