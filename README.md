# GTM Intelligence Agent 🤖

An AI agent that researches prospect companies and generates 
personalized outreach — built to explore multi-stage LLM 
orchestration for GTM automation use cases.

## What It Does

Give it a company name and your product description.
It autonomously:

1. **Researches** the company — profile, stage, tech stack
2. **Identifies** specific pain points relevant to your product
3. **Generates** personalized email + LinkedIn outreach
4. **Self-validates** output quality and retries if it fails

## Architecture
```
POST /api/research
        ↓
  Stage 1: Company Research (LLM)
        ↓
  Stage 2: Pain Point Analysis (LLM)  
        ↓
  Stage 3: Outreach Generation (LLM)
        ↓
  Quality Gate → passes? → return result
       ↓ fails?
  Retry (max 2x) → escalate error
```

**Key engineering decisions:**

- **3-stage pipeline** — each LLM has one job, 
  does it well. Separation of concerns.
- **Quality gates** — output is validated before 
  returning. Bad output triggers automatic retry.
- **Schema-first outputs** — every LLM call returns 
  structured JSON. No free-form text in the pipeline.
- **Safe JSON parsing** — handles LLM formatting 
  quirks (markdown fences, newlines) gracefully.
- **Processing time tracking** — every response 
  includes ms taken. Performance visibility built in.

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express
- **LLM**: Claude 3.5 Sonnet via OpenRouter
- **Pattern**: Multi-stage agent with quality gates

## Quick Start
```bash
# Install
npm install

# Set environment variables
cp .env.example .env
# Add your OPENROUTER_API_KEY to .env

# Run
npm run dev
```

## Example Request
```bash
curl -X POST http://localhost:3001/api/research \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Stripe",
    "ourProduct": "AI-powered GTM automation",
    "targetRole": "Head of Sales"
  }'
```

## Example Response
```json
{
  "success": true,
  "data": {
    "companyProfile": "Stripe is a financial technology 
      company providing payment APIs...",
    "likelyPainPoints": [
      "Sales teams struggle to prioritize 8000+ 
       employee prospect database",
      "Pressure to improve revenue efficiency 
       without adding headcount"
    ],
    "personalizedEmail": {
      "subject": "Scaling enterprise sales after 
                  your Treasury launch?",
      "body": "Your move into banking services..."
    },
    "linkedInMessage": "Hi! Noticed Stripe's push 
      into Treasury...",
    "confidenceScore": 90,
    "reasoning": "Addresses their core challenge..."
  },
  "processingTimeMs": 74384
}
```
> Note: An API key was accidentally committed 
> in an early commit and has since been rotated 
> and invalidated. The repository is safe to use.
## Why I Built This

Wanted to understand the core architecture behind 
GTM automation agents — specifically how to build 
reliable multi-stage LLM pipelines where each stage 
has a specific role and outputs are validated before 
proceeding.

The quality gate + retry pattern here mirrors what 
production agent systems need: never return bad output 
silently, always validate, always have a recovery path.
