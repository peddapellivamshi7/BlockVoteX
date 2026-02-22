import sqlite3
import pandas as pd
import hashlib
import os

DB_PATH = "voting_system.db"

# Master Dataset provided in reqs
MASTER_DATA = [
    {"ID": 1, "Aadhaar": "359146283661", "FirstName": "Akash", "LastName": "Singh", "DistrictID": "234", "VoterID": "ABC659753", "Password": "ABC@3661", "Role": "Admin"},
    {"ID": 2, "Aadhaar": "577379407366", "FirstName": "Dipti", "LastName": "Kumar", "DistrictID": "235", "VoterID": "JID563930", "Password": "JID@7366", "Role": "Auditor"},
    {"ID": 3, "Aadhaar": "782034294038", "FirstName": "Shlok", "LastName": "Agarwal", "DistrictID": "234", "VoterID": "KOF752745", "Password": "KOF@4038", "Role": "Auditor"},
    {"ID": 4, "Aadhaar": "616950285641", "FirstName": "Rashid", "LastName": "Khan", "DistrictID": "235", "VoterID": "KFL505615", "Password": "KFL@5641", "Role": "Voter"},
    {"ID": 5, "Aadhaar": "736741666818", "FirstName": "Nicole", "LastName": "Dias", "DistrictID": "234", "VoterID": "OKF618375", "Password": "OKF@6818", "Role": "Voter"}
]

def init_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    c = conn.cursor()
    
    # 1. Master Identity Source (The Dataset)
    c.execute('''CREATE TABLE IF NOT EXISTS master_users (
                    id INTEGER PRIMARY KEY,
                    aadhaar TEXT UNIQUE,
                    first_name TEXT,
                    last_name TEXT,
                    district_id TEXT,
                    voter_id TEXT UNIQUE,
                    password TEXT,
                    role TEXT
                )''')

    # 2. Registered Users (Actual App Users)
    # is_voted tracks if they voted in current election
    # 2. Registered Users (Actual App Users)
    # has_voted tracks if they voted in current election
    c.execute('''CREATE TABLE IF NOT EXISTS registered_users (
                    voter_id TEXT PRIMARY KEY,
                    aadhaar_number TEXT,
                    district_id TEXT,
                    role TEXT,
                    face_hash TEXT UNIQUE,
                    fingerprint_hash TEXT UNIQUE,
                    has_voted BOOLEAN DEFAULT 0
                )''')

    # WebAuthn Credentials
    c.execute('''CREATE TABLE IF NOT EXISTS webauthn_credentials (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT,
                    credential_id TEXT UNIQUE,
                    public_key BLOB,
                    sign_count INTEGER,
                    FOREIGN KEY(user_id) REFERENCES registered_users(voter_id)
                )''')

    # 4. Blockchain (Votes)
    c.execute('''CREATE TABLE IF NOT EXISTS blockchain (
                    index_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    block_data TEXT,
                    timestamp TEXT,
                    previous_hash TEXT,
                    current_hash TEXT,
                    voter_id TEXT,
                    district_id TEXT,
                    party_id TEXT
                )''')
    
    # 4. Logs (Fraud/Audit)
    c.execute('''CREATE TABLE IF NOT EXISTS logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    event_type TEXT,
                    description TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    user_id TEXT
                )''')

    # 5. Election Status
    c.execute('''CREATE TABLE IF NOT EXISTS election_config (
                    key TEXT PRIMARY KEY,
                    value TEXT
                )''')

    # 6. Representatives (Candidates)
    c.execute('''CREATE TABLE IF NOT EXISTS representatives (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    representative_id TEXT UNIQUE,
                    name TEXT,
                    party_name TEXT,
                    party_symbol TEXT,
                    district_id TEXT
                )''')

    conn.commit()
    
    # Seed Master Data if empty
    c.execute("SELECT count(*) FROM master_users")
    if c.fetchone()[0] == 0:
        print("Seeding Master Dataset...")
        for user in MASTER_DATA:
            c.execute("INSERT INTO master_users (id, aadhaar, first_name, last_name, district_id, voter_id, password, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                      (user["ID"], user["Aadhaar"], user["FirstName"], user["LastName"], user["DistrictID"], user["VoterID"], user["Password"], user["Role"]))
        conn.commit()
    
    # Seed Election Status
    c.execute("INSERT OR IGNORE INTO election_config (key, value) VALUES (?, ?)", ("is_active", "1"))
    
    # Seed Representatives
    c.execute("SELECT count(*) FROM representatives")
    if c.fetchone()[0] == 0:
        candidates = [
            ("BJP-234", "Amit Shah", "BJP", "🌸", "234"),
            ("INC-234", "Rahul Gandhi", "INC", "✋", "234"),
            ("AAP-234", "Arvind Kejriwal", "AAP", "🧹", "234"),
            ("BJP-235", "Yogi Adityanath", "BJP", "🌸", "235"),
            ("SP-235", "Akhilesh Yadav", "SP", "🚲", "235")
        ]
        c.executemany("INSERT INTO representatives (representative_id, name, party_name, party_symbol, district_id) VALUES (?, ?, ?, ?, ?)", candidates)
        conn.commit() # Moved commit inside the if block

    conn.commit() # This commit is now redundant if the previous one is inside the if block, but keeping it as per the provided edit structure.

    return conn

def get_db_connection():
    return sqlite3.connect(DB_PATH, check_same_thread=False)
