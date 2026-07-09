#!/usr/bin/env python3
"""
AyTree server — the dyslexia-first repository map.

Ported from the historical intuitree_server.py (the working implementation) into
AyTree's server/ layout. Serves the visualizer and provides the notes DB, git
enumeration, filesystem scan, and safe mutation endpoints.

Run from the repo root:  python server/aytree_server.py
The primary modular viz (index.html) is local-first (FS Access + logs); this
server is the optional power layer and also serves the legacy monolith at /legacy.
"""
import os
import sys
import json
import subprocess
import threading
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs, unquote

# Set default encoding to UTF-8 for subprocess calls on Windows
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Constants
DEFAULT_PORT = 8000
# server/ lives one level under the repo root; the workspace of repos to map is
# the directory that CONTAINS this repo (same "scan my siblings" intent as intuitree).
WEB_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SCAN_ROOT = os.path.abspath(os.path.join(WEB_ROOT, ".."))
NOTES_FILE = os.path.join(WEB_ROOT, ".aytree_notes.json")

# Ignored patterns to keep tree lightweight and clean
IGNORED_DIRS = {".git", "node_modules", "venv", ".venv", "__pycache__", ".vscode", ".idea", ".gemini", "obj", "bin"}
IGNORED_FILES = {".DS_Store", "desktop.ini", "thumbs.db", ".aytree_notes.json"}

# Notes Database Management
notes_db_lock = threading.Lock()

