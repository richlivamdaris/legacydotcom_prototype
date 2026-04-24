; Inno Setup script for the Funeral Home Prototype Stripe Integration demo.
; Build with: iscc installer\funeral-home-demo.iss
; (Normally invoked via scripts\build-installer.ps1 which stages files first.)

#define MyAppName "Funeral Home Prototype Stripe Integration"
#define MyAppShortName "Funeral Home Prototype"
; MyAppVersion is normally injected by scripts\build-installer.ps1 via
;   iscc /DMyAppVersion=<root package.json version> ...
; Keep a sane fallback so a bare `iscc installer\funeral-home-demo.iss`
; still compiles for ad-hoc tweaks.
#ifndef MyAppVersion
  #define MyAppVersion "1.0.0"
#endif
#define MyAppPublisher "Insight AI / Legacy.com"
#define MyAppURL "http://localhost:3001"
#define MyAppDataDirName "Insight AI\Funeral Home Prototype"

[Setup]
AppId={{B7F1A2C4-3E2D-4F8A-9C1B-5D8E6A4F2B91}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL=https://www.legacy.com
DefaultDirName={autopf}\Insight AI\{#MyAppName}
DefaultGroupName=Insight AI\{#MyAppShortName}
DisableProgramGroupPage=yes
OutputDir=..\dist-installer
OutputBaseFilename=FuneralHomePrototype-Setup-{#MyAppVersion}
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
ArchitecturesInstallIn64BitMode=x64compatible
ArchitecturesAllowed=x64compatible
PrivilegesRequired=admin
UninstallDisplayName={#MyAppName}
SetupLogging=yes

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Additional shortcuts:"

[Files]
; Entire staged tree, assembled by scripts\build-installer.ps1.
Source: "staging\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs ignoreversion

[Dirs]
; Writable data directory in %LOCALAPPDATA% for the logged-in user.
Name: "{localappdata}\{#MyAppDataDirName}\data"; Flags: uninsneveruninstall

[Icons]
Name: "{group}\Start {#MyAppShortName}"; Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; \
  Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\start.ps1"""; \
  WorkingDir: "{app}"; \
  Comment: "Start the demo (launches Stripe CLI, API, and opens the browser)"

Name: "{group}\Open {#MyAppShortName}"; Filename: "{#MyAppURL}"; \
  Comment: "Open the demo in your browser (use after Start)"

Name: "{group}\Stop {#MyAppShortName}"; Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; \
  Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\stop.ps1"""; \
  WorkingDir: "{app}"; \
  Comment: "Stop the demo"

Name: "{group}\Uninstall {#MyAppShortName}"; Filename: "{uninstallexe}"

Name: "{autodesktop}\Start {#MyAppShortName}"; Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; \
  Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\start.ps1"""; \
  WorkingDir: "{app}"; \
  Tasks: desktopicon

[Run]
; "Launch now" checkbox on the final page.
Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; \
  Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\start.ps1"""; \
  WorkingDir: "{app}"; \
  Description: "Launch {#MyAppShortName} now"; \
  Flags: postinstall nowait skipifsilent runasoriginaluser

[UninstallRun]
; Best-effort stop before uninstalling files.
Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; \
  Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\stop.ps1"""; \
  WorkingDir: "{app}"; \
  Flags: runhidden; \
  RunOnceId: "StopDemo"

[Code]
function InitializeSetup(): Boolean;
var
  WinHttpReq: Variant;
begin
  Result := True;
  try
    WinHttpReq := CreateOleObject('WinHttp.WinHttpRequest.5.1');
    WinHttpReq.Open('GET', 'https://api.stripe.com/', False);
    WinHttpReq.SetTimeouts(5000, 5000, 5000, 5000);
    WinHttpReq.Send;
  except
    MsgBox(
      'This installer needs an internet connection to download and verify components.' + #13#10 +
      'Please connect to the internet and run this installer again.',
      mbCriticalError, MB_OK);
    Result := False;
  end;
end;
