#!/usr/bin/env bash

set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:8000}"
SESSION="hero-regression-check"

npx playwright cli -s="$SESSION" open "$BASE_URL" >/tmp/hero-regression-open.txt

check_state() {
  local perspective="$1"
  local detail="$2"
  local expected_headline="$3"
  local expected_support="$4"

  npx playwright cli -s="$SESSION" goto "$BASE_URL/?perspective=$perspective&detail=$detail" >/tmp/hero-regression-goto.txt
  local snapshot
  snapshot="$(npx playwright cli -s="$SESSION" snapshot)"

  if ! grep -Fq "$expected_headline" <<<"$snapshot"; then
    echo "Hero headline mismatch for perspective=$perspective detail=$detail"
    echo "Expected headline: $expected_headline"
    exit 1
  fi

  if ! grep -Fq "$expected_support" <<<"$snapshot"; then
    echo "Hero support mismatch for perspective=$perspective detail=$detail"
    echo "Expected support: $expected_support"
    exit 1
  fi
}

check_state "technical" "concise" \
  "A software portfolio." \
  "Human-centered software with thoughtful interaction and practical use."

check_state "technical" "verbose" \
  "A portfolio of software products and experimental projects." \
  "Human-centered software combining thoughtful interaction and practical use, with an emphasis on context-aware systems and adaptive behavior."

check_state "design-philosophy" "concise" \
  "A human-centered software portfolio." \
  "Thoughtful interaction shaped around people, context, and practical use."

check_state "design-philosophy" "verbose" \
  "A portfolio of human-centered software and design principles." \
  "Thoughtful interaction shaped around the person and the situation, grounded in what they are actually trying to accomplish."

echo "Regression check passed for Tech/Design & Philosophy concise/verbose hero states."
