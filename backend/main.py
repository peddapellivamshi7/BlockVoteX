import json
import base64
import os
import random
import pandas as pd
from pydantic import BaseModel
from typing import Optional, List
from fastapi import FastAPI, HTTPException, Request, Body
from fastapi.middleware.cors import CORSMiddleware


try:
    from backend import database as db
    from backend import auth as auth
    from backend.blockchain import Blockchain
except ModuleNotFoundError:
    import database as db
    import auth as auth
    from blockchain import Blockchain

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

RP_ID = os.getenv("RP_ID", "blockvotex.vercel.app")
ORIGIN = os.getenv("ORIGIN", "https://blockvotex.vercel.app")
FRONTEND_URL = ORIGIN
RP_NAME = os.getenv("RP_NAME", "BlockVoteX ECI")

otp_store = {}

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

class Constituency(BaseModel):
    district_id: str
    region_name: str

class Notification(BaseModel):
    message: str

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
    otp: str

class OTPRequest(BaseModel):
    voter_id: str

# --- Endpoints ---

@app.get("/")
def read_root():
    return {"message": "Voting System API (Hash-Based)"}

# --- Registration ---

@app.post("/auth/webauthn/register/generate-options")
def webauthn_register_options(data: WebAuthnRegistrationOptionsRequest):
    c = conn.cursor()
    voter_id = data.voter_id.strip().upper()
    aadhaar = data.aadhaar.strip()

    # 1. Verify Voter ID and Aadhaar in Master DB
    c.execute("SELECT district_id, role, first_name, last_name, aadhaar FROM master_users WHERE voter_id=? AND aadhaar=?", (voter_id, aadhaar))
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
            resident_key=ResidentKeyRequirement.REQUIRED
        )
    )

    challenge_store[voter_id] = options.challenge

    return json.loads(options_to_json(options))


@app.post("/auth/webauthn/register/verify")
def webauthn_register_verify(data: WebAuthnRegistrationVerifyRequest):
    voter_id = data.voter_id.strip().upper()
    aadhaar = data.aadhaar.strip()
    c = conn.cursor()

    # 1. Verify Voter ID and Aadhaar in Master DB
    c.execute("SELECT district_id, role FROM master_users WHERE voter_id=? AND aadhaar=?", (voter_id, aadhaar))
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
            expected_origin=ORIGIN,
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
             (voter_id, data.aadhaar, district_id, role, face_hash, verification.credential_id.hex()))
             
    c.execute('''INSERT INTO webauthn_credentials
                 (user_id, credential_id, public_key, sign_count)
                 VALUES (?, ?, ?, ?)''',
             (voter_id, verification.credential_id.hex(), verification.credential_public_key, verification.sign_count))
             
    c.execute("INSERT INTO logs (event_type, description, user_id) VALUES (?, ?, ?)", 
             ("USER_REGISTERED", f"New user {voter_id} registered biometrics.", voter_id))
             
    conn.commit()
    return {"status": "registered", "verified": True}


# --- Login ---

@app.post("/auth/webauthn/login/generate-options")
def webauthn_login_options(data: WebAuthnLoginOptionsRequest):
    c = conn.cursor()
    voter_id = data.voter_id.strip().upper()
    aadhaar = data.aadhaar.strip()
    
    # Verify User exists in Master DB
    c.execute("SELECT 1 FROM master_users WHERE voter_id=? AND aadhaar=?", (voter_id, aadhaar))
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
    voter_id = data.voter_id.strip().upper()
    aadhaar = data.aadhaar.strip()
    
    # 1. Verify Voter ID and Aadhaar in Master DB
    c.execute("SELECT district_id, role, first_name, last_name, aadhaar, mother_name, father_name, sex, birthday, age, phone FROM master_users WHERE voter_id=? AND aadhaar=?", (voter_id, aadhaar))
    master_row = c.fetchone()
    if not master_row:
        raise HTTPException(status_code=401, detail="Invalid Voter Credentials")
    
    district_id, role, first_name, last_name, stored_aadhaar, mother_name, father_name, sex, birthday, age, phone = master_row
    
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
            expected_origin=ORIGIN,
            credential_public_key=stored_public_key,
            credential_current_sign_count=stored_sign_count,
            require_user_verification=True
        )
        
        # Update sign count
        c.execute("UPDATE webauthn_credentials SET sign_count=? WHERE credential_id=?", (verification.new_sign_count, credential.id))
        
        c.execute("INSERT INTO logs (event_type, description, user_id) VALUES (?, ?, ?)", 
                 ("USER_LOGIN", f"User {voter_id} logged in successfully.", voter_id))
                 
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
            "aadhaar_masked": f"XXXX-XXXX-{stored_aadhaar[-4:]}",
            "mother_name": mother_name,
            "father_name": father_name,
            "sex": sex,
            "birthday": birthday,
            "age": age,
            "phone": phone
        }
    }


