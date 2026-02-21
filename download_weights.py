import os
import requests

url = "https://github.com/serengil/deepface_models/releases/download/v1.0/facenet512_weights.h5"
target_dir = os.path.expanduser("~/.deepface/weights")
target_file = os.path.join(target_dir, "facenet512_weights.h5")

if not os.path.exists(target_dir):
    os.makedirs(target_dir)

print(f"Downloading weights to {target_file}...")
try:
    response = requests.get(url, stream=True)
    response.raise_for_status()
    with open(target_file, "wb") as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)
    print("SUCCESS: Download complete.")
except Exception as e:
    print(f"ERROR: Download failed: {e}")
