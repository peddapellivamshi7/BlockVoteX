import hashlib
from passlib.context import CryptContext
from deepface import DeepFace
import numpy as np
import json
import base64
import os
import cv2
import tempfile
import uuid
import re

# Suppress TF logs
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def hash_data(data: str) -> str:
    """Strictly hashes string data using SHA-256 to match the Master Rule"""
    if not data:
        return ""
    
    # Fast check for base64 data URIs from frontend
    if "," in data:
        data = data.split(",")[1]
        
    return hashlib.sha256(data.encode()).hexdigest()

def validate_voter_id_format(voter_id: str) -> bool:
    """Validates voter id in AAA999999 format for Streamlit compatibility."""
    return bool(re.fullmatch(r"[A-Z]{3}[0-9]{6}", voter_id or ""))

def verify_biometrics(stored_face_hash, stored_fingerprint_hash, face_input, finger_input):
    """Verifies simulated biometric strings by hashing input and comparing."""
    if not all([stored_face_hash, stored_fingerprint_hash, face_input, finger_input]):
        return False
    return stored_face_hash == hash_data(face_input) and stored_fingerprint_hash == hash_data(finger_input)

def extract_face_embedding(base64_img):
    """Securely extracts a 512-dimensional face embedding using Facenet512."""
    if not base64_img:
        return None
        
    try:
        # 1. Clean Base64
        if ',' in base64_img:
            base64_img = base64_img.split(',')[1]
            
        # 2. Decode & Save to Temp File (DeepFace prefers physical paths for accuracy)
        img_data = base64.b64decode(base64_img)
        temp_path = os.path.join(tempfile.gettempdir(), f"face_{uuid.uuid4().hex}.jpg")
        with open(temp_path, "wb") as f:
            f.write(img_data)
            
        # 3. Extract Embedding using High-Security Facenet512
        embedding_obj = DeepFace.represent(
            img_path=temp_path, 
            model_name="Facenet512",
            enforce_detection=True # Fails if no face is found
        )
        
        # Cleanup
        if os.path.exists(temp_path):
            os.remove(temp_path)
            
        # 4. Return robust embedding array as JSON string for storage
        return json.dumps(embedding_obj[0]["embedding"])
    except Exception as e:
        print(f"DeepFace Embedding Error: {e}")
        return None

def verify_face(stored_embedding_json, input_base64_img):
    """Compares an incoming face against a stored embedding with a strict threshold."""
    if not stored_embedding_json or not input_base64_img:
        return False
        
    try:
        # 1. Extract embedding from live camera
        input_embedding_json = extract_face_embedding(input_base64_img)
        if not input_embedding_json:
            return False
            
        stored_emb = np.array(json.loads(stored_embedding_json))
        input_emb = np.array(json.loads(input_embedding_json))
        
        # 2. Compute strict Euclidean Distance
        # Facenet512 typical threshold is 23.56. We use 20.0 for stricter security.
        distance = np.linalg.norm(stored_emb - input_emb)
        print(f"[SECURITY] Face distance: {distance} (Threshold: 20.0)")
        
        return distance < 20.0
    except Exception as e:
        print(f"DeepFace Verification Error: {e}")
        return False

def check_duplicate_face(new_embedding_json, stored_embeddings_list):
    """Iterates through all registered face embeddings to enforce uniqueness."""
    if not new_embedding_json or not stored_embeddings_list:
        return False
        
    try:
        new_emb = np.array(json.loads(new_embedding_json))
        for stored_json in stored_embeddings_list:
            if not stored_json: continue
            stored_emb = np.array(json.loads(stored_json))
            distance = np.linalg.norm(stored_emb - new_emb)
            if distance < 20.0:
                print(f"[SECURITY] Duplicate face detected! Distance: {distance}")
                return True
        return False
    except Exception as e:
        print(f"DeepFace Duplicate Check Error: {e}")
        return False
