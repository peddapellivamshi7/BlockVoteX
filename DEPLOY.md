# Deployment Guide

## Architecture
- Frontend: React + Vite (`frontend/`) -> deploy on Vercel.
- Backend API: FastAPI (`backend/main.py`) -> deploy on Render/Railway.
- Scanner service (mock): FastAPI (`backend/local_scanner_service.py`) -> deploy as a second service.

## Environment Variables

### Frontend (Vercel)
- `VITE_API_URL=https://<your-backend-domain>`
- `VITE_SCANNER_URL=https://<your-scanner-domain>`

### Backend API service
- `CORS_ORIGINS=https://<your-vercel-domain>`
- `FRONTEND_ORIGIN=https://<your-vercel-domain>`

### Scanner service
- `CORS_ORIGINS=https://<your-vercel-domain>`

## Deploy Backend API (Render)
1. Create a new Web Service from this GitHub repo.
2. Root directory: repository root.
3. Build command:
```bash
pip install -r requirements.txt
```
4. Start command:
```bash
uvicorn backend.main:app --host 0.0.0.0 --port $PORT
```
5. Add the environment variables listed above.

## Deploy Scanner Service (Render)
1. Create another Web Service from the same repo.
2. Root directory: repository root.
3. Build command:
```bash
pip install -r requirements.txt
```
4. Start command:
```bash
uvicorn backend.local_scanner_service:app --host 0.0.0.0 --port $PORT
```
5. Add scanner `CORS_ORIGINS`.

## Deploy Frontend (Vercel)
1. Import GitHub repo in Vercel.
2. Set Root Directory to `frontend`.
3. Build command:
```bash
npm run build
```
4. Output directory: `dist`.
5. Add frontend environment variables.

## Browser and Device Notes
- Use HTTPS endpoints for all deployed services.
- Camera access requires secure context (HTTPS).
- The scanner service here is a mock service and not physical USB access from the browser.
- For true production biometrics across devices, replace this with WebAuthn/passkeys or a supported client SDK flow.
