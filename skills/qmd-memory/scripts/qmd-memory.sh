#!/usr/bin/env bash
set -euo pipefail

# qmd's native modules are built for the Node it was installed under. Put qmd's
# own bin directory first on PATH so its `#!/usr/bin/env node` picks up the node
# installed beside it (nvm and Homebrew both install them side by side). Don't
# switch Node versions here. If qmd isn't on PATH yet, load nvm, which activates
# its default Node and any qmd installed under it.
if ! command -v qmd >/dev/null 2>&1 && [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck source=/dev/null
  set +u
  . "$HOME/.nvm/nvm.sh" >/dev/null 2>&1 || true
  set -u
fi
if QMD_BIN="$(command -v qmd 2>/dev/null)"; then
  PATH="$(dirname "$QMD_BIN"):$PATH"
fi

KB_PATH="${QMD_KB_PATH:-}"

# Team scoping lives in the KB repo itself (.kb-config at its root), so this
# script stays team-agnostic. Precedence: explicit env var > repo .kb-config >
# generic fallback. .kb-config is read as data, never run: only allowlisted
# KEY="value" lines count (KB_TEAM, KB_TEAM_DESCRIPTION, KB_PLANS_COLLECTION,
# KB_PLANS_DIR, KB_PUBLISH_MODE, KB_PUBLISH_START_HOUR, KB_PUBLISH_END_HOUR,
# KB_PUBLISH_WEEKDAYS_ONLY) plus KB_CONTEXT_<n>="<target>|<text>" lines that
# setup turns into qmd contexts. Anything else in the file is ignored.
KB_TEAM=""
KB_TEAM_DESCRIPTION=""
KB_CONTEXTS=()
KB_CONFIG_LEGACY_HOOK=false

load_kb_config() {
  local file="$1" line key val
  local re='^[[:space:]]*(export[[:space:]]+)?([A-Z][A-Z0-9_]*)=(.*)$'
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      *kb_extra_contexts*\(\)*) KB_CONFIG_LEGACY_HOOK=true ;;
    esac
    [[ "$line" =~ $re ]] || continue
    key="${BASH_REMATCH[2]}"
    val="${BASH_REMATCH[3]}"
    case "$val" in
      \"*) val="${val#\"}"; val="${val%%\"*}" ;;
      \'*) val="${val#\'}"; val="${val%%\'*}" ;;
      *) val="${val%%[[:space:]#]*}" ;;
    esac
    case "$key" in
      KB_TEAM|KB_TEAM_DESCRIPTION|KB_PLANS_COLLECTION|KB_PLANS_DIR|KB_PUBLISH_MODE|KB_PUBLISH_START_HOUR|KB_PUBLISH_END_HOUR|KB_PUBLISH_WEEKDAYS_ONLY)
        printf -v "$key" '%s' "$val" ;;
      KB_CONTEXT_[0-9]*)
        KB_CONTEXTS+=("$val") ;;
    esac
  done < "$file"
}

if [ -n "$KB_PATH" ] && [ -f "$KB_PATH/.kb-config" ]; then
  load_kb_config "$KB_PATH/.kb-config"
fi
# Check the values that become names, paths, hours and modes. Drop bad ones.
for _var in KB_TEAM KB_PLANS_COLLECTION; do
  case "${!_var:-}" in
    ""|*[!a-z0-9-]*|-*) [ -n "${!_var:-}" ] && echo "Ignoring .kb-config $_var='${!_var}' (use lowercase letters, digits and dashes)." >&2; printf -v "$_var" '%s' "" ;;
  esac
done
# The planning dir is relative to the code repo. A shared config can't point it
# elsewhere; a machine-local QMD_PLANS_DIR can.
case "/${KB_PLANS_DIR:-}/" in
  //) ;;
  //?*|*/../*) echo "Ignoring .kb-config KB_PLANS_DIR='$KB_PLANS_DIR' (use a path inside the repo, without '..')." >&2; KB_PLANS_DIR="" ;;
esac
for _var in KB_PUBLISH_START_HOUR KB_PUBLISH_END_HOUR; do
  case "${!_var:-}" in
    ""|*[!0-9]*) [ -n "${!_var:-}" ] && echo "Ignoring .kb-config $_var='${!_var}' (use a number from 0 to 24)." >&2; printf -v "$_var" '%s' "" ;;
  esac
done
case "${KB_PUBLISH_MODE:-}" in ""|review|auto) ;; *) echo "Ignoring .kb-config KB_PUBLISH_MODE='$KB_PUBLISH_MODE' (use review or auto)." >&2; KB_PUBLISH_MODE="" ;; esac
case "${KB_PUBLISH_WEEKDAYS_ONLY:-}" in ""|true|false) ;; *) KB_PUBLISH_WEEKDAYS_ONLY="" ;; esac
KB_TEAM="${KB_TEAM:-team}"
KB_TEAM_DESCRIPTION="${KB_TEAM_DESCRIPTION:-Team engineering memory: plans, decisions, incidents, validation gates, and coding-agent runbooks. Prefer recent last_updated dates and direct code for current implementation.}"
# Publish window (team policy, overridable in .kb-config): hours are local time.
PUBLISH_START_HOUR="${KB_PUBLISH_START_HOUR:-9}"
PUBLISH_END_HOUR="${KB_PUBLISH_END_HOUR:-20}"
PUBLISH_WEEKDAYS_ONLY="${KB_PUBLISH_WEEKDAYS_ONLY:-true}"
# Publish mode: review = a human approves every push (publish commits locally,
# an explicit `push` performs the approved push); auto = push within the window.
# Precedence: per-machine env > team .kb-config > safe default (review).
PUBLISH_MODE="${QMD_PUBLISH_MODE:-${KB_PUBLISH_MODE:-review}}"

valid_index_name() {
  case "$1" in ""|*[!A-Za-z0-9_.-]*) return 1 ;; esac
}

INDEX="${QMD_INDEX:-$KB_TEAM}"
# The team KB's index. get, multi-get and status read READ_INDEX, which one
# scope flag can point at another index.
READ_INDEX="$INDEX"
KB_COLLECTION="${QMD_KB_COLLECTION:-${KB_TEAM}-kb}"
REPO_PATH="${QMD_REPO_PATH:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
PLANS_COLLECTION="${QMD_PLANS_COLLECTION:-${KB_PLANS_COLLECTION:-plans}}"
PLANS_DIR="${QMD_PLANS_DIR:-${KB_PLANS_DIR:-.cursor/planning}}"
LIMIT="${QMD_LIMIT:-10}"
MIN_SCORE="${QMD_MIN_SCORE:-0.25}"
# Private workbench (optional, personal): a separate index. Its search entries
# carry a label that says it is not team truth.
WORKBENCH_INDEX="${QMD_WORKBENCH_INDEX:-${INDEX}-workbench}"
WORKBENCH_PATH="${QMD_WORKBENCH_PATH:-}"
for _name in "$INDEX" "$WORKBENCH_INDEX"; do
  if ! valid_index_name "$_name"; then
    echo "Invalid index name '$_name' in QMD_INDEX or QMD_WORKBENCH_INDEX: use letters, digits, '.', '_' or '-'." >&2
    exit 2
  fi
