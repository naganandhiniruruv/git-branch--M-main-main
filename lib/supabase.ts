import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function isLiveSupabaseMode() {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "false" && isSupabaseConfigured();
}

export type LiveMarketplaceRow = {
  item_id: string; vendor_id: string; vendor_name: string; item_name: string; category: string;
  unit: string; quantity_step: number; stock_quantity: number; image_url: string | null;
  customer_price: number; calories_per_unit: number; protein_g: number; carbs_g: number;
  fat_g: number; fibre_g: number; dietary_tags: string[]; pack_amount: number | null;
  pack_measure: string | null; delivery_enabled: boolean; pickup_enabled: boolean;
  distance_km: number;
};

export type MarketplaceDiagnostics = {
  verified_vendors: number; open_vendors: number; vendors_with_products: number;
  vendors_in_radius: number; serviceable_products: number;
};

export type LiveVendorRow = {
  id: string; owner_id: string; name: string; category: string; locality: string; address: string | null;
  latitude: number | null; longitude: number | null; service_radius_km: number;
  delivery_enabled: boolean; pickup_enabled: boolean; store_open_today: boolean;
  verification_status: string; operational_status: string; marketplace_visible: boolean;
  plan_id: string | null;
};

export type LiveMenuItemRow = {
  id: string; vendor_id: string; name: string; category: string; unit: string;
  quantity_step: number; stock_quantity: number; vendor_base_price: number; active: boolean;
  calories_per_unit: number; protein_g: number; carbs_g: number; fat_g: number; fibre_g: number;
  dietary_tags: string[]; pack_amount: number | null; pack_measure: string | null; image_url: string | null;
  nutrition_status?: string | null; nutrition_confidence?: number | null; nutrition_note?: string | null;
};

export function getSupabaseBrowserClient() {
  if (!isSupabaseConfigured()) return null;
  if (!browserClient) {
    browserClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
    );
  }
  return browserClient;
}

export async function liveSignIn(email: string, password: string) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Live account access is not available in this deployment.");
  const normalizedEmail = email.trim().toLowerCase();
  const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
  if (error) throw new Error(error.message || "The email or password could not be verified.");
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, role, vendor_id")
    .eq("id", data.user.id)
    .single();
  if (profileError) {
    throw new Error(
      profileError.code === "PGRST116"
        ? "This Auth account has no ShePlates role profile. Run the packaged staff-user setup command, then sign in again."
        : profileError.message,
    );
  }
  return { user: data.user, profile };
}

export async function liveSignUp(input: {
  name: string;
  email: string;
  password: string;
  role: "customer" | "vendor";
}) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Live account access is not available in this deployment.");

  if (process.env.NEXT_PUBLIC_TEST_AUTO_CONFIRM === "true") {
    const response = await fetch("/api/test-auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const result = await response.json() as { error?: string };
    if (!response.ok) throw new Error(result.error || "Unable to create the local test account.");
    const signedIn = await supabase.auth.signInWithPassword({ email: input.email, password: input.password });
    if (signedIn.error) throw signedIn.error;
    return signedIn.data;
  }

  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: { data: { full_name: input.name, role: input.role } },
  });
  if (error) throw error;
  return data;
}

export async function liveSignOut() {
  const supabase = getSupabaseBrowserClient();
  if (supabase) await supabase.auth.signOut();
}

export async function getAccessToken() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function saveLiveCustomerLocation(input: { userId: string; address: string; latitude: number; longitude: number }) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Live account access is not available in this deployment.");
  const result = await supabase.from("customer_preferences").upsert({
    customer_id: input.userId,
    address: input.address,
    latitude: input.latitude,
    longitude: input.longitude,
    onboarding_complete: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: "customer_id" });
  if (result.error) throw result.error;
}

export async function loadLiveCustomerPreference(userId: string) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Live account access is not available in this deployment.");
  const result = await supabase.from("customer_preferences").select("*").eq("customer_id", userId).maybeSingle();
  if (result.error) throw result.error;
  return result.data;
}

export async function loadLiveCustomerMemory(userId: string) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Live account access is not available in this deployment.");
  const result = await supabase.from("customer_ai_memory").select("memory_key,memory_value,confidence,updated_at").eq("customer_id", userId).order("updated_at", { ascending: false }).limit(30);
  if (result.error) return [];
  return result.data || [];
}

export async function clearLiveCustomerMemory(userId: string) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Live account access is not available in this deployment.");
  const result = await supabase.from("customer_ai_memory").delete().eq("customer_id", userId);
  if (result.error) throw result.error;
}

