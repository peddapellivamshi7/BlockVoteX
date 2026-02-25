import os
import pandas as pd
import hashlib

DB_PATH = "voting_system.db"
DATABASE_URL = os.getenv("DATABASE_URL")

# Master Dataset provided in reqs
MASTER_DATA = [
    {"ID": 1, "Aadhaar": "359146283661", "FirstName": "Akash", "LastName": "Singh", "DistrictID": "234", "VoterID": "ABC659753", "Password": "ABC@3661", "Role": "Admin"},
    {"ID": 2, "Aadhaar": "577379407366", "FirstName": "Dipti", "LastName": "Kumar", "DistrictID": "235", "VoterID": "JID563930", "Password": "JID@7366", "Role": "Auditor"},
    {"ID": 3, "Aadhaar": "782034294038", "FirstName": "Shlok", "LastName": "Agarwal", "DistrictID": "234", "VoterID": "KOF752745", "Password": "KOF@4038", "Role": "Auditor"},
    {"ID": 4, "Aadhaar": "616950285641", "FirstName": "Rashid", "LastName": "Khan", "DistrictID": "235", "VoterID": "KFL505615", "Password": "KFL@5641", "Role": "Voter"},
    {"ID": 5, "Aadhaar": "736741666818", "FirstName": "Nicole", "LastName": "Dias", "DistrictID": "234", "VoterID": "OKF618375", "Password": "OKF@6818", "Role": "Voter"}
]

if DATABASE_URL:
    import psycopg2
    from psycopg2.extras import RealDictCursor

    class PostgresCursorWrapper:
        def __init__(self, cursor):
            self.cursor = cursor

        @property
        def description(self):
            return self.cursor.description

        @property
        def rowcount(self):
            return self.cursor.rowcount

        def execute(self, query, params=()):
            # Map sqlite '?' to postgres '%s'
            pg_query = query.replace('?', '%s')
            self.cursor.execute(pg_query, params)
            return self

        def fetchone(self):
            return self.cursor.fetchone()
        
        def fetchall(self):
            return self.cursor.fetchall()
            
        def executemany(self, query, params_list):
            pg_query = query.replace('?', '%s')
            self.cursor.executemany(pg_query, params_list)
            return self

    class PostgresConnWrapper:
        def __init__(self, conn):
            self.conn = conn
        def cursor(self):
            return PostgresCursorWrapper(self.conn.cursor())
        def commit(self):
            return self.conn.commit()
else:
    import sqlite3

def get_db_connection():
    if DATABASE_URL:
        conn = psycopg2.connect(DATABASE_URL)
        return PostgresConnWrapper(conn)
    else:
        return sqlite3.connect(DB_PATH, check_same_thread=False)

