---
description: How to connect to GitHub, push commits, create repos, and open Pull Requests
---

# GitHub Push, Commit & PR Workflow

// turbo-all

## Prerequisites

### 1. Check if `gh` CLI is installed
```bash
which gh || echo "NOT INSTALLED"
```
- If **NOT INSTALLED**, go to step 2.
- If installed, skip to step 3.

### 2. Install `gh` CLI (no sudo required)
```bash
mkdir -p ~/.local/bin && \
curl -sL https://github.com/cli/cli/releases/download/v2.65.0/gh_2.65.0_linux_amd64.tar.gz | tar xz -C /tmp && \
cp /tmp/gh_2.65.0_linux_amd64/bin/gh ~/.local/bin/gh && \
chmod +x ~/.local/bin/gh && \
~/.local/bin/gh --version
```

> [!NOTE]
> For ARM/aarch64, replace `amd64` with `arm64` in the URL.
> Check latest version at https://github.com/cli/cli/releases

### 3. Check authentication status
```bash
export PATH="$HOME/.local/bin:$PATH"
gh auth status
```
- If **authenticated**, skip to step 5.
- If **not authenticated**, go to step 4.

### 4. Authenticate with GitHub
```bash
export PATH="$HOME/.local/bin:$PATH"
gh auth login --web -p https
```
- This generates a **one-time code** and a URL.
- **Ask the user** to open `https://github.com/login/device` in their browser and enter the code.
- Wait for confirmation before proceeding.

> [!IMPORTANT]
> If the repo contains `.github/workflows/*.yml` (CI/CD files), you MUST add the `workflow` scope:
> ```bash
> gh auth refresh -h github.com -s workflow
> ```
> This requires another device flow authorization from the user.

### 5. Configure git credential helper
```bash
export PATH="$HOME/.local/bin:$PATH"
gh auth setup-git
```
This allows `git push` over HTTPS to use the `gh` token automatically.

---

## Creating a New Repository

### 6. Create the repo on GitHub
```bash
export PATH="$HOME/.local/bin:$PATH"
gh repo create <REPO_NAME> --public
```
- Use `--private` instead of `--public` for private repos.
- Do NOT add `--confirm` (deprecated).
- This creates an **empty repo** (no README, no .gitignore, no license).

### 7. Add the remote to the local repo
```bash
git remote add origin https://github.com/<USERNAME>/<REPO_NAME>.git
```

> [!TIP]
> Get the username from `git config user.email` (the noreply email contains it)
> or from `gh auth status`.

---

## Pushing Branches

### 8. Push the main branch
```bash
git push -u origin main
```

### 9. Push feature branches
```bash
git push -u origin <BRANCH_NAME>
```

> [!WARNING]
> If push fails with "refusing to allow an OAuth App to create or update workflow",
> run `gh auth refresh -h github.com -s workflow` and have the user authorize again.

---

## Creating a Pull Request

### 10. Create the PR
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

## Quick Reference: Common Git + GitHub Commands

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
| `could not read Username for https://github.com` | Run `gh auth setup-git` (step 5) |
| `refusing to allow OAuth App to create workflow` | Run `gh auth refresh -h github.com -s workflow` (step 4 note) |
| `remote origin already exists` | Run `git remote set-url origin <URL>` instead of `git remote add` |
