param(
    [int]$Port = 4110
)

$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$Failures = New-Object System.Collections.Generic.List[string]

function Add-Failure {
    param([string]$Message)
    $Failures.Add($Message) | Out-Null
}

function Read-Text {
    param([string]$RelativePath)
    $Path = Join-Path $Root $RelativePath
    return Get-Content -LiteralPath $Path -Raw -Encoding UTF8
}

function Assert-File {
    param([string]$RelativePath)
    $Path = Join-Path $Root $RelativePath
    if (-not (Test-Path -LiteralPath $Path)) {
        Add-Failure "Missing required file: $RelativePath"
    }
}

function Assert-Absent {
    param([string]$RelativePath)
    $Path = Join-Path $Root $RelativePath
    if (Test-Path -LiteralPath $Path) {
        Add-Failure "File should be removed or unused in v1.1.0: $RelativePath"
    }
}

function Assert-Contains {
    param([string]$RelativePath, [string]$Marker)
    $Path = Join-Path $Root $RelativePath
    if ((Test-Path -LiteralPath $Path) -and -not (Read-Text $RelativePath).Contains($Marker)) {
        Add-Failure "$RelativePath missing marker: $Marker"
    }
}

function Has-Bom {
    param([string]$RelativePath)
    $Path = Join-Path $Root $RelativePath
    $Bytes = [System.IO.File]::ReadAllBytes($Path)
    return $Bytes.Length -ge 3 -and $Bytes[0] -eq 239 -and $Bytes[1] -eq 187 -and $Bytes[2] -eq 191
}

function Load-Json {
    param([string]$RelativePath)
    $Path = Join-Path $Root $RelativePath
    return (Get-Content -LiteralPath $Path -Raw -Encoding UTF8 | ConvertFrom-Json)
}

$RequiredFiles = @(
    "index.html",
    "server.js",
    "README.md",
    "assets/css/styles.css",
    "assets/js/app.js",
    "assets/js/api.js",
    "assets/js/modules/dashboard.js",
    "assets/js/modules/eventflow.js",
    "assets/js/modules/aiassist.js",
    "scripts/sync-api-from-csv.ps1",
    "docs/v1.1.0更新规划.md",
    "docs/讲解提纲.md",
    "api/districts.json",
    "api/events.json",
    "api/flowStages.json",
    "api/aiSuggestions.json",
    "api/kpi.json",
    "data/districts.csv",
    "data/events.csv",
    "data/flowStages.csv",
    "data/aiSuggestions.csv"
)

foreach ($File in $RequiredFiles) {
    Assert-File $File
}

Assert-Absent "assets/js/data.js"

$HtmlMarkers = @(
    '<header class="app-header">',
    '<nav class="tab-nav"',
    'id="module-container"',
    'type="module"',
    'src="assets/js/app.js"'
)
foreach ($Marker in $HtmlMarkers) {
    Assert-Contains "index.html" $Marker
}

$AppMarkers = @(
    'import { initDashboard } from "./modules/dashboard.js"',
    'import { initEventFlow } from "./modules/eventflow.js"',
    'import { initAiAssist } from "./modules/aiassist.js"',
    'const tabs ='
)
foreach ($Marker in $AppMarkers) {
    Assert-Contains "assets/js/app.js" $Marker
}

Assert-Contains "assets/js/modules/dashboard.js" 'import { fetchDashboardData } from "../api.js"'
Assert-Contains "assets/js/modules/dashboard.js" '<span>P0 紧急</span>'
Assert-Contains "assets/js/modules/dashboard.js" '<span>超时事件</span>'
Assert-Contains "assets/js/modules/eventflow.js" 'flow-current-badge'
Assert-Contains "assets/js/modules/eventflow.js" '查看该事件 AI 辅助建议'
Assert-Contains "assets/js/modules/eventflow.js" 'app:navigate'
Assert-Contains "assets/js/modules/eventflow.js" 'import { fetchEventFlowData } from "../api.js"'
Assert-Contains "assets/js/modules/aiassist.js" 'import { fetchAiAssistData } from "../api.js"'
Assert-Contains "assets/js/modules/aiassist.js" 'suggestion-card--focused'
Assert-Contains "assets/js/app.js" 'app:navigate'
Assert-Contains "assets/css/styles.css" 'grid-template-columns: repeat(5, minmax(0, 1fr));'

$ApiFiles = @(
    "api/districts.json",
    "api/events.json",
    "api/flowStages.json",
    "api/aiSuggestions.json",
    "api/kpi.json"
)

foreach ($File in $ApiFiles) {
    if ((Test-Path -LiteralPath (Join-Path $Root $File)) -and (Has-Bom $File)) {
        Add-Failure "API JSON should be UTF-8 without BOM: $File"
    }
}

try {
    & (Join-Path $PSScriptRoot "sync-api-from-csv.ps1") -Check | Out-Null
} catch {
    Add-Failure $_.Exception.Message
}

