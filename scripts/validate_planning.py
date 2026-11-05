#!/usr/bin/env python3
"""Validate documentation and proposed JSON contracts, not application behavior.

Install requirements-docs.txt in a local virtual environment; run from any cwd.
Runtime implementations must separately enforce ownership, scope, concurrency,
privacy projection, actual source truth and the device/account acceptance gates.
"""
from copy import deepcopy
from datetime import date, datetime
from pathlib import Path
import json
import re
import sys
from urllib.parse import unquote
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from jsonschema import Draft202012Validator, FormatChecker
from referencing import Registry, Resource

ROOT = Path(__file__).resolve().parents[1]
FORMATS = FormatChecker()

@FORMATS.checks('date-time')
def valid_timestamp(value):
    # jsonschema's date-time checker otherwise needs an optional dependency.
    # This wire profile uses seconds and an explicit RFC3339 UTC offset.
    if not isinstance(value, str):
        return True
    if not re.fullmatch(r'\d{4}-\d{2}-\d{2}[Tt]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:[Zz]|[+-]\d{2}:\d{2})', value):
        return False
    try:
        return datetime.fromisoformat(value.upper()).utcoffset() is not None
    except ValueError:
        return False

def semantic_sync(payload):
    """Cross-field checks for synthetic contract examples, not a server validator."""
    ids = [item['evidence_id'] for item in payload['items']]
    if len(ids) != len(set(ids)):
        raise ValueError('duplicate evidence ID')
    candidate_ids = [item['candidate_id'] for item in payload['candidates']]
    if len(candidate_ids) != len(set(candidate_ids)):
        raise ValueError('duplicate candidate ID')
    coverage = payload['coverage']
    if (coverage['start_at'] is None) != (coverage['end_at'] is None):
        raise ValueError('coverage bounds must both be present or absent')
    if coverage['start_at'] and datetime.fromisoformat(coverage['start_at']) > datetime.fromisoformat(coverage['end_at']):
        raise ValueError('coverage reversed')
    for candidate in payload['candidates']:
        if not set(candidate['evidence_ids']) <= set(ids):
            raise ValueError('evidence outside batch')
        due = candidate['fields']['due']
        if due['local_date']:
            date.fromisoformat(due['local_date'])
        if due['local_datetime']:
            datetime.fromisoformat(due['local_datetime'])
        if due['timezone']:
            ZoneInfo(due['timezone'])

