import sqlite3

try:
    conn = sqlite3.connect('voting_system.db')
    c = conn.cursor()
    
    # Clear hashes
    c.execute("UPDATE registered_users SET face_hash=NULL, fingerprint_hash=NULL WHERE voter_id='ABC659753'")
    
    # Delete WebAuthn credentials only if the optional table exists
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='webauthn_credentials'")
    if c.fetchone():
        c.execute("DELETE FROM webauthn_credentials WHERE user_id='ABC659753'")
    
    conn.commit()
    print("SUCCESS: Admin (ABC659753) biometrics cleared.")
except Exception as e:
    print(f"ERROR: {e}")
finally:
    if conn: conn.close()