done
# Whether default searches read the workbench: on-request (only when a search
# asks for it) or always. Set per machine, since the workbench is personal.
SEARCH_WORKBENCH="${QMD_SEARCH_WORKBENCH:-on-request}"
case "$SEARCH_WORKBENCH" in
  on-request|always) ;;
  *) echo "Ignoring QMD_SEARCH_WORKBENCH='$SEARCH_WORKBENCH' (use on-request or always)." >&2; SEARCH_WORKBENCH=on-request ;;
esac
# qmd keeps one YAML config per index here, resolved the same way qmd does.
QMD_CONFIG_HOME="${QMD_CONFIG_DIR:-${XDG_CONFIG_HOME:-$HOME/.config}/qmd}"

physical_path() {
  # $1 with symlinks resolved when it is an existing directory, so a qmd config
  # path and an env var path that reach the same folder through a symlink
  # (/tmp vs /private/tmp on macOS) compare equal.
  if [ -d "$1" ]; then
    (cd -P "$1" 2>/dev/null && pwd -P) || printf '%s\n' "${1%/}"
  else
    printf '%s\n' "${1%/}"
  fi
}

# The team KB and workbench folders, resolved once for duplicate checks.
KB_PHYS=""; [ -z "$KB_PATH" ] || KB_PHYS="$(physical_path "$KB_PATH")"
WB_PHYS=""; [ -z "$WORKBENCH_PATH" ] || WB_PHYS="$(physical_path "$WORKBENCH_PATH")"

repo_slug() {
  # owner/name from the origin URL (SSH, scp-style or HTTPS) of the repo being
  # worked in. A worktree shares its main checkout's origin. Prints nothing
  # outside a git repo or without an origin.
  local url name rest
  url="$(git -C "$REPO_PATH" remote get-url origin 2>/dev/null)" || return 0
  url="${url%/}"
  url="${url%.git}"
  name="${url##*/}"
  rest="${url%/*}"
  printf '%s/%s\n' "${rest##*[/:]}" "$name"
}
REPO_SLUG="$(repo_slug)"
# REPO_SLUG as an extended regex, for index_matches_repo.
SLUG_RE="$(printf '%s' "$REPO_SLUG" | sed 's/[]\.[*^$()+?{}|]/\\&/g')"

# qmd can't run inside an agent sandbox such as Claude Code's, for two reasons.
# Every command opens its SQLite index in QMD_STORAGE_DIR and must write files
# next to it, which the sandbox blocks outside the working directory. `query` and
# `embed` also load llama.cpp models, and on Apple Silicon the packaged build
# needs the GPU (Metal), which the sandbox blocks too. qmd then exits non-zero,
# and query prints [], which reads like "no matches".
if [ -n "${INDEX_PATH:-}" ]; then
  # qmd's own override for the index database file.
  QMD_STORAGE_DIR="$(dirname "$INDEX_PATH")"
else
  QMD_STORAGE_DIR="${XDG_CACHE_HOME:-$HOME/.cache}/qmd"
fi
SANDBOX_FAILURE='unable to open database file|ggml_metal_init: error'
EXIT_SANDBOXED=3
# Rewritten notes leave their old chunk vectors behind until `qmd cleanup` runs.
# Refresh cleans an index once its orphans reach this share of its vectors; 10%
# is where qmd itself starts suggesting a cleanup.
ORPHAN_CLEANUP_PERCENT="${QMD_ORPHAN_CLEANUP_PERCENT:-10}"
case "$ORPHAN_CLEANUP_PERCENT" in ''|*[!0-9]*) ORPHAN_CLEANUP_PERCENT=10 ;; esac

report_sandboxed() {
  # $1 says what was skipped.
  cat >&2 <<EOF
qmd-memory.sh: qmd can't run here, so $1
qmd writes its index files in $QMD_STORAGE_DIR, and search and re-embedding also
need the GPU. Agent sandboxes such as Claude Code's block both (in Claude Code,
run with dangerouslyDisableSandbox: true). Only indexes, env and pending work
inside the sandbox.
EOF
}

qmd_storage_writable() {
  # Writes and removes a probe file where qmd keeps its index. A sandbox can make
  # permission checks such as `test -w` pass while still blocking the write.
  local probe="$QMD_STORAGE_DIR/.qmd-memory-probe.$$"
  mkdir -p "$QMD_STORAGE_DIR" 2>/dev/null || return 1
  ( : > "$probe" ) 2>/dev/null || return 1
  rm -f "$probe"
}

require_qmd_storage() {
  qmd_storage_writable && return 0
  report_sandboxed "nothing ran. Rerun this command outside the sandbox."
  exit "$EXIT_SANDBOXED"
}

run_qmd_checked() {
  # Runs a qmd command, streaming its output. Returns 3 when it failed in a way a
  # sandbox causes (index files not writable, GPU unavailable), otherwise the
  # command's own status. When it succeeded without the GPU, notes that qmd fell
  # back to keyword-only search.
  local log rc=0
  log="$(mktemp "${TMPDIR:-/tmp}/qmd-memory.XXXXXX")"
  # Both streams are copied into $log: qmd 2.5.x prints llama.cpp's Metal
  # errors on stdout, later versions on stderr.
  { { "$@" </dev/null 2>&1 1>&3 3>&- | tee -a "$log" >&2; } 3>&1 | tee -a "$log"; } || rc=$?
  if [ "$rc" -ne 0 ] && grep -Eq "$SANDBOX_FAILURE" "$log"; then
    rc="$EXIT_SANDBOXED"
  elif [ "$rc" -eq 0 ] && grep -q 'ggml_metal_init: error' "$log"; then
    echo "(qmd couldn't use the GPU, so it searched by keyword only. Rerun outside the sandbox for semantic results.)" >&2
  fi
  rm -f "$log"
  return "$rc"
}

index_config() {
  printf '%s/%s.yml\n' "$QMD_CONFIG_HOME" "$1"
}

