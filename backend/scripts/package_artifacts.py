"""
RailSense — Serving Artifacts Packaging & Manifest Generator
(backend/scripts/package_artifacts.py)

Gathers all critical runtime serving artifacts, computes cryptographic SHA-256 checksums,
measures byte sizes, and produces backend/serving/manifest.json.
"""

import hashlib
import json
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent

ARTIFACTS_TO_MANIFEST = [
    BACKEND_DIR / "serving" / "serving.sqlite",
    BACKEND_DIR / "serving" / "overview.json",
    BACKEND_DIR / "serving" / "patterns.json",
    BACKEND_DIR / "serving" / "model_lab.json",
    BACKEND_DIR / "models" / "deployment_model.joblib",
    BACKEND_DIR / "models" / "calibrator.joblib",
    BACKEND_DIR / "models" / "hist_transformer.joblib",
    BACKEND_DIR / "models" / "historical_tables.json",
    BACKEND_DIR / "models" / "model_metadata.json",
]


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def generate_manifest():
    print("=" * 70)
    print("RailSense Serving Artifacts Packaging")
    print("=" * 70)

    manifest_entries = []
    total_bytes = 0

    for path in ARTIFACTS_TO_MANIFEST:
        if not path.exists():
            raise FileNotFoundError(f"Required artifact missing: {path}")

        size = path.stat().st_size
        sha256 = sha256_file(path)
        rel_path = path.relative_to(BACKEND_DIR).as_posix()
        total_bytes += size

        manifest_entries.append({
            "path": rel_path,
            "filename": path.name,
            "size_bytes": size,
            "size_mb": round(size / (1024 * 1024), 2),
            "sha256": sha256
        })
        print(f"  + {rel_path:<35} | {round(size / (1024 * 1024), 2):>6.2f} MB | {sha256[:16]}...")

    manifest = {
        "version": "1.0.0",
        "generated_at": "2026-10-30T23:30:00+05:30",
        "total_artifacts": len(manifest_entries),
        "total_size_bytes": total_bytes,
        "total_size_mb": round(total_bytes / (1024 * 1024), 2),
        "artifacts": manifest_entries
    }

    manifest_file = BACKEND_DIR / "serving" / "manifest.json"
    with open(manifest_file, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    print(f"\n[OK] Successfully wrote {manifest_file}")
    print(f"Total Package Size: {round(total_bytes / (1024 * 1024), 2)} MB across {len(manifest_entries)} artifacts.")
    return manifest


if __name__ == "__main__":
    generate_manifest()