export async function loadLiveMarketplace(latitude: number, longitude: number) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Live account access is not available in this deployment.");
  const [items, diagnostics, homeConfig] = await Promise.all([
    supabase.rpc("marketplace_menu_nearby", { customer_lat: latitude, customer_lng: longitude }),
    supabase.rpc("marketplace_visibility_diagnostics", { customer_lat: latitude, customer_lng: longitude }),
    supabase.from("platform_settings").select("config").eq("setting_key", "marketplace_home").maybeSingle(),
  ]);
  if (items.error) throw items.error;
  if (diagnostics.error) throw diagnostics.error;
  const config = homeConfig.error ? null : homeConfig.data?.config as { featuredProductIds?: string[]; recommendationPopupEnabled?: boolean; maxFeatured?: number } | null;
  return {
    items: (items.data || []) as LiveMarketplaceRow[],
    diagnostics: ((diagnostics.data || [])[0] || null) as MarketplaceDiagnostics | null,
    merchandising: { featuredProductIds: config?.featuredProductIds || [], recommendationPopupEnabled: config?.recommendationPopupEnabled ?? true, maxFeatured: config?.maxFeatured || 6 },
  };
}

export async function loadLiveVendorWorkspace(vendorId: string) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Live account access is not available in this deployment.");
  const vendorPromise = supabase.from("vendors").select("id,owner_id,name,category,locality,address,latitude,longitude,service_radius_km,delivery_enabled,pickup_enabled,store_open_today,verification_status,operational_status,marketplace_visible,plan_id").eq("id", vendorId).single();
  const documentsPromise = supabase.from("vendor_documents").select("document_number,storage_path,expiry_date,verification_status").eq("vendor_id", vendorId).order("created_at", { ascending: false }).limit(1);
  let products = await supabase.from("vendor_menu_items").select("id,vendor_id,name,category,unit,quantity_step,stock_quantity,vendor_base_price,active,calories_per_unit,protein_g,carbs_g,fat_g,fibre_g,dietary_tags,pack_amount,pack_measure,image_url,nutrition_status,nutrition_confidence,nutrition_note").eq("vendor_id", vendorId).order("created_at", { ascending: false });
  if (products.error && /nutrition_status|nutrition_confidence|nutrition_note/i.test(products.error.message || "")) {
    products = await supabase.from("vendor_menu_items").select("id,vendor_id,name,category,unit,quantity_step,stock_quantity,vendor_base_price,active,calories_per_unit,protein_g,carbs_g,fat_g,fibre_g,dietary_tags,pack_amount,pack_measure,image_url").eq("vendor_id", vendorId).order("created_at", { ascending: false });
  }
  const [vendor, documents] = await Promise.all([vendorPromise, documentsPromise]);
  if (vendor.error) throw vendor.error;
  if (products.error) throw products.error;
  if (documents.error) throw documents.error;
  return { vendor: vendor.data as LiveVendorRow, products: (products.data || []) as LiveMenuItemRow[], document: documents.data?.[0] || null };
}

export async function loadLiveOperationsWorkspace() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Live account access is not available in this deployment.");
  const [vendors, products, profiles, documents, homeConfig, campaigns] = await Promise.all([
    supabase.from("vendors").select("id,owner_id,name,category,locality,address,latitude,longitude,service_radius_km,delivery_enabled,pickup_enabled,store_open_today,verification_status,operational_status,marketplace_visible,plan_id").order("created_at", { ascending: false }),
    supabase.from("vendor_menu_items").select("id,vendor_id,name,category,unit,quantity_step,stock_quantity,vendor_base_price,active,calories_per_unit,protein_g,carbs_g,fat_g,fibre_g,dietary_tags,pack_amount,pack_measure,image_url").order("created_at", { ascending: false }),
    supabase.from("profiles").select("id,full_name,role,vendor_id"),
    supabase.from("vendor_documents").select("vendor_id,document_number,storage_path,expiry_date,verification_status").order("created_at", { ascending: false }),
    supabase.from("platform_settings").select("config").eq("setting_key", "marketplace_home").maybeSingle(),
    supabase.from("marketing_campaigns").select("id,name,audience,offer,channel,status,ai_rationale,created_at").order("created_at", { ascending: false }).limit(100),
  ]);
  for (const result of [vendors, products, profiles, documents]) if (result.error) throw result.error;
  const config = homeConfig.error ? null : homeConfig.data?.config as { featuredProductIds?: string[]; recommendationPopupEnabled?: boolean; maxFeatured?: number } | null;
  return { vendors: (vendors.data || []) as LiveVendorRow[], products: (products.data || []) as LiveMenuItemRow[], profiles: profiles.data || [], documents: documents.data || [], merchandising: { featuredProductIds: config?.featuredProductIds || [], recommendationPopupEnabled: config?.recommendationPopupEnabled ?? true, maxFeatured: config?.maxFeatured || 6 }, campaigns: campaigns.error ? [] : (campaigns.data || []) };
}

