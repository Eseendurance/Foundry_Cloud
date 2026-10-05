import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (session.role === "member") {
    return NextResponse.json({ error: "Only workspace admins can confirm bank transfers." }, { status: 403 });
  }
  const { id } = await params;
  const result = await query<{ id: string }>(
    `UPDATE payment_orders
     SET status = 'PAID', confirmed_by = $1, paid_at = now(), updated_at = now()
     WHERE id = $2 AND organization_id = $3 AND created_by <> $1
       AND method = 'BANK_TRANSFER' AND status = 'PROOF_SUBMITTED'
       AND proof_file IS NOT NULL
     RETURNING id`,
    [session.userId, id, session.organizationId]
  );
  if (!result[0]) {
    return NextResponse.json(
      { error: "The order must have submitted proof and be reviewed by a different workspace admin." },
      { status: 409 }
    );
  }
  return NextResponse.json({ status: "PAID", orderId: result[0].id });
}
