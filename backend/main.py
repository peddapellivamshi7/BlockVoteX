from fastapi import FastAPI, HTTPException, Request, Body
from pydantic import BaseModel
from typing import Optional, List
try:
    from backend import database as db
    from backend import auth as auth
    from backend.blockchain import Blockchain
except ModuleNotFoundError:
    import database as db
    import auth as auth
    from blockchain import Blockchain
import json
import base64
import pandas as pd
import os


from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

raw_cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,https://blockvotex.vercel.app").strip()
allow_origins = [origin.strip() for origin in raw_cors_origins.split(",") if origin.strip()]
if not allow_origins:
    allow_origins = ["http://localhost:5173", "https://blockvotex.vercel.app"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

conn = db.init_db()
blockchain = Blockchain(conn)
challenge_store = {}

import os

RP_ID = os.getenv("RP_ID", "blockvotex.vercel.app")
ORIGIN = os.getenv("ORIGIN", "https://blockvotex.vercel.app")
FRONTEND_URL = ORIGIN
RP_NAME = os.getenv("RP_NAME", "Secure Vote Blockchain")

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

from webauthn import generate_registration_options, verify_registration_response, generate_authentication_options, verify_authentication_response
from webauthn.helpers.structs import RegistrationCredential, AuthenticationCredential, AuthenticatorSelectionCriteria, AuthenticatorAttachment, UserVerificationRequirement, ResidentKeyRequirement
from webauthn.helpers.options_to_json import options_to_json

class AdminCreateUser(BaseModel):
    admin_id: str
    aadhaar: str
    first_name: str
    last_name: str
    district_id: str
    voter_id: str
    role: str
    password: Optional[str] = None

class WebAuthnRegistrationOptionsRequest(BaseModel):
    voter_id: str
    aadhaar: str

class WebAuthnRegistrationVerifyRequest(BaseModel):
    voter_id: str
    aadhaar: str
    face_image: str  # Base64
    registration_response: dict
    
class WebAuthnLoginOptionsRequest(BaseModel):
    voter_id: str
    aadhaar: str

class WebAuthnLoginVerifyRequest(BaseModel):
    voter_id: str
    aadhaar: str
    face_image: str  # Base64
    authentication_response: dict

class WebAuthnVoteRequest(BaseModel):
    voter_id: str
    district_id: str
    party_id: str
    face_image: str  # Base64
    authentication_response: dict

# --- Endpoints ---

@app.get("/")
def read_root():
    return {"message": "Voting System API (Hash-Based)"}

# --- Registration ---

@app.post("/auth/webauthn/register/generate-options")
def webauthn_register_options(data: WebAuthnRegistrationOptionsRequest):
    c = conn.cursor()
    voter_id = data.voter_id

    # 1. Verify Voter ID and Aadhaar in Master DB
    c.execute("SELECT district_id, role, first_name, last_name, aadhaar FROM master_users WHERE voter_id=? AND aadhaar=?", (voter_id, data.aadhaar))
    master_row = c.fetchone()
    if not master_row:
         raise HTTPException(status_code=401, detail="Invalid Voter Credentials")

    district_id, role, first_name, last_name, stored_aadhaar = master_row

    # 2. Check if already registered
    c.execute("SELECT * FROM registered_users WHERE voter_id=?", (voter_id,))
    if c.fetchone():
         raise HTTPException(status_code=409, detail="Voter already registered!")

    # 3. Generate Options
    options = generate_registration_options(
        rp_id=RP_ID,
        rp_name=RP_NAME,
        user_id=voter_id.encode(),
        user_name=voter_id,
        user_display_name=f"{first_name} {last_name}",
        authenticator_selection=AuthenticatorSelectionCriteria(
            authenticator_attachment=AuthenticatorAttachment.PLATFORM,
            user_verification=UserVerificationRequirement.REQUIRED,
            resident_key=ResidentKeyRequirement.PREFERRED
        )
    )

    challenge_store[voter_id] = options.challenge

    return json.loads(options_to_json(options))


@app.post("/auth/webauthn/register/verify")
def webauthn_register_verify(data: WebAuthnRegistrationVerifyRequest):
    voter_id = data.voter_id
    c = conn.cursor()

    # 1. Verify Voter ID and Aadhaar in Master DB
    c.execute("SELECT district_id, role FROM master_users WHERE voter_id=? AND aadhaar=?", (voter_id, data.aadhaar))
    master_row = c.fetchone()
    if not master_row:
         raise HTTPException(status_code=401, detail="Invalid Voter Credentials")
         
    district_id, role = master_row

    # 2. Check if already registered
    c.execute("SELECT * FROM registered_users WHERE voter_id=?", (voter_id,))
    if c.fetchone():
         raise HTTPException(status_code=409, detail="Voter already registered!")

    expected_challenge = challenge_store.get(voter_id)
    if not expected_challenge:
        raise HTTPException(status_code=400, detail="Challenge missing or expired")

    # 3. Hash Face (Secure DeepFace Embedding)
    face_hash = auth.extract_face_embedding(data.face_image)
    if not face_hash:
        raise HTTPException(status_code=400, detail="Invalid Face Data")

    c.execute("SELECT face_hash FROM registered_users")
    all_faces = [row[0] for row in c.fetchall()]
    if auth.check_duplicate_face(face_hash, all_faces):
         raise HTTPException(status_code=409, detail="Face already registered to another user!")

    # 4. Verify WebAuthn Registration Response
    import traceback
    try:
        from webauthn.helpers import parse_registration_credential_json
        credential = parse_registration_credential_json(data.registration_response)
        verification = verify_registration_response(
            credential=credential,
            expected_challenge=expected_challenge,
            expected_rp_id=RP_ID,
            expected_origin=allow_origins,
        )
    except Exception as e:
        print(f"WebAuthn verification failed: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"WebAuthn verification failed: {str(e)}")
    finally:
        # Clean up challenge
        if voter_id in challenge_store:
            del challenge_store[voter_id]

    # 5. Store Data
    c.execute('''INSERT INTO registered_users 
                 (voter_id, aadhaar_number, district_id, role, face_hash, fingerprint_hash, has_voted) 
                 VALUES (?, ?, ?, ?, ?, ?, 0)''', 
             (voter_id, data.aadhaar, district_id, role, face_hash, "WEBAUTHN")) # dummy hash placeholder
             
    c.execute('''INSERT INTO webauthn_credentials
                 (user_id, credential_id, public_key, sign_count)
                 VALUES (?, ?, ?, ?)''',
             (voter_id, verification.credential_id.hex(), verification.credential_public_key, verification.sign_count))
             
    conn.commit()
    return {"status": "registered", "verified": True}


# --- Login ---

@app.post("/auth/webauthn/login/generate-options")
def webauthn_login_options(data: WebAuthnLoginOptionsRequest):
    c = conn.cursor()
    voter_id = data.voter_id
    
    # Verify User exists in Master DB
    c.execute("SELECT 1 FROM master_users WHERE voter_id=? AND aadhaar=?", (voter_id, data.aadhaar))
    if not c.fetchone():
        raise HTTPException(status_code=401, detail="Invalid Voter Credentials")

    # Fetch Registered Credentials
    c.execute("SELECT credential_id FROM webauthn_credentials WHERE user_id=?", (voter_id,))
    credentials = c.fetchall()
    
    if not credentials:
        raise HTTPException(status_code=400, detail="Device not registered. Please Register first.")

    from webauthn.helpers.structs import PublicKeyCredentialDescriptor
    allow_credentials = []
    for cred in credentials:
        allow_credentials.append(PublicKeyCredentialDescriptor(
            id=bytes.fromhex(cred[0])
        ))

    options = generate_authentication_options(
        rp_id=RP_ID,
        allow_credentials=allow_credentials,
        user_verification=UserVerificationRequirement.REQUIRED,
    )

    challenge_store[voter_id] = options.challenge

    return json.loads(options_to_json(options))


@app.post("/auth/webauthn/login/verify")
def webauthn_login_verify(data: WebAuthnLoginVerifyRequest):
    c = conn.cursor()
    voter_id = data.voter_id
    
    # 1. Verify Voter ID and Aadhaar in Master DB
    c.execute("SELECT district_id, role, first_name, last_name, aadhaar FROM master_users WHERE voter_id=? AND aadhaar=?", (voter_id, data.aadhaar))
    master_row = c.fetchone()
    if not master_row:
        raise HTTPException(status_code=401, detail="Invalid Voter Credentials")
    
    district_id, role, first_name, last_name, stored_aadhaar = master_row
    
    # 2. Fetch Stored Hashes
    c.execute("SELECT face_hash FROM registered_users WHERE voter_id=?", (voter_id,))
    reg_row = c.fetchone()
    if not reg_row:
        raise HTTPException(status_code=400, detail="Biometrics not found. Please Register first.")
    
    stored_face_hash = reg_row[0]
    
    # 3. Verify Face Data (Secure DeepFace Threshold)
    if not auth.verify_face(stored_face_hash, data.face_image):
        raise HTTPException(status_code=401, detail="Face Verification Failed - Does not match registered biometric")

    # 4. Verify WebAuthn Authentication Response
    expected_challenge = challenge_store.get(voter_id)
    if not expected_challenge:
        raise HTTPException(status_code=400, detail="Challenge missing or expired")

    try:
        from webauthn.helpers import parse_authentication_credential_json
        credential = parse_authentication_credential_json(data.authentication_response)
        
        c.execute("SELECT public_key, sign_count FROM webauthn_credentials WHERE credential_id=?", (credential.raw_id.hex(),))
        cred_row = c.fetchone()
        if not cred_row:
            raise HTTPException(status_code=400, detail="Unregistered WebAuthn credential")
            
        stored_public_key, stored_sign_count = cred_row

        verification = verify_authentication_response(
            credential=credential,
            expected_challenge=expected_challenge,
            expected_rp_id=RP_ID,
            expected_origin=allow_origins,
            credential_public_key=stored_public_key,
            credential_current_sign_count=stored_sign_count,
            require_user_verification=True
        )
        
        # Update sign count
        c.execute("UPDATE webauthn_credentials SET sign_count=? WHERE credential_id=?", (verification.new_sign_count, credential.id))
        conn.commit()
    except Exception as e:
        print(f"WebAuthn verification failed: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=401, detail=f"Hardware Biometric Verification Failed: {str(e)}")
    finally:
        if voter_id in challenge_store:
            del challenge_store[voter_id]

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

@app.post("/vote/generate-options")
def webauthn_vote_options(data: WebAuthnLoginOptionsRequest):
    # Voting uses the exact same WebAuthn options generation as login
    return webauthn_login_options(data)

@app.post("/vote/verify")
def webauthn_cast_vote(vote: WebAuthnVoteRequest):
    c = conn.cursor()
    
    # 1. Election Active?
    c.execute("SELECT value FROM election_config WHERE key='is_active'")
    if c.fetchone()[0] != '1':
        raise HTTPException(status_code=400, detail="Election Closed")

    # 2. Already Voted?
    c.execute("SELECT has_voted, face_hash FROM registered_users WHERE voter_id=?", (vote.voter_id,))
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

    # 4. Verify WebAuthn
    expected_challenge = challenge_store.get(vote.voter_id)
    if not expected_challenge:
        raise HTTPException(status_code=400, detail="Challenge missing or expired")

    try:
        from webauthn.helpers import parse_authentication_credential_json
        credential = parse_authentication_credential_json(vote.authentication_response)
        
        c.execute("SELECT public_key, sign_count FROM webauthn_credentials WHERE credential_id=?", (credential.raw_id.hex(),))
        cred_row = c.fetchone()
        if not cred_row:
            raise Exception("Unregistered WebAuthn credential")
            
        stored_public_key, stored_sign_count = cred_row

        verification = verify_authentication_response(
            credential=credential,
            expected_challenge=expected_challenge,
            expected_rp_id=RP_ID,
            expected_origin=allow_origins,
            credential_public_key=stored_public_key,
            credential_current_sign_count=stored_sign_count,
            require_user_verification=True
        )
        
        c.execute("UPDATE webauthn_credentials SET sign_count=? WHERE credential_id=?", (verification.new_sign_count, credential.id))
    except Exception as e:
        import traceback
        traceback.print_exc()
        c.execute("INSERT INTO logs (event_type, description, user_id) VALUES (?, ?, ?)", 
                 ("FRAUD_Attempt", f"Hardware biometric verification failed during vote for {vote.voter_id}: {str(e)}", vote.voter_id))
        conn.commit()
        raise HTTPException(status_code=401, detail=f"Hardware Biometric Verification Failed: {str(e)}")
    finally:
        if vote.voter_id in challenge_store:
            del challenge_store[vote.voter_id]

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
@app.get("/debug/env")
def debug_env():
    return {
        "CORS_ORIGINS": os.getenv("CORS_ORIGINS", "not set"),
        "allow_origins": allow_origins,
        "FRONTEND_URL": FRONTEND_URL,
        "RP_ID": RP_ID,
        "ORIGIN": ORIGIN,
    }


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

@app.get("/debug/reset")
def debug_reset():
    c = conn.cursor()
    c.execute("DELETE FROM registered_users")
    c.execute("DELETE FROM webauthn_credentials")
    conn.commit()
    return {"status": "Database cleared! You can now register with your face again."}