all_indexes() {
  # Index names on this machine, one per line. Names a search can't pass safely
  # to qmd are skipped with a note.
  local f name
  for f in "$QMD_CONFIG_HOME"/*.yml; do
    [ -e "$f" ] || continue
    name="$(basename "$f" .yml)"
    if valid_index_name "$name"; then
      printf '%s\n' "$name"
    else
      echo "(Skipping qmd index '$name': use letters, digits, '.', '_' or '-' in index names.)" >&2
    fi
  done
}

index_paths() {
  # Collection folders in an index's qmd config, one per line.
  local f
  f="$(index_config "$1")"
  [ -f "$f" ] || return 0
  # qmd indents collection fields by four spaces; deeper `path:` lines are
  # context keys, not folders.
  sed -n 's/^    path:[[:space:]]*//p' "$f" |
    sed -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'\$/\1/" -e 's:/*$::'
}

index_prose() {
  # The prose that describes index $1, from its qmd config. With $2 = global, only
  # the global_context value on one line. With $2 = all, that line followed by
  # the values under each collection's `context:` map, one per line, without
  # their keys (which are paths). qmd writes a value with a newline as a YAML
  # block scalar (`global_context: |-` and indented lines), and global_context's
  # lines are joined into one. Paths, masks and model URIs are never included.
  local f
  f="$(index_config "$1")"
  [ -f "$f" ] || return 0
  awk -v mode="$2" '
    { match($0, /^ */); indent = RLENGTH; blank = ($0 ~ /^[[:space:]]*$/) }
    in_ctx && !blank && indent <= ctx_indent { in_ctx = 0 }
    /^global_context:/ {
      v = $0; sub(/^global_context:[[:space:]]*/, "", v)
      if (v ~ /^[|>][-+0-9]*[[:space:]]*$/) { in_global = 1; next }
      sub(/^"/, "", v); sub(/"$/, "", v); global = v; next
    }
    in_global && (blank || indent > 0) {
      if (!blank) { t = $0; sub(/^[[:space:]]+/, "", t); global = global (global == "" ? "" : " ") t }
      next
    }
    { in_global = 0 }
    in_ctx {
      if (!blank) {
        line = $0
        if (indent == ctx_indent + 2) sub(/^[[:space:]]*("[^"]*"|[^:]*):[[:space:]]*/, "", line)
        ctx = ctx line "\n"
      }
      next
    }
    /^ *context:[[:space:]]*$/ { in_ctx = 1; ctx_indent = indent }
    END { if (global != "") print global; if (mode == "all") printf "%s", ctx }
  ' "$f"
}

index_matches_repo() {
  # True when an index documents the current repo: its prose names the repo's
  # owner/name, e.g. a docs index whose description says it covers acme/web.
  # Case-insensitive and whole names only: acme/web matches "acme/web.", "acme/web,"
  # and "acme/web.git", never "acme/web-components" or "acme/web.js". The prose is
  # read whole before grep, since grep -q exiting early would break the pipe
  # under pipefail.
  local prose
  [ -n "$REPO_SLUG" ] || return 1
  prose="$(index_prose "$1" all)"
  grep -Eiq "(^|[^A-Za-z0-9_.-])${SLUG_RE}(\\.git)?(\$|[^A-Za-z0-9_.-]|\\.(\$|[^A-Za-z0-9_-]))" <<<"$prose"
}

workbench_configured() {
  [ -n "$WORKBENCH_PATH" ] && [ -d "$WORKBENCH_PATH" ]
}

workbench_in_default_search() {
  workbench_configured && [ "$SEARCH_WORKBENCH" = always ]
}

# Roles: index_role assigns them, label_for names them in search output, and the
# `indexes` command describes them. A new role needs all three.
index_role() {
  # team, workbench, repo (its prose names the current repo's owner/name),
  # duplicate (another index over the team KB or workbench folder, such as a
  # leftover from an older setup), empty (no collections) or other.
  local paths
  if [ "$1" = "$INDEX" ]; then echo team; return; fi
  if [ "$1" = "$WORKBENCH_INDEX" ]; then echo workbench; return; fi
  paths="$(index_paths "$1" | while IFS= read -r p; do physical_path "$p"; done)"
  if [ -z "$paths" ]; then
    echo empty
  elif grep -Fxq -e "${KB_PHYS:-//none}" -e "${WB_PHYS:-//none}" <<<"$paths"; then
    echo duplicate
  elif index_matches_repo "$1"; then
    echo repo
  else
    echo other
  fi
}

label_for() {
  # The label for role $1 of index $2. A duplicate of the workbench folder keeps
  # the workbench's warning.
  case "$1" in
    team) echo "team KB (shared, reviewed)" ;;
    workbench) echo "private workbench (personal notes, local-only, not team truth)" ;;
    repo) echo "repo docs matched to $REPO_SLUG" ;;
    duplicate)
      if [ -n "$WB_PHYS" ] && index_paths "$2" | while IFS= read -r p; do physical_path "$p"; done | grep -Fx "$WB_PHYS" >/dev/null; then
        echo "copy of the private workbench (personal notes, local-only, not team truth)"
      else
        echo "another index over the team KB folder"
      fi
      ;;
    *) echo "index named with --index" ;;
  esac
}

search_targets() {
  # The indexes a search reads, one "<index>|<role>|<label>" per line, each once.
  # With --team, --workbench or --index, exactly the named indexes in the order
  # given. Without them, the team KB, then the workbench when it's in the default
  # set, then indexes whose prose names this repo. --with-workbench adds a
  # configured workbench to either set: after the team KB in the default set, at
  # the end of a named one.
  local name role names repos="" with_wb=false seen=" "
  if [ "$WITH_WORKBENCH" = true ] && workbench_configured; then with_wb=true; fi
  if [ -n "$TARGETS" ]; then
    names="$TARGETS"
    [ "$with_wb" = false ] || names="$names $WORKBENCH_INDEX"
  else
    names="$INDEX"
    if [ "$with_wb" = true ] || workbench_in_default_search; then names="$names $WORKBENCH_INDEX"; fi
    while IFS= read -r name; do
      case "$name" in ""|"$INDEX"|"$WORKBENCH_INDEX") continue ;; esac
      [ "$(index_role "$name")" != repo ] || repos="$repos $name"
    done <<EOF
$(all_indexes)
EOF
    names="$names$repos"
  fi
  for name in $names; do
    case "$seen" in *" $name "*) continue ;; esac
    seen="$seen$name "
    case "$repos " in
      *" $name "*) role=repo ;;
      *) role="$(index_role "$name")" ;;
    esac
    printf '%s|%s|%s\n' "$name" "$role" "$(label_for "$role" "$name")"
  done
}

