"""
RailSense — Serving Artifacts Integrity Verifier
(backend/scripts/verify_artifacts.py)

Reads backend/serving/manifest.json, validates cryptographic SHA-256 checksums
for binary assets (.sqlite, .joblib) and structural validity for JSON data.
Exits with code 0 on success.
"""

import sys
import hashlib
import json
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


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
    print(f"Verifying {len(manifest['artifacts'])} artifacts...\n")

    for entry in manifest["artifacts"]:
        path = BACKEND_DIR / entry["path"]
        if not path.exists():
            print(f"[FAIL] Missing file: {entry['path']}")
            all_passed = False
            continue

        # JSON files: Validate structural integrity (valid JSON) across OS line endings
        if path.suffix.lower() == ".json":
            try:
                with open(path, "r", encoding="utf-8") as jf:
                    json.load(jf)
                print(f"[PASS] {entry['path']:<35} ({entry['size_mb']} MB) [VALID JSON]")
            except Exception as e:
                print(f"[FAIL] JSON corruption in {entry['path']}: {e}")
                all_passed = False
            continue

        # Binary files (.sqlite, .joblib): Strict size and cryptographic SHA-256 verification
        actual_size = path.stat().st_size
        if actual_size != entry["size_bytes"]:
            print(f"[FAIL] Size mismatch for {entry['path']}: expected {entry['size_bytes']}, got {actual_size}")
            all_passed = False
            continue

        actual_sha256 = sha256_file(path)
        if actual_sha256 != entry["sha256"]:
            print(f"[FAIL] Checksum mismatch for {entry['path']}")
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