# Hugging Face Frontend Push Script

$HF_TOKEN = "YOUR_HF_TOKEN_HERE"
$HF_USER = "jayabimainvestments"
$HF_SPACE = "jayabima-hr-frontend" # ඔබ සාදන Space එකේ නම මෙය විය යුතුය

$REPO_URL = "https://$($HF_USER):$($HF_TOKEN)@huggingface.co/spaces/$($HF_USER)/$($HF_SPACE)"

# Frontend folder එකට යන්න
Set-Location "G:\HR\ANTIGRAVITY\HR\HR PACEGE\frontend"

Write-Host "Initializing Git for Frontend..." -ForegroundColor Cyan
git init
git checkout -b main

Write-Host "Adding files..." -ForegroundColor Cyan
git add -A

Write-Host "Committing changes..." -ForegroundColor Cyan
git commit -m "Deploy: Initial frontend push to HF Spaces"

Write-Host "Adding remote and pushing to Hugging Face..." -ForegroundColor Cyan
git remote add hf $REPO_URL
git push hf main --force

Write-Host "`n✅ සාර්ථකයි! දැන් Hugging Face වෙත ගොස් Building status එක බලන්න." -ForegroundColor Green
