@echo off
chcp 65001 > nul
title 🍉 水果切切樂 - 自動上傳監控
powershell.exe -NoExit -ExecutionPolicy Bypass -File "%~dp0auto-push.ps1"
