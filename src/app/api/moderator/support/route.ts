import { NextRequest } from "next/server";
import { GET as customerServiceGET } from "@/app/api/customer-service/support/route";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return customerServiceGET(req);
}