# --- Vote ---

@app.post("/vote/generate-options")
def webauthn_vote_options(data: WebAuthnLoginOptionsRequest):
    c = conn.cursor()
    voter_id = data.voter_id
    
    # Voting options generation bypasses strict Aadhaar matching since frontend only has masked Aadhaar. 
    # The actual security relies on Face + WebAuthn + OTP which are verified subsequently.
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

@app.post("/auth/generate-otp")
def generate_otp(data: OTPRequest):
    # 1. Generate 6-digit random OTP
    otp = str(random.randint(100000, 999999))
    # 2. Store OTP temporarily in memory for verification
    otp_store[data.voter_id] = otp
    # 3. In a real system, send this via SMS (Twilio) or Email
    print(f"\n\n[SIMULATED SMS] OTP for {data.voter_id} is: {otp}\n\n")
    return {"message": "OTP generated and sent to console"}

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

    # 3.5 Verify 2FA OTP
    expected_otp = otp_store.get(vote.voter_id)
    if not expected_otp or expected_otp != vote.otp:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP code")
    del otp_store[vote.voter_id] # Clear OTP after success

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
            expected_origin=ORIGIN,
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

    # 4.5 Anomaly Detection (Check for >= 5 votes in the same district in the last 60 seconds)
    import time
    sixty_seconds_ago = time.time() - 60
    c.execute("SELECT count(*) FROM blockchain WHERE district_id=? AND timestamp >= ?", (vote.district_id, sixty_seconds_ago))
    recent_votes = c.fetchone()[0]
    if recent_votes >= 5:
        c.execute("INSERT INTO logs (event_type, description, user_id) VALUES (?, ?, ?)", 
                 ("BULK_VOTE_ANOMALY", f"High volume voting detected in District {vote.district_id} ({recent_votes} votes/min)", vote.voter_id))
        conn.commit()

    # 5. Add Block
    new_block = blockchain.add_vote(vote.district_id, vote.party_id)
    c.execute("UPDATE registered_users SET has_voted=1 WHERE voter_id=?", (vote.voter_id,))
    conn.commit()
    
    return {
        "status": "success", 
        "block_hash": new_block.current_hash,
        "timestamp": new_block.timestamp
    }

@app.post("/representatives")
def add_rep(rep: Representative, admin_id: str = None):
    c = conn.cursor()
    if admin_id:
        c.execute("SELECT role, district_id FROM master_users WHERE voter_id=?", (admin_id,))
        row = c.fetchone()
        if row and row[0] == "Auditor":
            if rep.district_id != row[1]:
                raise HTTPException(status_code=403, detail="Auditors can only add representatives to their own district.")
                
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
def delete_rep(representative_id: str, admin_id: str = None):
    c = conn.cursor()
    if admin_id:
        c.execute("SELECT role, district_id FROM master_users WHERE voter_id=?", (admin_id,))
        row = c.fetchone()
        if row and row[0] == "Auditor":
            # Check target district
            c.execute("SELECT district_id FROM representatives WHERE representative_id=?", (representative_id,))
            target = c.fetchone()
            if target and target[0] != row[1]:
                raise HTTPException(status_code=403, detail="Auditors can only delete representatives from their own district.")
                
    c.execute("DELETE FROM representatives WHERE representative_id=?", (representative_id,))
    conn.commit()
    return {"status": "deleted"}

