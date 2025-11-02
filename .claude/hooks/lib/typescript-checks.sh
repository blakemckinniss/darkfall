#!/bin/bash
# TypeScript and ESLint checking functions for Claude Code hooks
# Used by: prompt-validator.sh

# Run TypeScript and ESLint checks in parallel with smart caching
run_typescript_eslint_checks() {
  local mentioned_files="$1"
  local session_id="${SESSION_ID:-$$}"
  local context=""

  # Cache management (skip checks if run within last 60 seconds and no file changes)
  local cache_dir="/tmp/claude-hook-cache"
  local cache_file="$cache_dir/last-check-${session_id}"
  local cache_max_age=60  # seconds
  local skip_checks=false

  mkdir -p "$cache_dir"

  if [ -f "$cache_file" ]; then
    local last_check=$(cat "$cache_file" 2>/dev/null || echo "0")
    local current_time=$(date +%s)
    local time_diff=$((current_time - last_check))

    if [ "$time_diff" -lt "$cache_max_age" ]; then
      # Check if any files were modified since last check
      local modified_since_check=$(find "$CLAUDE_PROJECT_DIR" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -newer "$cache_file" 2>/dev/null | wc -l)

      if [ "$modified_since_check" -eq 0 ]; then
        skip_checks=true
        context+="### ⚡ TypeScript & Linting Status"$'\n'
        context+="Using cached results from ${time_diff}s ago (no file changes detected)."$'\n\n'
      fi
    fi
  fi

  if [ "$skip_checks" = false ]; then
    # Update cache timestamp
    date +%s > "$cache_file"

    # Get list of modified TypeScript/JavaScript files from git
    local git_modified_files=""
    if [ -d "$CLAUDE_PROJECT_DIR/.git" ]; then
      git_modified_files=$(git -C "$CLAUDE_PROJECT_DIR" diff --name-only --diff-filter=ACMR HEAD 2>/dev/null | grep -E '\.(ts|tsx|js|jsx)$' || true)
    fi

    # Combine mentioned files from prompt + git modified files for relevance
    local relevant_files="$mentioned_files"$'\n'"$git_modified_files"
    relevant_files=$(echo "$relevant_files" | grep -v '^$' | sort -u || echo "")

    # Determine check mode: smart (relevant files only) or full (no relevant files identified)
    local check_mode
    local file_count
    if [ -n "$relevant_files" ]; then
      check_mode="smart"
      file_count=$(echo "$relevant_files" | wc -l | tr -d ' ')
    else
      check_mode="full"
    fi

    # Setup temporary files for parallel execution
    local tsc_output_file="$cache_dir/tsc-output-${session_id}"
    local lint_output_file="$cache_dir/lint-output-${session_id}"

    # Start TypeScript check in background
    (
      cd "$CLAUDE_PROJECT_DIR" && pnpm tsc --noEmit 2>&1 || true
    ) > "$tsc_output_file" &
    local tsc_pid=$!

    # Start ESLint check in background
    (
      if [ "$check_mode" = "smart" ] && [ -n "$relevant_files" ]; then
        # Targeted lint check on relevant files only
        local lint_files=$(echo "$relevant_files" | tr '\n' ' ')
        cd "$CLAUDE_PROJECT_DIR" && pnpm eslint $lint_files 2>&1 || true
      else
        # Full project lint
        cd "$CLAUDE_PROJECT_DIR" && pnpm lint 2>&1 || true
      fi
    ) > "$lint_output_file" &
    local lint_pid=$!

    # Wait for both checks to complete
    wait $tsc_pid
    wait $lint_pid

    # Process TypeScript results with smart filtering
    local typecheck_output=$(cat "$tsc_output_file")
    local typecheck_errors
    local display_output

    if [ "$check_mode" = "smart" ] && [ -n "$relevant_files" ]; then
      # Filter output to relevant files only
      local filtered_output=""
      while IFS= read -r file; do
        if [ -n "$file" ]; then
          local file_errors=$(echo "$typecheck_output" | grep "^$file(" || true)
          if [ -n "$file_errors" ]; then
            filtered_output+="$file_errors"$'\n'
          fi
        fi
      done <<< "$relevant_files"
      typecheck_errors=$(echo "$filtered_output" | grep -c "error TS" || true)
      display_output="$filtered_output"
    else
      typecheck_errors=$(echo "$typecheck_output" | grep -c "error TS" || true)
      display_output="$typecheck_output"
    fi

    if [ "$typecheck_errors" -gt 0 ]; then
      context+="### 🔴 TypeScript Status (MANDATORY CHECK)"$'\n'
      if [ "$check_mode" = "smart" ]; then
        context+="❌ $typecheck_errors type error(s) in $file_count relevant file(s)"$'\n\n'
      else
        context+="❌ $typecheck_errors type error(s) detected (full project check)"$'\n\n'
      fi
      context+="**Errors:**"$'\n'
      context+='```'$'\n'
      context+="$(echo "$display_output" | grep "error TS" | head -5)"$'\n'
      context+='```'$'\n\n'
      context+="**Action required:** These MUST be fixed before committing per strict TypeScript policy."$'\n\n'
    else
      context+="### ✅ TypeScript Status"$'\n'
      if [ "$check_mode" = "smart" ]; then
        context+="No type errors in $file_count relevant file(s)."$'\n\n'
      else
        context+="No type errors detected."$'\n\n'
      fi
    fi

    # Process ESLint results
    local lint_output=$(cat "$lint_output_file")
    local lint_errors=$(echo "$lint_output" | grep -c "✖" | head -1 || echo "0")
    local lint_warnings=$(echo "$lint_output" | grep -oP '\d+(?= warning)' | head -1 || echo "0")

    if [ "$lint_errors" != "0" ] && [ "$lint_errors" != "" ]; then
      context+="### 🔴 Linting Status (MANDATORY CHECK)"$'\n'
      if [ "$check_mode" = "smart" ]; then
        context+="❌ Issues found in $file_count relevant file(s)"$'\n'
      else
        context+="❌ Linting issues found (full project check)"$'\n'
      fi
      if [ "$lint_warnings" != "0" ] && [ "$lint_warnings" != "" ]; then
        context+="⚠️  $lint_warnings warning(s) detected."$'\n'
      fi
      context+='```'$'\n'
      context+="$(echo "$lint_output" | tail -15)"$'\n'
      context+='```'$'\n\n'
      context+="**Action required:** Fix linting errors before committing."$'\n\n'
    elif [ "$lint_warnings" != "0" ] && [ "$lint_warnings" != "" ]; then
      context+="### ⚠️  Linting Status"$'\n'
      if [ "$check_mode" = "smart" ]; then
        context+="$lint_warnings warning(s) in relevant files. Run \`pnpm lint\` to review."$'\n\n'
      else
        context+="$lint_warnings warning(s) detected. Run \`pnpm lint\` to review."$'\n\n'
      fi
    else
      context+="### ✅ Linting Status"$'\n'
      if [ "$check_mode" = "smart" ]; then
        context+="No linting issues in $file_count relevant file(s)."$'\n\n'
      else
        context+="No linting errors or warnings detected."$'\n\n'
      fi
    fi

    # Cleanup temporary files
    rm -f "$tsc_output_file" "$lint_output_file"
  fi

  echo "$context"
}
