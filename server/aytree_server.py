#!/usr/bin/env python3
"""
AyTree server complement (CR-safe iTree)
Adapted from historical intuitree_server.py

Provides:
- Notes DB
- Deeper FS scans
- (Future) .git parsing, registry for dyslexi profile work, mutations

Primary viz stays local-first (FS Access + logs). Server is optional power layer.
"""

import os
import json
from http.server import HTTPServer, SimpleHTTPRequestHandler

DEFAULT_PORT = 8010
SCAN_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
NOTES_FILE = os.path.join(os.path.dirname(__file__), ".aytree_notes.json")

# TODO: port notes, /api/tree with re-root, extend for AyTree model
# TODO: add .git/logs parser endpoint, optional pywin32 for Windows junctions

print("AyTree server stub ready. Implement full ingest + notes as needed.")
print(f"Would serve on :{DEFAULT_PORT}")