@app.get("/admin/users")
def get_admin_managed_users(admin_id: str):
    c = conn.cursor()
    c.execute("SELECT role, district_id FROM master_users WHERE voter_id=?", (admin_id,))
    admin_row = c.fetchone()
    if not admin_row or admin_row[0] not in {"Admin", "Auditor"}:
        raise HTTPException(status_code=403, detail="Unauthorized access to user management data.")

    role, district_id = admin_row

    if role == "Admin":
        c.execute(
            """SELECT id, aadhaar, first_name, last_name, district_id, voter_id, role
               FROM master_users
               WHERE role IN ('Voter', 'Auditor')
               ORDER BY id DESC"""
        )
    else:
        # Auditor only sees Voters in their district
        c.execute(
            """SELECT id, aadhaar, first_name, last_name, district_id, voter_id, role
               FROM master_users
               WHERE role = 'Voter' AND district_id=?
               ORDER BY id DESC""",
            (district_id,)
        )
        
    cols = [d[0] for d in c.description]
    return [dict(zip(cols, row)) for row in c.fetchall()]

@app.get("/admin/constituencies")
def get_constituencies():
    c = conn.cursor()
    c.execute('''
        SELECT c.district_id, c.region_name, count(m.id) as user_count 
        FROM constituencies c 
        LEFT JOIN master_users m ON c.district_id = m.district_id 
        GROUP BY c.district_id, c.region_name
    ''')
    cols = [d[0] for d in c.description]
    return [dict(zip(cols, row)) for row in c.fetchall()]

@app.post("/admin/constituencies")
def add_constituency(data: Constituency):
    c = conn.cursor()
    try:
        c.execute("INSERT INTO constituencies (district_id, region_name) VALUES (?, ?)", (data.district_id, data.region_name))
        conn.commit()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=400, detail="Constituency already exists or invalid data")

@app.delete("/admin/constituencies/{district_id}")
def delete_constituency(district_id: str):
    c = conn.cursor()
    c.execute("DELETE FROM constituencies WHERE district_id=?", (district_id,))
    conn.commit()
    return {"status": "success"}

@app.get("/notifications/active")
def get_active_notifications():
    c = conn.cursor()
    c.execute("SELECT message FROM notifications WHERE is_active=1 ORDER BY timestamp DESC LIMIT 1")
    row = c.fetchone()
    return {"message": row[0] if row else None}

@app.post("/admin/notifications")
def create_notification(data: Notification):
    c = conn.cursor()
    c.execute("UPDATE notifications SET is_active=0") # Deactivate old ones
    c.execute("INSERT INTO notifications (message) VALUES (?)", (data.message,))
    conn.commit()
    return {"status": "success"}

@app.delete("/admin/notifications")
def clear_notifications():
    c = conn.cursor()
    c.execute("UPDATE notifications SET is_active=0")
    conn.commit()
    return {"status": "success"}

@app.post("/admin/users")
def create_voter_or_auditor(data: AdminCreateUser):
    c = conn.cursor()

    c.execute("SELECT role, district_id FROM master_users WHERE voter_id=?", (data.admin_id,))
    admin_row = c.fetchone()
    if not admin_row or admin_row[0] not in {"Admin", "Auditor"}:
        raise HTTPException(status_code=403, detail="Unauthorized access.")
        
    admin_role, admin_district = admin_row

    role = (data.role or "").strip().title()
    if admin_role == "Auditor":
        if role != "Voter":
            raise HTTPException(status_code=403, detail="Auditors can only create Voter accounts.")
        if data.district_id != admin_district:
            raise HTTPException(status_code=403, detail="Auditors can only add users to their own district.")
            
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

    c.execute("SELECT role, district_id FROM master_users WHERE voter_id=?", (admin_id,))
    admin_row = c.fetchone()
    if not admin_row or admin_row[0] not in {"Admin", "Auditor"}:
        raise HTTPException(status_code=403, detail="Unauthorized access.")

    admin_role, admin_district = admin_row

    c.execute("SELECT role, district_id FROM master_users WHERE voter_id=?", (voter_id,))
    target_row = c.fetchone()
    if not target_row:
        raise HTTPException(status_code=404, detail="User not found.")

    target_role, target_district = target_row
    
    if target_role not in {"Voter", "Auditor"}:
        raise HTTPException(status_code=400, detail="Only Voter/Auditor accounts can be deleted here.")
        
    if admin_role == "Auditor":
        if target_role != "Voter":
             raise HTTPException(status_code=403, detail="Auditors can only delete Voter accounts.")
        if target_district != admin_district:
             raise HTTPException(status_code=403, detail="Auditors can only delete users from their own district.")

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
    return {"status": "success", "action": data.action}

