# BlockVoteX - High Security Voting System

BlockVoteX is a next-generation, high-security digital voting platform built to ensure transparent, immutable, and cryptographically secure elections. Designed to prevent voter fraud and maintain absolute privacy, the platform leverages Hardware Security Tokens (WebAuthn/Passkeys), Facial Recognition, and an append-only Blockchain ledger.

## 🚀 Key Features

*   **Hardware Security (WebAuthn):** Eliminates password phishing by tying voter authentication to device-bound passkeys or biometric hardware (Fingerprint / FaceID).
*   **Facial Recognition (DeepFace):** Enforces a strict 1:1 mapping between a voter's physical identity and their digital passkey via deep learning facial embeddings.
*   **Cryptographic Ledger (Blockchain):** Votes are stored in an immutable, chained ledger. Any tampering instantly invalidates the block hash.
*   **Voter Receipts:** Voters receive a Digital Voting Receipt with a unique Cryptographic Hash proving their vote was mathematically sealed into the blockchain without revealing their candidate choice.
*   **Live Analytics & Security Alerts:** Admins have a real-time view of demographic turnout (age/gender), voting patterns, and automated detection of rapid bulk-voting anomalies.
*   **Multi-Tier Architecture:** Supports distinct roles: `Admin` (Global Management), `Auditor` (District-level Management), and `Voter` (End-user).
*   **Mobile-First Design:** Fully responsive, modern, and accessible interface that feels like a premium native mobile application.

## 🛠️ Technology Stack

**Frontend:**
- React (Vite)
- TailwindCSS (Styling & Responsive Design)
- Lucide React (Icons)
- SimpleWebAuthn (Passkey Integration)
- Recharts (Data Visualization)

**Backend:**
- Python (FastAPI)
- SQLite (Local Development) / PostgreSQL (Production)
- DeepFace / OpenCV (Facial Recognition & Embedding)
- Pandas (Analytics & Data ingestion)
- WebAuthn (Passkey Server-side Verification)

## 📦 Local Development Setup

### 1. Backend Setup (FastAPI)
```bash
cd backend

# Create a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn main:app --reload --port 8000
```
> The API will be running at `http://localhost:8000`

### 2. Frontend Setup (React/Vite)
```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```
> The Frontend will be running at `http://localhost:5173`

## 🗄️ Database Management
The application ingests eligible voters directly from a secure master CSV file (not tracked in Git to protect PII). Admins can also securely provision or sync users directly from the Admin Dashboard.

- **Reset Database (For Testing):** Admins can wipe active registrations using the secure endpoint: `/debug/reset?admin_id={ADMIN_VOTER_ID}`

## 🌐 Production Deployment
- **Frontend:** Deployed natively on **Vercel** (`blockvotex.vercel.app`), ensuring lighting-fast CDN global delivery and seamless HTTPS.
- **Backend:** Hosted securely on **Railway** utilizing a containerized Python environment and an attached PostgreSQL instance for persistent data storage.

## ⚖️ License
This project is proprietary and confidential. All rights reserved.
