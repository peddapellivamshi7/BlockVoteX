from fastapi import FastAPI, HTTPException, Request, Body
from pydantic import BaseModel
from typing import Optional, List
import backend.database as db
import backend.auth as auth
from backend.blockchain import Blockchain
import json
import base64
import pandas as pd


from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

conn = db.init_db()
blockchain = Blockchain(conn)
challenge_store = {}

RP_ID = "localhost"
RP_NAME = "Secure Vote Blockchain"
ORIGIN = "http://localhost:5173"

# --- Models ---
# --- Models ---
class UserLogin(BaseModel):
    voter_id: str
    aadhaar: str

class RegistrationResponse(BaseModel):
    voter_id: str
    aadhaar: str
    face_image: str # Base64
    fingerprint_template: str

class AuthResponse(BaseModel):
    voter_id: str
    aadhaar: str
    face_image: str # Base64
    fingerprint_template: str

class VoteCast(BaseModel):
    voter_id: str
    district_id: str
    party_id: str
    face_image: str # Base64
    fingerprint_template: str

class ElectionControl(BaseModel):
    action: str
    auditor_id: str

class Representative(BaseModel):
    representative_id: str
    name: str
    party_name: str
    party_symbol: str
    district_id: str

class AdminCreateUser(BaseModel):
    admin_id: str
    aadhaar: str
    first_name: str
    last_name: str
    district_id: str
    voter_id: str
    role: str
    password: Optional[str] = None

# --- Endpoints ---

@app.get("/")
def read_root():
    return {"message": "Voting System API (Hash-Based)"}

# --- Registration ---

@app.post("/auth/register/verify")
def verify_reg(data: RegistrationResponse):
    voter_id = data.voter_id

    try:
        c = conn.cursor()
        
        # 1. MASTER RULE: Verify Voter ID and Aadhaar in Master DB
        c.execute("SELECT district_id, role FROM master_users WHERE voter_id=? AND aadhaar=?", (voter_id, data.aadhaar))
        master_row = c.fetchone()
        if not master_row:
             raise HTTPException(status_code=401, detail="Invalid Voter Credentials")
        
        district_id, role = master_row

        # 2. Hash Face (Secure DeepFace Embedding)
        face_hash = auth.extract_face_embedding(data.face_image)
        if not face_hash:
            raise HTTPException(status_code=400, detail="Invalid Face Data")
            
        # 3. Hash Fingerprint Template (SHA256 from local external scanner)
        fingerprint_hash = auth.hash_data(data.fingerprint_template)
            
        # 4. Check Duplicates in Registered DB
        c.execute("SELECT * FROM registered_users WHERE voter_id=?", (voter_id,))
        if c.fetchone():
             raise HTTPException(status_code=409, detail="Voter already registered!")

        c.execute("SELECT face_hash FROM registered_users")
        all_faces = [row[0] for row in c.fetchall()]
        if auth.check_duplicate_face(face_hash, all_faces):
             raise HTTPException(status_code=409, detail="Face already registered to another user!")

        c.execute("SELECT * FROM registered_users WHERE fingerprint_hash=?", (fingerprint_hash,))
        if c.fetchone():
             raise HTTPException(status_code=409, detail="Fingerprint device already registered to another user!")

        # 5. Store Data
        c.execute('''INSERT INTO registered_users 
                     (voter_id, aadhaar_number, district_id, role, face_hash, fingerprint_hash, has_voted) 
                     VALUES (?, ?, ?, ?, ?, ?, 0)''', 
                 (voter_id, data.aadhaar, district_id, role, face_hash, fingerprint_hash))
        conn.commit()
        return {"status": "registered", "verified": True}
        
    except HTTPException:
        raise
    except Exception as e:
        print(e)
        raise HTTPException(status_code=400, detail=str(e))


# --- Login ---

@app.post("/auth/login/verify")
def verify_login(data: AuthResponse):
    c = conn.cursor()
    voter_id = data.voter_id
    
    # 1. Verify Voter ID and Aadhaar in Master DB
    c.execute("SELECT district_id, role, first_name, last_name, aadhaar FROM master_users WHERE voter_id=? AND aadhaar=?", (voter_id, data.aadhaar))
    master_row = c.fetchone()
    if not master_row:
        raise HTTPException(status_code=401, detail="Invalid Voter Credentials")
    
    district_id, role, first_name, last_name, stored_aadhaar = master_row
    
    # 2. Fetch Stored Hashes
    c.execute("SELECT face_hash, fingerprint_hash FROM registered_users WHERE voter_id=?", (voter_id,))
    reg_row = c.fetchone()
    if not reg_row:
        raise HTTPException(status_code=400, detail="Biometrics not found. Please Register first.")
    
    stored_face_hash, stored_fingerprint_hash = reg_row
    
    # 3. Verify Face Data (Secure DeepFace Threshold)
    if not auth.verify_face(stored_face_hash, data.face_image):
        raise HTTPException(status_code=401, detail="Face Verification Failed - Does not match registered biometric")

    # 4. Verify Fingerprint Template against stored hash
    input_fingerprint_hash = auth.hash_data(data.fingerprint_template)
    if stored_fingerprint_hash != input_fingerprint_hash:
        raise HTTPException(status_code=401, detail="Fingerprint Verification Failed")

    return {
        "status": "success", 
        "user": {
            "voter_id": voter_id,
            "district": district_id,
            "role": role,
            "name": f"{first_name} {last_name}",
            "aadhaar_masked": f"XXXX-XXXX-{stored_aadhaar[-4:]}"
        }
    }


