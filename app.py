import streamlit as st
import pandas as pd
import backend.database as db
import backend.auth as auth
from backend.blockchain import Blockchain
import time

# --- SETUP ---
st.set_page_config(page_title="BlockVoteX", layout="wide", page_icon="🗳")

if 'db_conn' not in st.session_state:
    st.session_state.db_conn = db.init_db()

blockchain = Blockchain(st.session_state.db_conn)

if 'user' not in st.session_state:
    st.session_state.user = None

# --- SIDEBAR & STYLING ---
st.markdown("""
    <style>
    .main { background-color: #0e1117; }
    .stButton>button { width: 100%; border-radius: 5px; }
    .success { color: #00ff00; }
    .error { color: #ff0000; }
    </style>
    """, unsafe_allow_html=True)

def logout():
    st.session_state.user = None
    st.rerun()

# --- PAGES ---

def login_page():
    st.title("🗳 Blockchain Voting System - Login")
    
    tab1, tab2 = st.tabs(["Login", "Register"])
    
    with tab1:
        v_id = st.text_input("Voter ID", placeholder="AAA999999")
        password = st.text_input("Password", type="password")
        
        st.write("---")
        st.write("🔐 **Biometric Verification**")
        col1, col2 = st.columns(2)
        face_input = col1.text_input("Face Scan (Simulated Key)", type="password", help="Enter a unique text representing your face")
        finger_input = col2.text_input("Fingerprint Scan (Simulated Key)", type="password", help="Enter a unique text representing your fingerprint")
        
        if st.button("Login"):
            # 1. Format Check
            if not auth.validate_voter_id_format(v_id):
                st.error("⚠ Invalid Voter ID Format! Must be AAA999999")
                # Log invalid attempt
                return
            
            conn = st.session_state.db_conn
            c = conn.cursor()
            
            # 2. Check Master Dataset
            c.execute("SELECT * FROM master_users WHERE voter_id=? AND password=?", (v_id, password))
            user = c.fetchone()
            
            if user:
                # user: id, aadhaar, fname, lname, dist_id, vid, pwd, role
                role = user[7]
                
                if role == "Voter":
                    # Check if registered (has biometrics)
                    c.execute("SELECT * FROM registered_users WHERE voter_id=?", (v_id,))
                    reg_user = c.fetchone()
                    
                    if not reg_user:
                        st.error("User not registered! Please Register first.")
                    else:
                        # Verify Biometrics
                        # reg_user: vid, face_hash, fing_hash, voted
                        if auth.verify_biometrics(reg_user[4], reg_user[5], face_input, finger_input):
                            st.session_state.user = {
                                "voter_id": v_id, 
                                "name": user[2], "role": role, 
                                "district": user[4], "has_voted": reg_user[6]
                            }
                            st.success(f"Welcome {user[2]}!")
                            st.rerun()
                        else:
                            st.error("❌ Biometric Mismatch! Fraud Detected.")
                else:
                    # Admin / Auditor (Biometrics optional for Admin in this simplified flow? 
                    # Req says Auditor needs biometrics. Admin features don't specify biometrics strictly for login, but let's assume secure login)
                    
                    if role == "Auditor":
                        # Auditor validations as per req: User ID, Dist ID (User has it), Pwd, Face, Finger
                        # Assuming Auditors are also "registered" to have biometrics stored? 
                        # The prompt says "Auditor must login using... Face, Fingerprint". 
                        # But Master Data doesn't have biometrics. 
                        # We will assume Auditors also need to "Register" to set their biometrics first OR we allow them to set it on first login.
                        # For simplicity, let's treat them like Voters who need to register first if not present in registered_users.
                        c.execute("SELECT * FROM registered_users WHERE voter_id=?", (v_id,))
                        reg_user = c.fetchone()
                        if not reg_user:
                             st.warning("Auditor not registered for biometrics. Please Register.")
                        else:
                            if auth.verify_biometrics(reg_user[4], reg_user[5], face_input, finger_input):
                                st.session_state.user = {"voter_id": v_id, "name": user[2], "role": role, "district": user[4]}
                                st.rerun()
                            else:
                                st.error("❌ Auditor Biometric Mismatch!")

                    else: # Admin
                         # Admin doesn't strictly need biometric validation in the prompt list for *Login*, 
                         # but "Secure Login" is a general req. Let's just allow Password for Admin for now or enforce it if registered.
                         st.session_state.user = {"voter_id": v_id, "name": user[2], "role": role}
                         st.rerun()
            else:
                st.error("Invalid Credentials or User not found in Master Dataset.")
    
    with tab2:
        st.subheader("New User Registration")
        r_vid = st.text_input("Enter Voter ID for Registration")
        r_aadhaar = st.text_input("Aadhaar Number")
        
        st.write("Capture Biometrics (These will be hashed and stored)")
        r_face = st.text_input("Face Data", key="r_face")
        r_finger = st.text_input("Fingerprint Data", key="r_fing")
        
        if st.button("Register"):
            if not auth.validate_voter_id_format(r_vid):
                st.error("Invalid Voter ID Format.")
                return

            conn = st.session_state.db_conn
            c = conn.cursor()
            
            # 1. Check if exists in Master
            c.execute("SELECT * FROM master_users WHERE voter_id=? AND aadhaar=?", (r_vid, r_aadhaar))
            master = c.fetchone()
            
            if not master:
                st.error("Identity Verification Failed! User not in Master Dataset.")
                return
            
            # 2. Check if already registered
            c.execute("SELECT * FROM registered_users WHERE voter_id=?", (r_vid,))
            if c.fetchone():
                st.error("User already registered!")
                return
            
            # 3. Store Hashes
            f_hash = auth.hash_data(r_face)
            fg_hash = auth.hash_data(r_finger)
            
            # Check for Duplicate Biometrics (one person, one account)
            c.execute("SELECT * FROM registered_users WHERE face_hash=? OR fingerprint_hash=?", (f_hash, fg_hash))
            if c.fetchone():
                st.error("🚨 FRAUD ALERT: Biometrics already exist for another user!")
                # Log fraud
                c.execute("INSERT INTO logs (event_type, description, user_id) VALUES (?, ?, ?)", 
                          ("FRAUD_Attempt", f"Duplicate Biometric Registration attempt by {r_vid}", r_vid))
                conn.commit()
                return

            c.execute("INSERT INTO registered_users (voter_id, face_hash, fingerprint_hash) VALUES (?, ?, ?)",
                      (r_vid, f_hash, fg_hash))
            conn.commit()
            st.success("Registration Successful! You can now Login.")

