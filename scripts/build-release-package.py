#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json, os, shutil, subprocess, tempfile, zipfile
from datetime import datetime, timezone
from pathlib import Path

EXCLUDED_DIRS = {'.git', 'node_modules', 'dist', 'build', 'coverage', '.tmp', 'tmp', '_renders'}
EXCLUDED_NAMES = {'.DS_Store', 'Thumbs.db'}

def run(*args: str, cwd: Path) -> str:
    return subprocess.check_output(args, cwd=cwd, text=True).strip()

def copy_source(source: Path, destination: Path) -> None:
    for path in sorted(source.rglob('*')):
        rel = path.relative_to(source)
        if any(part in EXCLUDED_DIRS for part in rel.parts) or path.name in EXCLUDED_NAMES:
            continue
        if path.is_symlink():
            raise RuntimeError(f'symlink is not allowed in release: {rel}')
        target = destination / rel
        if path.is_dir():
            target.mkdir(parents=True, exist_ok=True)
        elif path.is_file():
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(path, target)

def sha256(path: Path) -> str:
    digest=hashlib.sha256()
    with path.open('rb') as handle:
        for chunk in iter(lambda: handle.read(1024*1024), b''):
            digest.update(chunk)
    return digest.hexdigest()

def main() -> int:
    parser=argparse.ArgumentParser()
    parser.add_argument('--source', default='.')
    parser.add_argument('--output', required=True)
    parser.add_argument('--package-name', default='Project-lost-found-system-latest')
    args=parser.parse_args()
    source=Path(args.source).resolve()
    output=Path(args.output).resolve()
    source_id=run('git','rev-parse','HEAD',cwd=source)
    branch=run('git','branch','--show-current',cwd=source)
    status=run('git','status','--porcelain',cwd=source)
    if status:
        raise RuntimeError('release source must be committed and clean')
    epoch=int(run('git','show','-s','--format=%ct',source_id,cwd=source))
    generated=datetime.fromtimestamp(epoch,tz=timezone.utc).isoformat().replace('+00:00','Z')

    output.parent.mkdir(parents=True,exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='smart-lf-release-') as temp:
        stage_root=Path(temp)/args.package_name
        stage_root.mkdir()
        copy_source(source,stage_root)
        evidence={
            'schemaVersion':1,
            'sourceCommit':source_id,
            'sourceBranch':branch,
            'sourceCommitTimestamp':generated,
            'classification':'hardened release candidate - target environment and institutional certification pending',
            'excluded':['.git','node_modules','dist','build','coverage','.env and environment-specific secret files'],
        }
        (stage_root/'PACKAGE_BUILD_EVIDENCE.json').write_text(json.dumps(evidence,indent=2)+'\n',encoding='utf-8')
        env=os.environ.copy(); env['SOURCE_DATE_EPOCH']=str(epoch); env['RELEASE_SOURCE_ID']=source_id
        subprocess.check_call(['python',str(source/'scripts/generate-release-manifest.py'),'--root',str(stage_root),'--source-id',source_id],env=env,cwd=source)

        fixed=datetime.fromtimestamp(max(epoch,315532800),tz=timezone.utc)
        zip_time=(fixed.year,fixed.month,fixed.day,fixed.hour,fixed.minute,fixed.second)
        with zipfile.ZipFile(output,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as archive:
            for path in sorted(stage_root.rglob('*')):
                if not path.is_file(): continue
                arcname=(Path(args.package_name)/path.relative_to(stage_root)).as_posix()
                info=zipfile.ZipInfo(arcname,zip_time)
                info.compress_type=zipfile.ZIP_DEFLATED
                info.external_attr=(0o100644 & 0xFFFF)<<16
                archive.writestr(info,path.read_bytes(),compress_type=zipfile.ZIP_DEFLATED,compresslevel=9)

    with zipfile.ZipFile(output) as archive:
        bad=archive.testzip()
        if bad: raise RuntimeError(f'archive integrity failed at {bad}')
        count=len(archive.infolist())
    digest=sha256(output)
    checksum=output.with_suffix(output.suffix+'.sha256')
    checksum.write_text(f'{digest}  {output.name}\n',encoding='utf-8')
    print(json.dumps({'zip':str(output),'sha256':digest,'files':count,'sourceCommit':source_id,'integrity':'PASS'},indent=2))
    return 0

if __name__=='__main__':
    raise SystemExit(main())