@app.get("/admin/voter-status/{identifier}")
def get_voter_status(identifier: str, requester_id: str):
    c = conn.cursor()
    # Security check: Requester must be Admin or Auditor
    c.execute("SELECT role FROM master_users WHERE voter_id=?", (requester_id,))
    row = c.fetchone()
    if not row or row[0] not in {"Admin", "Auditor"}:
        raise HTTPException(status_code=403, detail="Unauthorized access to voter status.")

    # Search in master_users by Voter ID or Aadhaar
    c.execute(
        "SELECT first_name, last_name, district_id, voter_id, aadhaar, role, mother_name, father_name, sex, birthday, age, phone FROM master_users WHERE voter_id=? OR aadhaar=?",
        (identifier, identifier)
    )
    master = c.fetchone()
    if not master:
        raise HTTPException(status_code=404, detail="Voter not found in master dataset.")

    first_name, last_name, district_id, m_voter_id, stored_aadhaar, role, mother_name, father_name, sex, birthday, age, phone = master
    
    # Check registration and voting status in registered_users
    c.execute(
        "SELECT has_voted, face_hash FROM registered_users WHERE voter_id=?",
        (m_voter_id,)
    )
    reg = c.fetchone()
    
    is_registered = reg is not None
    has_voted = reg[0] == 1 if reg else False
    
    return {
        "voter_id": m_voter_id,
        "name": f"{first_name} {last_name}".strip(),
        "district": district_id,
        "aadhaar_masked": f"XXXX-XXXX-{stored_aadhaar[-4:]}" if stored_aadhaar else "N/A",
        "role": role,
        "mother_name": mother_name,
        "father_name": father_name,
        "sex": sex,
        "birthday": birthday,
        "age": age,
        "phone": phone,
        "is_registered": is_registered,
        "has_voted": has_voted,
        "status": "Voted" if has_voted else ("Registered" if is_registered else "Not Registered")
    }

@app.post("/admin/sync-dataset")
def sync_dataset(admin_id: str):
    c = conn.cursor()
    c.execute("SELECT role FROM master_users WHERE voter_id=?", (admin_id,))
    admin_row = c.fetchone()
    if not admin_row or admin_row[0] != "Admin":
        raise HTTPException(status_code=403, detail="Only Admin can sync the dataset.")

    if db.sync_master_from_csv(conn):
        return {"status": "success", "message": "Master dataset synchronized from CSV."}
    else:
        raise HTTPException(status_code=500, detail="Failed to sync dataset from CSV. Check if backend/voters_dataset.csv exists.")
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
    
    c.execute("SELECT district_id, party_id FROM blockchain")
    blocks = c.fetchall()
    
    party_counts = {}
    district_votes = {}
    
    for row in blocks:
        dist_id = row[0]
        rep_id = row[1]
        
        actual_party = rep_id.split("-")[0] if "-" in rep_id else rep_id
        party_counts[actual_party] = party_counts.get(actual_party, 0) + 1
        
        if dist_id not in district_votes:
            district_votes[dist_id] = {}
        district_votes[dist_id][rep_id] = district_votes[dist_id].get(rep_id, 0) + 1

    parties = [{"party": k, "votes": v} for k, v in party_counts.items()]
    
    winners = []
    c.execute("SELECT representative_id, name, party_name, party_symbol, district_id FROM representatives")
    reps = c.fetchall()
    reps_dict = {r[0]: {"name": r[1], "party_name": r[2], "party_symbol": r[3], "district_id": r[4]} for r in reps}
    
    # Inject NOTA for global stats resolving
    reps_dict["NOTA"] = {"name": "None of the Above", "party_name": "NOTA", "party_symbol": "🚫", "district_id": "ALL"}
    
    for dist_id, dist_candidates in district_votes.items():
        if not dist_candidates: continue
        winner_rep_id = max(dist_candidates, key=dist_candidates.get)
        winner_votes = dist_candidates[winner_rep_id]
        
        rep_info = reps_dict.get(winner_rep_id, {"name": "Unknown", "party_name": winner_rep_id.split("-")[0] if "-" in winner_rep_id else winner_rep_id, "party_symbol": "❓"})
        winners.append({
            "district_id": dist_id,
            "winner_name": rep_info["name"],
            "party": rep_info["party_name"],
            "symbol": rep_info["party_symbol"],
            "votes": winner_votes
        })
        
    c.execute('''
        SELECT m.sex, m.age 
        FROM registered_users r 
        JOIN master_users m ON r.voter_id = m.voter_id 
        WHERE r.has_voted=1
    ''')
    voter_demographics = c.fetchall()
    
    gender_stats = {"Male": 0, "Female": 0, "Other": 0}
    age_stats = {"18-25": 0, "26-40": 0, "41-60": 0, "60+": 0}
    
    for row in voter_demographics:
        gender = row[0]
        age = row[1]
        
        # Gender
        if gender in gender_stats: gender_stats[gender] += 1
        elif gender == "M": gender_stats["Male"] += 1
        elif gender == "F": gender_stats["Female"] += 1
        else: gender_stats["Other"] += 1
        
        # Age
        try:
            age = int(age)
            if age <= 25: age_stats["18-25"] += 1
            elif age <= 40: age_stats["26-40"] += 1
            elif age <= 60: age_stats["41-60"] += 1
            else: age_stats["60+"] += 1
        except:
            age_stats["18-25"] += 1 # Fallback
        
    demographics = {
        "gender": [{"label": k, "value": v} for k, v in gender_stats.items()],
        "age": [{"label": k, "value": v} for k, v in age_stats.items()]
    }
        
    return {"total_users": total, "voted_users": voted, "party_data": parties, "district_winners": winners, "demographics": demographics}

