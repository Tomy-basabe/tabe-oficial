@echo off
chcp 65001 >nul
title TABE AI x Google Gemini (MCP)
echo ========================================================
echo        TABE AI - Google Gemini MCP
echo ========================================================
echo.
echo Conectando con servidor de TABE (https://www.tabe.com.ar)...
echo.
node "%~dp0mcp\tabe-gemini-chat.cjs" %*
if errorlevel 1 (
  echo.
  echo Revisa tu conexion a Internet o credenciales de TABE.
  pause
)
