#!/usr/bin/env python3
"""Owner-local Moodle CLI with explicit source, session and projection review."""
import argparse,getpass,json,os,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'collectors/local/src'))
from academic_os.core import Store,Invalid
from academic_os.pipeline import Pipeline
from academic_os import itk_operations

def main():
 p=argparse.ArgumentParser();p.add_argument('operation',choices=['enroll','preview','queue','send']);p.add_argument('--data-dir',required=True);p.add_argument('--source-id',required=True);p.add_argument('--generation',required=True,type=int);p.add_argument('--profile');p.add_argument('--cookie-prompt',action='store_true');p.add_argument('--job');p.add_argument('--confirm-projection',action='store_true');p.add_argument('--all',action='store_true');a=p.parse_args()
 directory=Path(a.data_dir).expanduser().resolve()
 if directory==ROOT or ROOT in directory.parents:p.error('Private local store must be outside the repository')
 store=Store(directory)
 try:
  pipeline=Pipeline(store);value={'source_id':a.source_id,'generation':a.generation,'action':a.operation}
  if a.operation=='preview':
   if bool(a.profile)==bool(a.cookie_prompt):p.error('Choose --profile OR --cookie-prompt')
   value.update({'profile_path':a.profile or '','session_cookie':getpass.getpass('MoodleSession (local only): ') if a.cookie_prompt else '','confirmed':'yes','pending_only':not a.all})
  if a.operation=='queue':
   if not a.job or not a.confirm_projection:p.error('--job and --confirm-projection are required after reviewing the structured preview')
   value.update({'job_id':a.job,'confirmed':'yes'})
  if a.operation=='send':
   if not a.job:p.error('--job is required')
   itk_operations.initialise(store);source,generation,_=itk_operations.selection(pipeline,value);job=pipeline.get(a.job)
   if job['source_id']!=source or job['payload']['envelope']['source_generation']!=generation:raise Invalid('JOB_SOURCE_MISMATCH')
   result=pipeline.send(a.job)
  else:result=itk_operations.action(pipeline,value)
  print(json.dumps(result,ensure_ascii=False,indent=2))
 except Invalid as error:print(json.dumps({'error':str(error)}));raise SystemExit(1)
 finally:store.db.close()
if __name__=='__main__':main()
