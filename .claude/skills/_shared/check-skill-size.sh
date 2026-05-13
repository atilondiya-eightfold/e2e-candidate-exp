#!/usr/bin/env bash
# Lint for .claude/skills/* — enforces authoring-rules.md.
# Runs at pre-commit. Fails on: oversize SKILL.md, retro-append pattern,
# @-prefix eager loads, missing frontmatter fields.

set -o pipefail

SKILLS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FAIL=0

# Per-class budgets (line counts for SKILL.md). Bash 3.2 compatible (no associative arrays).
budget_for() {
  case "$1" in
    domain-researcher|story-writer|architect|db-architect|api-architect|react-ux-designer)
      echo 350 ;;
    forger)
      echo 500 ;;
    *) echo 450 ;;
  esac
}

for dir in "$SKILLS_DIR"/*/; do
  name="$(basename "$dir")"
  [[ "$name" == "_shared" ]] && continue
  skill="$dir/SKILL.md"
  [[ -f "$skill" ]] || { echo "MISSING: $skill"; FAIL=1; continue; }

  # 1. Size budget
  lines=$(wc -l < "$skill" | tr -d ' ')
  budget="$(budget_for "$name")"
  if (( lines > budget )); then
    echo "SIZE FAIL: $skill = $lines lines (budget $budget)"
    FAIL=1
  fi

  # 2. Retro-append pattern — must be folded, not appended
  if grep -qE '^## Retro .* (additions|Lessons)' "$skill"; then
    echo "RETRO FAIL: $skill contains '## Retro ... additions/Lessons' — fold into canonical sections; raw retro → docs/retros/"
    FAIL=1
  fi

  # 3. Eager loads (@ prefix on reference links)
  if grep -qE '^@[a-zA-Z0-9_/.-]+\.(md|dot|ts|py|sh)' "$skill"; then
    echo "EAGER LOAD FAIL: $skill uses '@path' (loads into context eagerly). Use 'Read \`path\` when <trigger>' instead."
    FAIL=1
  fi

  # 4. Frontmatter fields
  if ! head -20 "$skill" | grep -q '^name:'; then
    echo "FRONTMATTER FAIL: $skill missing 'name:' field"
    FAIL=1
  fi
  if ! head -20 "$skill" | grep -q '^description:'; then
    echo "FRONTMATTER FAIL: $skill missing 'description:' field"
    FAIL=1
  fi

  # 5. Description quality — must start with "Use when"
  desc=$(awk '/^description:/,/^---$|^[a-z_]+:/' "$skill" | head -5 | tr '\n' ' ')
  # Description should start with "Use when/after/at/only/before..." — any imperative trigger opener
  if ! echo "$desc" | grep -qEi 'Use (when|after|at|only|before)'; then
    echo "DESCRIPTION WARN: $skill description should start with 'Use when/after/at/only/before ...' (CSO rule)"
  fi
done

# Total line count summary
echo "---"
total=$(wc -l "$SKILLS_DIR"/*/SKILL.md 2>/dev/null | tail -1 | awk '{print $1}')
echo "Total SKILL.md lines: $total"

if (( FAIL )); then
  echo "---"
  echo "LINT FAILED"
  exit 1
fi
echo "LINT OK"
