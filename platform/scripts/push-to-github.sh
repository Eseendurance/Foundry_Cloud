#!/usr/bin/env bash
# Pushes this project to GitHub, ready for Vercel to import.
#
# Two paths, auto-detected:
#   A) GitHub CLI (`gh`) installed and logged in — creates the repo on
#      GitHub for you and pushes in one go.
#   B) No `gh` — you paste a repo URL (create an empty one first at
#      github.com/new, no README/.gitignore/license) and this script
#      wires it up as `origin` and pushes.
#
# After this finishes: go to vercel.com/new, import the repo, add your
# environment variables (see .env.example), deploy. From then on, every
# push to main redeploys automatically — this script or a plain
# `git push` is all you need going forward.
#
# Usage:
#   chmod +x scripts/push-to-github.sh
#   ./scripts/push-to-github.sh

set -euo pipefail
cd "$(dirname "$0")/.."

echo "== Push to GitHub =="

if ! command -v git &> /dev/null; then
  echo "git isn't installed. Install it first: https://git-scm.com/downloads"
  exit 1
fi

if [ ! -d ".git" ]; then
  echo "No git repo here yet — initializing one."
  git init -b main
else
  echo "Existing git repo found."
  current_branch="$(git symbolic-ref --short -q HEAD || true)"
  if [ -n "$current_branch" ] && [ "$current_branch" != "main" ]; then
    echo "Currently on branch '$current_branch', not 'main'."
    read -rp "Rename it to 'main'? (Vercel's default production branch) [y/N]: " rename
    if [[ "$rename" =~ ^[Yy]$ ]]; then
      git branch -m "$current_branch" main
    fi
  fi
fi

if [ ! -f ".gitignore" ] || ! grep -q "^\.env" .gitignore; then
  echo ".env*.local" >> .gitignore
fi

if ! git config user.email &> /dev/null; then
  read -rp "Git commit email: " git_email
  git config user.email "$git_email"
fi
if ! git config user.name &> /dev/null; then
  read -rp "Git commit name: " git_name
  git config user.name "$git_name"
fi

git add -A
if git diff --cached --quiet; then
  echo "Nothing new to commit."
else
  read -rp "Commit message [Update from Groundwork]: " commit_msg
  git commit -m "${commit_msg:-Update from Groundwork}"
fi

if git remote get-url origin &> /dev/null; then
  echo "Remote 'origin' already set: $(git remote get-url origin)"
else
  if command -v gh &> /dev/null && gh auth status &> /dev/null; then
    echo "GitHub CLI found and logged in."
    read -rp "New repo name [foundry-cloud]: " repo_name
    repo_name="${repo_name:-foundry-cloud}"
    read -rp "Public or private? [private]: " visibility
    visibility="${visibility:-private}"
    gh repo create "$repo_name" --"$visibility" --source=. --remote=origin
  else
    echo "GitHub CLI not found (or not logged in)."
    echo "Create an empty repo first — no README, .gitignore, or license —"
    echo "at: https://github.com/new"
    echo ""
    read -rp "Paste its URL (https://github.com/you/repo.git): " repo_url
    if [ -z "$repo_url" ]; then
      echo "No URL given — stopping here. Re-run this script once you have one."
      exit 1
    fi
    git remote add origin "$repo_url"
  fi
fi

echo "Pushing to origin main..."
if git push -u origin main 2>/tmp/push-error.log; then
  echo "Pushed cleanly."
else
  if grep -q "rejected\|fetch first\|non-fast-forward" /tmp/push-error.log; then
    echo "The remote repo already has commits on it."
    read -rp "Merge that history in and push? [Y/n]: " merge_ans
    if [[ "$merge_ans" =~ ^[Nn]$ ]]; then
      echo "Stopped without pushing."
      exit 1
    fi
    git pull origin main --allow-unrelated-histories --no-rebase -m "Merge existing repo content"
    git push -u origin main
  else
    echo "Push failed for a different reason:"
    cat /tmp/push-error.log
    exit 1
  fi
fi
rm -f /tmp/push-error.log

echo ""
echo "Done. Next: go to https://vercel.com/new, import this repo, add"
echo "your environment variables (see .env.example), and deploy."
echo "Every push to main after that redeploys automatically."
