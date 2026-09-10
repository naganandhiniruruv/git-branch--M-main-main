import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Role = "customer" | "vendor" | "operations" | "admin";

function clients(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!url || !anon || !service || !token) return null;
  return {
    token,
    caller: createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } }),
    admin: createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } }),
  };
}

async function identity(request: Request) {
  const c = clients(request);
  if (!c) return null;
  const { data: authData } = await c.caller.auth.getUser(c.token);
  if (!authData.user) return null;
  const { data: profile } = await c.caller.from("profiles").select("id,full_name,role,vendor_id").eq("id", authData.user.id).maybeSingle();
  if (!profile) return null;
  return { ...c, user: authData.user, profile: profile as { id: string; full_name: string; role: Role; vendor_id: string | null } };
}

function orderNumber() {
  return `SP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function recurrence(value: string) {
  const v = value.toLowerCase();
  return ["once", "daily", "weekly", "custom"].includes(v) ? v : "once";
}

function fulfilment(value: string) {
  return /pickup/i.test(value) ? "self_pickup" : "vendor_delivery";
}

const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function addDays(dateISO: string, days: number) { const date = new Date(`${dateISO}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10); }
function scheduleDates(schedule: { start_date: string; end_date?: string | null; recurrence: string; weekdays?: number[] | null }) {
  const start = String(schedule.start_date);
  const mode = String(schedule.recurrence || "once");
  if (mode === "once") return [start];
  const defaultHorizon = mode === "daily" ? 29 : mode === "weekly" ? 27 : 27;
  const end = schedule.end_date ? String(schedule.end_date) : addDays(start, defaultHorizon);
  const out: string[] = [];
  for (let cursor = start, guard = 0; cursor <= end && guard < 366; cursor = addDays(cursor, 1), guard++) {
    const day = new Date(`${cursor}T12:00:00Z`).getUTCDay();
    if (mode === "daily" || (mode === "weekly" && day === new Date(`${start}T12:00:00Z`).getUTCDay()) || (mode === "custom" && (schedule.weekdays || []).includes(day))) out.push(cursor);
  }
  return out.length ? out : [start];
}

async function commerceSnapshot(ctx: Awaited<ReturnType<typeof identity>>) {
  if (!ctx) throw new Error("Unauthorised");
  const { admin, profile } = ctx;
  const role = profile.role;
  const orderQuery = admin.from("orders").select("id,order_number,schedule_id,customer_id,vendor_id,vendor_base_total,markup_total,tax_amount,delivery_fee,customer_total,fulfilment_mode,scheduled_date,scheduled_slot,status,tracking_latitude,tracking_longitude,cancellation_fee,created_at,order_items(id,product_name,quantity,unit,vendor_base_price,customer_price),payments(id,amount,status,provider,provider_reference,created_at)").order("scheduled_date", { ascending: true }).limit(500);
  if (role === "customer") orderQuery.eq("customer_id", profile.id);
  if (role === "vendor") {
    if (!profile.vendor_id) return { orders: [], schedules: [], staff: [], assignments: [] };
    orderQuery.eq("vendor_id", profile.vendor_id);
  }
  const schedulesQuery = admin.from("product_schedules").select("id,customer_id,vendor_id,menu_item_id,start_date,end_date,recurrence,weekdays,scheduled_slot,quantity,unit,fulfilment_mode,status,next_delivery_at,whatsapp_reminder_enabled,created_at").order("start_date", { ascending: true }).limit(500);
  if (role === "customer") schedulesQuery.eq("customer_id", profile.id);
  if (role === "vendor" && profile.vendor_id) schedulesQuery.eq("vendor_id", profile.vendor_id);

  const [orders, schedules] = await Promise.all([orderQuery, schedulesQuery]);
  if (orders.error) throw orders.error;
  if (schedules.error) throw schedules.error;

  let staff: unknown[] = [];
  let assignments: unknown[] = [];
  if (role === "vendor" && profile.vendor_id) {
    const [staffResult, assignmentResult] = await Promise.all([
      admin.from("vendor_delivery_staff").select("id,vendor_id,full_name,phone,active,created_at,updated_at").eq("vendor_id", profile.vendor_id).order("created_at"),
      admin.from("delivery_assignments").select("id,order_id,vendor_id,delivery_staff_id,assigned_at,completed_at").eq("vendor_id", profile.vendor_id),
    ]);
    if (staffResult.error) throw staffResult.error;
    if (assignmentResult.error) throw assignmentResult.error;
    staff = staffResult.data || [];
    assignments = assignmentResult.data || [];
  } else if (role === "operations" || role === "admin") {
    const [staffResult, assignmentResult] = await Promise.all([
      admin.from("vendor_delivery_staff").select("id,vendor_id,full_name,phone,active,created_at,updated_at").order("created_at"),
      admin.from("delivery_assignments").select("id,order_id,vendor_id,delivery_staff_id,assigned_at,completed_at"),
    ]);
    if (!staffResult.error) staff = staffResult.data || [];
    if (!assignmentResult.error) assignments = assignmentResult.data || [];
  }
  return { orders: orders.data || [], schedules: schedules.data || [], staff, assignments };
}

