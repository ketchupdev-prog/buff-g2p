# First push to GitHub

Run these from the **project root** (`buffr-g2p`):

```bash
cd /Users/georgenekwaya/buffr-g2p

# Create a new repo here (only if this folder is not yet a git repo)
git init

# Stage everything (respects .gitignore)
git add .
git status   # optional: check what will be committed

# First commit
git commit -m "first commit"

# Main branch and remote
git branch -M main
git remote add origin https://github.com/ketchupdev-prog/buff-g2p.git

# Push (will prompt for GitHub auth if needed)
git push -u origin main
```

If `git init` says "Reinitialized existing repository", you already have a repo here; skip init and run the rest.  
If you already added a different remote, use `git remote set-url origin https://github.com/ketchupdev-prog/buff-g2p.git` instead of `git remote add`.