def load_notes_db():
    with notes_db_lock:
        if os.path.exists(NOTES_FILE):
            try:
                with open(NOTES_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                print(f"[Error] Loading notes database: {e}", file=sys.stderr)
        return {"notes": {}, "virtual_nodes": {}}

def save_notes_db(db):
    with notes_db_lock:
        try:
            with open(NOTES_FILE, "w", encoding="utf-8") as f:
                json.dump(db, f, indent=2, ensure_ascii=False)
            return True
        except Exception as e:
            print(f"[Error] Saving notes database: {e}", file=sys.stderr)
            return False

# Git Enumeration
def get_git_branches(repo_path):
    """Retrieves local and remote branches of a repository using subprocess."""
    branches = {"local": [], "remote": [], "current": None}
    try:
        # Run 'git branch -a' to fetch all branches
        result = subprocess.run(
            ["git", "-C", repo_path, "branch", "-a"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            errors="ignore",
            check=False
        )
        if result.returncode == 0:
            lines = result.stdout.splitlines()
            for line in lines:
                line_stripped = line.strip()
                if not line_stripped:
                    continue

                is_current = line.startswith("*")
                name = line_stripped.replace("*", "").strip()

                # Check for HEAD pointer
                if "-> " in name:
                    continue

                if name.startswith("remotes/"):
                    # Remote branch, extract remote name
                    clean_name = name[len("remotes/"):]
                    branches["remote"].append(clean_name)
                else:
                    branches["local"].append(name)
                    if is_current:
                        branches["current"] = name
    except Exception as e:
        print(f"[Warning] Failed to run git branch for {repo_path}: {e}", file=sys.stderr)
    return branches

# Tree Builder
def build_tree_recursive(current_path, notes_db, depth=0, max_depth=6):
    name = os.path.basename(current_path) or current_path
    rel_path = os.path.relpath(current_path, SCAN_ROOT).replace("\\", "/")
    if rel_path == ".":
        rel_path = ""

    # Base node structure
    node = {
        "name": name,
        "path": current_path,
        "rel_path": rel_path,
        "type": "directory",
        "notes": notes_db.get("notes", {}).get(rel_path, {}).get("notes", ""),
        "status": notes_db.get("notes", {}).get(rel_path, {}).get("status", ""),
        "children": []
    }

    # Check if this is a Git repo
    is_git_repo = os.path.exists(os.path.join(current_path, ".git"))
    if is_git_repo:
        node["type"] = "repository"
        node["is_git"] = True
        git_info = get_git_branches(current_path)
        node["current_branch"] = git_info["current"]

        # Inject branch group node
        branches_node = {
            "name": "🌿 Branches",
            "type": "branch_group",
            "children": []
        }

        for lb in git_info["local"]:
            b_key = f"{name}::local::{lb}"
            branches_node["children"].append({
                "name": lb,
                "type": "branch_local",
                "is_current": (lb == git_info["current"]),
                "key": b_key,
                "notes": notes_db.get("notes", {}).get(b_key, {}).get("notes", ""),
                "status": notes_db.get("notes", {}).get(b_key, {}).get("status", "")
            })

        for rb in git_info["remote"]:
            b_key = f"{name}::remote::{rb}"
            branches_node["children"].append({
                "name": rb,
                "type": "branch_remote",
                "key": b_key,
                "notes": notes_db.get("notes", {}).get(b_key, {}).get("notes", ""),
                "status": notes_db.get("notes", {}).get(b_key, {}).get("status", "")
            })

        if branches_node["children"]:
            node["children"].append(branches_node)

    # Add virtual nodes if any exist for this node path
    virtual_key = rel_path if rel_path else "root"
    virtual_list = notes_db.get("virtual_nodes", {}).get(virtual_key, [])
    for vn in virtual_list:
        node["children"].append({
            "id": vn.get("id"),
            "name": vn.get("name"),
            "type": "virtual_note",
            "notes": vn.get("notes", ""),
            "status": vn.get("status", "")
        })

    # Return if exceeded depth limits
    if depth >= max_depth:
        return node

    # Scan child directories and files
    try:
        entries = sorted(list(os.scandir(current_path)), key=lambda e: (not e.is_dir(), e.name.lower()))
        for entry in entries:
            if entry.is_dir():
                if entry.name in IGNORED_DIRS:
                    continue
                # Recurse directory
                child_node = build_tree_recursive(entry.path, notes_db, depth + 1, max_depth)
                node["children"].append(child_node)
            else:
                if entry.name in IGNORED_FILES:
                    continue
                file_rel_path = os.path.relpath(entry.path, SCAN_ROOT).replace("\\", "/")
                node["children"].append({
                    "name": entry.name,
                    "path": entry.path,
                    "rel_path": file_rel_path,
                    "type": "file",
                    "notes": notes_db.get("notes", {}).get(file_rel_path, {}).get("notes", ""),
                    "status": notes_db.get("notes", {}).get(file_rel_path, {}).get("status", "")
                })
    except Exception as e:
        print(f"[Warning] Failed to scan directory {current_path}: {e}", file=sys.stderr)

    return node

# API Handler & Web Server
class AyTreeRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Allow CORS for ease of development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200, "OK")
        self.end_headers()

    def do_GET(self):
        parsed_url = urlparse(self.path)
        path = parsed_url.path

        # Router
        if path == "/api/tree":
            self.handle_get_tree()
        elif path == "/" or path == "/index.html":
            # Serve the modular AyTree shell
            self.serve_file_or_fallback("index.html")
        elif path == "/legacy" or path == "/legacy/":
            # Serve the working monolith brought over from intuitree
            self.serve_file_or_fallback(os.path.join("legacy", "index_tree.html"))
        else:
            # Fallback to serving static files normally (from WEB_ROOT)
            super().do_GET()

    def do_POST(self):
        parsed_url = urlparse(self.path)
        path = parsed_url.path

        if path == "/api/notes":
            self.handle_post_notes()
        elif path == "/api/extend":
            self.handle_post_extend()
        else:
            self.send_error(404, "API endpoint not found")

    def serve_file_or_fallback(self, filename):
        file_path = os.path.join(WEB_ROOT, filename)
        if os.path.exists(file_path):
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            with open(file_path, "rb") as f:
                self.wfile.write(f.read())
        else:
            self.send_error(404, f"File {filename} not found.")

    def handle_get_tree(self):
        print(f"[API] Scanning {SCAN_ROOT} ...")
        notes_db = load_notes_db()
        tree = build_tree_recursive(SCAN_ROOT, notes_db, depth=0)

        # Return response
        response_data = json.dumps(tree, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(response_data)))
        self.end_headers()
        self.wfile.write(response_data)

    def handle_post_notes(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        try:
            req = json.loads(post_data.decode('utf-8'))
            key = req.get("key")
            is_virtual = req.get("is_virtual", False)

            if not key:
                self.send_api_response(400, {"success": False, "error": "Missing 'key'"})
                return

            db = load_notes_db()

            if is_virtual:
                # Update properties of an existing virtual node
                parent_key = req.get("parent_key", "root")
                virtual_list = db["virtual_nodes"].setdefault(parent_key, [])
                updated = False
                for vn in virtual_list:
                    if vn.get("id") == key:
                        vn["name"] = req.get("name", vn["name"])
                        vn["notes"] = req.get("notes", "")
                        vn["status"] = req.get("status", "")
                        updated = True
                        break
                if not updated:
                    # Create new virtual node
                    new_node = {
                        "id": key,
                        "name": req.get("name", "New Milestone"),
                        "notes": req.get("notes", ""),
                        "status": req.get("status", "")
                    }
                    virtual_list.append(new_node)
            else:
                # Regular node (file, folder, branch)
                db["notes"][key] = {
                    "notes": req.get("notes", ""),
                    "status": req.get("status", "")
                }

            if save_notes_db(db):
                self.send_api_response(200, {"success": True})
            else:
                self.send_api_response(500, {"success": False, "error": "Failed to save database"})

        except Exception as e:
            self.send_api_response(500, {"success": False, "error": str(e)})

    def handle_post_extend(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        try:
            req = json.loads(post_data.decode('utf-8'))
            action = req.get("action")

            if action == "create_folder":
                parent_path = req.get("parent_path", SCAN_ROOT)
                folder_name = req.get("folder_name")
                if not folder_name:
                    self.send_api_response(400, {"success": False, "error": "Folder name is required"})
                    return
                # Sanitize name
                folder_name = os.path.basename(folder_name)
                new_path = os.path.join(parent_path, folder_name)

                # Check if path is valid subpath
                if not os.path.abspath(new_path).startswith(SCAN_ROOT):
                    self.send_api_response(403, {"success": False, "error": "Access Denied: Path outside workspace"})
                    return

                os.makedirs(new_path, exist_ok=True)
                self.send_api_response(200, {"success": True, "message": f"Created folder: {folder_name}"})

            elif action == "create_branch":
                repo_path = req.get("repo_path")
                branch_name = req.get("branch_name")
                if not repo_path or not branch_name:
                    self.send_api_response(400, {"success": False, "error": "Repository path and branch name are required"})
                    return

                # Verify is repository
                if not os.path.exists(os.path.join(repo_path, ".git")):
                    self.send_api_response(400, {"success": False, "error": "Not a valid Git repository"})
                    return

                # Safe branch name check
                if " " in branch_name or ";" in branch_name or "&" in branch_name:
                    self.send_api_response(400, {"success": False, "error": "Invalid characters in branch name"})
                    return

                # Run git branch
                cmd = ["git", "-C", repo_path, "branch", branch_name]
                res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding="utf-8")

                if res.returncode == 0:
                    self.send_api_response(200, {"success": True, "message": f"Created branch '{branch_name}' successfully."})
                else:
                    self.send_api_response(400, {"success": False, "error": res.stderr.strip()})

            elif action == "delete_virtual":
                node_id = req.get("id")
                parent_key = req.get("parent_key", "root")
                if not node_id:
                    self.send_api_response(400, {"success": False, "error": "ID is required"})
                    return

                db = load_notes_db()
                virtual_list = db["virtual_nodes"].get(parent_key, [])
                db["virtual_nodes"][parent_key] = [vn for vn in virtual_list if vn.get("id") != node_id]

                if save_notes_db(db):
                    self.send_api_response(200, {"success": True, "message": "Virtual node deleted"})
                else:
                    self.send_api_response(500, {"success": False, "error": "Failed to save database"})
            else:
                self.send_api_response(400, {"success": False, "error": f"Unknown action: {action}"})

        except Exception as e:
            self.send_api_response(500, {"success": False, "error": str(e)})

    def send_api_response(self, status, payload):
        response_data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(response_data)))
        self.end_headers()
        self.wfile.write(response_data)

# Launch Server
def run_server():
    # Serve static files (index.html, src/, legacy/) relative to the repo root.
    os.chdir(WEB_ROOT)

    port = DEFAULT_PORT
    server = None
    while port < DEFAULT_PORT + 20:
        try:
            server_address = ('', port)
            server = HTTPServer(server_address, AyTreeRequestHandler)
            break
        except OSError:
            print(f"[Port Bind] Port {port} is busy, trying {port+1}...")
            port += 1

    if not server:
        print("[Fatal] Could not find any available port for AyTree server.", file=sys.stderr)
        sys.exit(1)

    print("-" * 64)
    print("AYTREE — DYSLEXIA-FIRST REPOSITORY MAP · SERVER STARTED")
    print(f"Server is listening at: http://localhost:{port}/")
    print(f"Legacy monolith:        http://localhost:{port}/legacy")
    print(f"Scanning directory:     {SCAN_ROOT}")
    print(f"Notes database:         {NOTES_FILE}")
    print("Press Ctrl+C to stop.")
    print("-" * 64)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        server.server_close()
        sys.exit(0)

if __name__ == "__main__":
    run_server()