json_string() {
  # $1 as a JSON string literal. Drops control characters other than tab, CR and
  # LF, which are escaped.
  local s
  s="$(printf '%s' "$1" | tr -d '\000-\010\013\014\016-\037')"
  s="${s//\\/\\\\}"
  s="${s//\"/\\\"}"
  s="${s//$'\t'/\\t}"
  s="${s//$'\r'/\\r}"
  s="${s//$'\n'/\\n}"
  printf '"%s"' "$s"
}

compact_json_array() {
  # Prints the JSON array in $1 on one line, and fails when it isn't one. qmd
  # pretty-prints results, and the helper's output must stay on one line. Parses
  # with node when it's on PATH; without node it only checks the brackets.
  if command -v node >/dev/null 2>&1; then
    printf '%s' "$1" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const v=JSON.parse(s);if(!Array.isArray(v))process.exit(1);process.stdout.write(JSON.stringify(v))}catch(e){process.exit(1)}})'
  else
    # JSON strings can't hold raw newlines, so joining lines keeps the value.
    case "$1" in \[*\]) printf '%s' "$1" | tr '\n' ' ' ;; *) return 1 ;; esac
  fi
}

run_search() {
  # Prints one JSON object on one line: {"query", "indexes": [{"index", "role",
  # "label", "results", "error"?}]}, one entry per search target in order.
  # results is qmd's own array for that index, so rankings are never merged. It
  # is null, with error set, when qmd failed or printed something other than a
  # JSON array; the other indexes still report. Returns 1 if any index failed.
  # When every index fails the way a sandbox causes, prints nothing on stdout
  # and returns 3. $1 is the qmd subcommand (query or search), $2 the query.
  local sub="$1" query="$2" targets idx role label out rc err entry entries=""
  local status=0 total=0 sandboxed=0
  targets="$(search_targets)"
  if [ -n "${INDEX_PATH:-}" ] && [ "$(grep -c . <<<"$targets")" -gt 1 ]; then
    # INDEX_PATH points every index name at one database file.
    echo "(INDEX_PATH is set, so every index opens the same database; searching only the first.)" >&2
    targets="$(head -n 1 <<<"$targets")"
  fi
  while IFS='|' read -r idx role label; do
    [ -z "$idx" ] || require_name_sources "$idx"
  done <<EOF
$targets
EOF
  case "
$targets" in
    *"
$WORKBENCH_INDEX|"*) ;;
    *)
      if [ "$WITH_WORKBENCH" = true ] || [ -z "$TARGETS" ]; then
        if ! workbench_configured; then
          echo "(No private workbench on this machine: QMD_WORKBENCH_PATH is unset or missing.)" >&2
        elif [ -z "$TARGETS" ]; then
          echo "(Private workbench not searched. Add --with-workbench, or set QMD_SEARCH_WORKBENCH=always to include it by default.)" >&2
        fi
      fi
      ;;
  esac
  while IFS='|' read -r idx role label; do
    [ -n "$idx" ] || continue
    total=$((total + 1))
    rc=0
    if [ "$sub" = query ]; then
      out="$(run_qmd_checked qmd --index "$idx" query --json -n "$LIMIT" --min-score "$MIN_SCORE" -- "$query")" || rc=$?
    else
      out="$(run_qmd_checked qmd --index "$idx" search --json -n "$LIMIT" -- "$query")" || rc=$?
    fi
    err=""
    if [ "$rc" -eq "$EXIT_SANDBOXED" ]; then
      err="qmd couldn't open this index or load its models"
      sandboxed=$((sandboxed + 1))
    elif [ "$rc" -ne 0 ]; then
      err="qmd exited $rc"
    elif ! out="$(compact_json_array "$out")"; then
      err="qmd printed something other than a JSON array"
    fi
    entry="{\"index\":$(json_string "$idx"),\"role\":$(json_string "$role"),\"label\":$(json_string "$label")"
    if [ -n "$err" ]; then
      echo "(search on index '$idx' failed: $err)" >&2
      entry="$entry,\"results\":null,\"error\":$(json_string "$err")}"
      status=1
    else
      entry="$entry,\"results\":$out}"
    fi
    entries="${entries:+$entries,}$entry"
  done <<EOF
$targets
EOF
  if [ "$total" -gt 0 ] && [ "$sandboxed" -eq "$total" ]; then
    report_sandboxed "nothing was searched. Rerun this command outside the sandbox."
    return "$EXIT_SANDBOXED"
  fi
  printf '{"query":%s,"indexes":[%s]}\n' "$(json_string "$query")" "$entries"
  return "$status"
}

refresh_workbench() {
  # No-op unless the machine has a private workbench configured. Callers may run
  # this after `||`, where set -e is off, so each step checks its own status.
  local rc=0
  workbench_configured || return 0
  require_name_sources "$WORKBENCH_INDEX"
  if ! qmd --index "$WORKBENCH_INDEX" collection list 2>/dev/null | grep -F "qmd://$WORKBENCH_INDEX/" >/dev/null; then
    echo "Adding workbench collection: $WORKBENCH_INDEX -> $WORKBENCH_PATH"
    qmd --index "$WORKBENCH_INDEX" collection add "$WORKBENCH_PATH" --name "$WORKBENCH_INDEX" --mask "**/*.md" || return $?
  fi
  qmd --index "$WORKBENCH_INDEX" update || return $?
  run_qmd_checked qmd --index "$WORKBENCH_INDEX" embed || rc=$?
  [ "$rc" -ne "$EXIT_SANDBOXED" ] || report_sandboxed "the workbench index was not re-embedded. Run qmd-memory.sh refresh outside the sandbox."
  [ "$rc" -ne 0 ] || cleanup_orphans "$WORKBENCH_INDEX"
  return "$rc"
}

cleanup_orphans() {
  # $1 is the index. Call it only after a successful embed, so the orphan count
  # reflects the notes on disk. Best effort: orphans waste space without breaking
  # search, so a failed cleanup never fails the refresh.
  local pct
  pct="$(qmd --index "$1" status 2>/dev/null | sed -n 's/.*Orphaned: *[0-9][0-9]* embedding chunks (\([0-9][0-9]*\)%).*/\1/p' | head -n 1)"
  [ -n "$pct" ] && [ "$pct" -ge "$ORPHAN_CLEANUP_PERCENT" ] || return 0
  echo "Cleaning $1: $pct% of its vectors are orphaned chunks."
  qmd --index "$1" cleanup >/dev/null 2>&1 ||
    echo "(qmd cleanup failed on $1. Search still works; run qmd --index $1 cleanup to reclaim the space.)" >&2
}

