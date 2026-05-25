import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Set this in .env.local after deploying:
//   PARCHMENT_MODAL_URL=https://your-workspace--parchment-parchment-infer.modal.run
// ---------------------------------------------------------------------------
const MODAL_URL = process.env.PARCHMENT_MODAL_URL;

export async function POST(req: NextRequest) {
  if (!MODAL_URL) {
    return new Response(
      JSON.stringify({ error: "PARCHMENT_MODAL_URL not set" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: {
    message?: string;
    system?: string;
    max_new_tokens?: number;
    temperature?: number;
    top_k?: number;
  };

  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const {
    message,
    system = "You are a helpful assistant.",
    max_new_tokens = 200,
    temperature = 0.0,
    top_k = 40,
  } = body;

  if (!message) {
    return new Response(
      JSON.stringify({ error: "message is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Forward to Modal endpoint and stream response back to client
  const modalRes = await fetch(MODAL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, system, max_new_tokens, temperature, top_k }),
  });

  if (!modalRes.ok || !modalRes.body) {
    return new Response(`Modal error: ${modalRes.status}`, { status: 502 });
  }

  // Stream Modal's response directly back to the browser
  return new Response(modalRes.body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}