export async function saveLiveMarketplaceHome(config: { featuredProductIds: string[]; recommendationPopupEnabled: boolean; maxFeatured: number }) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Live account access is not available in this deployment.");
  const result = await supabase.from("platform_settings").upsert({ setting_key: "marketplace_home", config, updated_at: new Date().toISOString() }, { onConflict: "setting_key" });
  if (result.error) throw result.error;
}

export async function saveLiveCampaign(input: { id?: string; name: string; audience: string; offer: string; channel: string; status: string; aiRationale: string }) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Live account access is not available in this deployment.");
  const row = { ...(input.id ? { id: input.id } : {}), name: input.name, audience: input.audience, offer: input.offer, channel: input.channel, status: input.status.toLowerCase(), ai_rationale: input.aiRationale, updated_at: new Date().toISOString() };
  const result = await supabase.from("marketing_campaigns").upsert(row).select("id").single();
  if (result.error) throw result.error;
  return result.data.id as string;
}

export async function uploadLiveProductImage(vendorId: string, dataUrl: string) {
  const token = await getAccessToken();
  const response = await fetch("/api/product-image-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ vendorId, dataUrl }),
  });
  const result = await response.json() as { publicUrl?: string; error?: string };
  if (!response.ok || !result.publicUrl) throw new Error(result.error || "Image upload failed.");
  return result.publicUrl;
}

export async function saveLiveVendorProduct(input: {
  vendorId: string; name: string; category: string; unit: string; price: number; stock: number;
  active: boolean; calories: number; protein: number; carbs: number; fat: number; fibre: number;
  dietaryTags: string[]; packAmount: number; packMeasure: string; imageUrl?: string;
  nutritionStatus?: "verified" | "estimated" | "pending_review"; nutritionConfidence?: number; nutritionNote?: string;
}) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Live account access is not available in this deployment.");
  const payload = {
    vendor_id: input.vendorId, name: input.name, category: input.category, unit: input.unit,
    quantity_step: 1, vendor_base_price: input.price, stock_quantity: input.stock, active: input.active,
    calories_per_unit: input.calories, protein_g: input.protein, carbs_g: input.carbs,
    fat_g: input.fat, fibre_g: input.fibre, dietary_tags: input.dietaryTags,
    pack_amount: input.packAmount, pack_measure: input.packMeasure, image_url: input.imageUrl || null,
    nutrition_status: input.nutritionStatus || "pending_review",
    nutrition_confidence: input.nutritionConfidence ?? null,
    nutrition_note: input.nutritionNote || null,
  };
  let result = await supabase.from("vendor_menu_items").insert(payload).select("id").single();
  // Backward-compatible retry lets the UI keep working if the production migration
  // has not been applied yet; the release notes still require the migration.
  if (result.error && /nutrition_status|nutrition_confidence|nutrition_note/i.test(result.error.message || "")) {
    const { nutrition_status: _status, nutrition_confidence: _confidence, nutrition_note: _note, ...legacyPayload } = payload;
    result = await supabase.from("vendor_menu_items").insert(legacyPayload).select("id").single();
  }
  if (result.error) throw result.error;
  return result.data.id as string;
}

export async function notifyLiveNutritionReview(input: { productId: string; productName: string; reason: string }) {
  return commerceRequest({ action: "notify_nutrition_review", ...input });
}

export async function setLiveProductActive(productId: string, active: boolean) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Live account access is not available in this deployment.");
  const result = await supabase.from("vendor_menu_items").update({ active, updated_at: new Date().toISOString() }).eq("id", productId);
  if (result.error) throw result.error;
}

export async function updateLiveVendorControls(vendorId: string, patch: {
  store_open_today?: boolean; operational_status?: string; delivery_enabled?: boolean;
  pickup_enabled?: boolean; marketplace_visible?: boolean;
}) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Live account access is not available in this deployment.");
  const result = await supabase.from("vendors").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", vendorId);
  if (result.error) throw result.error;
}

