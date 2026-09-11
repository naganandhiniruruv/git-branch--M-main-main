import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!url || !anon || !service || !token) return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  const caller = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const { data: auth } = await caller.auth.getUser(token);
  if (!auth.user) return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  const { data: profile } = await caller.from("profiles").select("role,vendor_id").eq("id", auth.user.id).maybeSingle();
  if (!profile || !["vendor", "admin"].includes(profile.role)) return NextResponse.json({ error: "Vendor access is required." }, { status: 403 });
  const form = await request.formData();
  const file = form.get("file");
  const vendorId = String(form.get("vendorId") || profile.vendor_id || "");
  const outletId = String(form.get("outletId") || "");
  if (!(file instanceof File) || !vendorId) return NextResponse.json({ error: "Choose a certificate file." }, { status: 400 });
  if (profile.role === "vendor" && profile.vendor_id !== vendorId) return NextResponse.json({ error: "This certificate belongs to another store." }, { status: 403 });
  if (file.size > 12 * 1024 * 1024) return NextResponse.json({ error: "Certificate must be under 12 MB." }, { status: 413 });
  const allowed = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
  if (!allowed.includes(file.type)) return NextResponse.json({ error: "Upload a PDF, PNG, JPG or WebP file." }, { status: 400 });

  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const buckets = await admin.storage.listBuckets();
  if (!buckets.data?.some((bucket) => bucket.name === "vendor-certificates")) {
    const created = await admin.storage.createBucket("vendor-certificates", { public: false, fileSizeLimit: "12MB", allowedMimeTypes: allowed });
    if (created.error && !/already exists/i.test(created.error.message)) return NextResponse.json({ error: "Certificate storage could not be prepared." }, { status: 500 });
  }
  const ext = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || (file.type === "application/pdf" ? "pdf" : "jpg");
  const path = `${vendorId}/${outletId || "main"}/${crypto.randomUUID()}.${ext}`;
  const uploaded = await admin.storage.from("vendor-certificates").upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
  if (uploaded.error) return NextResponse.json({ error: uploaded.error.message }, { status: 500 });
  if (outletId) await admin.from("vendor_outlets").update({ certificate_storage_path: path, updated_at: new Date().toISOString() }).eq("id", outletId).eq("vendor_id", vendorId);
  else {
    const { data: doc } = await admin.from("vendor_documents").select("id").eq("vendor_id", vendorId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (doc?.id) await admin.from("vendor_documents").update({ storage_path: path, updated_at: new Date().toISOString() }).eq("id", doc.id);
  }
  return NextResponse.json({ path, fileName: file.name });
}
