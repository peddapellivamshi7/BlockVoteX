import hashlib
import json
import time

import pandas as pd

class Block:
    def __init__(self, index, district_id, party_id, timestamp, previous_hash):
        self.index = index
        self.voter_id = "ANONYMOUS_VOTER" # Hardcoded to completely hide identity
        self.district_id = district_id
        self.party_id = party_id
        self.timestamp = timestamp
        self.previous_hash = previous_hash
        self.biometric_verified = True # Always True if it reached this stage
        self.current_hash = self.calculate_hash()

    def calculate_hash(self):
        block_string = json.dumps({
            "index": self.index,
            "voter_id": self.voter_id,
            "district_id": self.district_id,
            "party_id": self.party_id,
            "timestamp": self.timestamp,
            "previous_hash": self.previous_hash,
            "biometric_verified": self.biometric_verified
        }, sort_keys=True).encode()
        return hashlib.sha256(block_string).hexdigest()

class Blockchain:
    def __init__(self, conn):
        self.conn = conn
        self.create_genesis_block()

    def create_genesis_block(self):
        # Check if chain is empty
        c = self.conn.cursor()
        c.execute("SELECT count(*) FROM blockchain")
        if c.fetchone()[0] == 0:
            genesis_block = Block(0, "0", "0", time.time(), "0")
            self.add_block(genesis_block)

    def get_latest_block(self):
        c = self.conn.cursor()
        c.execute("SELECT * FROM blockchain ORDER BY index_id DESC LIMIT 1")
        row = c.fetchone()
        if row:
            # Row mapping: 0:index, 1:data(unused here), 2:timestamp, 3:prev_hash, 4:curr_hash, 5:voter, 6:district, 7:party
            return {
                "hash": row[4],
                "index": row[0]
            }
        return None

    def add_block(self, new_block):
        c = self.conn.cursor()
        c.execute("INSERT INTO blockchain (block_data, timestamp, previous_hash, current_hash, voter_id, district_id, party_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
                  (json.dumps(new_block.__dict__, default=str), new_block.timestamp, new_block.previous_hash, new_block.current_hash, new_block.voter_id, new_block.district_id, new_block.party_id))
        self.conn.commit()

    def add_vote(self, district_id, party_id):
        latest = self.get_latest_block()
        new_index = latest["index"] + 1 if latest else 0
        previous_hash = latest["hash"] if latest else "0"
        
        new_block = Block(new_index, district_id, party_id, time.time(), previous_hash)
        self.add_block(new_block)
        return new_block

    def is_chain_valid(self):
        """Iterates through the database rows and validates hashes and sequence."""
        c = self.conn.cursor()
        c.execute("SELECT * FROM blockchain ORDER BY index_id ASC")
        rows = c.fetchall()
        
        if not rows:
            return True
            
        previous_hash = "0"
        for i, row in enumerate(rows):
            # Row mapping: 0:index_id, 1:block_data, 2:timestamp, 3:previous_hash, 4:current_hash, 5:voter, 6:district, 7:party
            idx_id, block_data_str, timestamp, prev_h, curr_h, voter, district, party = row
            
            # 1. Check previous hash link (skip genesis's 0 prev hash check against 0)
            if i > 0 and prev_h != previous_hash:
                return False
                
            # 2. Re-calculate hash to verify integrity
            # We need to recreate the block object or replicate its hashing logic
            # Using block_data_str which contains the dict used for hashing
            try:
                data = json.loads(block_data_str)
                # Ensure we use the exact same keys and sorting as in Block.calculate_hash
                block_string = json.dumps({
                    "index": data["index"],
                    "voter_id": data["voter_id"],
                    "district_id": data["district_id"],
                    "party_id": data["party_id"],
                    "timestamp": data["timestamp"],
                    "previous_hash": data["previous_hash"],
                    "biometric_verified": data["biometric_verified"]
                }, sort_keys=True).encode()
                recalculated_hash = hashlib.sha256(block_string).hexdigest()
                
                if curr_h != recalculated_hash:
                    return False
            except Exception:
                return False
                
            previous_hash = curr_h
            
        return True
    
    def get_all_blocks(self):
        return pd.read_sql("SELECT * FROM blockchain", self.conn)