export async function GET(request: Request) {
  const ctx = await identity(request);
  if (!ctx) return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  try {
    return NextResponse.json(await commerceSnapshot(ctx));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Commerce data is unavailable." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const ctx = await identity(request);
  if (!ctx) return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  const body = await request.json() as Record<string, unknown>;
  const action = String(body.action || "");
  const { admin, profile } = ctx;
  try {
    if (action === "create_schedule") {
      if (profile.role !== "customer") return NextResponse.json({ error: "Customer access required." }, { status: 403 });
      const productId = String(body.productId || "");
      const { data: product, error: productError } = await admin.from("vendor_menu_items").select("id,vendor_id,name,unit,vendor_base_price,active,stock_quantity").eq("id", productId).maybeSingle();
      if (productError || !product || !product.active || Number(product.stock_quantity) <= 0) return NextResponse.json({ error: "This product is no longer available." }, { status: 409 });
      const quantity = Math.max(0.001, Number(body.quantity || 1));
      const customerPrice = Math.max(0, Number(body.customerPrice || product.vendor_base_price));
      const startDate = String(body.startDate || "");
      const scheduleInsert = await admin.from("product_schedules").insert({
        customer_id: profile.id, vendor_id: product.vendor_id, menu_item_id: product.id,
        start_date: startDate, end_date: body.endDate ? String(body.endDate) : null,
        recurrence: recurrence(String(body.recurrence || "once")),
        weekdays: Array.isArray(body.weekdays) ? body.weekdays.map((d) => weekdayMap[String(d)]).filter((n) => Number.isInteger(n)) : [],
        scheduled_slot: String(body.slot || "Vendor to confirm"), quantity, unit: String(body.unit || product.unit),
        fulfilment_mode: fulfilment(String(body.mode || "Vendor delivery")), status: "active",
        whatsapp_reminder_enabled: body.whatsappReminder !== false,
      }).select("id").single();
      if (scheduleInsert.error) throw scheduleInsert.error;
      const orderInsert = await admin.from("orders").insert({
        order_number: orderNumber(), schedule_id: scheduleInsert.data.id, customer_id: profile.id, vendor_id: product.vendor_id,
        vendor_base_total: Number(product.vendor_base_price) * quantity, markup_total: Math.max(0, customerPrice - Number(product.vendor_base_price)) * quantity,
        tax_amount: 0, delivery_fee: 0, customer_total: Number(body.perDeliveryTotal || customerPrice * quantity),
        fulfilment_mode: fulfilment(String(body.mode || "Vendor delivery")), scheduled_date: startDate,
        scheduled_slot: String(body.slot || "Vendor to confirm"), status: "awarded",
      }).select("id,order_number").single();
      if (orderInsert.error) throw orderInsert.error;
      const itemInsert = await admin.from("order_items").insert({
        order_id: orderInsert.data.id, product_name: product.name, quantity, unit: String(body.unit || product.unit),
        vendor_base_price: Number(product.vendor_base_price), markup_percent: Number(product.vendor_base_price) > 0 ? Math.max(0, ((customerPrice / Number(product.vendor_base_price)) - 1) * 100) : 0,
        customer_price: customerPrice,
      });
      if (itemInsert.error) throw itemInsert.error;
      await admin.from("payments").insert({ order_id: orderInsert.data.id, customer_id: profile.id, amount: Number(body.total || customerPrice * quantity), status: "pending", provider: "checkout" });
      await admin.from("notifications").insert({ recipient_id: profile.id, kind: "payment", title: "Complete payment", body: `${product.name} is reserved for ${startDate}. Complete payment to send the order to the vendor.`, entity_type: "order", entity_id: orderInsert.data.id });
      await admin.from("communication_outbox").insert({ recipient_id: profile.id, channel: "in_app", template_key: "payment_reminder", payload: { orderId: orderInsert.data.id, orderNumber: orderInsert.data.order_number }, scheduled_for: new Date(Date.now() + 30 * 60 * 1000).toISOString() });
      return NextResponse.json({ ok: true, scheduleId: scheduleInsert.data.id, orderId: orderInsert.data.id, orderNumber: orderInsert.data.order_number });
    }

    if (action === "mark_paid") {
      if (profile.role !== "customer") return NextResponse.json({ error: "Customer access required." }, { status: 403 });
      const orderId = String(body.orderId || "");
      const { data: order } = await admin.from("orders").select("id,order_number,schedule_id,customer_id,vendor_id,customer_total,scheduled_date,scheduled_slot,fulfilment_mode,vendor_base_total,markup_total,tax_amount,delivery_fee,order_items(product_name,quantity,unit,vendor_base_price,markup_percent,customer_price),product_schedules(start_date,end_date,recurrence,weekdays)").eq("id", orderId).eq("customer_id", profile.id).maybeSingle();
      if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
      const updated = await admin.from("payments").update({ status: "paid", provider: String(body.method || "checkout").toLowerCase(), provider_reference: String(body.reference || `SIM-${Date.now()}`), updated_at: new Date().toISOString() }).eq("order_id", order.id).eq("customer_id", profile.id);
      if (updated.error) throw updated.error;
      await admin.from("orders").update({ status: "confirmed", updated_at: new Date().toISOString() }).eq("id", order.id);
      const rawSchedule = Array.isArray(order.product_schedules) ? order.product_schedules[0] : order.product_schedules;
      const dates = rawSchedule ? scheduleDates(rawSchedule as { start_date: string; end_date?: string | null; recurrence: string; weekdays?: number[] | null }) : [String(order.scheduled_date)];
      const firstItem = Array.isArray(order.order_items) ? order.order_items[0] : order.order_items;
      const remainingDates = dates.filter((date) => date !== String(order.scheduled_date));
      for (const date of remainingDates) {
        const duplicate = await admin.from("orders").select("id").eq("schedule_id", order.schedule_id).eq("scheduled_date", date).maybeSingle();
        if (duplicate.data?.id) continue;
        const created = await admin.from("orders").insert({
          order_number: orderNumber(), schedule_id: order.schedule_id, customer_id: order.customer_id, vendor_id: order.vendor_id,
          vendor_base_total: Number(order.vendor_base_total || 0), markup_total: Number(order.markup_total || 0), tax_amount: Number(order.tax_amount || 0), delivery_fee: Number(order.delivery_fee || 0),
          customer_total: Number(order.customer_total || 0), fulfilment_mode: order.fulfilment_mode, scheduled_date: date, scheduled_slot: order.scheduled_slot, status: "confirmed",
        }).select("id").single();
        if (created.error) throw created.error;
        if (firstItem) {
          const item = firstItem as Record<string, unknown>;
          await admin.from("order_items").insert({ order_id: created.data.id, product_name: String(item.product_name || "Scheduled item"), quantity: Number(item.quantity || 1), unit: String(item.unit || "pack"), vendor_base_price: Number(item.vendor_base_price || 0), markup_percent: Number(item.markup_percent || 0), customer_price: Number(item.customer_price || 0) });
        }
        await admin.from("payments").insert({ order_id: created.data.id, customer_id: profile.id, amount: 0, status: "paid", provider: "schedule_prepaid", provider_reference: `COVERED-${order.id}` });
      }
      const { data: vendor } = await admin.from("vendors").select("owner_id,name").eq("id", order.vendor_id).maybeSingle();
      if (vendor?.owner_id) await admin.from("notifications").insert({ recipient_id: vendor.owner_id, kind: "new_order", title: "New paid order", body: `${order.order_number} is confirmed for ${order.scheduled_date}.`, entity_type: "order", entity_id: order.id });
      await admin.from("notifications").insert({ recipient_id: profile.id, kind: "payment", title: "Payment confirmed", body: `${order.order_number} is confirmed and has been sent to the vendor.`, entity_type: "order", entity_id: order.id });
      await admin.from("communication_outbox").update({ status: "cancelled" }).eq("recipient_id", profile.id).eq("template_key", "payment_reminder").contains("payload", { orderId: order.id }).eq("status", "queued");
      return NextResponse.json({ ok: true, snapshot: await commerceSnapshot(ctx) });
    }


    if (action === "update_order_status") {
      if (!(["vendor", "operations", "admin"] as Role[]).includes(profile.role)) return NextResponse.json({ error: "Not authorised." }, { status: 403 });
      const orderId = String(body.orderId || "");
      const statusMap: Record<string,string> = { Scheduled: "awarded", Confirmed: "confirmed", Preparing: "preparing", Ready: "ready", "Out for delivery": "out_for_delivery", "Ready for pickup": "ready_for_pickup", Completed: "completed", Cancelled: "cancelled", "Cancellation requested": "cancellation_requested" };
      const nextStatus = statusMap[String(body.status || "")] || String(body.status || "").toLowerCase();
      const { data: order } = await admin.from("orders").select("id,vendor_id,customer_id,order_number").eq("id", orderId).maybeSingle();
      if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
      if (profile.role === "vendor" && order.vendor_id !== profile.vendor_id) return NextResponse.json({ error: "This order belongs to another store." }, { status: 403 });
      const updated = await admin.from("orders").update({ status: nextStatus, updated_at: new Date().toISOString() }).eq("id", orderId);
      if (updated.error) throw updated.error;
      await admin.from("notifications").insert({ recipient_id: order.customer_id, kind: "order", title: `Order ${String(body.status || "updated").toLowerCase()}`, body: `${order.order_number} is now ${String(body.status || "updated").toLowerCase()}.`, entity_type: "order", entity_id: orderId });
      return NextResponse.json({ ok: true });
    }

    if (action === "reschedule_order") {
      if (profile.role !== "customer") return NextResponse.json({ error: "Customer access required." }, { status: 403 });
      const orderId = String(body.orderId || "");
      const { data: order } = await admin.from("orders").select("id,customer_id,vendor_id,order_number").eq("id", orderId).eq("customer_id", profile.id).maybeSingle();
      if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
      const updated = await admin.from("orders").update({ scheduled_date: String(body.date || ""), scheduled_slot: String(body.slot || ""), updated_at: new Date().toISOString() }).eq("id", orderId);
      if (updated.error) throw updated.error;
      const { data: vendor } = await admin.from("vendors").select("owner_id").eq("id", order.vendor_id).maybeSingle();
      if (vendor?.owner_id) await admin.from("notifications").insert({ recipient_id: vendor.owner_id, kind: "order", title: "Customer rescheduled order", body: `${order.order_number} moved to ${String(body.date || "")} · ${String(body.slot || "")}.`, entity_type: "order", entity_id: orderId });
      return NextResponse.json({ ok: true });
    }

    if (action === "save_staff") {
      if (profile.role !== "vendor" || !profile.vendor_id) return NextResponse.json({ error: "Vendor access required." }, { status: 403 });
      const staffId = body.staffId ? String(body.staffId) : "";
      const row = { vendor_id: profile.vendor_id, full_name: String(body.name || "").trim(), phone: String(body.phone || "").trim(), active: body.active !== false, updated_at: new Date().toISOString() };
      if (!row.full_name || !row.phone) return NextResponse.json({ error: "Name and phone are required." }, { status: 400 });
      const result = staffId ? await admin.from("vendor_delivery_staff").update(row).eq("id", staffId).eq("vendor_id", profile.vendor_id).select("id").single() : await admin.from("vendor_delivery_staff").insert(row).select("id").single();
      if (result.error) throw result.error;
      return NextResponse.json({ ok: true, id: result.data.id });
    }

    if (action === "delete_staff") {
      if (profile.role !== "vendor" || !profile.vendor_id) return NextResponse.json({ error: "Vendor access required." }, { status: 403 });
      const staffId = String(body.staffId || "");
      await admin.from("delivery_assignments").delete().eq("delivery_staff_id", staffId).eq("vendor_id", profile.vendor_id);
      const deleted = await admin.from("vendor_delivery_staff").delete().eq("id", staffId).eq("vendor_id", profile.vendor_id);
      if (deleted.error) throw deleted.error;
      return NextResponse.json({ ok: true });
    }

    if (action === "assign_staff") {
      if (!(["vendor", "operations", "admin"] as Role[]).includes(profile.role)) return NextResponse.json({ error: "Not authorised." }, { status: 403 });
      const orderId = String(body.orderId || "");
      const staffId = String(body.staffId || "");
      const { data: order } = await admin.from("orders").select("id,vendor_id,customer_id").eq("id", orderId).maybeSingle();
      if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
      if (profile.role === "vendor" && order.vendor_id !== profile.vendor_id) return NextResponse.json({ error: "This order belongs to another store." }, { status: 403 });
      await admin.from("delivery_assignments").delete().eq("order_id", orderId);
      if (staffId) {
        const { data: staff } = await admin.from("vendor_delivery_staff").select("id,vendor_id,full_name").eq("id", staffId).eq("vendor_id", order.vendor_id).maybeSingle();
        if (!staff) return NextResponse.json({ error: "Delivery person not found for this store." }, { status: 400 });
        const inserted = await admin.from("delivery_assignments").insert({ order_id: orderId, vendor_id: order.vendor_id, delivery_staff_id: staffId, assigned_by: profile.id });
        if (inserted.error) throw inserted.error;
        await admin.from("notifications").insert({ recipient_id: order.customer_id, kind: "delivery", title: "Delivery person assigned", body: `${staff.full_name} has been assigned to your order.`, entity_type: "order", entity_id: orderId });
      }
      return NextResponse.json({ ok: true });
    }

    if (action === "resubmit_verification") {
      if (profile.role !== "vendor" || !profile.vendor_id) return NextResponse.json({ error: "Vendor access required." }, { status: 403 });
      const documentNumber = String(body.documentNumber || "").trim();
      const expiryDate = body.expiryDate ? String(body.expiryDate) : null;
      const { data: existing } = await admin.from("vendor_documents").select("id").eq("vendor_id", profile.vendor_id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (existing?.id) await admin.from("vendor_documents").update({ document_number: documentNumber, expiry_date: expiryDate, verification_status: "submitted", updated_at: new Date().toISOString() }).eq("id", existing.id);
      else await admin.from("vendor_documents").insert({ vendor_id: profile.vendor_id, document_type: "fssai", document_number: documentNumber, storage_path: "pending-upload", expiry_date: expiryDate, verification_status: "submitted" });
      await admin.from("vendors").update({ verification_status: "submitted", operational_status: "inactive", marketplace_visible: false, updated_at: new Date().toISOString() }).eq("id", profile.vendor_id);
      const { data: ops } = await admin.from("profiles").select("id").in("role", ["operations", "admin"]);
      if (ops?.length) await admin.from("notifications").insert(ops.map((p) => ({ recipient_id: p.id, kind: "verification", title: "Vendor resubmitted verification", body: `${profile.full_name || "A vendor"} updated certification details for review.`, entity_type: "vendor", entity_id: profile.vendor_id })));
      return NextResponse.json({ ok: true });
    }

    if (action === "save_outlet_certificate") {
      if (profile.role !== "vendor" || !profile.vendor_id) return NextResponse.json({ error: "Vendor access required." }, { status: 403 });
      const outletId = String(body.outletId || "");
      const result = await admin.from("vendor_outlets").update({ certificate_number: String(body.certificateNumber || "") || null, certificate_expiry: body.certificateExpiry ? String(body.certificateExpiry) : null, updated_at: new Date().toISOString() }).eq("id", outletId).eq("vendor_id", profile.vendor_id);
      if (result.error) throw result.error;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "The request could not be completed." }, { status: 500 });
  }
}
