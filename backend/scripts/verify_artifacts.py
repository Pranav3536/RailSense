"""
RailSense — Serving Artifacts Integrity Verifier
(backend/scripts/verify_artifacts.py)

Reads backend/serving/manifest.json, validates cryptographic SHA-256 checksums
and file sizes for all production serving files, and exits with code 0 on success.
"""

import sys
import hashlib
import json
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent


def get_file_bytes_and_hash(path: Path):
    with open(path, "rb") as f:
        content = f.read()
    
    # If it's a JSON text file, normalize CRLF to LF so hash matches regardless of OS checkout
    if path.suffix.lower() == ".json":
        normalized = content.replace(b"\r\n", b"\n")
        return len(content), len(normalized), hashlib.sha256(content).hexdigest(), hashlib.sha256(normalized).hexdigest()
    
    # For binary files (.sqlite, .joblib), strict raw bytes
    raw_hash = hashlib.sha256(content).hexdigest()
    return len(content), len(content), raw_hash, raw_hash


def verify_artifacts() -> bool:
    print("=" * 70)
    print("RailSense Serving Artifacts Verification")
    print("=" * 70)

    manifest_file = BACKEND_DIR / "serving" / "manifest.json"
    if not manifest_file.exists():
        print(f"[ERROR] Manifest file not found: {manifest_file}")
        return False

    with open(manifest_file, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    all_passed = True
    print(f"Verifying {len(manifest['artifacts'])} artifacts against SHA-256 manifest...\n")

    for entry in manifest["artifacts"]:
        path = BACKEND_DIR / entry["path"]
        if not path.exists():
            print(f"[FAIL] Missing file: {entry['path']}")
            all_passed = False
            continue

        raw_size, norm_size, raw_sha, norm_sha = get_file_bytes_and_hash(path)
        expected_size = entry["size_bytes"]
        expected_sha = entry["sha256"]

        # Check if either raw or normalized matches expected (handles Windows vs Linux line endings)
        size_match = (raw_size == expected_size) or (norm_size == expected_size)
        sha_match = (raw_sha == expected_sha) or (norm_sha == expected_sha)

        if not size_match:
            print(f"[FAIL] Size mismatch for {entry['path']}: expected {expected_size}, got {raw_size}")
            all_passed = False
            continue

        if not sha_match:
            print(f"[FAIL] Checksum mismatch for {entry['path']}")
            print(f"       Expected: {expected_sha}")
            print(f"       Actual:   {raw_sha}")
            all_passed = False
            continue

        print(f"[PASS] {entry['path']:<35} ({entry['size_mb']} MB) [SHA-256 MATCH]")

    if all_passed:
        print("\n[OK] All serving artifacts strictly verified! Zero corruption or tamper detected.")
    else:
        print("\n[ERROR] Artifact verification FAILED!")

    return all_passed


if __name__ == "__main__":
    success = verify_artifacts()
    sys.exit(0 if success else 1)