#!/usr/bin/env python3
from __future__ import annotations
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
errors: list[str] = []

try:
    import yaml
except ImportError:
    yaml = None

for path in ROOT.rglob('*.json'):
    if any(part in {'.git', 'node_modules', 'dist'} for part in path.parts):
        continue
    try:
        json.loads(path.read_text(encoding='utf-8'))
    except Exception as exc:
        errors.append(f'{path.relative_to(ROOT)}: invalid JSON: {exc}')

for path in [*ROOT.rglob('*.yaml'), *ROOT.rglob('*.yml')]:
    if any(part in {'.git', 'node_modules', 'dist'} for part in path.parts):
        continue
    if yaml is None:
        errors.append('PyYAML is required to validate YAML documents')
        break
    try:
        yaml.safe_load(path.read_text(encoding='utf-8'))
    except Exception as exc:
        errors.append(f'{path.relative_to(ROOT)}: invalid YAML: {exc}')

link_pattern = re.compile(r'\[[^\]]*\]\(([^)]+)\)')
for path in ROOT.rglob('*.md'):
    if any(part in {'.git', 'node_modules', 'dist'} for part in path.parts):
        continue
    text = path.read_text(encoding='utf-8', errors='replace')
    for raw in link_pattern.findall(text):
        target = raw.strip().split('#', 1)[0]
        if not target or target.startswith(('https://', 'http://', 'mailto:', '#')):
            continue
        candidate = (path.parent / target).resolve()
        if not candidate.exists():
            errors.append(f'{path.relative_to(ROOT)}: broken relative link {raw}')

required = [
    'docs/public/PRIVACY_AND_STUDENT_DATA_NOTICE.md',
    'docs/public/TERMS_OF_USE.md',
    'docs/public/ACCEPTABLE_USE_POLICY.md',
    'docs/public/COOKIE_AND_SESSION_NOTICE.md',
    'docs/public/DATA_RETENTION_AND_DELETION_POLICY.md',
    'docs/public/THIRD_PARTY_PROCESSOR_REGISTER.md',
    'docs/public/ACCESSIBILITY_STATEMENT.md',
    'docs/public/AI_TRANSPARENCY_NOTICE.md',
    'docs/manuals/USER_MANUAL.md',
    'docs/manuals/ADMIN_MANUAL.md',
    'docs/manuals/SUPPORT_AND_ESCALATION_GUIDE.md',
    'docs/academic/SRS.md',
    'docs/academic/SOFTWARE_DESIGN_DOCUMENT.md',
    'docs/academic/UNIVERSITY_PROJECT_REPORT.md',
    'docs/academic/UNIVERSITY_PROJECT_REPORT.pdf',
    'docs/architecture/UML_AND_ARCHITECTURE.md',
    'docs/architecture/ER_DIAGRAM_AND_DATA_DICTIONARY.md',
    'docs/api/openapi.yaml',
    'docs/testing/TEST_PLAN_AND_CASES.md',
    'docs/testing/UAT_AND_SIGNOFF_TEMPLATE.md',
    'docs/governance/DPIA_AND_RISK_ASSESSMENT.md',
    'docs/governance/BACKUP_AND_DISASTER_RECOVERY_PLAN.md',
    'docs/governance/INCIDENT_RESPONSE_PLAN.md',
    'docs/governance/PRODUCTION_APPROVAL_CHECKLIST.md',
    'docs/compliance/SBOM.cdx.json',
    'docs/compliance/DEPENDENCY_LICENSES.json',
    'docs/compliance/DEPENDENCY_LICENCE_REVIEW.md',
    'docs/implementation/AI_CAPABILITY_STATUS_MATRIX.json',
]
for item in required:
    if not (ROOT / item).is_file():
        errors.append(f'missing required release document: {item}')

matrix_path = ROOT / 'docs/implementation/AI_CAPABILITY_STATUS_MATRIX.json'
if matrix_path.exists():
    matrix = json.loads(matrix_path.read_text(encoding='utf-8'))
    capabilities = matrix.get('capabilities', [])
    if len(capabilities) != 31:
        errors.append(f'AI capability matrix has {len(capabilities)} records; expected 31')
    allowed = {'implemented', 'partial', 'provider-dependent', 'field-data-dependent', 'planned'}
    for item in capabilities:
        if item.get('status') not in allowed:
            errors.append(f"AI capability {item.get('id')} has invalid status {item.get('status')}")

if errors:
    print(f'Document verification failed with {len(errors)} issue(s):', file=sys.stderr)
    for error in errors:
        print(f'- {error}', file=sys.stderr)
    raise SystemExit(1)
print('Document verification passed: JSON/YAML, relative links, required pack and 31-capability matrix are valid.')
