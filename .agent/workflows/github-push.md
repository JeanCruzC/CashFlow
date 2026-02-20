---
description: How to connect to GitHub, push commits, create repos, and open Pull Requests
---

# GitHub Push, Commit & PR Workflow

// turbo-all

> [!IMPORTANT]
> **Auth is interactive.** Steps 4 and 4b require the USER to open a URL and enter a code.
> You MUST notify the user, wait for confirmation, then verify before continuing.
> Do NOT run gh API commands until auth is verified (step 3 passes).

---

## Prerequisites

### 1. Check if `gh` CLI is installed
```bash
export PATH="$HOME/.local/bin:$PATH"
which gh && gh --version || echo "NOT_INSTALLED"
```
- If output contains **NOT_INSTALLED** → go to step 2.
- If installed → skip to step 3.

### 2. Install `gh` CLI (no sudo required)
```bash
GH_VERSION="2.65.0"
ARCH=$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/')
mkdir -p ~/.local/bin && \
curl -sL "https://github.com/cli/cli/releases/download/v${GH_VERSION}/gh_${GH_VERSION}_linux_${ARCH}.tar.gz" | tar xz -C /tmp && \
cp "/tmp/gh_${GH_VERSION}_linux_${ARCH}/bin/gh" ~/.local/bin/gh && \
chmod +x ~/.local/bin/gh && \
~/.local/bin/gh --version
```

> [!NOTE]
> Check latest version at https://github.com/cli/cli/releases and update `GH_VERSION`.

### 3. Check authentication status
```bash
export PATH="$HOME/.local/bin:$PATH"
gh auth status 2>&1
```
- If output contains **Logged in as** → skip to step 5.
- If output contains **not logged into** → go to step 4.

### 4. Authenticate with GitHub (requires user interaction)
```bash
export PATH="$HOME/.local/bin:$PATH"
gh auth login --web -p https
```

**This command will output a one-time code. You MUST:**
1. Tell the user the code and ask them to open `https://github.com/login/device`
2. **WAIT** for the user to say "listo" / "done" / confirm
3. Check the background command status to confirm `Authentication complete`
4. **Verify** by running step 3 again — do NOT proceed until step 3 passes

> [!CAUTION]
> If the user presses Ctrl+C during this step, the token is NOT saved even if
> the browser shows "Congratulations". You must re-run this step if that happens.

### 4b. Add `workflow` scope (only if repo has CI/CD files)

**Check first:**
```bash
find . -path './.github/workflows/*.yml' -o -path './.github/workflows/*.yaml' | head -1
```

If any files are found, the `workflow` scope is required:
```bash
export PATH="$HOME/.local/bin:$PATH"
gh auth refresh -h github.com -s workflow
```
This triggers another device flow — follow the same notify/wait/verify pattern as step 4.

> [!WARNING]
> Without this scope, `git push` will fail with:
> `refusing to allow an OAuth App to create or update workflow`
> Always check for workflow files BEFORE pushing.

### 5. Configure git credential helper
```bash
export PATH="$HOME/.local/bin:$PATH"
gh auth setup-git
```
This allows `git push` over HTTPS to use the `gh` token automatically.
**Run this every time after authenticating.**

---

## Creating a New Repository

### 6. Detect username
```bash
export PATH="$HOME/.local/bin:$PATH"
gh api user --jq '.login'
```
Save this as `<USERNAME>` for the next steps.

### 7. Check if repo already exists
```bash
export PATH="$HOME/.local/bin:$PATH"
gh repo view <USERNAME>/<REPO_NAME> --json url 2>&1 || echo "REPO_NOT_FOUND"
```
- If **REPO_NOT_FOUND** → create in step 8.
- If repo exists → skip to step 9.

### 8. Create the repo on GitHub
```bash
export PATH="$HOME/.local/bin:$PATH"
gh repo create <REPO_NAME> --public
```
- Use `--private` for private repos.
- Creates an **empty repo** (no README, no .gitignore, no license).

### 9. Add or update the remote
```bash
# Check if remote exists
git remote get-url origin 2>&1 || echo "NO_REMOTE"
```
- If **NO_REMOTE**: `git remote add origin https://github.com/<USERNAME>/<REPO_NAME>.git`
- If remote exists but wrong URL: `git remote set-url origin https://github.com/<USERNAME>/<REPO_NAME>.git`
- If remote is correct: skip.

---

## Pushing Branches

### 10. Push the main/default branch
```bash
git push -u origin main
```

### 11. Push feature branches
```bash
git push -u origin <BRANCH_NAME>
```

### 12. Verify push succeeded
```bash
git rev-parse --short HEAD && git rev-parse --short origin/<BRANCH_NAME>
```
Both should match. If they don't, the push didn't fully succeed.

---

## Creating a Pull Request

### 13. Check if PR already exists
```bash
export PATH="$HOME/.local/bin:$PATH"
gh pr list --state open --head <FEATURE_BRANCH> --base main --json number,title,url
```
- If a PR is listed → skip creation, just output the URL.
- If empty → create in step 14.

### 14. Create the PR
```bash
export PATH="$HOME/.local/bin:$PATH"
gh pr create \
  --base main \
  --head <FEATURE_BRANCH> \
  --title "feat: <description>" \
  --body "## Summary
<description of changes>

### Branch
\`<FEATURE_BRANCH>\` → \`main\`"
```

---

## Quick Reference

| Action | Command |
|--------|---------|
| Stage all changes | `git add .` |
| Commit | `git commit -m "feat: description"` |
| Push current branch | `git push` |
| Create branch | `git checkout -b feat/my-feature` |
| Switch branch | `git checkout main` |
| Check status | `git status` |
| View log | `git log --oneline -10` |
| List remotes | `git remote -v` |
| List PRs | `gh pr list` |
| View PR | `gh pr view <NUMBER>` |
| Merge PR | `gh pr merge <NUMBER> --merge` |

---

## Troubleshooting

| Error | Solution |
|-------|----------|
| `gh: command not found` | Run `export PATH="$HOME/.local/bin:$PATH"` or reinstall (step 2) |
| `not logged into any GitHub hosts` | Run `gh auth login --web -p https` (step 4) |
| `could not read Username` | Run `gh auth setup-git` (step 5) |
| `refusing to allow OAuth App to create workflow` | Run `gh auth refresh -h github.com -s workflow` (step 4b) |
| `remote origin already exists` | Run `git remote set-url origin <URL>` instead of `add` |
| User did Ctrl+C during auth | Token NOT saved — re-run step 4 from scratch |
| `--hostname required when not running interactively` | Add `-h github.com` flag |
