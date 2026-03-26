import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return new NextResponse(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sitezy Preview Frame</title>
  <style>
    html, body {
      margin: 0;
      padding: 0;
      min-height: 100%;
      background: #ffffff;
    }
  </style>
</head>
<body></body>
</html>`,
    {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store, max-age=0",
      },
    }
  );
}
