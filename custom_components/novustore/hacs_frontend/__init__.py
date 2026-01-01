"""HACS Frontend"""
import os
from .version import VERSION

def locate_dir():
    """Return the directory where frontend files are located."""
    frontend_dir = __path__[0]
    
    # Log what we found
    print(f"[NovuStore] Frontend directory: {frontend_dir}")
    print(f"[NovuStore] Directory exists: {os.path.exists(frontend_dir)}")
    
    if os.path.exists(frontend_dir):
        # Check for entrypoint.js
        entrypoint = os.path.join(frontend_dir, "entrypoint.js")
        print(f"[NovuStore] Entrypoint.js exists: {os.path.exists(entrypoint)}")
        
        # List subdirectories
        try:
            subdirs = [d for d in os.listdir(frontend_dir) if os.path.isdir(os.path.join(frontend_dir, d))]
            print(f"[NovuStore] Frontend subdirectories: {subdirs}")
        except Exception as e:
            print(f"[NovuStore] Error listing directory: {e}")
    
    return frontend_dir