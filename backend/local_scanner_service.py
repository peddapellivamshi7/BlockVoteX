from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import time
import os

app = FastAPI()

raw_cors_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,https://blockvotex.vercel.app"
).strip()
allow_origins = [origin.strip() for origin in raw_cors_origins.split(",") if origin.strip()]
if not allow_origins:
    allow_origins = ["http://localhost:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# This is a MOCK implementation of what a Python SDK for an external DigitalPersona or Secugen USB scanner would do.
@app.get("/capture")
def capture_fingerprint():
    """
    Simulates bridging to an external hardware USB scanner (Local Device SDK).
    In a real system, this calls dlls or C bindings to wait for a finger press,
    light up the scanner, and extract an ANSI/ISO standard template or proprietary Base64.
    """
    
    # Simulate hardware wait time
    time.sleep(2.0)
    
    # Generate a "live" template string
    # For testing, we just use a static string to ensure we can log out and log back in, 
    # but in real-life this is a dynamic biometric template ISO stream.
    # We will simulate the "Scanner Device" identifier + some static bytes
    # NOTE: To test different people, we will just simulate a unique device capture 
    # based on the time they started if we wanted real dynamism, but for simple testing 
    # a static mock string suffices to prove the architecture.
    
    mock_template = "USB_SCANNER_EXTERNAL_DEV_EXTRACTED_TEMPLATE_892348234_B64"
    
    return {
        "status": "success",
        "fingerprint_template": mock_template
    }

if __name__ == "__main__":
    import uvicorn
    # Runs on Port 8081 specifically so frontend can call it exclusively for local hardware access
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8081")))