kb_has_remote() {
  git -C "$KB_PATH" remote get-url origin >/dev/null 2>&1
}

within_publish_window() {
  # Push window in the committer's local timezone; bounds come from .kb-config
  # (defaults: weekdays 09:00-20:00). Always read the real clock; never assume.
  local dow hour
  dow=$(date +%u)   # 1=Mon .. 7=Sun
  hour=$((10#$(date +%H)))
  if [ "$PUBLISH_WEEKDAYS_ONLY" = "true" ] && [ "$dow" -gt 5 ]; then
    return 1
  fi
  [ "$hour" -ge "$PUBLISH_START_HOUR" ] && [ "$hour" -lt "$PUBLISH_END_HOUR" ]
}

publish_window_label() {
  local days="Mon-Sun"
  [ "$PUBLISH_WEEKDAYS_ONLY" = "true" ] && days="Mon-Fri"
  printf '%s %02d:00-%02d:00 local' "$days" "$PUBLISH_START_HOUR" "$PUBLISH_END_HOUR"
}

has_upstream() {
  git -C "$KB_PATH" rev-parse --abbrev-ref --symbolic-full-name '@{upstream}' >/dev/null 2>&1
}

origin_branch_ref() {
  # Prints origin/<current branch> when the local remote-tracking ref exists.
  local branch
  branch="$(git -C "$KB_PATH" symbolic-ref --short -q HEAD)" || return 1
  git -C "$KB_PATH" rev-parse --verify -q "refs/remotes/origin/$branch" >/dev/null || return 1
  echo "origin/$branch"
}

ensure_upstream() {
  # 0: the branch tracks origin (an existing upstream, or origin/<branch> found
  #    after a fetch and now tracked).
  # 1: origin doesn't have this branch yet, so the first push sets upstream.
  # 2: stop (a rebase in progress, a detached HEAD, or a failed fetch); the
  #    error is printed.
  if rebase_in_progress; then
    echo "A rebase is already in progress in $KB_PATH. Finish it (git rebase --continue) or abort it, then retry." >&2
    return 2
  fi
  has_upstream && return 0
  if ! git -C "$KB_PATH" symbolic-ref -q HEAD >/dev/null; then
    echo "The KB repo at $KB_PATH is on a detached HEAD. Check out its main branch and retry." >&2
    return 2
  fi
  if ! git -C "$KB_PATH" fetch -q origin; then
    echo "git fetch failed in $KB_PATH; see the error above." >&2
    return 2
  fi
  local ref
  ref="$(origin_branch_ref)" || return 1
  git -C "$KB_PATH" branch -q --set-upstream-to="$ref" || return 2
}

pending_pushes() {
  # Commits on the local branch not yet on origin. Empty when none/no remote.
  kb_has_remote || return 0
  local ref
  if has_upstream; then
    git -C "$KB_PATH" log --oneline '@{upstream}..HEAD'
  elif ref="$(origin_branch_ref)"; then
    git -C "$KB_PATH" log --oneline "$ref..HEAD"
  else
    # A new KB repo whose branch was never pushed: every local commit is pending.
    git -C "$KB_PATH" log --oneline HEAD 2>/dev/null || true
  fi
}

rebase_in_progress() {
  # `rev-parse --git-path` is relative to the repo, so build absolute paths.
  local gitdir
  gitdir="$(git -C "$KB_PATH" rev-parse --absolute-git-dir)" || return 1
  [ -d "$gitdir/rebase-merge" ] || [ -d "$gitdir/rebase-apply" ]
}

pull_rebase() {
  # Bring in teammates' notes underneath local commits. --autostash carries
  # uncommitted note edits across the rebase. Stop on any conflict.
  # Callers run ensure_upstream first, which refuses a rebase already underway.
  local conflicts
  if ! git -C "$KB_PATH" pull --rebase --autostash; then
    # Only a rebase this pull started can be in progress here.
    if rebase_in_progress && git -C "$KB_PATH" rebase --abort >/dev/null 2>&1; then
      echo "Your local KB commits conflict with origin. The rebase was aborted and the repo is as it was." >&2
      echo "Rebase by hand in $KB_PATH (git pull --rebase), then retry." >&2
    else
      echo "git pull failed in $KB_PATH; see the error above." >&2
    fi
    return 1
  fi
  conflicts="$(git -C "$KB_PATH" diff --name-only --diff-filter=U)" || return 1
  if [ -n "$conflicts" ]; then
    echo "Your uncommitted edits conflict with notes you just pulled:" >&2
    printf '%s\n' "$conflicts" >&2
    echo "Resolve them in $KB_PATH and retry. Your edits are also kept in 'git stash list'." >&2
    return 1
  fi
}

clear_update_cmd() {
  # qmd 2.1.0 runs a collection's update-cmd on every `qmd update` (with or
  # without --pull) and exits before reindexing when it fails. Older versions of
  # this skill registered a git pull there, outside the conflict checks above.
  # The helper owns syncing, so clear it. Clearing when none is set is a no-op.
  qmd_i collection update-cmd "$KB_COLLECTION" >/dev/null 2>&1 || true
}

require_clean_merge_state() {
  # A commit made now would record conflict markers as resolved content, or land
  # inside someone's rebase or on a detached HEAD. Callers may run in a later
  # session than the sync that hit the conflict, so check every time.
  local unmerged
  unmerged="$(git -C "$KB_PATH" diff --name-only --diff-filter=U)" || exit 1
  if [ -n "$unmerged" ]; then
    echo "Unresolved conflicts in $KB_PATH; resolve them before publishing:" >&2
    printf '%s\n' "$unmerged" >&2
    exit 1
  fi
  if rebase_in_progress; then
    echo "A rebase is in progress in $KB_PATH. Finish or abort it before publishing." >&2
    exit 1
  fi
  if ! git -C "$KB_PATH" symbolic-ref -q HEAD >/dev/null; then
    echo "The KB repo at $KB_PATH is on a detached HEAD. Check out its main branch before publishing." >&2
    exit 1
  fi
}

refresh_index() {
  # Writeback and index refresh are one step: keep the index level with the files.
  # embed loads models only when notes changed, so a blocked GPU fails it only
  # then. Callers may run this after `||`, where set -e is off, so each step
  # checks its own status.
  local rc=0
  command -v qmd >/dev/null 2>&1 || return 0
  clear_update_cmd
  qmd_i update || return $?
  run_qmd_checked qmd_i embed || rc=$?
  [ "$rc" -ne "$EXIT_SANDBOXED" ] || report_sandboxed "the team index was not re-embedded. Any pull, commit or push above already ran; run qmd-memory.sh refresh outside the sandbox."
  [ "$rc" -ne 0 ] || cleanup_orphans "$INDEX"
  return "$rc"
}

refresh_all() {
  # Refreshes the team index and the workbench. Returns a real failure (not 3)
  # when either has one, else 3 when only a re-embed was skipped, else 0.
  local rc=0 wrc=0
  refresh_index || rc=$?
  refresh_workbench || wrc=$?
  if [ "$rc" -eq 0 ] || { [ "$rc" -eq "$EXIT_SANDBOXED" ] && [ "$wrc" -ne 0 ]; }; then
    rc="$wrc"
  fi
  return "$rc"
}

do_push() {
  # The actual push, always window-gated. Callers decide the approval semantics.
  if ! kb_has_remote; then
    echo "KB repo has no 'origin' remote; nothing to push."
    return 0
  fi
  # Callers run this as `do_push || rc=$?`, which turns off set -e inside it,
  # so every step checks its own status.
  local pending upstream=0
  ensure_upstream || upstream=$?
  [ "$upstream" -le 1 ] || return 1
  pending="$(pending_pushes)" || return 1
  if [ -z "$pending" ]; then
    echo "Nothing to push: local branch is level with origin."
    return 0
  fi
  if within_publish_window; then
    echo "Pushing the following commits:"
    printf '%s\n' "$pending"
    if [ "$upstream" = 0 ]; then
      pull_rebase || return 1
      git -C "$KB_PATH" push || return 1
    else
      # First push of a new KB repo: there's nothing upstream to pull yet.
      git -C "$KB_PATH" push -u origin HEAD || return 1
    fi
    echo "Pushed to $(git -C "$KB_PATH" remote get-url origin)."
  else
    echo "Push deferred until the publish window ($(publish_window_label)). Pending:"
    printf '%s\n' "$pending"
  fi
}

usage() {
  cat <<EOF
qmd-memory.sh: helper for the qmd-memory skill

Usage:
  qmd-memory.sh setup
  qmd-memory.sh status
  qmd-memory.sh refresh
  qmd-memory.sh sync                 # git pull the KB repo, then refresh indexes
  qmd-memory.sh publish [message]    # commit KB notes; auto mode: push within window; review mode: hold for approval
  qmd-memory.sh push                 # push pending commits (the human-approval action in review mode)
  qmd-memory.sh pending              # show commits awaiting push
  qmd-memory.sh search [scope] <query>
  qmd-memory.sh lex [scope] <exact-query>
  qmd-memory.sh get [scope] <path-or-docid> [qmd get args...]
  qmd-memory.sh multi-get [scope] <glob-or-list> [qmd multi-get args...]
  qmd-memory.sh indexes              # list this machine's qmd indexes and which searches read them
  qmd-memory.sh env                  # print the resolved index and collection names

  search and lex read the team KB and every docs index whose description names
  the current repo's owner/name. They read the private workbench too when
  QMD_SEARCH_WORKBENCH=always. They print one JSON object on one line, with an
  entry per index (index, role, label, results, plus error when qmd failed on
  that index). Scope flags go right after the subcommand and replace the
  default set:
    --team           the team KB
    --workbench      the private workbench
    --index <name>   any index from `indexes` (repeatable)
  --with-workbench adds the workbench to whichever set is read; without a
  workbench on this machine it notes that and searches the rest. --workbench
  exits 1 there.
  get, multi-get and status read one index: the team KB unless one scope flag
  says otherwise. get also honors the ?index=<name> in a result's qmd:// URI;
  multi-get does not.

  Run every command except indexes, env and pending outside agent sandboxes.
  qmd writes its index files in $QMD_STORAGE_DIR, and search and re-embedding
  need the GPU; Claude Code's sandbox blocks both. When qmd can't run, the
  helper says so and exits 3:
    - from the check before qmd starts: nothing ran;
    - from search or lex: every index failed that way, and nothing was
      searched. A failure on only some indexes shows as an error on their
      entries, with exit 1;
    - from setup, refresh, publish, push or sync: only the re-embed was
      skipped, and any git step already ran. A failed pull or push exits 1.

Environment:
  QMD_INDEX=$INDEX
  QMD_KB_PATH=$KB_PATH
  QMD_KB_COLLECTION=$KB_COLLECTION
  QMD_REPO_PATH=$REPO_PATH
  QMD_PLANS_COLLECTION=$PLANS_COLLECTION
  QMD_WORKBENCH_INDEX=$WORKBENCH_INDEX
  QMD_WORKBENCH_PATH=${WORKBENCH_PATH:-<unset: no private workbench on this machine>}
  QMD_SEARCH_WORKBENCH=$SEARCH_WORKBENCH (on-request = only with --workbench or --with-workbench; always = every default search)
  QMD_PUBLISH_MODE=$PUBLISH_MODE (env > .kb-config KB_PUBLISH_MODE > default 'review')
  QMD_LIMIT=$LIMIT
  QMD_MIN_SCORE=$MIN_SCORE
EOF
}

qmd_version_note() {
  # Setup suggests an upgrade when qmd is older than 2.8, the oldest version this
  # helper is tested against. Other commands skip the check to stay fast.
  local version major minor
  version="$(qmd --version 2>/dev/null | head -n 1 | sed -n 's/^qmd \([0-9][0-9]*\.[0-9][0-9]*\).*/\1/p')"
  [ -n "$version" ] || return 0
  major="${version%%.*}"
  minor="${version#*.}"
  if [ "$major" -lt 2 ] || { [ "$major" -eq 2 ] && [ "$minor" -lt 8 ]; }; then
    echo "Note: qmd $version found. Upgrade with: npm install -g @tobilu/qmd@latest" >&2
  fi
}

require_qmd() {
  # Every caller opens the qmd index, so also check that qmd can write it.
  if ! command -v qmd >/dev/null 2>&1; then
    echo "qmd is not installed or not on PATH." >&2
    echo "Install globally outside the repo: npm install -g @tobilu/qmd@latest" >&2
    exit 127
  fi
  require_qmd_storage
}

require_kb_path() {
  if [ -z "$KB_PATH" ]; then
    echo "QMD_KB_PATH is not set. Set it to your local clone of your team knowledge base" >&2
    echo "in a machine-local shell profile, e.g.:" >&2
    echo "  export QMD_KB_PATH=\"/path/to/your/clone/of/your-team-knowledge-base\"" >&2
    exit 2
  fi
}

qmd_i() {
  qmd --index "$INDEX" "$@"
}

require_name_sources() {
  # The team index name comes from .kb-config unless QMD_INDEX sets it, and the
  # workbench name from QMD_WORKBENCH_INDEX, else from the team name. When $@
  # includes one of them and its source is missing (QMD_KB_PATH unset), stop:
  # the generic fallback name would quietly read the wrong index.
  local name
  for name in "$@"; do
    if [ "$name" = "$INDEX" ] && [ -z "${QMD_INDEX:-}" ]; then require_kb_path; fi
    if [ "$name" = "$WORKBENCH_INDEX" ] && [ -z "${QMD_WORKBENCH_INDEX:-}${QMD_INDEX:-}" ]; then require_kb_path; fi
  done
}

require_known_index() {
  # Naming an index qmd hasn't seen would make qmd create an empty one.
  if ! valid_index_name "$1"; then
    echo "Invalid index name: '$1'" >&2
    exit 2
  fi
  if [ ! -f "$(index_config "$1")" ]; then
    echo "No qmd index named '$1' on this machine. List them with: qmd-memory.sh indexes" >&2
    exit 2
  fi
}

require_workbench() {
  if ! workbench_configured; then
    echo "No private workbench is configured on this machine (QMD_WORKBENCH_PATH is unset or missing)." >&2
    exit 1
  fi
}

collection_exists() {
  local name="$1"
  qmd_i collection list 2>/dev/null | grep -F "qmd://$name/" >/dev/null
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
    echo "Adding collection: $name -> $path ($mask)"
    qmd_i collection add "$path" --name "$name" --mask "$mask"
  fi
}

context_exists() {
  local needle="$1"
  qmd_i context list 2>/dev/null | grep -F -- "$needle" >/dev/null
}

ensure_context() {
  local target="$1"
  local text="$2"
  if context_exists "$target"; then
    echo "Context exists: $target"
  else
    echo "Adding context: $target"
    # `--` keeps text from .kb-config that starts with '-' from parsing as a qmd option.
    qmd_i context add -- "$target" "$text"
  fi
}

cmd="${1:-}"
shift || true
# Scope flags come right after the subcommand: --team, --workbench, --index <name>
# (repeatable). On search and lex they name exactly the indexes to read, and
# without them the default set is read; --with-workbench adds the workbench to
# either. get, multi-get and status take at most one of the first three.
TARGETS=""
WITH_WORKBENCH=false
case "$cmd" in
  search|lex|get|multi-get|status)
    while [ $# -gt 0 ]; do
      case "$1" in
        --team) TARGETS="$TARGETS $INDEX"; shift ;;
        --workbench) require_workbench; TARGETS="$TARGETS $WORKBENCH_INDEX"; shift ;;
        --with-workbench) WITH_WORKBENCH=true; shift ;;
        --index)
          if [ $# -lt 2 ]; then
            echo "--index needs an index name. List them with: qmd-memory.sh indexes" >&2
            exit 2
          fi
          require_known_index "$2"
          TARGETS="$TARGETS $2"
          shift 2
          ;;
        *) break ;;
      esac
    done
    TARGETS="${TARGETS# }"
    ;;
