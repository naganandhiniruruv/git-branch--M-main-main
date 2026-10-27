import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!url || !anonKey || !serviceRoleKey || !token) {
    return NextResponse.json({ error: "Sign in with the invited vendor account first." }, { status: 401 });
  }

  const caller = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const { data: authData, error: authError } = await caller.auth.getUser(token);
  if (authError || !authData.user) {
    return NextResponse.json({ error: "The authenticated vendor account could not be verified." }, { status: 401 });
  }

  let invitationId: string;
  try {
    const body = await request.json() as { invitationId?: string };
    invitationId = String(body.invitationId || "");
    if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(invitationId)) {
      return NextResponse.json({ error: "The invitation link is invalid." }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "The invitation request is invalid." }, { status: 400 });
  }

  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: vendorId, error } = await admin.rpc("p0_complete_upgrade", {
    p_invitation: invitationId,
    p_invitee: authData.user.id,
  });
  if (error) {
    const message = /p0_upgrade_invitations|p0_vendor_history|p0_complete_upgrade/i.test(error.message)
      ? "P0 upgrade completion is unavailable until the reviewed lifecycle migration is applied."
      : error.message;
    return NextResponse.json({ error: message }, { status: 409 });
  }

  return NextResponse.json({ vendorId, completed: true });
}
