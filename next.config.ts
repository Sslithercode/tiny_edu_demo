import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // onnxruntime-node ships native .node bindings — tell Next.js not to bundle it.
  // tiktoken uses WASM in the browser but native bindings in Node — same treatment.
  serverExternalPackages: ["onnxruntime-node", "tiktoken"],
};

export default nextConfig;
