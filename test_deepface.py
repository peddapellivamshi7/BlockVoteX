from deepface import DeepFace
import numpy as np
import base64
import json
import os

# Create a dummy black image to test representation
import cv2
img = np.zeros((500, 500, 3), dtype=np.uint8)
cv2.imwrite("test_face.jpg", img)

print("Testing DeepFace...")
try:
    embedding = DeepFace.represent(
        img_path="test_face.jpg",
        model_name="Facenet512",
        enforce_detection=False
    )
    print("SUCCESS: Embedding generated.")
    print(f"Vector Length: {len(embedding[0]['embedding'])}")
except Exception as e:
    print(f"ERROR: {e}")
