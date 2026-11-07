#!/usr/bin/env python3
"""CLI utility to collect ITK LMS tasks from active Firefox session."""
import argparse, json, os, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'collectors' / 'local' / 'src'))

from academic_os.core import Store, Invalid
from academic_os.itk import find_session, collect_itk, import_itk
from academic_os.sync import project, upload

def main():
    parser = argparse.ArgumentParser(description="Collect tasks from ITK Moodle LMS (kuliah.itk.ac.id)")
    parser.add_argument('--all', action='store_true', help="Include already completed/submitted tasks")
    parser.add_argument('--upload', action='store_true', help="Upload collected tasks to Academic OS backend")
    parser.add_argument('--source-id', help="Existing enrolled source ID for Academic OS store")
    parser.add_argument('--store-dir', default=str(ROOT / 'collectors' / 'local' / 'data'), help="Local store directory")
    args = parser.parse_args()

    print("Checking active Firefox session...")
    try:
        session = find_session()
    except Invalid:
        session = None

    if not session:
        print("ERROR: No active session found. Please open https://kuliah.itk.ac.id in Firefox and log in.")
        sys.exit(1)

    print("Active session found. Discovering courses and tasks...")
    pending_only = not args.all
    collected = collect_itk(cookies=session, pending_only=pending_only)

    courses = collected['courses']
    items = collected['items']

    print(f"\nDiscovered {len(courses)} enrolled courses.")
    print(f"Found {len(items)} {'pending' if pending_only else 'total'} tasks/quizzes:\n")

    # Sort items: items with due date first (ascending), then items with unknown date
    def sort_key(it):
        d = it.get('due', {})
        if d.get('precision') == 'datetime' and d.get('local_datetime'):
            return (0, d['local_datetime'])
        return (1, '')

    items.sort(key=sort_key)

    for idx, it in enumerate(items, 1):
        due_str = it['due_raw'] if it['due_raw'] else "No close date"
        print(f"{idx:2d}. [{it['course_short']}] ({it['kind'].upper()}) {it['title']}")
        print(f"    Due    : {due_str}")
        print(f"    Status : {it['submission_status']}")
        print(f"    URL    : {it['url']}")
        print()

    if args.upload:
        if not args.source_id:
            print("ERROR: --source-id is required to upload.")
            sys.exit(1)
        store = Store(args.store_dir)
        batches, summary = import_itk(store, args.source_id, cookies=session, pending_only=pending_only)
        url = os.environ.get('ACADEMIC_OS_API_URL', '')
        key_id = os.environ.get('COLLECTOR_KEY_ID', '')
        secret = os.environ.get('COLLECTOR_HMAC_SECRET', '')
        if not (url and key_id and secret):
            print("ERROR: ACADEMIC_OS_API_URL, COLLECTOR_KEY_ID, COLLECTOR_HMAC_SECRET must be set in environment.")
            sys.exit(1)
        for b in batches:
            env = project(store, args.source_id, b)
            res = upload(env, url, key_id, secret)
            print(f"Uploaded batch {b['batch_id']}: {res}")
        print("All batches synced successfully!")

if __name__ == '__main__':
    main()
