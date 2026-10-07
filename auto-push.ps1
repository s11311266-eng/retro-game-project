# ============================================================
# 🍉 水果切切樂 - 自動偵測變更並推送至 GitHub
# 使用方式：在此資料夾內雙擊 「啟動自動上傳.bat」
# ============================================================

$RepoPath  = Split-Path -Parent $MyInvocation.MyCommand.Path
$DebounceSeconds = 5   # 最後一次儲存後等幾秒再 push（避免連續多次存檔重複 push）

Set-Location $RepoPath

Write-Host ""
Write-Host "  ╔══════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "  ║   🍉 水果切切樂 自動上傳監控已啟動    ║" -ForegroundColor Cyan
Write-Host "  ║   監控資料夾: $RepoPath" -ForegroundColor Cyan
Write-Host "  ║   偵測到變更後 ${DebounceSeconds}秒 自動上傳 GitHub   ║" -ForegroundColor Cyan
Write-Host "  ║   關閉此視窗即可停止監控             ║" -ForegroundColor Cyan
Write-Host "  ╚══════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# 建立 FileSystemWatcher
$Watcher = New-Object System.IO.FileSystemWatcher
$Watcher.Path = $RepoPath
$Watcher.IncludeSubdirectories = $true
$Watcher.EnableRaisingEvents   = $false   # 手動輪詢模式，避免 PowerShell 事件衝突

# 需要忽略的路徑關鍵字
$IgnorePatterns = @('.git', 'auto-push.ps1', 'gcm-diagnose.log', 'login.txt')

function Should-Ignore($path) {
    foreach ($pat in $IgnorePatterns) {
        if ($path -like "*$pat*") { return $true }
    }
    return $false
}

$PendingPush = $false
$LastChangeTime = $null

Write-Host "  [$(Get-Date -Format 'HH:mm:ss')] 監控中... 請正常修改遊戲檔案。" -ForegroundColor Green

while ($true) {
    Start-Sleep -Milliseconds 1000

    # 偵測 git status 有無未提交變更
    $status = git status --porcelain 2>$null
    $hasChanges = ($status -ne $null -and $status.Trim() -ne "")

    if ($hasChanges -and -not $PendingPush) {
        $PendingPush = $true
        $LastChangeTime = Get-Date
        Write-Host "  [$(Get-Date -Format 'HH:mm:ss')] 🔍 偵測到檔案變更，等候 ${DebounceSeconds} 秒後自動上傳..." -ForegroundColor Yellow
    }

    if ($PendingPush) {
        $elapsed = ((Get-Date) - $LastChangeTime).TotalSeconds
        if ($hasChanges) {
            # 還在修改，重設計時器
            $LastChangeTime = Get-Date
        } elseif ($elapsed -ge $DebounceSeconds -or -not $hasChanges) {
            # 穩定後執行 push
        }

        if ($elapsed -ge $DebounceSeconds) {
            $PendingPush = $false

            # 再次確認是否還有變更
            $status2 = git status --porcelain 2>$null
            if ($status2 -ne $null -and $status2.Trim() -ne "") {
                $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
                Write-Host ""
                Write-Host "  [$(Get-Date -Format 'HH:mm:ss')] ⬆️  開始自動上傳..." -ForegroundColor Cyan

                git add . 2>&1 | Out-Null
                $commitMsg = "auto: update game files at $timestamp"
                $commitResult = git commit -m $commitMsg 2>&1
                $pushResult   = git push 2>&1

                # 判斷結果
                $pushStr = $pushResult | Out-String
                if ($pushStr -match "main -> main" -or $pushStr -match "Everything up-to-date" -or $LASTEXITCODE -eq 0) {
                    Write-Host "  [$(Get-Date -Format 'HH:mm:ss')] ✅ 上傳成功！GitHub Pages 約 1 分鐘後更新。" -ForegroundColor Green
                } else {
                    Write-Host "  [$(Get-Date -Format 'HH:mm:ss')] ⚠️  上傳異常，錯誤訊息如下：" -ForegroundColor Red
                    Write-Host $pushStr -ForegroundColor Red
                }
                Write-Host ""
            }
        }
    }
}