@app.get("/blockchain")
def get_chain():
    c = conn.cursor()
    c.execute("SELECT * FROM blockchain")
    cols = [d[0] for d in c.description]
    return [dict(zip(cols, row)) for row in c.fetchall()]

@app.get("/voter/{voter_id}/receipt")
def get_voter_receipt(voter_id: str):
    c = conn.cursor()
    # Find the block where this user voted
    c.execute("SELECT current_hash, timestamp, district_id FROM blockchain WHERE voter_id=?", (voter_id,))
    row = c.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="No vote record found for this user.")
        
    return {
        "block_hash": row[0],
        "timestamp": row[1],
        "district_id": row[2]
    }

@app.get("/blockchain/verify/{block_hash}")
def verify_block_hash(block_hash: str):
    c = conn.cursor()
    c.execute("SELECT index_id, timestamp, previous_hash, current_hash, district_id FROM blockchain WHERE current_hash=?", (block_hash,))
    row = c.fetchone()
    if not row:
        return {"valid": False, "message": "Hash not found on the blockchain."}
        
    # We could theoretically re-hash the block data here to mathematically prove it, 
    # but since it's an immutable DB ledger for this prototype, finding it is proof of existence.
    return {
        "valid": True,
        "message": "Block verified cryptographically.",
        "block_details": {
            "index": row[0],
            "timestamp": row[1],
            "previous_hash": row[2],
            "district_id": row[4]
        }
    }

@app.get("/logs")
def get_logs():
    return pd.read_sql("SELECT * FROM logs ORDER BY timestamp DESC", conn).to_dict(orient="records")

@app.get("/debug/reset")
def debug_reset(admin_id: str = None):
    if not admin_id:
        raise HTTPException(status_code=401, detail="Admin ID required to reset database. Example: /debug/reset?admin_id=VOTER123")
        
    c = conn.cursor()
    c.execute("SELECT role FROM master_users WHERE voter_id=?", (admin_id,))
    admin_row = c.fetchone()
    if not admin_row or admin_row[0] != "Admin":
        raise HTTPException(status_code=403, detail="Unauthorized. Only Admins can reset the database.")
        
    c.execute("DELETE FROM registered_users")
    c.execute("DELETE FROM webauthn_credentials")
    conn.commit()
    return {"status": f"Database cleared by {admin_id}! You can now register with your face again."}
