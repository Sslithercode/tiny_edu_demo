"use client";

import { useState, useRef, useEffect, useCallback } from "react";

type Role = "user" | "assistant";
type Message = { id: string; role: Role; content: string; streaming?: boolean };
function uid() { return Math.random().toString(36).slice(2, 10); }

function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setInView(true); obs.disconnect(); }
    }, { threshold });
    obs.observe(el); return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function FadeUp({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, inView } = useInView();
  return (
    <div ref={ref} className={className} style={{
      opacity: inView ? 1 : 0,
      transform: inView ? "translateY(0)" : "translateY(24px)",
      transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
    }}>{children}</div>
  );
}

/* ── Fonts injected via style tag ── */
const FONT_LINK = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Mono:wght@300;400;500&family=DM+Sans:wght@300;400;500&display=swap');
`;

/* ── Chat ── */
function ChatWidget() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);
  const stop = useCallback(() => abortRef.current?.abort(), []);

  const send = useCallback(async (promptText?: string) => {
    const msg = (promptText ?? input).trim();
    if (!msg || generating) return;
    const userMsg: Message = { id: uid(), role: "user", content: msg };
    const asstMsg: Message = { id: uid(), role: "assistant", content: "", streaming: true };
    setMessages(prev => [...prev, userMsg, asstMsg]);
    setInput(""); setGenerating(true);
    abortRef.current = new AbortController();
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, max_new_tokens: 150, temperature: 0.8, top_k: 40 }),
        signal: abortRef.current.signal,
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const reader = res.body.getReader(); const dec = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        const chunk = dec.decode(value, { stream: true });
        setMessages(prev => {
          const copy = [...prev]; const last = copy[copy.length - 1];
          if (last?.role === "assistant") copy[copy.length - 1] = { ...last, content: last.content + chunk };
          return copy;
        });
      }
    } catch (e: unknown) {
      if ((e as Error)?.name !== "AbortError") setMessages(prev => {
        const copy = [...prev]; const last = copy[copy.length - 1];
        if (last?.role === "assistant") copy[copy.length - 1] = { ...last, content: "[generation failed]", streaming: false };
        return copy;
      });
    } finally {
      setMessages(prev => {
        const copy = [...prev]; const last = copy[copy.length - 1];
        if (last?.role === "assistant") copy[copy.length - 1] = { ...last, streaming: false };
        return copy;
      });
      setGenerating(false);
    }
  }, [input, generating]);

  const SUGGESTED = ["What is photosynthesis?", "Who wrote Hamlet?", "47 + 83 =", "What is the capital of Japan?"];

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5 space-y-4 min-h-0">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col justify-center gap-3">
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.2em", color: "#a1a1aa", textTransform: "uppercase" }}>Try asking</p>
            <div className="space-y-0">
              {SUGGESTED.map(p => (
                <button key={p} onClick={() => send(p)}
                  className="block w-full text-left py-2.5 border-b border-zinc-100 hover:border-zinc-400 transition-all group"
                  style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#71717a" }}>
                  <span style={{ color: "#d4d4d8", marginRight: 12 }}>→</span>
                  <span className="group-hover:text-zinc-900 transition-colors">{p}</span>
                </button>
              ))}
            </div>
          </div>
        ) : messages.map(m => m.role === "user" ? (
          <div key={m.id} className="flex justify-end">
            <div className="max-w-[75%] text-sm text-white px-4 py-2.5 rounded-2xl rounded-tr-sm leading-relaxed"
              style={{ background: "#09090b", fontFamily: "'DM Sans', sans-serif" }}>{m.content}</div>
          </div>
        ) : (
          <div key={m.id} className="flex gap-3">
            <span style={{ color: "#a78bfa", fontSize: 11, marginTop: 2, flexShrink: 0, userSelect: "none" }}>◈</span>
            <div className="flex-1 text-sm leading-relaxed whitespace-pre-wrap pl-2 border-l-2"
              style={{ borderColor: "#f4f4f5", color: "#3f3f46", fontFamily: "'DM Sans', sans-serif" }}>
              {!m.content && m.streaming ? <span style={{ color: "#d4d4d8" }}>thinking…</span> : m.content}
              {m.streaming && m.content && <span className="animate-pulse" style={{ color: "#a78bfa" }}>▍</span>}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-zinc-100 px-5 py-3.5">
        <div className="flex gap-3 items-end">
          <textarea value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            disabled={generating} placeholder="Ask Parchment something…" rows={1}
            className="flex-1 bg-transparent resize-none focus:outline-none placeholder-zinc-300 text-zinc-800 disabled:opacity-40 py-1"
            style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, maxHeight: 100, overflowY: "auto", borderBottom: "1px solid #e4e4e7" }} />
          {generating
            ? <button onClick={stop} style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#ef4444", paddingBottom: 4 }}>stop</button>
            : <button onClick={() => send()} disabled={!input.trim()}
                style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: input.trim() ? "#09090b" : "#d4d4d8", paddingBottom: 4, transition: "color 0.15s" }}>
                send →
              </button>}
        </div>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#d4d4d8", marginTop: 8, letterSpacing: "0.05em" }}>
          arithmetic: use "47 + 83 =" format · shift+enter for newline
        </p>
      </div>
    </div>
  );
}

/* ── Pipeline ── */
const STEPS = [
  { n: "01", label: "Architecture", detail: "RoPE · RMSNorm · SwiGLU" },
  { n: "02", label: "Pretraining", detail: "4B tokens · FineWeb-Edu" },
  { n: "03", label: "SFT", detail: "7k examples · Dolly" },
  { n: "04", label: "ONNX Export", detail: "Opset 17 · fp32 trace" },
  { n: "05", label: "FP16 Quant", detail: "479 MB" },
  { n: "06", label: "Modal", detail: "Serverless · CPU" },
  { n: "07", label: "Next.js", detail: "Streaming proxy" },
];

function Pipeline() {
  const { ref, inView } = useInView(0.2);
  return (
    <div ref={ref} className="overflow-x-auto pb-2">
      <div className="flex items-start min-w-max gap-0">
        {STEPS.map((s, i) => (
          <div key={s.n} className="flex items-start" style={{ opacity: inView ? 1 : 0, transition: `opacity 0.4s ease ${i * 70}ms` }}>
            <div className="flex flex-col pr-8">
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#a78bfa", letterSpacing: "0.15em", marginBottom: 6 }}>{s.n}</span>
              <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: "#09090b" }}>{s.label}</span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#a1a1aa", marginTop: 3 }}>{s.detail}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex items-center mr-8 mt-6" style={{ opacity: inView ? 1 : 0, transition: `opacity 0.3s ease ${i * 70 + 150}ms` }}>
                <div style={{ width: 24, height: 1, background: "#e4e4e7" }} />
                <span style={{ color: "#d4d4d8", fontSize: 12, marginLeft: -1 }}>›</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Helpers ── */
function Divider() {
  return <div style={{ borderTop: "1px solid #f4f4f5", margin: "72px 0" }} />;
}

function SectionNum({ n }: { n: string }) {
  return (
    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#a78bfa", letterSpacing: "0.15em", display: "block", marginBottom: 12 }}>{n}</span>
  );
}

function H2({ children }: { children: string }) {
  return (
    <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 40, fontWeight: 900, color: "#09090b", lineHeight: 1.1, letterSpacing: "-0.02em", marginBottom: 32 }}>{children}</h2>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: "#52525b", lineHeight: 1.8, marginBottom: 20 }}>{children}</p>
  );
}

function MonoTable({ rows }: { rows: [string, string][] }) {
  return (
    <table className="w-full">
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k} style={{ borderBottom: "1px solid #f4f4f5" }}>
            <td style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#a1a1aa", padding: "8px 16px 8px 0" }}>{k}</td>
            <td style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#3f3f46", textAlign: "right", padding: "8px 0" }}>{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function InlineCode({ children }: { children: string }) {
  return (
    <code style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, background: "#fafafa", border: "1px solid #e4e4e7", borderRadius: 4, padding: "1px 6px", color: "#52525b" }}>{children}</code>
  );
}

/* ── Bug item ── */
function BugItem({ title, problem, fix, code }: { title: string; problem: string; fix: string; code?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid #f4f4f5" }}>
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-start gap-4 py-5 text-left group">
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#f87171", border: "1px solid #fee2e2", background: "#fff1f2", borderRadius: 4, padding: "2px 6px", flexShrink: 0, marginTop: 2 }}>ERR</span>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 500, color: "#18181b", flex: 1 }} className="group-hover:text-zinc-500 transition-colors">{title}</span>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, color: "#d4d4d8", flexShrink: 0, marginTop: 2 }}>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div style={{ paddingLeft: 60, paddingBottom: 24 }} className="space-y-5">
          <div>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#a1a1aa", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8 }}>Problem</p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#52525b", lineHeight: 1.75 }}>{problem}</p>
          </div>
          <div>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#34d399", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8 }}>Fix</p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#52525b", lineHeight: 1.75 }}>{fix}</p>
          </div>
          {code && (
            <pre style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#52525b", background: "#fafafa", border: "1px solid #e4e4e7", borderRadius: 10, padding: 16, overflowX: "auto", lineHeight: 1.8 }}>{code}</pre>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Page ── */
export default function ParchmentPage() {
  return (
    <>
      <style>{FONT_LINK}</style>
      <div style={{ minHeight: "100vh", background: "#ffffff", color: "#09090b" }}>

        {/* Grid bg */}
        <div style={{
          position: "fixed", inset: 0, pointerEvents: "none",
          backgroundImage: "linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }} />

        <div style={{ position: "relative", maxWidth: 880, margin: "0 auto", padding: "0 40px" }}>

          {/* ── Hero ── */}
          <section style={{ paddingTop: 96, paddingBottom: 72 }}>
            <FadeUp>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#a1a1aa", letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 32 }}>
                SlitherCode · 2025 · Pranay Narula
              </p>

              {/* Big title */}
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(56px, 9vw, 88px)", fontWeight: 900, color: "#09090b", lineHeight: 0.95, letterSpacing: "-0.03em", marginBottom: 28 }}>
                Tiny-Edu-<em style={{ fontStyle: "italic", color: "#a78bfa" }}>166M</em>
              </h1>

              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 18, color: "#71717a", maxWidth: 520, lineHeight: 1.7, marginBottom: 12 }}>
                A 166M parameter language model built entirely from scratch — architecture, pretraining on real web data, supervised fine-tuning, ONNX export, and live streaming inference.
              </p>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#a1a1aa", letterSpacing: "0.05em" }}>
                ~$55 in cloud compute · A100-40GB · Modal · Next.js
              </p>
            </FadeUp>

            {/* Stats */}
            <FadeUp delay={80}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "32px 48px", margin: "48px 0", paddingTop: 32, borderTop: "1px solid #f4f4f5" }}>
                {[
                  ["166M", "parameters"],
                  ["~4B", "training tokens"],
                  ["~$55", "total cost"],
                  ["479 MB", "fp16 onnx"],
                  ["12", "layers"],
                  ["100 277", "vocab size"],
                ].map(([val, label]) => (
                  <div key={label}>
                    <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: "#09090b", lineHeight: 1 }}>{val}</p>
                    <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#a1a1aa", marginTop: 5, letterSpacing: "0.1em" }}>{label}</p>
                  </div>
                ))}
              </div>
            </FadeUp>

            {/* Chat embed */}
            <FadeUp delay={140}>
              <div style={{ border: "1px solid #e4e4e7", borderRadius: 20, overflow: "hidden", height: 440, boxShadow: "0 8px 48px rgba(0,0,0,0.06)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 20px", borderBottom: "1px solid #f4f4f5", background: "#fafafa" }}>
                  <span style={{ color: "#a78bfa", fontSize: 13, userSelect: "none" }}>◈</span>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#a1a1aa", letterSpacing: "0.1em" }}>tiny-edu-166m-instruct-v3 · modal cpu</span>
                  <div style={{ flex: 1 }} />
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#a1a1aa" }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399", animation: "pulse 2s infinite" }} />
                    online
                  </span>
                </div>
                <div style={{ height: "calc(100% - 46px)" }}><ChatWidget /></div>
              </div>
            </FadeUp>
          </section>

          <Divider />

          {/* ── Pipeline ── */}
          <section>
            <FadeUp>
              <SectionNum n="00" />
              <H2>The Full Pipeline</H2>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: "#71717a", maxWidth: 560, lineHeight: 1.8, marginBottom: 40 }}>
                Every component built and understood from first principles — no high-level wrappers, no pretrained checkpoints. From a blank Python file to a live streaming API.
              </p>
            </FadeUp>
            <FadeUp delay={60}><Pipeline /></FadeUp>
          </section>

          <Divider />

          {/* ── Architecture ── */}
          <section>
            <FadeUp>
              <SectionNum n="01" />
              <H2>Architecture</H2>
            </FadeUp>
            <div className="grid sm:grid-cols-5 gap-12">
              <FadeUp className="sm:col-span-3">
                <Prose>ParchmentLM is a decoder-only transformer in the LLaMA family, implemented entirely in PyTorch without any pre-built transformer blocks. Twelve layers, twelve attention heads, a hidden dimension of 768.</Prose>
                <Prose>Three modern components replace the original GPT-2 design: <strong style={{ color: "#18181b" }}>RoPE</strong> for relative positional encoding that generalises beyond training length, <strong style={{ color: "#18181b" }}>RMSNorm</strong> for simpler pre-normalisation, and <strong style={{ color: "#18181b" }}>SwiGLU</strong> feed-forward blocks — the same combination used by LLaMA and PaLM.</Prose>
                <Prose>The input embedding matrix (100,277 × 768 = 77M parameters) is tied to the output projection — a weight-sharing trick that saves memory in PyTorch but is materialised separately in ONNX, a key reason the exported file is larger than expected.</Prose>
              </FadeUp>
              <FadeUp delay={80} className="sm:col-span-2">
                <MonoTable rows={[
                  ["d_model", "768"],
                  ["n_layers", "12"],
                  ["n_heads", "12"],
                  ["d_k (per head)", "64"],
                  ["ffn_hidden", "2 048"],
                  ["max_seq_len", "1 024"],
                  ["vocab_size", "100 277"],
                  ["pos enc", "RoPE (θ=10k)"],
                  ["norm", "RMSNorm (ε=1e-6)"],
                  ["activation", "SwiGLU"],
                  ["attention", "FlashAttention"],
                  ["weight tying", "yes"],
                ]} />
              </FadeUp>
            </div>
          </section>

          <Divider />

          {/* ── Pretraining ── */}
          <section>
            <FadeUp>
              <SectionNum n="02" />
              <H2>Pretraining</H2>
            </FadeUp>
            <div className="grid sm:grid-cols-5 gap-12">
              <FadeUp className="sm:col-span-3">
                <Prose>The model was pretrained on <strong style={{ color: "#18181b" }}>FineWeb-Edu</strong>, a high-quality filtered subset of CommonCrawl curated by HuggingFace for educational content. Raw CommonCrawl is dominated by low-quality web text — forum spam, SEO content, boilerplate. FineWeb-Edu runs a quality classifier to keep only text that scores well on educational value, which matters especially at 4B tokens where every example counts more. The 10BT sample was pre-tokenised to a binary file using tiktoken's cl100k_base vocabulary and loaded via a memory-mapped dataset with correct striding to prevent leakage between chunks.</Prose>
                <Prose>Training ran on a single A100-40GB via Modal for ~14.8 hours at ~75,000 tokens per second. AdamW with β2=0.95 and cosine decay from 3e-4 to 3e-5 with a 2,000-step warmup. Effective batch size: ~131k tokens per step (16 seqs × 8 grad accum × 1,024 tokens).</Prose>
                <Prose>The fundamental constraint: 4B tokens is roughly 13× less than what a model this size typically trains on. The model is undertrained relative to its capacity — a known limitation that directly affects hallucination rates downstream.</Prose>
              </FadeUp>
              <FadeUp delay={80} className="sm:col-span-2">
                <MonoTable rows={[
                  ["dataset", "FineWeb-Edu 10BT"],
                  ["tokens", "~4B"],
                  ["tokeniser", "cl100k_base"],
                  ["hardware", "A100-40GB · Modal"],
                  ["throughput", "~75k tok/sec"],
                  ["duration", "~14.8 hrs"],
                  ["cost", "~$46"],
                  ["optimizer", "AdamW"],
                  ["β1 / β2", "0.9 / 0.95"],
                  ["weight decay", "0.1"],
                  ["lr", "3e-4 → 3e-5 cosine"],
                  ["warmup", "2 000 steps"],
                  ["precision", "bfloat16"],
                ]} />
              </FadeUp>
            </div>
          </section>

          <Divider />

          {/* ── SFT ── */}
          <section>
            <FadeUp>
              <SectionNum n="03" />
              <H2>Supervised Fine-Tuning</H2>
            </FadeUp>
            <div className="grid sm:grid-cols-5 gap-12">
              <FadeUp className="sm:col-span-3">
                <Prose>The first SFT attempt used <strong style={{ color: "#18181b" }}>Alpaca</strong>. It failed. Alpaca's instructions assume a model with strong world knowledge and multi-step reasoning — capabilities that require far more pretraining than 4B tokens. The base model had no footing for complex instruction following and loss collapsed without useful generalisation.</Prose>
                <Prose>The dataset was switched to <strong style={{ color: "#18181b" }}>Databricks Dolly-15k</strong>, filtered to three categories — <InlineCode>closed_qa</InlineCode>, <InlineCode>open_qa</InlineCode>, and <InlineCode>information_extraction</InlineCode> — roughly 7k examples of grounded factual Q&A matched to the base model's actual capability level.</Prose>
                <Prose>Loss was computed on completion tokens only — prompt and padding tokens were masked to -100. Training on the full sequence would penalise the model for not predicting the user's question, which is both wasteful and counterproductive: the goal is to teach response generation, not input reconstruction.</Prose>
                <Prose>A subtle but important issue arose with the pad token. The natural choice would be to reuse <InlineCode>{"<|endoftext|>"}</InlineCode> (token 100257) for padding — but that token also serves as the stop signal the model needs to learn to emit at the end of each turn. If EOT is used as padding and then masked, the model sees it scattered throughout sequences as a meaningless filler token, which corrupts the stop signal. The fix was a dedicated pad token — <InlineCode>{"<|endofprompt|>"}</InlineCode> (token 100276) — so EOT stays meaningful and the model learns to generate it reliably as a stop condition.</Prose>
                <div style={{ borderLeft: "2px solid #e4e4e7", paddingLeft: 16, marginTop: 8 }}>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#a1a1aa", lineHeight: 1.75 }}>
                    The model still hallucinates on out-of-distribution factual questions — a direct consequence of undertraining. 4B tokens gives a surface-level grasp of language but insufficient factual grounding to be reliable. Arithmetic is consistent up to ~2–3 digit operands.
                  </p>
                </div>
              </FadeUp>
              <FadeUp delay={80} className="sm:col-span-2 space-y-6">
                <div>
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#a1a1aa", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 10 }}>Chat template</p>
                  <pre style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#52525b", background: "#fafafa", border: "1px solid #e4e4e7", borderRadius: 10, padding: 14, lineHeight: 1.9 }}>{`system\n{content}<|endoftext|>\nuser\n{content}<|endoftext|>\nassistant\n{content}<|endoftext|>`}</pre>
                </div>
                <MonoTable rows={[
                  ["datasets", "Dolly-15k (filtered)"],
                  ["examples", "~7k"],
                  ["loss", "completion-only"],
                  ["pad token", "<|endofprompt|>"],
                  ["stop token", "<|endoftext|>"],
                  ["epochs", "8"],
                  ["lr", "1e-4 cosine"],
                  ["duration", "~38 min"],
                  ["cost", "~$1.50"],
                ]} />
              </FadeUp>
            </div>
          </section>

          <Divider />

          {/* ── ONNX ── */}
          <section>
            <FadeUp>
              <SectionNum n="04" />
              <H2>ONNX Export & Quantisation</H2>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: "#71717a", maxWidth: 560, lineHeight: 1.8, marginBottom: 40 }}>
                Exporting to ONNX enables inference outside Python — the API runs via <InlineCode>onnxruntime</InlineCode> with no PyTorch dependency. Four non-obvious bugs had to be debugged before the export ran correctly.
              </p>
            </FadeUp>
            <FadeUp delay={60}>
              <BugItem
                title="RoPE lazy cache traced as dynamic ops"
                problem="The cos/sin cache is None at init and built on first forward. PyTorch's JIT tracer evaluates the if-None branch at trace time — if the cache hasn't been built, the build-cache code gets traced, creating dynamic ops that break ONNX export."
                fix="Run a warmup forward pass before tracing. The tracer then sees the already-built branch and bakes the full 1,024-row cos/sin tables as FP32 constants. The [:, :, :seq] slice stays dynamic so variable-length inputs still work."
                code={`_dummy = torch.zeros(1, 16, dtype=torch.long)\nwith torch.no_grad():\n    _ = model(_dummy)   # fills all 12 RoPE caches\n# now trace — tracer sees "cache already built" branch`}
              />
              <BugItem
                title="bfloat16 — no Pow kernel in onnxruntime CPU"
                problem="The model was trained in bfloat16. Loading in bf16 and tracing produces a valid ONNX graph — but onnxruntime's CPU provider has no Pow(bfloat16) kernel, used in RMSNorm. The model traces without error but fails at inference with a type mismatch."
                fix="Force torch_dtype=torch.float32 in from_pretrained(). All weights load and trace in FP32. FP16 conversion is applied as a separate post-processing step via onnxconverter_common."
              />
              <BugItem
                title="24 Cast nodes with stale to=FLOAT attribute after FP16 conversion"
                problem="onnxconverter_common updates the output value_info type of Cast nodes to FP16 but leaves the node's `to` attribute still pointing at FLOAT (1). onnxruntime rejects the model — the attribute and actual output type disagree."
                fix="After conversion, iterate all Cast nodes and sync the `to` attribute to match value_info."
                code={`vi_type = {vi.name: vi.type.tensor_type.elem_type\n           for vi in model.graph.value_info}\nfor node in model.graph.node:\n    if node.op_type != "Cast": continue\n    for attr in node.attribute:\n        if attr.name == "to" and attr.i == TensorProto.FLOAT:\n            if vi_type.get(node.output[0]) == TensorProto.FLOAT16:\n                attr.i = TensorProto.FLOAT16`}
              />
              <BugItem
                title="INT8 quantisation is larger than FP16"
                problem="Weight tying means the 77M embedding matrix is shared in PyTorch but materialised twice in ONNX (957MB FP32). INT8 tools skip embedding Gather ops — so the vocab table stays FP32, producing a 703MB INT8 file, larger than the 479MB FP16."
                fix="FP16 conversion processes all tensors uniformly including embeddings. FP16 is the correct target — lossless halving of every weight, no rounding beyond what training already introduced."
              />
            </FadeUp>
          </section>

          <Divider />

          {/* ── Serving ── */}
          <section>
            <FadeUp>
              <SectionNum n="05" />
              <H2>Serving on Modal</H2>
            </FadeUp>
            <div className="grid sm:grid-cols-5 gap-12">
              <FadeUp className="sm:col-span-3">
                <Prose>Vercel's free tier imposes a 10-second function timeout — a 166M model generating 200 tokens without a KV cache reliably exceeds that. Modal solves this: serverless functions with no generation timeout, billed only for active CPU time. At portfolio-scale traffic (~10 req/day), the $30/month free credit covers it indefinitely.</Prose>
                <Prose>The container image installs only <InlineCode>onnxruntime</InlineCode> and <InlineCode>tiktoken</InlineCode> (~55MB) — no PyTorch, no transformers. The ONNX model lives in a Modal Volume mounted at container start. The ORT session loads once via <InlineCode>@modal.enter()</InlineCode> and stays resident across requests while warm. Cold start is ~2 seconds.</Prose>
                <Prose>The Next.js route on Vercel is a thin proxy — it forwards the request to Modal and pipes the streaming response back to the browser. UTF-8 streaming is handled by decoding all generated tokens as a batch per step and streaming only the character delta, preventing replacement characters on multi-byte sequences.</Prose>
              </FadeUp>
              <FadeUp delay={80} className="sm:col-span-2">
                <MonoTable rows={[
                  ["frontend", "Next.js · Vercel free"],
                  ["inference", "Modal serverless"],
                  ["runtime", "onnxruntime (C++)"],
                  ["model", "Modal Volume · 479MB"],
                  ["image", "~55MB (no torch)"],
                  ["cold start", "~2s"],
                  ["idle cost", "$0"],
                  ["active cost", "~$0.02/day"],
                  ["concurrency", "4 per container"],
                  ["timeout", "none"],
                ]} />
              </FadeUp>
            </div>
          </section>

          <Divider />

          {/* ── Next Steps ── */}
          <section>
            <FadeUp>
              <SectionNum n="06" />
              <H2>Next Steps</H2>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: "#71717a", lineHeight: 1.8, marginBottom: 32 }}>
                Three directions to extend this work.
              </p>
            </FadeUp>
            <FadeUp delay={60}>
              {[
                {
                  title: "KV Cache",
                  tag: "inference",
                  body: "Re-export the ONNX graph with past_key_values as inputs/outputs so each generation step processes one token instead of the full growing sequence. No retraining — just a new export and updated inference loop."
                },
                {
                  title: "Transcoder & Circuit Tracing",
                  tag: "interpretability",
                  body: "Train a transcoder on the residual stream to decompose MLP activations into interpretable features, then trace circuits through the attention heads. The small scale and known architecture make this tractable in a way it isn't on production models."
                },
              ].map((item, i) => (
                <div key={item.title} style={{ borderBottom: i < 2 ? "1px solid #f4f4f5" : "none", paddingBottom: 16, marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
                    <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700, color: "#09090b" }}>{item.title}</h3>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#a78bfa", letterSpacing: "0.15em", textTransform: "uppercase" }}>{item.tag}</span>
                  </div>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#71717a", lineHeight: 1.7, maxWidth: 580 }}>{item.body}</p>
                </div>
              ))}
            </FadeUp>
          </section>

          <Divider />

          {/* ── Footer ── */}
          <footer style={{ paddingBottom: 64, display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 32 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ color: "#a78bfa", fontSize: 14, userSelect: "none" }}>◈</span>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: "#09090b" }}>tiny-edu-166M</span>
              </div>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#a1a1aa", letterSpacing: "0.05em" }}>pytorch → onnx → fp16 → modal · ~$55 total · ParchmentLM arch</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, textAlign: "right" }}>
              {[
                ["SlitherCode/tiny-edu-166m-instruct-v3", "https://huggingface.co/SlitherCode/tiny-edu-166m-instruct-v3"],
                ["SlitherCode/tiny-edu-166m", "https://huggingface.co/SlitherCode/tiny-edu-166m"],
                ["github.com/Sslithercode", "https://github.com/Sslithercode"],
              ].map(([label, href]) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                  style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#a1a1aa", textDecoration: "none", transition: "color 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#09090b")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#a1a1aa")}>
                  {label} ↗
                </a>
              ))}
            </div>
          </footer>

        </div>
      </div>
    </>
  );
}