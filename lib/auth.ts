import { NextResponse } from "next/server";
import { organizerKey } from "./stellar";

/**
 * Organizer role check for the dashboard's mutating endpoints. The dashboard
 * sends the shared ORGANIZER_API_KEY as the x-organizer-key header. Testnet
 * POC-grade: fine for a single-organizer demo; swap for real auth (wallet
 * signatures / session tokens) before any public exposure.
 */
export function unauthorized(): NextResponse {
  return NextResponse.json({ error: "unauthorized: organizer key required" }, { status: 401 });
}

export function requireOrganizer(req: Request): NextResponse | null {
  const key = req.headers.get("x-organizer-key") ?? "";
  let expected = "";
  try {
    expected = organizerKey();
  } catch {
    return unauthorized();
  }
  if (!key || key !== expected) return unauthorized();
  return null;
}
