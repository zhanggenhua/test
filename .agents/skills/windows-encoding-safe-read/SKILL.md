---
name: windows-encoding-safe-read
description: Read files and command output safely on Windows/PowerShell. Use when inspecting logs, generated JS/JSON/YAML, Unity or Douyin/TTSDK build output, files containing Chinese or other non-ASCII text, or any case where mojibake/garbled text could affect conclusions.
---

# Windows Encoding Safe Read

## Rules

- Do not treat PowerShell console mojibake as file corruption or syntax corruption.
- Prefer encoding-explicit reads before drawing conclusions from non-ASCII text.
- For text files, use one of these checks:
  - `node -e "const fs=require('fs'); console.log(fs.readFileSync('path','utf8'))"`
  - `Get-Content -Raw -Encoding UTF8 path`
  - `[System.IO.File]::ReadAllText('path',[System.Text.Encoding]::UTF8)`
- For JavaScript syntax, validate with `node --check path` when Node is available.
- When PowerShell display and encoding-explicit output disagree, trust the encoding-explicit read.
- If the issue is about generated packages, compare actual parsed/validated file content rather than console rendering.

## Workflow

1. Identify whether the file can contain non-ASCII text.
2. Read with explicit UTF-8 or a structured parser.
3. Validate behavior directly when possible, such as `node --check` for JS or JSON parser checks for JSON.
4. Only call a file "corrupt" or "syntax broken" after validation fails outside PowerShell display rendering.
