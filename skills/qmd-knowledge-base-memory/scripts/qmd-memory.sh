#!/usr/bin/env bash
set -euo pipefail

if [ -n "${QMD_NODE_VERSION:-}" ] && [ -s "$HOME/.nvm/nvm.sh" ]; then
  # Optional: use the same nvm Node version that installed qmd native modules.
  # shellcheck source=/dev/null
  set +u
  . "$HOME/.nvm/nvm.sh"
  nvm use "$QMD_NODE_VERSION" >/dev/null
  set -u
fi

REPO_PATH="${QMD_REPO_PATH:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
INDEX="${QMD_INDEX:-memory}"
APPLY="${QMD_APPLY:-0}"
KB_PATH="${QMD_KB_PATH:-}"
KB_COLLECTION="${QMD_KB_COLLECTION:-knowledge-base}"
KB_MASK="${QMD_KB_MASK:-**/*.md}"
PLANS_PATH="${QMD_PLANS_PATH:-}"
PLANS_COLLECTION="${QMD_PLANS_COLLECTION:-project-plans}"
PLANS_MASK="${QMD_PLANS_MASK:-**/*.md}"
LIMIT="${QMD_LIMIT:-10}"
MIN_SCORE="${QMD_MIN_SCORE:-0.25}"
GLOBAL_CONTEXT="${QMD_GLOBAL_CONTEXT:-Project memory, plans, decisions, validation gates, and coding-agent runbooks. Prefer recent last_updated dates and direct source evidence for current implementation.}"
KB_CONTEXT="${QMD_KB_CONTEXT:-Persistent markdown knowledge base maintained by agents. Use for project history, gotchas, decisions, external-system behavior, and validation commands.}"
PLANS_CONTEXT="${QMD_PLANS_CONTEXT:-Repository-local planning documents. Use for current task state, progress, decisions, and acceptance gates.}"

detect_first_dir() {
  local candidate
  for candidate in "$@"; do
    if [ -d "$candidate" ]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done
  return 1
}

if [ -z "$KB_PATH" ]; then
  KB_PATH="$(detect_first_dir \
    "$REPO_PATH/knowledge-base" \
    "$REPO_PATH/kb" \
    "$REPO_PATH/docs/knowledge-base" \
    2>/dev/null || true)"
fi

if [ -z "$PLANS_PATH" ]; then
  PLANS_PATH="$(detect_first_dir \
    "$REPO_PATH/docs/plans" \
    "$REPO_PATH/plans" \
    "$REPO_PATH/.plans" \
    2>/dev/null || true)"
fi

usage() {
  cat <<EOF
qmd-memory.sh: helper for the qmd-knowledge-base-memory skill

Usage:
  qmd-memory.sh setup [--apply]
  qmd-memory.sh status
  qmd-memory.sh refresh [--apply]
  qmd-memory.sh search <query>
  qmd-memory.sh lex <exact-query>
  qmd-memory.sh get <path-or-docid> [qmd get args...]
  qmd-memory.sh multi-get <glob-or-list> [qmd multi-get args...]

Environment:
  QMD_INDEX=$INDEX
  QMD_KB_PATH=${KB_PATH:-"(not set; set it or create ./knowledge-base)"}
  QMD_KB_COLLECTION=$KB_COLLECTION
  QMD_KB_MASK=$KB_MASK
  QMD_REPO_PATH=$REPO_PATH
  QMD_PLANS_PATH=${PLANS_PATH:-"(optional; not set)"}
  QMD_PLANS_COLLECTION=$PLANS_COLLECTION
  QMD_PLANS_MASK=$PLANS_MASK
  QMD_LIMIT=$LIMIT
  QMD_MIN_SCORE=$MIN_SCORE
  QMD_NODE_VERSION=${QMD_NODE_VERSION:-"(optional; not set)"}
  QMD_APPLY=$APPLY
EOF
}

require_qmd() {
  if ! command -v qmd >/dev/null 2>&1; then
    echo "qmd is not installed or not on PATH." >&2
    echo "Install globally or externally, for example: npm install -g @tobilu/qmd" >&2
    exit 127
  fi
}

qmd_i() {
  qmd --index "$INDEX" "$@"
}

mutation_enabled() {
  case "$APPLY" in
    1|true|TRUE|yes|YES) return 0 ;;
    *) return 1 ;;
  esac
}

print_qmd() {
  printf '  '
  printf '%q ' qmd --index "$INDEX" "$@"
  printf '\n'
}

run_or_print_qmd() {
  if mutation_enabled; then
    qmd_i "$@"
  else
    print_qmd "$@"
  fi
}

collection_exists() {
  local name="$1"
  local output line expected
  output="$(qmd_i collection list 2>/dev/null || true)"
  expected="$name (qmd://$name/)"
  while IFS= read -r line; do
    if [ "$line" = "$expected" ]; then
      return 0
    fi
  done <<< "$output"
  return 1
}

ensure_collection() {
  local name="$1"
  local path="$2"
  local mask="$3"
  if [ ! -d "$path" ]; then
    echo "Skipping collection '$name'; directory does not exist: $path" >&2
    return 0
  fi
  if collection_exists "$name"; then
    echo "Collection exists: $name"
  else
    if mutation_enabled; then
      echo "Adding collection: $name -> $path ($mask)"
    else
      echo "Would add collection: $name -> $path ($mask)"
    fi
    run_or_print_qmd collection add "$path" --name "$name" --mask "$mask"
  fi
}