# --- Vote ---

@app.post("/vote")
def cast_vote(vote: VoteCast):
    c = conn.cursor()
    
    # 1. Election Active?
    c.execute("SELECT value FROM election_config WHERE key='is_active'")
    if c.fetchone()[0] != '1':
        raise HTTPException(status_code=400, detail="Election Closed")

    # 2. Already Voted?
    c.execute("SELECT has_voted, face_hash, fingerprint_hash FROM registered_users WHERE voter_id=?", (vote.voter_id,))
    user_row = c.fetchone()
    if not user_row:
        raise HTTPException(status_code=400, detail="Voter not registered")
    if user_row[0]:
        raise HTTPException(status_code=400, detail="Already voted")

    # 3. Verify Face Data (Secure DeepFace Threshold)
    if not auth.verify_face(user_row[1], vote.face_image):
        c.execute("INSERT INTO logs (event_type, description, user_id) VALUES (?, ?, ?)", 
                 ("FRAUD_Attempt", f"Face verification failed during vote for {vote.voter_id}", vote.voter_id))
        conn.commit()
        raise HTTPException(status_code=401, detail="Face Verification Failed - Does not match registered biometric")

    # 4. Verify Fingerprint Template against stored hash
    input_fingerprint_hash = auth.hash_data(vote.fingerprint_template)
    if user_row[2] != input_fingerprint_hash:
        c.execute("INSERT INTO logs (event_type, description, user_id) VALUES (?, ?, ?)", 
                 ("FRAUD_Attempt", f"Fingerprint verification failed during vote for {vote.voter_id}", vote.voter_id))
        conn.commit()
        raise HTTPException(status_code=401, detail="Fingerprint Verification Failed")

    # 5. Add Block
    new_block = blockchain.add_vote(vote.voter_id, vote.district_id, vote.party_id)
    c.execute("UPDATE registered_users SET has_voted=1 WHERE voter_id=?", (vote.voter_id,))
    conn.commit()
    
    return {
        "status": "success", 
        "block_hash": new_block.current_hash,
        "timestamp": new_block.timestamp
    }