esac
case "$cmd" in
  get|multi-get|status)
    # These read one index, READ_INDEX.
    if [ "$TARGETS" != "${TARGETS%% *}" ] || [ "$WITH_WORKBENCH" = true ]; then
      echo "$cmd reads one index; pass at most one of --team, --workbench, --index." >&2
      exit 2
    fi
    [ -z "$TARGETS" ] || READ_INDEX="$TARGETS"
    ;;
esac

case "$cmd" in
  setup)
    require_qmd
    require_kb_path
    qmd_version_note
    if [ ! -d "$KB_PATH" ]; then
      echo "Knowledge base directory does not exist: $KB_PATH" >&2
      echo "Ask the user before creating the missing knowledge-base directory." >&2
      exit 2
    fi
    ensure_collection "$KB_COLLECTION" "$KB_PATH" "**/*.md"
    plans_available=false
    if [ -d "$REPO_PATH/$PLANS_DIR" ]; then
      ensure_collection "$PLANS_COLLECTION" "$REPO_PATH/$PLANS_DIR" "**/*.md"
      plans_available=true
    elif collection_exists "$PLANS_COLLECTION"; then
      plans_available=true
    else
      echo "No $PLANS_DIR directory found under $REPO_PATH; skipping the optional planning collection."
    fi
    if [ ! -f "$KB_PATH/.kb-config" ]; then
      echo "No .kb-config found at $KB_PATH. Using generic names (index '$INDEX', collection '$KB_COLLECTION')." >&2
      echo "To scope this KB to a team, commit a .kb-config with KB_TEAM and KB_TEAM_DESCRIPTION at the repo root." >&2
    fi
    ensure_context "/" "$KB_TEAM_DESCRIPTION"
    ensure_context "qmd://$KB_COLLECTION" "Persistent markdown knowledge base maintained by agents. Use for migration history, gotchas, decisions, vendor behavior, and validation commands."
    # Topic contexts from .kb-config: KB_CONTEXT_<n>="<target>|<text>". A bare
    # target is a path inside the KB collection; qmd:// targets and / pass through.
    for entry in ${KB_CONTEXTS[@]+"${KB_CONTEXTS[@]}"}; do
      target="${entry%%|*}"
      text="${entry#*|}"
      if [ -z "$target" ] || [ "$text" = "$entry" ]; then
        echo "Skipping malformed KB_CONTEXT entry: $entry" >&2
        continue
      fi
      case "$target" in
        qmd://*|/) ;;
        *) target="qmd://$KB_COLLECTION/${target#/}" ;;
      esac
      ensure_context "$target" "$text"
    done
    if [ "$KB_CONFIG_LEGACY_HOOK" = true ]; then
      echo "Note: .kb-config defines kb_extra_contexts(), which is no longer run. Replace it with KB_CONTEXT_1=\"<topic-dir>|<description>\" lines." >&2
    fi
    if [ "$plans_available" = true ]; then
      ensure_context "qmd://$PLANS_COLLECTION" "Repository-local planning documents and ExecPlans. Use for current task state, progress, decisions, and acceptance gates."
    fi
    refresh_all
    qmd_i status
    ;;
  status)
    require_qmd
    require_name_sources "$READ_INDEX"
    qmd --index "$READ_INDEX" status
    ;;
  refresh)
    require_qmd
    require_name_sources "$INDEX"
    refresh_all
    ;;
  sync)
    # Pull the latest team notes, then rebuild the local (derived) indexes.
    require_qmd
    require_kb_path
    pull_ok=true
    upstream=0
    if ! kb_has_remote; then
      echo "KB repo has no 'origin' remote; skipping pull (local-only repo)."
    else
      ensure_upstream || upstream=$?
      case "$upstream" in
        0) pull_rebase || pull_ok=false ;;
        1) echo "origin doesn't have this KB branch yet (never pushed); skipping pull." ;;
        *) pull_ok=false ;;
      esac
    fi
    # Refresh even when the pull failed, so the index matches the files on disk.
    # A pull failure outranks a skipped re-embed in the exit status.
    refresh_rc=0
    refresh_all || refresh_rc=$?
    [ "$pull_ok" = true ] || exit 1
    exit "$refresh_rc"
    ;;
  publish)
    # Commit markdown notes in the KB repo. Whether the push happens depends on
    # PUBLISH_MODE: auto = push within the publish window; review = never push
    # here — a human approves first, then `qmd-memory.sh push` performs it.
    require_qmd
    require_kb_path
    msg="${1:-kb: update notes}"
    push_rc=0
    require_clean_merge_state
    git -C "$KB_PATH" add -A -- '*.md'
    if git -C "$KB_PATH" diff --cached --quiet; then
      echo "Nothing to publish: no staged markdown changes in $KB_PATH."
    else
      git -C "$KB_PATH" commit -m "$msg"
      if ! kb_has_remote; then
        echo "Committed locally. KB repo has no 'origin' remote yet; nothing pushed."
      elif [ "$PUBLISH_MODE" = "auto" ]; then
        do_push || push_rc=$?
      else
        echo "Committed locally in review mode. Review the pending commits before approving a push."
        echo "Pending commits awaiting approval:"
        pending_pushes
        echo "After the human approves, push with: qmd-memory.sh push"
      fi
    fi
    # Writeback and index refresh are one step: refresh even when the push failed.
    # A push failure outranks a skipped re-embed in the exit status.
    refresh_rc=0
    refresh_index || refresh_rc=$?
    [ "$push_rc" -eq 0 ] || exit "$push_rc"
    exit "$refresh_rc"
    ;;
  push)
    # The human-approval action for review mode (harmless in auto mode).
    # Agents: run this ONLY after the user explicitly approved the pending
    # commits in this conversation. Approval does not carry between pushes.
    require_kb_path
    # Check before pushing, so a sandboxed push stops before any git step.
    ! command -v qmd >/dev/null 2>&1 || require_qmd_storage
    push_rc=0
    do_push || push_rc=$?
    # The pull before the push may have brought in teammates' notes.
    refresh_rc=0
    refresh_index || refresh_rc=$?
    [ "$push_rc" -eq 0 ] || exit "$push_rc"
    exit "$refresh_rc"
    ;;
  pending)
    # What's committed locally but not yet on the team remote.
    require_kb_path
    pending="$(pending_pushes)"
    if [ -n "$pending" ]; then
      echo "Local commits not yet pushed (mode: $PUBLISH_MODE):"
      printf '%s\n' "$pending"
    else
      echo "Nothing pending: local branch is level with origin (mode: $PUBLISH_MODE)."
    fi
    ;;
  search|lex)
    require_qmd
    query="$*"
    if [ -z "$query" ]; then usage; exit 2; fi
    sub=query
    [ "$cmd" = search ] || sub=search
    run_search "$sub" "$query"
    ;;
  indexes)
    # What this machine has, so an agent can pick the indexes a question needs.
    echo "qmd indexes on this machine ($QMD_CONFIG_HOME)"
    echo "current repo: ${REPO_SLUG:-none (not in a git repo with an origin)}"
    roles="$(while IFS= read -r name; do [ -z "$name" ] || printf '%s|%s\n' "$name" "$(index_role "$name")"; done <<EOF
