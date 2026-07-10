#!/usr/bin/env bash
# Apply (or dry-run) Sesefus-matched main branch protection for AyTree.
#
# Policy source: docs/BRANCH_PROTECTION.md
# Sesefus sources: ROADMAP.md, docs/GIT_WORKFLOW.md
#
# Usage:
#   bash tools/apply-main-protection.sh              # dry-run
#   bash tools/apply-main-protection.sh --apply      # mutate GitHub
#   REPO=Zychs/sesefus bash tools/apply-main-protection.sh --apply
#
# Requires: gh auth with admin on REPO. Repo must be public (or Pro) for rulesets.
set -euo pipefail

REPO="${REPO:-Zychs/AyTree}"
APPLY=0
RULESET_NAME="main — sesefus-matched public guard"

for arg in "$@"; do
  case "$arg" in
    --apply) APPLY=1 ;;
    -h|--help)
      sed -n '2,14p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown arg: $arg" >&2
      exit 2
      ;;
  esac
done

if ! command -v gh >/dev/null; then
  echo "gh CLI required" >&2
  exit 1
fi

visibility="$(gh api "repos/${REPO}" --jq .visibility 2>/dev/null || true)"
if [[ -z "$visibility" ]]; then
  echo "Cannot read repos/${REPO} — check gh auth and repo name." >&2
  exit 1
fi

echo "Repo:        ${REPO}"
echo "Visibility:  ${visibility}"
echo "Mode:        $([[ $APPLY -eq 1 ]] && echo APPLY || echo DRY-RUN)"
echo

if [[ "$visibility" != "public" ]]; then
  echo "WARNING: rulesets/branch protection on free plans need a public repo."
  echo "         Make ${REPO} public first, or use GitHub Pro."
  echo "         Merge-settings PATCH may still work; ruleset create will 403."
  echo
fi

# --- payload: repository ruleset for refs/heads/main ---
# API: https://docs.github.com/en/rest/repos/rules
RULESET_JSON="$(cat <<'EOF'
{
  "name": "main — sesefus-matched public guard",
  "target": "branch",
  "enforcement": "active",
  "conditions": {
    "ref_name": {
      "include": ["refs/heads/main"],
      "exclude": []
    }
  },
  "rules": [
    {
      "type": "deletion"
    },
    {
      "type": "non_fast_forward"
    },
    {
      "type": "required_linear_history"
    },
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": true,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": true,
        "allowed_merge_methods": ["squash"]
      }
    }
  ],
  "bypass_actors": []
}
EOF
)"

# Optional status-check rule — only include when CI exists.
# Uncomment / merge into rules[] after .github/workflows/ci.yml lands:
# {
#   "type": "required_status_checks",
#   "parameters": {
#     "strict_required_status_checks_policy": true,
#     "do_not_enforce_on_create": false,
#     "required_status_checks": [
#       { "context": "test", "integration_id": null }
#     ]
#   }
# }

MERGE_SETTINGS_JSON='{
  "allow_squash_merge": true,
  "allow_merge_commit": false,
  "allow_rebase_merge": false,
  "delete_branch_on_merge": true,
  "allow_auto_merge": false,
  "squash_merge_commit_title": "PR_TITLE",
  "squash_merge_commit_message": "PR_BODY"
}'

echo "=== Merge settings (PATCH repos/${REPO}) ==="
echo "$MERGE_SETTINGS_JSON" | python3 -m json.tool
echo
echo "=== Ruleset (${RULESET_NAME}) ==="
echo "$RULESET_JSON" | python3 -m json.tool
echo

if [[ $APPLY -eq 0 ]]; then
  echo "Dry-run only. Re-run with --apply to mutate ${REPO}."
  exit 0
fi

echo "Applying merge settings..."
gh api --method PATCH "repos/${REPO}" --input - <<<"$MERGE_SETTINGS_JSON" \
  --jq '{allow_squash_merge, allow_merge_commit, allow_rebase_merge, delete_branch_on_merge, allow_auto_merge}'

# Upsert ruleset by name
existing_id="$(gh api "repos/${REPO}/rulesets" --jq \
  --arg n "$RULESET_NAME" '.[] | select(.name == $n) | .id' 2>/dev/null || true)"

if [[ -n "${existing_id}" ]]; then
  echo "Updating ruleset id=${existing_id}..."
  gh api --method PUT "repos/${REPO}/rulesets/${existing_id}" --input - <<<"$RULESET_JSON" \
    --jq '{id, name, enforcement, target}'
else
  echo "Creating ruleset..."
  gh api --method POST "repos/${REPO}/rulesets" --input - <<<"$RULESET_JSON" \
    --jq '{id, name, enforcement, target}'
fi

echo
echo "Done. Verify:"
echo "  gh api repos/${REPO}/rulesets --jq '.[] | {id,name,enforcement}'"
echo "  gh api repos/${REPO} --jq '{visibility, allow_squash_merge, allow_merge_commit, allow_rebase_merge, delete_branch_on_merge}'"
