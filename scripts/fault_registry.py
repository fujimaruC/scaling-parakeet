"""Single execution inventory. Budgets are proposed hard ceilings, not measurements."""
# key: (runner filename, total seconds, prerequisites)
SUITES = {
    'contract': ('check_contract_mutations.py', 900, 'node,python,chromium'),
    'release': ('check_release_mutations.py', 900, 'node'),
    'round4': ('check_round4_mutations.py', 900, 'node,python,built-assets'),
    'round5': ('check_round5_mutations.py', 900, 'node,python,chromium'),
    'ack': ('check_ack_mutations.py', 600, 'node,python'),
    's2': ('check_s2_mutations.py', 1200, 'node,python,chromium'),
    'evidence': ('check_evidence_mutations.py', 600, 'python'),
    'foundation': ('check_foundation_mutations.py', 900, 'node,chromium'),
    'owner-safety': ('check_owner_safety_mutations.py', 600, 'python'),
    'android': ('check_android_mutations.py', 1200, 'jdk17,sdk28+35,build-tools35'),
    'native': ('check_native_mutations.py', 1500, 'node,jdk17,sdk28+35,build-tools35'),
    'round6': ('check_round6_mutations.py', 1800, 'node,python'),
}