$(all_indexes)
EOF
)"
    [ -n "$roles" ] || { echo "No qmd indexes yet. Run: qmd-memory.sh setup"; exit 0; }
    # Team, workbench and repo indexes first, in the order searches read them.
    for pass in team workbench repo rest; do
      while IFS='|' read -r name role; do
        case "$role" in team|workbench|repo) group="$role" ;; *) group=rest ;; esac
        [ "$group" = "$pass" ] || continue
        case "$role" in
          team|repo) reads="searched by default" ;;
          workbench)
            if ! workbench_configured; then
              reads="not searched: QMD_WORKBENCH_PATH is unset or missing"
            elif workbench_in_default_search; then
              reads="searched by default (QMD_SEARCH_WORKBENCH=always)"
            else
              reads="searched with --with-workbench or --workbench; set QMD_SEARCH_WORKBENCH=always to include it by default"
            fi
            ;;
          duplicate) reads="skipped: covers the team KB or workbench folder (stale copy)" ;;
          empty) reads="skipped: no collections" ;;
          *) reads="search it with --index $name when the question is about it" ;;
        esac
        echo
        echo "$name [$role] $reads"
        index_paths "$name" | sed 's/^/  path: /'
        desc="$(index_prose "$name" global)"
        [ -z "$desc" ] || printf '  about: %s\n' "$desc"
      done <<EOF