def admin_dashboard():
    st.title("Admin Dashboard")
    st.sidebar.button("Logout", on_click=logout)
    
    menu = st.sidebar.radio("Actions", ["Overview", "Manage Users", "Blockchain Audit", "Declare Winner"])
    
    if menu == "Overview":
        st.subheader("Live Election Stats")
        conn = st.session_state.db_conn
        
        col1, col2 = st.columns(2)
        v_count = pd.read_sql("SELECT count(*) as cnt FROM registered_users", conn).iloc[0]['cnt']
        votes = pd.read_sql("SELECT count(*) as cnt FROM blockchain", conn).iloc[0]['cnt']
        
        col1.metric("Total Registered Users", v_count)
        col2.metric("Total Votes Cast", votes)
        
        st.subheader("Party-wise Counts")
        df_votes = pd.read_sql("SELECT party_id, count(*) as votes FROM blockchain GROUP BY party_id", conn)
        st.bar_chart(df_votes.set_index("party_id"))
        
        st.subheader("District-wise Stats")
        df_dist = pd.read_sql("SELECT district_id, count(*) as votes FROM blockchain GROUP BY district_id", conn)
        st.table(df_dist)

    elif menu == "Manage Users":
        st.subheader("Master Dataset (Identity Source)")
        df = pd.read_sql("SELECT * FROM master_users", st.session_state.db_conn)
        st.dataframe(df)
        
        # Add new user (Simplified for demo)
        st.write("---")
        st.write("Add New User to Master")
        with st.form("add_user"):
            cols = st.columns(4)
            uid = cols[0].text_input("ID")
            aadhaar = cols[1].text_input("Aadhaar")
            fname = cols[2].text_input("First Name")
            lname = cols[3].text_input("Last Name")
            
            cols2 = st.columns(4)
            dist = cols2[0].text_input("District ID")
            vid = cols2[1].text_input("Voter ID (AAA999999)")
            pwd = cols2[2].text_input("Password")
            role = cols2[3].selectbox("Role", ["Voter", "Auditor", "Admin"])
            
            if st.form_submit_button("Add User"):
                if not auth.validate_voter_id_format(vid):
                    st.error("Invalid Voter ID Format")
                else:
                    c = st.session_state.db_conn.cursor()
                    try:
                        c.execute("INSERT INTO master_users (id, aadhaar, first_name, last_name, district_id, voter_id, password, role) VALUES (?,?,?,?,?,?,?,?)",
                                  (uid, aadhaar, fname, lname, dist, vid, pwd, role))
                        st.session_state.db_conn.commit()
                        st.success("User Added")
                        st.rerun()
                    except Exception as e:
                        st.error(f"Error: {e}")

    elif menu == "Blockchain Audit":
        st.subheader("Blockchain Ledger")
        df_blocks = pd.read_sql("SELECT * FROM blockchain", st.session_state.db_conn)
        st.dataframe(df_blocks)
        
        st.subheader("Security Logs")
        df_logs = pd.read_sql("SELECT * FROM logs ORDER BY timestamp DESC", st.session_state.db_conn)
        st.dataframe(df_logs)
        
    elif menu == "Declare Winner":
        st.subheader("Election Results")
        if st.button("Generate Final Results"):
            df = pd.read_sql("SELECT party_id, count(*) as votes FROM blockchain GROUP BY party_id ORDER BY votes DESC", st.session_state.db_conn)
            if not df.empty:
                winner = df.iloc[0]['party_id']
                st.balloons()
                st.success(f"🏆 The Winner is Party: {winner}")
                st.table(df)
            else:
                st.write("No votes cast yet.")

