import { NextRequest } from "next/server";
import {
  PATCH as customerServicePATCH,
  POST as customerServicePOST,
} from "@/app/api/customer-service/support/[id]/route";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  context: { params: { id: string } }
) {
  return customerServicePATCH(req, context);
}

export async function POST(
  req: NextRequest,
  context: { params: { id: string } }
) {
  return customerServicePOST(req, context);
}