$roles
EOF
    done
    ;;
  get)
    require_qmd
    if [ $# -lt 1 ]; then usage; exit 2; fi
    # A qmd:// URI with ?index=<name> names its own index, which qmd opens.
    case "$1" in
      *"?index="*)
        uri_index="${1##*\?index=}"
        require_known_index "${uri_index%%[&#]*}"
        ;;
      *) require_name_sources "$READ_INDEX" ;;
    esac
    target="$1"
    shift
    qmd --index "$READ_INDEX" get "$target" "$@"
    ;;
  multi-get)
    require_qmd
    require_name_sources "$READ_INDEX"
    if [ $# -lt 1 ]; then usage; exit 2; fi
    target="$1"
    shift
    qmd --index "$READ_INDEX" multi-get "$target" --json "$@"
    ;;
  env)
    # Resolved names for raw qmd commands. The helper doesn't export QMD_INDEX to
    # the calling shell, so type the printed index name after --index.
    echo "index=$INDEX"
    echo "collection=$KB_COLLECTION"
    echo "workbench_index=$WORKBENCH_INDEX"
    echo "search_workbench=$SEARCH_WORKBENCH"
    echo "qmd_config_dir=$QMD_CONFIG_HOME"
    echo "repo=$REPO_SLUG"
    echo "plans_collection=$PLANS_COLLECTION"
    echo "kb_path=$KB_PATH"
    echo "publish_mode=$PUBLISH_MODE"
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