context_exists() {
  local target="$1"
  local output header path stripped in_block line
  output="$(qmd_i context list 2>/dev/null || true)"
  if [ "$target" = "/" ]; then
    header="*"
    path="/"
  elif [[ "$target" == qmd://* ]]; then
    stripped="${target#qmd://}"
    stripped="${stripped%/}"
    if [[ "$stripped" == */* ]]; then
      header="${stripped%%/*}"
      path="${stripped#*/}"
    else
      header="$stripped"
      path="/"
    fi
  else
    return 1
  fi

  in_block=0
  while IFS= read -r line; do
    if [ "$line" = "$header" ]; then
      in_block=1
      continue
    fi
    if [ "$in_block" -eq 1 ]; then
      case "$line" in
        ""|"  "*) ;;
        *) return 1 ;;
      esac
      if [ "$path" = "/" ]; then
        if [ "$line" = "  /" ] || [ "$line" = "  / (root)" ]; then
          return 0
        fi
      elif [ "$line" = "  $path" ]; then
        return 0
      fi
    fi
  done <<< "$output"
  return 1
}

ensure_context() {
  local target="$1"
  local text="$2"
  if context_exists "$target"; then
    echo "Context exists: $target"
  else
    if mutation_enabled; then
      echo "Adding context: $target"
    else
      echo "Would add context: $target"
    fi
    run_or_print_qmd context add "$target" "$text"
  fi
}

print_setup_plan() {
  echo "Suggested qmd commands:"
  print_qmd collection add "$KB_PATH" --name "$KB_COLLECTION" --mask "$KB_MASK"
  if [ -n "$PLANS_PATH" ] && [ -d "$PLANS_PATH" ]; then
    print_qmd collection add "$PLANS_PATH" --name "$PLANS_COLLECTION" --mask "$PLANS_MASK"
  else
    echo "  # Optional: set QMD_PLANS_PATH to index project plans."
  fi
  print_qmd context add "/" "$GLOBAL_CONTEXT"
  print_qmd context add "qmd://$KB_COLLECTION" "$KB_CONTEXT"
  if [ -n "$PLANS_PATH" ] && [ -d "$PLANS_PATH" ]; then
    print_qmd context add "qmd://$PLANS_COLLECTION" "$PLANS_CONTEXT"
  fi
  print_qmd update
  print_qmd embed
  echo "After applying, inspect status with:"
  print_qmd status
}

if [ "${1:-}" = "--apply" ]; then
  APPLY=1
  shift
fi

cmd="${1:-}"
shift || true

if [ "${1:-}" = "--apply" ]; then
  APPLY=1
  shift
fi

case "$cmd" in
  setup)
    require_qmd
    if [ -z "$KB_PATH" ] || [ ! -d "$KB_PATH" ]; then
      echo "Knowledge base directory was not found." >&2
      echo "Set QMD_KB_PATH or create a repo-local knowledge-base directory, then rerun setup." >&2
      exit 2
    fi
    if ! mutation_enabled; then
      echo "Dry run: setup would mutate qmd index '$INDEX'. Review the commands below, then rerun with --apply or QMD_APPLY=1 to execute."
      print_setup_plan
      exit 0
    fi
    ensure_collection "$KB_COLLECTION" "$KB_PATH" "$KB_MASK"
    plans_available=false
    if [ -n "$PLANS_PATH" ] && [ -d "$PLANS_PATH" ]; then
      ensure_collection "$PLANS_COLLECTION" "$PLANS_PATH" "$PLANS_MASK"
      plans_available=true
    elif collection_exists "$PLANS_COLLECTION"; then
      plans_available=true
    else
      echo "No plans directory found; set QMD_PLANS_PATH to index project plans."
    fi
    ensure_context "/" "$GLOBAL_CONTEXT"
    ensure_context "qmd://$KB_COLLECTION" "$KB_CONTEXT"
    if [ "$plans_available" = true ]; then
      ensure_context "qmd://$PLANS_COLLECTION" "$PLANS_CONTEXT"
    fi
    if mutation_enabled; then
      qmd_i update
      qmd_i embed
      qmd_i status
    else
      echo "Would refresh indexed documents and embeddings:"
      print_qmd update
      print_qmd embed
      echo "After applying, inspect status with:"
      print_qmd status
    fi
    ;;
  status)
    require_qmd
    qmd_i status
    ;;
  refresh)
    require_qmd
    if mutation_enabled; then
      qmd_i update
      qmd_i embed
    else
      echo "Dry run: refresh would mutate qmd index '$INDEX'. Review the commands below, then rerun with --apply or QMD_APPLY=1 to execute."
      print_qmd update
      print_qmd embed
    fi
    ;;
  search)
    require_qmd
    query="$*"
    if [ -z "$query" ]; then usage; exit 2; fi
    qmd_i query --json -n "$LIMIT" --min-score "$MIN_SCORE" "$query"
    ;;
  lex)
    require_qmd
    query="$*"
    if [ -z "$query" ]; then usage; exit 2; fi
    qmd_i search --json -n "$LIMIT" "$query"
    ;;
  get)
    require_qmd
    if [ $# -lt 1 ]; then usage; exit 2; fi
    target="$1"
    shift
    qmd_i get "$target" "$@"
    ;;
  multi-get)
    require_qmd
    if [ $# -lt 1 ]; then usage; exit 2; fi
    target="$1"
    shift
    qmd_i multi-get "$target" --json "$@"
    ;;
  ""|-h|--help|help)
    usage
    ;;
  *)
    echo "Unknown command: $cmd" >&2
    usage
    exit 2
    ;;
esac
