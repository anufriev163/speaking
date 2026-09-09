Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = currentDir
WshShell.Run Chr(34) & currentDir & "\node_modules\electron\dist\electron.exe" & Chr(34) & " " & Chr(34) & currentDir & Chr(34), 0
Set WshShell = Nothing
Set fso = Nothing
