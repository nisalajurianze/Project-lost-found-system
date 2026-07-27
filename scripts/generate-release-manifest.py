#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json, os
from datetime import datetime, timezone
from pathlib import Path

EXCLUDED_DIRS = {'.git', 'node_modules', 'dist', 'build', 'coverage', '.tmp', 'tmp', '_renders'}
EXCLUDED_FILES = {'RELEASE_MANIFEST.json', 'FILE_HASHES_SHA256.txt'}

def iter_files(root: Path):
    for path in sorted(root.rglob('*')):
        rel = path.relative_to(root)
        if any(part in EXCLUDED_DIRS for part in rel.parts):
            continue
        if path.is_symlink():
            raise RuntimeError(f'symlink is not allowed in release: {rel}')
        if path.is_file() and path.name not in EXCLUDED_FILES:
            yield path, rel

def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open('rb') as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', default='.')
    parser.add_argument('--source-id', default=os.environ.get('RELEASE_SOURCE_ID', 'uncommitted'))
    args = parser.parse_args()
    root = Path(args.root).resolve()
    records=[]
    for path, rel in iter_files(root):
        records.append({'path': rel.as_posix(), 'bytes': path.stat().st_size, 'sha256': sha256(path)})
    epoch = int(os.environ.get('SOURCE_DATE_EPOCH', '0') or 0)
    generated = datetime.fromtimestamp(epoch, tz=timezone.utc).isoformat().replace('+00:00','Z') if epoch else None
    manifest = {
        'schemaVersion': 2,
        'sourceId': args.source_id,
        'generatedAt': generated,
        'fileCountExcludingManifestFiles': len(records),
        'totalBytesExcludingManifestFiles': sum(item['bytes'] for item in records),
        'files': records,
    }
    (root/'RELEASE_MANIFEST.json').write_text(json.dumps(manifest, indent=2)+'\n', encoding='utf-8')
    (root/'FILE_HASHES_SHA256.txt').write_text(''.join(f"{item['sha256']}  {item['path']}\n" for item in records), encoding='utf-8')
    print(f"Generated manifest for {len(records)} files ({manifest['totalBytesExcludingManifestFiles']} bytes).")
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
