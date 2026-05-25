# tiny-edu-166M — Web Inference

Next.js frontend and API proxy for [tiny-edu-166M-instruct-v3](https://huggingface.co/SlitherCode/tiny-edu-166m-instruct-v3) — a 166M parameter decoder-only transformer built from scratch and served via Modal serverless inference.

## Stack

- **Frontend** — Next.js 14 App Router, deployed on Vercel
- **Inference** — Modal serverless CPU, `onnxruntime` + `tiktoken`, no PyTorch
- **Model** — FP16 ONNX export of ParchmentLM, stored in a Modal Volume

## Setup

### 1. Deploy the Modal inference endpoint

```bash
cd ..   # modal file lives outside the Next.js project
modal volume create parchment-model
modal volume put parchment-model onnx_bundle/parchment_instruct_fp16.onnx /model/parchment_instruct_fp16.onnx
modal deploy parchment_modal.py
# copy the printed endpoint URL
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
# .env.local
PARCHMENT_MODAL_URL=https://your-workspace--parchment-parchment-infer.modal.run
```

### 4. Run locally

```bash
npm run dev
# → http://localhost:3000
```

## Deployment

Push to GitHub and connect to Vercel. Add `PARCHMENT_MODAL_URL` under Project → Settings → Environment Variables.

## Model

| | |
|---|---|
| Architecture | ParchmentLM (decoder-only, LLaMA-style) |
| Parameters | ~166M |
| Pretraining | ~4B tokens · FineWeb-Edu · A100-40GB |
| SFT | ~7k examples · Dolly-15k (filtered) |
| Export | ONNX opset 17 · FP16 quantised |
| Tokenizer | tiktoken cl100k_base (100,277 tokens) |
| Total cost | ~$55 |

**HuggingFace:** [instruct](https://huggingface.co/SlitherCode/tiny-edu-166m-instruct-v3) · [base](https://huggingface.co/SlitherCode/tiny-edu-166m)

## Notes

- Arithmetic works best with `"47 + 83 ="` format, not natural language
- Model hallucinates on out-of-distribution factual questions — undertrained at 4B tokens vs ~300B typical
- `ORT_ENABLE_EXTENDED` not `ORT_ENABLE_ALL` — the latter crashes on this model's FP16 Cast nodes