def auditor_dashboard():
    st.title("Auditor Dashboard")
    st.sidebar.button("Logout", on_click=logout)
    conn = st.session_state.db_conn
    c = conn.cursor()
    
    st.subheader("Election Control")
    c.execute("SELECT value FROM election_config WHERE key='is_active'")
    status = c.fetchone()[0]
    
    col1, col2 = st.columns(2)
    if col1.button("🟢 Start Election"):
        c.execute("UPDATE election_config SET value='1' WHERE key='is_active'")
        conn.commit()
        st.success("Election Started!")
        st.rerun()
        
    if col2.button("🔴 Stop Election"):
        c.execute("UPDATE election_config SET value='0' WHERE key='is_active'")
        conn.commit()
        st.warning("Election Stopped!")
        st.rerun()
        
    status_text = "Active" if status == '1' else "Inactive"
    st.info(f"Current Election Status: **{status_text}**")
    
    st.divider()
    
    st.subheader("Fraud Monitoring")
    # Real-time fraud logs
    logs = pd.read_sql("SELECT * FROM logs WHERE event_type LIKE '%Fraud%'", conn)
    if not logs.empty:
        st.error("🚨 FRAUD DETECTED!")
        st.dataframe(logs)
    else:
        st.success("No fraud activities detected so far.")
        
    st.subheader("District Monitoring")
    # Auditor should see stats for their district maybe? Or all.
    # Req: "Monitor district voting". Let's show all for now.
    df = pd.read_sql("SELECT district_id, count(*) as votes FROM blockchain GROUP BY district_id", conn)
    st.bar_chart(df.set_index("district_id"))

def voter_dashboard():
    user = st.session_state.user
    st.title(f"Welcome, {user['name']}")
    st.sidebar.button("Logout", on_click=logout)
    
    conn = st.session_state.db_conn
    c = conn.cursor()
    
    # Check Election Status
    c.execute("SELECT value FROM election_config WHERE key='is_active'")
    is_active = c.fetchone()[0] == '1'
    
    if not is_active:
        st.warning("⚠ Election is currently NOT active. Please wait for Auditor to start.")
        return

    # Check if already voted
    c.execute("SELECT has_voted FROM registered_users WHERE voter_id=?", (user['voter_id'],))
    has_voted = c.fetchone()[0]
    
    if has_voted:
        st.success("✅ You have already voted. Thank you!")
        
        st.write("Your Vote Block:")
        # Show their block
        c.execute("SELECT * FROM blockchain WHERE voter_id=?", (user['voter_id'],))
        block = c.fetchone()
        if block:
            st.json({
                "Block ID": block[0],
                "Timestamp": block[2],
                "Current Hash": block[4],
                "Party": block[7]
            })
        return

    st.subheader(f"Cast your Vote (District: {user['district']})")
    
    # Candidates based on district (Mocking candidates)
    # Ideally should be in DB, but hardcoding for demo speed
    district_candidates = {
        "234": ["BJP (Lotus)", "INC (Hand)", "AAP (Broom)"],
        "235": ["BJP (Lotus)", "SP (Cycle)", "BSP (Elephant)"]
    }
    
    candidates = district_candidates.get(user['district'], ["Independent"])
    
    choice = st.radio("Select Candidate", candidates)
    
    st.write("---")
    st.write("🔐 **Confirm Identity to Vote**")
    
    # Re-verify biometrics
    c1, c2 = st.columns(2)
    f_conf = c1.text_input("Confirm Face Key", type="password")
    fg_conf = c2.text_input("Confirm Fingerprint Key", type="password")
    
    if st.button("🗳 Cast Vote"):
        # Check Biometrics again
        c.execute("SELECT * FROM registered_users WHERE voter_id=?", (user['voter_id'],))
        reg_user = c.fetchone()
        
        if auth.verify_biometrics(reg_user[4], reg_user[5], f_conf, fg_conf):
            # Record Vote
            new_block = blockchain.add_vote(user['voter_id'], user['district'], choice)
            
            # Update status
            c.execute("UPDATE registered_users SET has_voted=1 WHERE voter_id=?", (user['voter_id'],))
            conn.commit()
            
            st.balloons()
            st.success("Vote Cast Successfully!")
            st.info(f"Block Hash: {new_block.current_hash}")
            time.sleep(2)
            st.rerun()
        else:
            st.error("❌ Bio-metric verification failed! Vote rejected.")
            # Log
            c.execute("INSERT INTO logs (event_type, description, user_id) VALUES (?, ?, ?)", 
                      ("FRAUD_Attempt", f"Invalid biometric execution during vote by {user['voter_id']}", user['voter_id']))
            conn.commit()


# --- ROUTING ---
if st.session_state.user:
    role = st.session_state.user['role']
    if role == 'Admin':
        admin_dashboard()
    elif role == 'Auditor':
        auditor_dashboard()
    else:
        voter_dashboard()
else:
    login_page()
