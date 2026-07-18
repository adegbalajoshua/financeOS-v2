import { NextRequest, NextResponse } from "next/server";
import { GET as SyncGet, POST as SyncPost } from "./sync/route";

export async function GET(req: NextRequest) {
  return SyncGet(req);
}

export async function POST(req: NextRequest) {
  return SyncPost(req);
}