try {
    $Districts = @(Load-Json "api/districts.json")
    $Events = @(Load-Json "api/events.json")
    $FlowStages = @(Load-Json "api/flowStages.json")
    $Suggestions = @(Load-Json "api/aiSuggestions.json")
    $Kpi = Load-Json "api/kpi.json"

    if ($Districts.Count -ne 4) { Add-Failure "Expected 4 districts, got $($Districts.Count)" }
    if ($Events.Count -ne 8) { Add-Failure "Expected 8 events, got $($Events.Count)" }
    if ($FlowStages.Count -ne 5) { Add-Failure "Expected 5 flow stages, got $($FlowStages.Count)" }
    if ($Suggestions.Count -ne 4) { Add-Failure "Expected 4 AI suggestions, got $($Suggestions.Count)" }

    $DistrictIds = @{}
    foreach ($District in $Districts) {
        $DistrictIds[$District.districtId] = $true
        foreach ($Field in @("districtId", "name", "status", "statusTone", "todayEvents", "pendingEvents", "overdueEvents", "resources")) {
            if (-not ($District.PSObject.Properties.Name -contains $Field)) {
                Add-Failure "District missing field $Field"
            }
        }
    }

    $EventIds = @{}
    foreach ($Event in $Events) {
        $EventIds[$Event.eventId] = $true
        foreach ($Field in @("eventId", "districtId", "type", "location", "priority", "status", "flowStage", "owner", "nextAction", "deadline", "createdAt", "reporter", "isOverdue")) {
            if (-not ($Event.PSObject.Properties.Name -contains $Field)) {
                Add-Failure "Event missing field $Field"
            }
        }
        if (-not $DistrictIds.ContainsKey($Event.districtId)) {
            Add-Failure "Event $($Event.eventId) references missing district $($Event.districtId)"
        }
        if ($Event.flowStage -lt 0 -or $Event.flowStage -ge $FlowStages.Count) {
            Add-Failure "Event $($Event.eventId) has invalid flowStage $($Event.flowStage)"
        }
    }

    foreach ($Suggestion in $Suggestions) {
        if (-not $EventIds.ContainsKey($Suggestion.eventId)) {
            Add-Failure "Suggestion $($Suggestion.suggestionId) references missing event $($Suggestion.eventId)"
        }
        if ($Suggestion.confidence -lt 0 -or $Suggestion.confidence -gt 100) {
            Add-Failure "Suggestion $($Suggestion.suggestionId) confidence should be 0-100"
        }
    }

    foreach ($Field in @("total", "pending", "urgent", "overdue", "abnormalDistricts")) {
        if (-not ($Kpi.PSObject.Properties.Name -contains $Field)) {
            Add-Failure "KPI missing field $Field"
        }
    }

    $OpenEvents = @($Events | Where-Object { $_.flowStage -lt 4 })
    $Urgent = @($OpenEvents | Where-Object { $_.priority -eq "P0" }).Count
    $Overdue = @($OpenEvents | Where-Object { $_.isOverdue }).Count

    if ($Kpi.total -ne $Events.Count) { Add-Failure "KPI total is out of sync" }
    if ($Kpi.pending -ne $OpenEvents.Count) { Add-Failure "KPI pending is out of sync" }
    if ($Kpi.urgent -ne $Urgent) { Add-Failure "KPI urgent is out of sync" }
    if ($Kpi.overdue -ne $Overdue) { Add-Failure "KPI overdue is out of sync" }
} catch {
    Add-Failure ("Data validation failed: " + $_.Exception.Message)
}

$Process = $null
try {
    $ProcessInfo = New-Object System.Diagnostics.ProcessStartInfo
    $ProcessInfo.FileName = "cmd.exe"
    $ProcessInfo.Arguments = "/c set PORT=$Port&&node server.js"
    $ProcessInfo.WorkingDirectory = $Root
    $ProcessInfo.UseShellExecute = $false
    $ProcessInfo.RedirectStandardOutput = $true
    $ProcessInfo.RedirectStandardError = $true
    $ProcessInfo.CreateNoWindow = $true
    $Process = [System.Diagnostics.Process]::Start($ProcessInfo)

    $BaseUrl = "http://127.0.0.1:$Port"
    $Started = $false
    for ($i = 0; $i -lt 30; $i += 1) {
        if ($Process.HasExited) {
            break
        }
        try {
            Invoke-WebRequest -UseBasicParsing -Uri "$BaseUrl/" -TimeoutSec 1 | Out-Null
            $Started = $true
            break
        } catch {
            Start-Sleep -Milliseconds 200
        }
    }

    if (-not $Started) {
        Add-Failure "Local server did not start on port $Port"
    } else {
        $EndpointPaths = @(
            "/",
            "/api/districts",
            "/api/events",
            "/api/flowStages",
            "/api/aiSuggestions",
            "/api/kpi"
        )

        foreach ($Endpoint in $EndpointPaths) {
            $Expected = switch ($Endpoint) {
                "/" { "module-container" }
                "/api/districts" { "district-east" }
                "/api/events" { "EVT-20260520-001" }
                "/api/flowStages" { "dispatch" }
                "/api/aiSuggestions" { "AI-001" }
                "/api/kpi" { '"urgent"' }
            }
            $Response = Invoke-WebRequest -UseBasicParsing -Uri "$BaseUrl$Endpoint" -TimeoutSec 3
            if ($Response.StatusCode -ne 200) {
                Add-Failure "Endpoint $Endpoint returned $($Response.StatusCode)"
            }
            if (-not $Response.Content.Contains($Expected)) {
                Add-Failure "Endpoint $Endpoint missing expected content $Expected"
            }
        }
    }
} catch {
    Add-Failure ("Endpoint validation failed at line $($_.InvocationInfo.ScriptLineNumber): " + $_.Exception.Message)
} finally {
    if ($Process -ne $null -and -not $Process.HasExited) {
        $Process.Kill()
        $Process.WaitForExit()
    }
}

if ($Failures.Count -gt 0) {
    Write-Error ("Prototype verification failed:`n- " + ($Failures -join "`n- "))
    exit 1
}

Write-Host "Prototype verification passed."
