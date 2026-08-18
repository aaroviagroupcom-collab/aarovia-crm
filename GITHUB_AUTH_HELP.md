# GitHub Authentication Setup

You're getting a 403 error because GitHub needs authentication. Here's how to fix it:

## Option 1: Use GitHub CLI (EASIEST) ✅ Recommended

### Step 1: Install GitHub CLI
Download from: https://cli.github.com/

Or use PowerShell:
```powershell
winget install GitHub.cli
```

### Step 2: Authenticate
```powershell
gh auth login
```

Choose:
- Platform: GitHub.com
- Protocol: HTTPS
- Authenticate: Y
- Web browser login: Y

### Step 3: Try pushing again
```powershell
cd "c:\Users\Aditya\Downloads\aarovia-crm"
git push -u origin main
```

---

## Option 2: Use Personal Access Token

### Step 1: Create GitHub Personal Access Token
1. Go to: https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. **Token name**: `aarovia-crm-deploy`
4. **Expiration**: 90 days
5. **Select scopes**: 
   - ✓ repo (all)
   - ✓ workflow
6. Click "Generate token"
7. **COPY THE TOKEN** (you won't see it again!)

### Step 2: Use token for git
When pushing, use token as password:
```powershell
cd "c:\Users\Aditya\Downloads\aarovia-crm"
git push -u origin main
```
When prompted for password, paste your token.

### Step 3: To save credentials
```powershell
git config --global credential.helper wincred
```

---

## Option 3: Use SSH Keys (Most Secure)

1. Generate SSH key:
```powershell
ssh-keygen -t ed25519 -C "your-email@github.com"
```

2. Add to ssh-agent:
```powershell
ssh-add $HOME\.ssh\id_ed25519
```

3. Add to GitHub:
- Go to: https://github.com/settings/ssh/new
- Paste your public key from: `$HOME\.ssh\id_ed25519.pub`

4. Change remote to SSH:
```powershell
git remote set-url origin git@github.com:aaroviagroupcom-collab/aarovia-crm.git
git push -u origin main
```

---

## Verify Repository Access

You need push permission for:
https://github.com/aaroviagroupcom-collab/aarovia-crm.git

Check if you're a collaborator:
1. Go to that GitHub repo
2. Click "Settings" → "Collaborators"
3. Verify your GitHub username is listed

If not, ask the repository owner to add you as a collaborator.

---

## Quick Fix - Try This Now:

```powershell
# Install GitHub CLI
winget install GitHub.cli

# Login
gh auth login

# Then push
cd "c:\Users\Aditya\Downloads\aarovia-crm"
git push -u origin main
```
