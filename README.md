# TelcoCare AI Support System

AI-powered customer support system for Telkom Indonesia with intelligent ticket classification and automated escalation.

## Architecture

- **Frontend**: Next.js 16 with TypeScript, Tailwind CSS, shadcn/ui
- **ML Microservice**: FastAPI with scikit-learn for ticket classification
- **LLM**: Google Gemini 2.5-flash for intelligent judgment
- **Database**: Supabase (PostgreSQL)

## Project Structure

```
├── web/                    # Next.js frontend application
├── ai/microservice/        # FastAPI ML classification service
└── docs/                   # Documentation
```

## Deployment

### ML Microservice (Google Cloud Run)
```bash
cd ai/microservice
# Deploy via GCP Console or use deploy.sh script
```
**Live**: https://usecase-digistar-658690143178.asia-southeast2.run.app

### Frontend (Vercel)
```bash
cd web
npm install
npm run build
# Deploy to Vercel
```

## Environment Variables

**Frontend** (`web/.env`):
- `GEMINI_API_KEY` - Google Gemini API key
- `ML_SERVICE_URL` - ML microservice endpoint
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` - Supabase publishable key
- `HF_API_KEY` - Hugging Face API key

**ML Service** (`ai/microservice/.env`):
- No environment variables required (stateless service)

## Features

✅ AI-powered ticket classification (internet, billing, upgrade issues)  
✅ LLM-based judgment and validation  
✅ Auto-escalation for high-priority tickets  
✅ Real-time chat interface with typing indicators  
✅ CS dashboard for ticket monitoring  
✅ Supabase integration for ticket storage  

## Development

**Frontend:**
```bash
cd web
npm install
npm run dev
```

**ML Service:**
```bash
cd ai/microservice
pip install -r requirements.txt
uvicorn src.main:app --reload
```

## Tech Stack

- Next.js 16.1.1 (App Router, Turbopack)
- FastAPI + scikit-learn
- Google Gemini 2.5-flash
- Supabase
- Tailwind CSS v4
- Framer Motion

---

Built for Telkom Indonesia Digital Star Program 2026