def sync_master_from_csv(conn):
    """Import master data from CSV into master_users table."""
    c = conn.cursor()
    # Support both singular and plural filenames
    paths = ["backend/voter_dataset.csv", "backend/voters_dataset.csv", "voter_dataset.csv", "voters_dataset.csv"]
    dataset_path = next((p for p in paths if os.path.exists(p)), None)
    
    if dataset_path:
        try:
            print(f"Synchronizing Master Dataset from {dataset_path}...")
            df = pd.read_csv(dataset_path)
            
            # Clear existing master data to ensure sync
            c.execute("DELETE FROM master_users")
            
            # Standardize column names (handle spaces and case)
            df.columns = [c.strip() for c in df.columns]
            
            # User's Dataset Header: ID,Aadhaar,FirstName,LastName,MotherName,FatherName,Sex,Birthday,Age,District ID,Phone,Voter ID,Def_Password
            col_aadhaar = 'Aadhaar'
            col_fname = 'FirstName'
            col_lname = 'LastName'
            col_mname = 'MotherName'
            col_faname = 'FatherName'
            col_sex = 'Sex'
            col_bday = 'Birthday'
            col_age = 'Age'
            col_district = 'District ID'
            col_phone = 'Phone'
            col_voterid = 'Voter ID'
            col_pass = 'Def_Password'
            
            count = 0
            for index, row in df.iterrows():
                # Clean up Aadhaar (remove spaces)
                aadhaar_raw = str(row[col_aadhaar]) if col_aadhaar in df.columns else ""
                aadhaar_clean = aadhaar_raw.replace(" ", "").replace(".0", "").strip()
                
                # Get other fields with fallbacks
                voter_id = str(row[col_voterid]).strip() if col_voterid in df.columns else f"VOTER{index+1}"
                first_name = str(row[col_fname]).strip() if col_fname in df.columns else "Unknown"
                last_name = str(row[col_lname]).strip() if col_lname in df.columns else ""
                mother_name = str(row[col_mname]).strip() if col_mname in df.columns else ""
                father_name = str(row[col_faname]).strip() if col_faname in df.columns else ""
                sex = str(row[col_sex]).strip() if col_sex in df.columns else ""
                birthday = str(row[col_bday]).strip() if col_bday in df.columns else ""
                
                age_val = row[col_age] if col_age in df.columns else None
                age = int(age_val) if pd.notna(age_val) else 0

                phone = str(row[col_phone]).strip() if col_phone in df.columns else ""
                district_id = str(row[col_district]).split(".")[0].strip() if col_district in df.columns else "0"
                password = str(row[col_pass]).strip() if col_pass in df.columns else f"{voter_id}@123"
                # For role, we check if there's a Role column, else first user is Admin, rest Voter
                role = str(row['Role']).strip() if 'Role' in df.columns else ("Admin" if index == 0 else "Voter")
                
                c.execute(
                    """INSERT INTO master_users 
                       (id, aadhaar, first_name, last_name, mother_name, father_name, sex, birthday, age, phone, district_id, voter_id, password, role) 
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        index + 1,
                        aadhaar_clean,
                        first_name,
                        last_name,
                        mother_name,
                        father_name,
                        sex,
                        birthday,
                        age,
                        phone,
                        district_id,
                        voter_id,
                        password,
                        role
                    )
                )
                count += 1
                
            conn.commit()
            print(f"Successfully synced {count} users from dataset.")
            return True
        except Exception as e:
            print(f"Error syncing dataset: {e}")
            return False
    else:
        print("Dataset CSV file not found, skipping sync.")
        return False

def init_db():
    conn = get_db_connection()
    c = conn.cursor()
    
    # 1. Master Identity Source
    c.execute('''CREATE TABLE IF NOT EXISTS master_users (
                    id ''' + ("SERIAL" if DATABASE_URL else "INTEGER") + ''' PRIMARY KEY,
                    aadhaar TEXT UNIQUE,
                    first_name TEXT,
                    last_name TEXT,
                    mother_name TEXT,
                    father_name TEXT,
                    sex TEXT,
                    birthday TEXT,
                    age INTEGER,
                    phone TEXT,
                    district_id TEXT,
                    voter_id TEXT UNIQUE,
                    password TEXT,
                    role TEXT
                )''')

    # 2. Registered Users (Actual App Users)
    c.execute('''CREATE TABLE IF NOT EXISTS registered_users (
                    voter_id TEXT PRIMARY KEY,
                    aadhaar_number TEXT,
                    district_id TEXT,
                    role TEXT,
                    face_hash TEXT UNIQUE,
                    fingerprint_hash TEXT UNIQUE,
                    has_voted BOOLEAN DEFAULT ''' + ("FALSE" if DATABASE_URL else "0") + '''
                )''')

    # 3. WebAuthn Credentials
    c.execute('''CREATE TABLE IF NOT EXISTS webauthn_credentials (
                    id ''' + ("SERIAL" if DATABASE_URL else "INTEGER PRIMARY KEY AUTOINCREMENT") + ''',
                    ''' + ("PRIMARY KEY (id)," if DATABASE_URL else "") + '''
                    user_id TEXT,
                    credential_id TEXT UNIQUE,
                    public_key ''' + ("BYTEA" if DATABASE_URL else "BLOB") + ''',
                    sign_count INTEGER,
                    FOREIGN KEY(user_id) REFERENCES registered_users(voter_id)
                )''')

    # 4. Blockchain (Votes)
    c.execute('''CREATE TABLE IF NOT EXISTS blockchain (
                    index_id ''' + ("SERIAL" if DATABASE_URL else "INTEGER PRIMARY KEY AUTOINCREMENT") + ''',
                    ''' + ("PRIMARY KEY (index_id)," if DATABASE_URL else "") + '''
                    block_data TEXT,
                    timestamp TEXT,
                    previous_hash TEXT,
                    current_hash TEXT,
                    voter_id TEXT,
                    district_id TEXT,
                    party_id TEXT
                )''')
    
    # 5. Logs (Fraud/Audit)
    c.execute('''CREATE TABLE IF NOT EXISTS logs (
                    id ''' + ("SERIAL" if DATABASE_URL else "INTEGER PRIMARY KEY AUTOINCREMENT") + ''',
                    ''' + ("PRIMARY KEY (id)," if DATABASE_URL else "") + '''
                    event_type TEXT,
                    description TEXT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    user_id TEXT
                )''')

    # 6. Election Status
    c.execute('''CREATE TABLE IF NOT EXISTS election_config (
                    key TEXT PRIMARY KEY,
                    value TEXT
                )''')

    # 7. Representatives (Candidates)
    c.execute('''CREATE TABLE IF NOT EXISTS representatives (
                    id ''' + ("SERIAL" if DATABASE_URL else "INTEGER PRIMARY KEY AUTOINCREMENT") + ''',
                    ''' + ("PRIMARY KEY (id)," if DATABASE_URL else "") + '''
                    representative_id TEXT UNIQUE,
                    name TEXT,
                    party_name TEXT,
                    party_symbol TEXT,
                    district_id TEXT
                )''')

    conn.commit()
    
    # Sync from CSV if available
    csv_synced = sync_master_from_csv(conn)
    
    # Fallback to hardcoded seed if CSV not found or empty and DB is empty
    c.execute("SELECT count(*) FROM master_users")
    if not csv_synced and c.fetchone()[0] == 0:
        print("Seeding Master Dataset from hardcoded fallback...")
        for user in MASTER_DATA:
            c.execute("INSERT INTO master_users (id, aadhaar, first_name, last_name, district_id, voter_id, password, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                      (user["ID"], user["Aadhaar"], user["FirstName"], user["LastName"], user["DistrictID"], user["VoterID"], user["Password"], user["Role"]))
        conn.commit()
    
    # Seed Election Status
    c.execute("INSERT " + ("ON CONFLICT (key) DO NOTHING" if DATABASE_URL else "OR IGNORE") + " INTO election_config (key, value) VALUES (?, ?)", ("is_active", "1"))
    
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
        conn.commit()

    conn.commit()
    return conn
