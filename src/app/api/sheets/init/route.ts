import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST(request: Request) {
  try {
    const session: any = await auth();
    if (!session || !session.accessToken) {
      return NextResponse.json(
        { status: "error", message: "Unauthorized. Please sign in with Google first." },
        { status: 401 }
      );
    }

    const { spreadsheetId } = await request.json();
    if (!spreadsheetId) {
      return NextResponse.json(
        { status: "error", message: "Spreadsheet ID is required." },
        { status: 400 }
      );
    }

    const accessToken = session.accessToken;
    const baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;

    // 1. Get spreadsheet metadata to check existing sheets
    const metaResp = await fetch(baseUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!metaResp.ok) {
      const err = await metaResp.json().catch(() => ({}));
      return NextResponse.json(
        { status: "error", message: `Could not access Google Sheet: ${err.error?.message || metaResp.statusText}` },
        { status: metaResp.status }
      );
    }

    const meta = await metaResp.json();
    const existingTitles = new Set(meta.sheets?.map((s: any) => s.properties?.title) || []);

    const requiredSheets = [
      { title: "Events", headers: ["ID", "Timestamp", "Type", "BudgetCycleID", "AccountID", "Amount", "Payload", "Category", "Description"] },
      { title: "Accounts", headers: ["ID", "Name", "Type", "Balance", "Institution", "Status"] },
      { title: "Budget", headers: ["ID", "Category", "Planned", "Spent", "Color"] },
    ];

    // 2. Add missing sheet tabs
    const addRequests: any[] = [];
    for (const s of requiredSheets) {
      if (!existingTitles.has(s.title)) {
        addRequests.push({ addSheet: { properties: { title: s.title } } });
      }
    }

    if (addRequests.length > 0) {
      await fetch(`${baseUrl}:batchUpdate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requests: addRequests }),
      });
    }

    // 3. Ensure headers exist on each tab
    for (const s of requiredSheets) {
      const checkRange = await fetch(`${baseUrl}/values/${s.title}!A1:Z1`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const checkData = await checkRange.json().catch(() => ({}));
      const values = checkData.values || [];

      if (values.length === 0 || values[0].length === 0) {
        // Write headers
        await fetch(`${baseUrl}/values/${s.title}!A1:append?valueInputOption=USER_ENTERED`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ values: [s.headers] }),
        });
      }
    }

    return NextResponse.json({
      status: "ok",
      message: "Google Sheet verified and initialized successfully!",
      spreadsheetTitle: meta.properties?.title || "Connected Sheet",
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: "error", message: error.message || "An unexpected error occurred during initialization." },
      { status: 500 }
    );
  }
}
