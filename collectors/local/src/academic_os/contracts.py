"""Python adapter for the same repository schemas used by the Worker."""
import json,re
from datetime import datetime,date
from pathlib import Path
from zoneinfo import ZoneInfo
from jsonschema import Draft202012Validator,FormatChecker
from referencing import Registry,Resource
from .core import Invalid
FORMATS=FormatChecker()
@FORMATS.checks('date-time')
def timestamp(value):
    if not isinstance(value,str):return True
    if not re.fullmatch(r'\d{4}-\d{2}-\d{2}[Tt]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:[Zz]|[+-]\d{2}:\d{2})',value):return False
    try:return datetime.fromisoformat(value.upper()).utcoffset() is not None
    except ValueError:return False
ROOT=Path(__file__).resolve().parents[4]
def validator(name):
    schemas=[json.loads(p.read_text()) for p in (ROOT/'schemas').glob('*.schema.json')]
    registry=Registry().with_resources((s['$id'],Resource.from_contents(s)) for s in schemas)
    target=next(s for s in schemas if s['$id'].endswith('/'+name))
    return Draft202012Validator(target,registry=registry,format_checker=FORMATS)
def check_due(due):
    if due['local_date']:date.fromisoformat(due['local_date'])
    if due['local_datetime']:
        local=datetime.fromisoformat(due['local_datetime']);zone=ZoneInfo(due['timezone'])
        from datetime import timezone
        choices={local.replace(tzinfo=zone,fold=fold).astimezone(timezone.utc) for fold in [0,1] if local.replace(tzinfo=zone,fold=fold).astimezone(timezone.utc).astimezone(zone).replace(tzinfo=None)==local}
        if len(choices)!=1:raise Invalid('AMBIGUOUS_DATETIME')
    elif due['timezone']:ZoneInfo(due['timezone'])
def validate_extraction(value,evidence_ids):
    validator('ai-extraction.schema.json').validate(value)
    for c in value['candidates']:
        if not set(c['evidence_ids'])<=set(evidence_ids):raise Invalid('EVIDENCE_UNAVAILABLE')
        check_due(c['fields']['due'])
    return value