export async function decideLiveVendorVerification(vendorId: string, verification: string) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Live account access is not available in this deployment.");
  const result = await supabase.rpc("review_vendor_and_notify", {
    target_vendor: vendorId,
    decision: verification,
    review_note: verification === "verified" ? null : "Please review the Operations decision and update the requested information.",
  });
  if (result.error) throw result.error;
}

export type LiveNotificationRow = {
  id: string; kind: string; title: string; body: string; entity_type: string | null;
  entity_id: string | null; read_at: string | null; created_at: string;
};

export async function loadLiveNotifications() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Live account access is not available in this deployment.");
  const result = await supabase.from("notifications")
    .select("id,kind,title,body,entity_type,entity_id,read_at,created_at")
    .order("created_at", { ascending: false }).limit(100);
  if (result.error) throw result.error;
  return (result.data || []) as LiveNotificationRow[];
}

export async function markLiveNotificationsRead() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Live account access is not available in this deployment.");
  const result = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
  if (result.error) throw result.error;
}

export async function saveLiveCustomerProfile(input: {
  userId: string; phone: string; address: string; latitude: number; longitude: number;
  householdSize: number; diet: string; allergies: string[]; goals: string[]; instructions: string;
}) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Live account access is not available in this deployment.");
  const [profile, preference] = await Promise.all([
    supabase.from("profiles").update({ phone: input.phone }).eq("id", input.userId),
    supabase.from("customer_preferences").upsert({
      customer_id: input.userId, address: input.address, latitude: input.latitude, longitude: input.longitude,
      household_size: input.householdSize, diet: input.diet, allergies: input.allergies,
      health_goals: input.goals, dislikes_and_instructions: input.instructions,
      onboarding_complete: true, updated_at: new Date().toISOString(),
    }, { onConflict: "customer_id" }),
  ]);
  if (profile.error) throw profile.error;
  if (preference.error) throw preference.error;
}

export async function saveLiveVendorLocation(input: { vendorId: string; address: string; latitude: number; longitude: number; radiusKm: number }) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Live account access is not available in this deployment.");
  const result = await supabase.from("vendors").update({
    address: input.address,
    latitude: input.latitude,
    longitude: input.longitude,
    service_radius_km: input.radiusKm,
    radius_updated_at: new Date().toISOString(),
  }).eq("id", input.vendorId);
  if (result.error) throw result.error;
}

export async function submitLiveVendorApplication(input: {
  userId: string; businessName: string; category: string; locality: string;
  fssaiNumber: string; expiryDate: string; certificate: File; address?: string;
  latitude?: number; longitude?: number; radiusKm?: number; delivery?: boolean; pickup?: boolean;
}) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Live account access is not available in this deployment.");
  const safeName = input.certificate.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const objectPath = `${input.userId}/${crypto.randomUUID()}-${safeName}`;
  const upload = await supabase.storage.from("vendor-certificates").upload(objectPath, input.certificate, { upsert: false });
  if (upload.error) throw upload.error;
  const vendor = await supabase.from("vendors").insert({
    owner_id: input.userId, name: input.businessName, category: input.category,
    locality: input.locality, verification_status: "submitted", operational_status: "inactive",
    address: input.address ?? input.locality, latitude: input.latitude, longitude: input.longitude,
    service_radius_km: input.radiusKm ?? 5, delivery_enabled: input.delivery ?? true,
    pickup_enabled: input.pickup ?? true, store_open_today: false,
  }).select("id").single();
  if (vendor.error) throw vendor.error;
  const document = await supabase.from("vendor_documents").insert({
    vendor_id: vendor.data.id, document_type: "food_certificate", document_number: input.fssaiNumber,
    storage_path: objectPath, expiry_date: input.expiryDate, verification_status: "submitted",
  });
  if (document.error) throw document.error;
  const profile = await supabase.from("profiles").update({ vendor_id: vendor.data.id }).eq("id", input.userId);
  if (profile.error) throw profile.error;
  return vendor.data.id as string;
}

/**
 * Super-Admin-only: create a real, confirmed account with a role-scoped
 * profile (Operations or Super Admin) via the service-role-backed API route. The route
 * itself re-verifies the caller is an admin before touching Auth — this client call is
 * a convenience wrapper, not the security boundary.
 */
export async function createStaffUser(input: { name: string; email: string; role: "operations" | "admin" }) {
  const token = await getAccessToken();
  const response = await fetch("/api/admin/create-user", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(input),
  });
  const json = await response.json() as { userId?: string; email?: string; temporaryPassword?: string; error?: string };
  if (!response.ok || !json.temporaryPassword) throw new Error(json.error || "User could not be created");
  return json as { userId: string; email: string; temporaryPassword: string };
}