def main():
    schemas = {p.name: json.loads(p.read_text()) for p in (ROOT/'schemas').glob('*.json')}
    registry = Registry().with_resources((s['$id'], Resource.from_contents(s)) for s in schemas.values())
    validators = {}
    for name, schema in schemas.items():
        Draft202012Validator.check_schema(schema)
        validators[name] = Draft202012Validator(schema, registry=registry, format_checker=FORMATS)
    sync = json.loads((ROOT/'examples/sync-envelope.synthetic.json').read_text())
    ai = json.loads((ROOT/'examples/ai-extraction.synthetic.json').read_text())
    vs = validators['sync-envelope.schema.json']; va = validators['ai-extraction.schema.json']
    vs.validate(sync); semantic_sync(sync); va.validate(ai)
    cases = []
    def reject(name, edit, validator=vs, source=sync, semantic=False):
        changed=deepcopy(source); edit(changed)
        try:
            validator.validate(changed)
            if semantic: semantic_sync(changed)
        except Exception as exc:
            # Programming/reference errors must fail the validator rather than masquerade as rejection.
            from jsonschema.exceptions import ValidationError
            if not isinstance(exc, (ValidationError, ValueError, ZoneInfoNotFoundError)):
                raise
            cases.append(name)
            return
        raise AssertionError('invalid fixture accepted: '+name)
    reject('raw top-level', lambda x:x.update(raw_text='RAW_SENTINEL'))
    reject('raw excerpt', lambda x:x['items'][0].update(minimal_excerpt='RAW_SENTINEL'))
    reject('raw hash', lambda x:x['items'][0].update(content_hash_sha256='0'*64))
    reject('arbitrary candidate object', lambda x:x['candidates'][0].update(candidate_json={'text':'RAW_SENTINEL'}))
    reject('nested raw field', lambda x:x['candidates'][0]['fields'].update(raw_message='RAW_SENTINEL'))
    reject('AI self approval', lambda x:x['candidates'][0].update(needs_review=False))
    reject('local AI self approval', lambda x:x['candidates'][0].update(needs_review=False), va, ai)
    reject('empty evidence', lambda x:x['candidates'][0].update(evidence_ids=[]))
    reject('missing reference', lambda x:x['candidates'][0].update(evidence_ids=['10000000-0000-4000-8000-000000000099']), semantic=True)
    reject('duplicate evidence', lambda x:x['items'].append(deepcopy(x['items'][0])), semantic=True)
    reject('invalid generation', lambda x:x.update(source_generation=0))
    reject('invalid candidate version', lambda x:x['candidates'][0].update(expected_version=0))
    reject('legacy contract', lambda x:x.update(schema_version='1.0'))
    reject('oversize item count', lambda x:x.update(items=x['items']*101))
    reject('bad observation time', lambda x:x['items'][0].update(observed_at='yesterday'))
    def set_due(x, precision, ld=None, dt=None, tz=None):
        x['candidates'][0]['fields']['due']={'precision':precision,'local_date':ld,'local_datetime':dt,'timezone':tz}
    reject('date-only with time', lambda x:set_due(x,'date_only','2026-11-10','2026-11-10T00:00:00','Asia/Makassar'))
    reject('impossible date', lambda x:set_due(x,'date_only','2026-02-30',None,'Asia/Makassar'))
    reject('impossible datetime', lambda x:set_due(x,'datetime',None,'2026-02-30T09:00:00','Asia/Makassar'), semantic=True)
    reject('unknown with invented date', lambda x:set_due(x,'unknown','2026-11-10'))
    reject('invalid timezone', lambda x:set_due(x,'date_only','2026-11-10',None,'Invalid/Nowhere'), semantic=True)
    reject('reversed coverage', lambda x:x['coverage'].update(start_at='2026-11-06T00:00:00Z'), semantic=True)
    for precision,ld,dt,tz in [('date_only','2026-11-10',None,'Asia/Makassar'),('datetime',None,'2026-11-10T23:59:00','Asia/Makassar'),('approximate',None,None,None)]:
        good=deepcopy(sync);set_due(good,precision,ld,dt,tz);vs.validate(good);semantic_sync(good)
    links=0;docs=list(ROOT.glob('*.md'))+list((ROOT/'docs').glob('*.md'))+list((ROOT/'academic-os-spec').glob('*.md'))+list((ROOT/'examples').glob('*.md'))
    for path in docs:
        # Ignore code fences; check actual relative Markdown links only.
        text=re.sub(r'```.*?```','',path.read_text(),flags=re.S)
        for target in re.findall(r'\[[^\]]*\]\(([^)]+)\)',text):
            if re.match(r'^(?:https?://|mailto:|#)',target):continue
            target=unquote(target.split('#')[0])
            if not (path.parent/target).exists():raise AssertionError(f'broken link {path.relative_to(ROOT)}: {target}')
            links+=1
    feature_doc=(ROOT/'docs/13-FEATURE-CATALOG.md').read_text()
    tests_doc=(ROOT/'docs/11-TEST-STRATEGY.md').read_text()
    for n in range(1,31):
        if f'| F{n:02d} |' not in feature_doc:raise AssertionError('missing feature')
    for n in range(1,35):
        if f'| T{n:02d} |' not in tests_doc:raise AssertionError('missing test')
    print(f'PASS: {len(schemas)} schemas; 5 valid fixtures/date variants; {len(cases)} rejection cases; {links} local links; 30 features; 34 test IDs.')
    print('This validates planning artifacts only. No application/device/account tests ran.')

if __name__=='__main__':main()