@app.post("/representatives")
def add_rep(rep: Representative):
    c = conn.cursor()
    try:
        c.execute("INSERT INTO representatives (representative_id, name, party_name, party_symbol, district_id) VALUES (?, ?, ?, ?, ?)",
                  (rep.representative_id, rep.name, rep.party_name, rep.party_symbol, rep.district_id))
        conn.commit()
        return {"status": "added"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/representatives")
def get_all_reps():
    c = conn.cursor()
    c.execute("SELECT * FROM representatives")
    cols = [d[0] for d in c.description]
    return [dict(zip(cols, row)) for row in c.fetchall()]

@app.get("/representatives/{district_id}")
def get_reps_by_district(district_id: str):
    c = conn.cursor()
    c.execute("SELECT * FROM representatives WHERE district_id=?", (district_id,))
    # Convert to list of dicts
    cols = [d[0] for d in c.description]
    return [dict(zip(cols, row)) for row in c.fetchall()]

@app.delete("/representatives/{representative_id}")
def delete_rep(representative_id: str):
    c = conn.cursor()
    c.execute("DELETE FROM representatives WHERE representative_id=?", (representative_id,))
    conn.commit()
    return {"status": "deleted"}

@app.get("/admin/users")
def get_admin_managed_users(admin_id: str):
    c = conn.cursor()
    c.execute("SELECT role FROM master_users WHERE voter_id=?", (admin_id,))
    admin_row = c.fetchone()
    if not admin_row or admin_row[0] != "Admin":
        raise HTTPException(status_code=403, detail="Only Admin can view user management data.")

    c.execute(
        """SELECT id, aadhaar, first_name, last_name, district_id, voter_id, role
           FROM master_users
           WHERE role IN ('Voter', 'Auditor')
           ORDER BY id DESC"""
    )
    cols = [d[0] for d in c.description]
    return [dict(zip(cols, row)) for row in c.fetchall()]

@app.post("/admin/users")
def create_voter_or_auditor(data: AdminCreateUser):
    c = conn.cursor()

    c.execute("SELECT role FROM master_users WHERE voter_id=?", (data.admin_id,))
    admin_row = c.fetchone()
    if not admin_row or admin_row[0] != "Admin":
        raise HTTPException(status_code=403, detail="Only Admin can add users.")

    role = (data.role or "").strip().title()
    if role not in {"Voter", "Auditor"}:
        raise HTTPException(status_code=400, detail="Role must be either Voter or Auditor.")

    voter_id = (data.voter_id or "").strip().upper()
    if not auth.validate_voter_id_format(voter_id):
        raise HTTPException(status_code=400, detail="Invalid voter_id format. Use AAA999999.")

    aadhaar = (data.aadhaar or "").strip()
    if not (aadhaar.isdigit() and len(aadhaar) == 12):
        raise HTTPException(status_code=400, detail="Aadhaar must be a 12-digit number.")

    c.execute("SELECT 1 FROM master_users WHERE voter_id=? OR aadhaar=?", (voter_id, aadhaar))
    if c.fetchone():
        raise HTTPException(status_code=409, detail="User with this voter_id or aadhaar already exists.")

    c.execute("SELECT COALESCE(MAX(id), 0) + 1 FROM master_users")
    next_id = c.fetchone()[0]

    password = data.password if data.password else f"{voter_id}@{aadhaar[-4:]}"

    c.execute(
        """INSERT INTO master_users (id, aadhaar, first_name, last_name, district_id, voter_id, password, role)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            next_id,
            aadhaar,
            data.first_name.strip(),
            data.last_name.strip(),
            data.district_id.strip(),
            voter_id,
            password,
            role,
        ),
    )
    conn.commit()

    return {
        "status": "created",
        "user": {
            "id": next_id,
            "aadhaar": aadhaar,
            "first_name": data.first_name.strip(),
            "last_name": data.last_name.strip(),
            "district_id": data.district_id.strip(),
            "voter_id": voter_id,
            "role": role,
        },
    }

@app.delete("/admin/users/{voter_id}")
def delete_voter_or_auditor(voter_id: str, admin_id: str):
    c = conn.cursor()

    c.execute("SELECT role FROM master_users WHERE voter_id=?", (admin_id,))
    admin_row = c.fetchone()
    if not admin_row or admin_row[0] != "Admin":
        raise HTTPException(status_code=403, detail="Only Admin can delete users.")

    c.execute("SELECT role FROM master_users WHERE voter_id=?", (voter_id,))
    target_row = c.fetchone()
    if not target_row:
        raise HTTPException(status_code=404, detail="User not found.")

    target_role = target_row[0]
    if target_role not in {"Voter", "Auditor"}:
        raise HTTPException(status_code=400, detail="Only Voter/Auditor accounts can be deleted here.")

    c.execute("DELETE FROM registered_users WHERE voter_id=?", (voter_id,))
    c.execute("DELETE FROM master_users WHERE voter_id=?", (voter_id,))
    conn.commit()

    return {"status": "deleted", "voter_id": voter_id, "role": target_role}

# --- Utils ---
@app.get("/election/status")
def get_status():
    c = conn.cursor()
    c.execute("SELECT value FROM election_config WHERE key='is_active'")
    row = c.fetchone()
    return {"active": row[0] == '1' if row else False}

@app.post("/election/control")
def control_election(data: ElectionControl):
    if data.action not in {"start", "stop"}:
        raise HTTPException(status_code=400, detail="Invalid action. Use 'start' or 'stop'.")

    c = conn.cursor()
    c.execute(
        "SELECT role FROM master_users WHERE voter_id=?",
        (data.auditor_id,),
    )
    row = c.fetchone()
    if not row or row[0] not in {"Auditor", "Admin"}:
        raise HTTPException(status_code=403, detail="Only Auditor/Admin can control election state.")

    val = '1' if data.action == "start" else '0'
    c.execute("UPDATE election_config SET value=? WHERE key='is_active'", (val,))
    conn.commit()
    return {"status": "updated", "active": val == '1'}

@app.get("/stats")
def get_stats():
    c = conn.cursor()
    c.execute("SELECT count(*) FROM registered_users")
    total = c.fetchone()[0]
    c.execute("SELECT count(*) FROM registered_users WHERE has_voted=1")
    voted = c.fetchone()[0]
    c.execute("SELECT party_id, count(*) as cnt FROM blockchain GROUP BY party_id")
    parties = [{"party": r[0], "votes": r[1]} for r in c.fetchall()]
    return {"total_users": total, "voted_users": voted, "party_data": parties}

@app.get("/blockchain")
def get_chain():
    c = conn.cursor()
    c.execute("SELECT * FROM blockchain")
    cols = [d[0] for d in c.description]
    return [dict(zip(cols, row)) for row in c.fetchall()]

@app.get("/logs")
def get_logs():
    return pd.read_sql("SELECT * FROM logs ORDER BY timestamp DESC", conn).to_dict(orient="records")
