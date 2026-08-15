# ── Hwasat Frontend Starter ─────────────────────────────────────────────────
Write-Host ""
Write-Host "=== Hwasat Frontend ===" -ForegroundColor Cyan

# 1. Install dependencies if needed
Write-Host "`n[1/2] Installing Node dependencies..." -ForegroundColor Yellow
npm install

# 2. Start the dev server
Write-Host "`n[2/2] Starting frontend on http://localhost:5173 ..." -ForegroundColor Yellow
Write-Host ""
npm run dev
