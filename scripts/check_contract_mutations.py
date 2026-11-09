"""Private-copy regressions for CSV, AI boundaries, restore and two-source review."""
import argparse,ast,json,pathlib,shutil,subprocess,tempfile
ROOT=pathlib.Path(__file__).resolve().parents[1]
CASES=[
 ('csv-formula','apps/worker/src/export.ts','if (/^[=+\\-@\\t\\r]/.test(s))','if (false)','csv','CSV escapes'),
 ('csv-quotes','apps/worker/src/export.ts',"s.replaceAll('\"', '\"\"')","s",'csv','CSV escapes'),
 ('client-format','apps/web/src/main.tsx',"sessionApi('/export?format=' + exportFormat)","sessionApi('/export?format=json')",'browser','owner chooses CSV'),
 ('csv-format','apps/worker/src/index.ts',"if (format === 'json')","if (true)",'csv','CSV and JSON export'),
 ('export-allowlist','packages/contracts/canonical-tables.json','"task_evidence"]','"task_evidence","collector_credentials"]','restore','test_all_eleven_tables_restore'),
 ('secret-redaction','collectors/local/src/academic_os/ai.py','text=redact_secrets(text)','text=text','python','test_secret_shaped_source_values'),
 ('adapter-consent','collectors/local/src/academic_os/ai.py',"if policy.get('mode')!='external_selected' or policy.get('route')!=route or policy.get('model')!=model or not policy.get('provider') or not policy.get('approved_at'):raise Invalid('CONSENT_REQUIRED')","pass # synthetic removed adapter consent check",'python','test_adapter_itself_checks_consent'),
 ('output-schema','collectors/local/src/academic_os/ai.py','validator.validate(output)','pass # synthetic removed schema check','python','test_schema_rejects_no_evidence'),
 ('evidence-subset','collectors/local/src/academic_os/ai.py',"if not set(c['evidence_ids'])<=allowed:","if False:",'python','test_evidence_subset_and_invalid_json'),
 ('forced-review','schemas/ai-extraction.schema.json','"const": true','"type": "boolean"','python','test_schema_rejects_no_evidence'),
 ('no-tools','collectors/local/src/academic_os/ai.py',"payload={'model':model","payload={'tools':[], 'model':model",'python','test_hostile_corpus_stays'),
 ('owner-choice','apps/worker/src/index.ts','{ ...target, due: proposed.due, ...(v.task_patch ?? {}) }','{ ...target, due: target.due, ...(v.task_patch ?? {}) }','review','two sources retain disagreeing'),
 ('review-not-accept','apps/worker/src/index.ts',"const accepting = v.action.startsWith('accept');","const accepting = true;",'review','reject and clarify only audit'),
 ('no-canonical-on-sync','apps/worker/src/index.ts','  await env.DB.batch(statements);','  await env.DB.batch(statements);\n  await env.DB.prepare("INSERT INTO tasks(id,title,kind,status,priority,due_json,created_at,updated_at) VALUES(?,\'Synthetic unapproved mutation\',\'personal_action\',\'todo\',\'normal\',?,?,?)").bind(uuid(),JSON.stringify(unknownDue),now(),now()).run();','review','AI-shaped proposals'),
]
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--output-dir',type=pathlib.Path,required=True);args=parser.parse_args();args.output_dir.mkdir(parents=True,exist_ok=True)
 with tempfile.TemporaryDirectory(prefix='aos-contract-faults-') as directory:
  fixture=pathlib.Path(directory)
  for folder in ['apps','packages','tests','schemas','collectors','examples','scripts']:shutil.copytree(ROOT/folder,fixture/folder,ignore=shutil.ignore_patterns('node_modules','dist','build','.gradle','.wrangler','__pycache__'))
  for file in ['package.json','package-lock.json','tsconfig.json','vitest.config.ts','playwright.config.ts']:shutil.copy2(ROOT/file,fixture/file)
  (fixture/'node_modules').symlink_to(ROOT/'node_modules',target_is_directory=True)
  def run(name,kind,pattern):
   if kind=='browser':command=[str(ROOT/'node_modules/.bin/playwright'),'test','tests/e2e/export.spec.ts','-g',pattern]
   elif kind in ['python','restore']:
    file='test_injection' if kind=='python' else 'test_restore_contract';command=[str(ROOT/'.venv/bin/python'),'-m','unittest','discover','-s','collectors/local/tests','-p',file+'.py','-k',pattern,'-v']
   else:command=[str(ROOT/'node_modules/.bin/vitest'),'run','tests/integration/'+('export-contract' if kind=='csv' else 'review-boundary')+'.test.ts','-t',pattern]
   result=subprocess.run(command,cwd=fixture,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,timeout=90)
   (args.output_dir/(name+'.txt')).write_text('COMMAND: '+' '.join(command)+'\n'+result.stdout+'\nEXIT: '+str(result.returncode)+'\n');return result
  for name,file,old,new,kind,pattern in CASES:
   target=fixture/file;original=target.read_text();assert original.count(old)==1,(name,original.count(old));assert run(name+'-baseline',kind,pattern).returncode==0,name+' baseline'
   try:
    target.write_text(original.replace(old,new,1));broken=run(name+'-broken',kind,pattern)
    assert broken.returncode!=0 and ('AssertionError' in broken.stdout or (kind=='browser' and 'toContain' in broken.stdout and 'schema_version' in broken.stdout)) and not any(s in broken.stdout for s in ['SyntaxError','Transform failed','Failed to load','FAILED (errors=']),name+' did not fail the intended assertion'
   finally:target.write_text(original)
   assert run(name+'-restored',kind,pattern).returncode==0,name+' restored'
   print(name+': intended assertion failure; restored PASS',flush=True)
 print(f'PASS: {len(CASES)} intended failures; {len(CASES)} restored passes; 0 survivors; working sources untouched.')
if __name__=='__main__':main()
