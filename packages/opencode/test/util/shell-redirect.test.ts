import { describe, expect, test } from "bun:test"
import { Shell } from "../../src/shell/shell"

describe("Shell.redirectKind", () => {
  test("powershell basename", () => {
    expect(Shell.redirectKind(String.raw`C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe`)).toBe(
      process.platform === "win32" ? "powershell" : null,
    )
    expect(Shell.redirectKind(String.raw`C:\Program Files\PowerShell\7\pwsh.exe`)).toBe(
      process.platform === "win32" ? "powershell" : null,
    )
  })

  test("cmd basename", () => {
    expect(Shell.redirectKind(String.raw`C:\Windows\System32\cmd.exe`)).toBe(
      process.platform === "win32" ? "cmd" : null,
    )
  })

  test("git bash is posix_win on windows", () => {
    expect(Shell.redirectKind(String.raw`C:\Program Files\Git\bin\bash.exe`)).toBe(
      process.platform === "win32" ? "posix_win" : null,
    )
  })
})

describe("Shell.adaptWindowsRedirects", () => {
  test("nul to $null for powershell", () => {
    expect(Shell.adaptWindowsRedirects("dir >nul", "powershell")).toBe("dir >$null")
    expect(Shell.adaptWindowsRedirects("dir 2>nul", "powershell")).toBe("dir 2>$null")
    expect(Shell.adaptWindowsRedirects("dir >> nul", "powershell")).toBe("dir >>$null")
    expect(Shell.adaptWindowsRedirects("dir 2>>nul", "powershell")).toBe("dir 2>>$null")
  })

  test("literal null word to $null for powershell", () => {
    expect(Shell.adaptWindowsRedirects("dir > null", "powershell")).toBe("dir >$null")
    expect(Shell.adaptWindowsRedirects("dir 2> null", "powershell")).toBe("dir 2>$null")
    expect(Shell.adaptWindowsRedirects("dir >null", "powershell")).toBe("dir >$null")
    expect(Shell.adaptWindowsRedirects("dir >> null", "powershell")).toBe("dir >>$null")
  })

  test("posix_win maps nul and null to dev null", () => {
    expect(Shell.adaptWindowsRedirects("echo x > null", "posix_win")).toBe("echo x >/dev/null")
    expect(Shell.adaptWindowsRedirects("echo x >nul", "posix_win")).toBe("echo x >/dev/null")
    expect(Shell.adaptWindowsRedirects("echo x 2> null", "posix_win")).toBe("echo x 2>/dev/null")
    expect(Shell.adaptWindowsRedirects("echo x >$null", "posix_win")).toBe("echo x >/dev/null")
  })

  test("$null to nul for cmd", () => {
    expect(Shell.adaptWindowsRedirects("dir >$null", "cmd")).toBe("dir >nul")
    expect(Shell.adaptWindowsRedirects("dir 2>$null", "cmd")).toBe("dir 2>nul")
  })

  test("literal null word to nul for cmd", () => {
    expect(Shell.adaptWindowsRedirects("dir > null", "cmd")).toBe("dir >nul")
    expect(Shell.adaptWindowsRedirects("dir 2> null", "cmd")).toBe("dir 2>nul")
  })

  test("null kind leaves line unchanged", () => {
    expect(Shell.adaptWindowsRedirects("echo ok >nul", null)).toBe("echo ok >nul")
  })
})
