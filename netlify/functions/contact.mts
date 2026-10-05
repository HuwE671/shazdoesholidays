import type { Context, Config } from "@netlify/functions";
import { sendEmail } from "../lib/email.mts";

// Contact form: sends the message to the site's own inbox (ALERT_EMAIL) with reply-to set to the sender
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
export default async (req: Request, context: Context) => {
  if (req.method !== "POST") return Response.json({ error: "Method not allowed." }, { status: 405 });
  let b: any = {};
  try { b = await req.json(); } catch { return Response.json({ error: "Please try again." }, { status: 400 }); }
  if (b.website) return Response.json({ ok: true }); // spam trap
  const name = String(b.name || "").trim().slice(0, 80), email = String(b.email || "").trim().slice(0, 120), topic = String(b.topic || "General").slice(0, 40), message = String(b.message || "").trim().slice(0, 3000);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: "Please enter a valid email address so we can reply." }, { status: 400 });
  if (message.length < 5) return Response.json({ error: "Please add a message." }, { status: 400 });
  const html = `<p><b>From:</b> ${esc(name || "(no name)")} &lt;${esc(email)}&gt;<br><b>Topic:</b> ${esc(topic)}</p><p>${esc(message).replace(/\n/g, "<br>")}</p>`;
  const sent = await sendEmail(`Website message: ${topic}${name ? " from " + name : ""}`, html, `From: ${name} <${email}>\nTopic: ${topic}\n\n${message}`, email);
  return sent.ok ? Response.json({ ok: true }) : Response.json({ error: "Sorry, the message couldn't be sent just now. Please try again later." }, { status: 502 });
};
export const config: Config = { path: "/api/contact" };