export async function requestEmailVerificationCode(input: { name: string; email: string; role: "customer" | "vendor" }) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Account verification is unavailable in this deployment.");
  const { error } = await supabase.auth.signInWithOtp({
    email: input.email,
    options: { shouldCreateUser: true, data: { full_name: input.name, role: input.role } },
  });
  if (error) throw error;
}

export async function verifyEmailCodeAndSetPassword(input: { email: string; token: string; password: string }) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Account verification is unavailable in this deployment.");
  const verified = await supabase.auth.verifyOtp({ email: input.email, token: input.token, type: "email" });
  if (verified.error || !verified.data.user) throw verified.error || new Error("The verification code is invalid or expired.");
  const updated = await supabase.auth.updateUser({ password: input.password });
  if (updated.error) throw updated.error;
  return verified.data;
}

export type LiveCommerceSnapshot = {
  orders: Array<Record<string, unknown>>;
  schedules: Array<Record<string, unknown>>;
  staff: Array<Record<string, unknown>>;
  assignments: Array<Record<string, unknown>>;
  cart?: Record<string, unknown> | null;
  cartItems?: Array<Record<string, unknown>>;
};

async function commerceRequest(body?: Record<string, unknown>) {
  const token = await getAccessToken();
  const response = await fetch("/api/commerce", {
    method: body ? "POST" : "GET",
    headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json() as Record<string, unknown> & { error?: string };
  if (!response.ok) throw new Error(result.error || "The latest commerce data could not be saved.");
  return result;
}

export async function loadLiveCommerceSnapshot() {
  return await commerceRequest() as unknown as LiveCommerceSnapshot;
}

export async function createLiveScheduledCheckout(input: {
  productId: string; startDate: string; endDate?: string; recurrence: string; weekdays: string[]; slot: string;
  quantity: number; unit: string; mode: string; customerPrice: number; perDeliveryTotal: number; total: number; whatsappReminder?: boolean;
}) {
  return commerceRequest({ action: "create_schedule", ...input });
}

export async function syncLiveCart(input: { items: Array<{ productId: string; quantity: number }>; createdBy?: "customer" | "she_agent" }) {
  return commerceRequest({ action: "sync_cart", items: input.items, createdBy: input.createdBy || "customer" });
}

export async function checkoutLiveCart(input?: { scheduledDate?: string; slot?: string }) {
  return commerceRequest({ action: "checkout_cart", ...(input || {}) });
}

export async function markLiveOrderPaid(input: { orderId: string; method: string; reference?: string }) {
  return commerceRequest({ action: "mark_paid", ...input });
}

export async function saveLiveDeliveryStaff(input: { staffId?: string; name: string; phone: string; active?: boolean }) {
  return commerceRequest({ action: "save_staff", ...input });
}

export async function deleteLiveDeliveryStaff(staffId: string) {
  return commerceRequest({ action: "delete_staff", staffId });
}

export async function assignLiveDeliveryStaff(orderId: string, staffId?: string) {
  return commerceRequest({ action: "assign_staff", orderId, staffId: staffId || "" });
}

export async function resubmitLiveVendorVerification(input: { documentNumber: string; expiryDate?: string }) {
  return commerceRequest({ action: "resubmit_verification", ...input });
}

export async function saveLiveOutletCertificate(input: { outletId: string; certificateNumber: string; certificateExpiry?: string }) {
  return commerceRequest({ action: "save_outlet_certificate", ...input });
}

export async function uploadLiveCertificate(input: { vendorId: string; file: File; outletId?: string }) {
  const token = await getAccessToken();
  const form = new FormData();
  form.append("file", input.file);
  form.append("vendorId", input.vendorId);
  if (input.outletId) form.append("outletId", input.outletId);
  const response = await fetch("/api/certificate-upload", { method: "POST", headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: form });
  const result = await response.json() as { path?: string; fileName?: string; error?: string };
  if (!response.ok) throw new Error(result.error || "Certificate upload failed.");
  return result;
}

export async function updateLiveOrderStatus(orderId: string, status: string) {
  return commerceRequest({ action: "update_order_status", orderId, status });
}
export async function rescheduleLiveOrder(orderId: string, date: string, slot: string) {
  return commerceRequest({ action: "reschedule_order", orderId, date, slot });
}
