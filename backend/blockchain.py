import hashlib
import json
import time

import pandas as pd

class Block:
    def __init__(self, index, voter_id, district_id, party_id, timestamp, previous_hash):
        self.index = index
        self.voter_id = voter_id
        # We encrypt/hash voter_id in the block data itself for privacy in a real app, 
        # but here we keep fields accessible for the simple prototype as per reqs (BlockID, EncryptedVoterID...)
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
            genesis_block = Block(0, "0", "0", "0", time.time(), "0")
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

    def add_vote(self, voter_id, district_id, party_id):
        latest = self.get_latest_block()
        new_index = latest["index"] + 1 if latest else 0
        previous_hash = latest["hash"] if latest else "0"
        
        new_block = Block(new_index, voter_id, district_id, party_id, time.time(), previous_hash)
        self.add_block(new_block)
        return new_block

    def is_chain_valid(self):
        # Todo: Iterate through DB rows and validate hashes
        pass
    
    def get_all_blocks(self):
        return pd.read_sql("SELECT * FROM blockchain", self.conn)
