param(
    [switch]$Check
)

$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$ApiDir = Join-Path $Root "api"
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Read-CsvFile {
    param([string]$RelativePath)

    $Path = Join-Path $Root $RelativePath
    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Missing CSV source: $RelativePath"
    }
    return @(Import-Csv -LiteralPath $Path -Encoding UTF8)
}

function To-Int {
    param([string]$Value, [string]$FieldName)

    $Parsed = 0
    if (-not [int]::TryParse($Value, [ref]$Parsed)) {
        throw "Field $FieldName should be an integer, got '$Value'"
    }
    return $Parsed
}

function To-Bool {
    param([string]$Value, [string]$FieldName)

    if ($Value -eq "true") { return $true }
    if ($Value -eq "false") { return $false }
    throw "Field $FieldName should be true or false, got '$Value'"
}

function Convert-District {
    param($Row, $Events)

    $DistrictEvents = @($Events | Where-Object { $_.districtId -eq $Row.districtId })
    $OpenEvents = @($DistrictEvents | Where-Object { $_.flowStage -lt 4 })
    $OverdueEvents = @($OpenEvents | Where-Object { $_.isOverdue })

    [ordered]@{
        districtId = $Row.districtId
        name = $Row.name
        status = $Row.status
        statusTone = $Row.statusTone
        todayEvents = $DistrictEvents.Count
        pendingEvents = $OpenEvents.Count
        overdueEvents = $OverdueEvents.Count
        resources = $Row.resources
    }
}

function Convert-Event {
    param($Row)

    [ordered]@{
        eventId = $Row.eventId
        districtId = $Row.districtId
        type = $Row.type
        location = $Row.location
        priority = $Row.priority
        status = $Row.status
        flowStage = To-Int $Row.flowStage "flowStage"
        owner = $Row.owner
        nextAction = $Row.nextAction
        deadline = $Row.deadline
        createdAt = $Row.createdAt
        reporter = $Row.reporter
        isOverdue = To-Bool $Row.isOverdue "isOverdue"
    }
}

function Convert-FlowStage {
    param($Row)

    [ordered]@{
        key = $Row.key
        label = $Row.label
        icon = $Row.icon
    }
}

function Convert-AiSuggestion {
    param($Row)

    [ordered]@{
        suggestionId = $Row.suggestionId
        eventId = $Row.eventId
        riskLevel = $Row.riskLevel
        riskTone = $Row.riskTone
        recommendation = $Row.recommendation
        reason = $Row.reason
        resourceHint = $Row.resourceHint
        confidence = To-Int $Row.confidence "confidence"
        accepted = To-Bool $Row.accepted "accepted"
    }
}

function Assert-Unique {
    param($Items, [string]$FieldName)

    $Seen = @{}
    foreach ($Item in $Items) {
        $Value = $Item[$FieldName]
        if ([string]::IsNullOrWhiteSpace($Value)) {
            throw "Missing required field: $FieldName"
        }
        if ($Seen.ContainsKey($Value)) {
            throw "Duplicate ${FieldName}: $Value"
        }
        $Seen[$Value] = $true
    }
}

function Assert-References {
    param($Districts, $Events, $Suggestions, $FlowStages)

    $DistrictIds = @{}
    foreach ($District in $Districts) { $DistrictIds[$District.districtId] = $true }

    $EventIds = @{}
    foreach ($Event in $Events) {
        if (-not $DistrictIds.ContainsKey($Event.districtId)) {
            throw "Event $($Event.eventId) references missing district $($Event.districtId)"
        }
        if ($Event.flowStage -lt 0 -or $Event.flowStage -ge $FlowStages.Count) {
            throw "Event $($Event.eventId) has invalid flowStage $($Event.flowStage)"
        }
        if ($Event.priority -notmatch "^P[0-2]$") {
            throw "Event $($Event.eventId) has invalid priority $($Event.priority)"
        }
        $EventIds[$Event.eventId] = $true
    }

    foreach ($Suggestion in $Suggestions) {
        if (-not $EventIds.ContainsKey($Suggestion.eventId)) {
            throw "Suggestion $($Suggestion.suggestionId) references missing event $($Suggestion.eventId)"
        }
        if ($Suggestion.confidence -lt 0 -or $Suggestion.confidence -gt 100) {
            throw "Suggestion $($Suggestion.suggestionId) has invalid confidence $($Suggestion.confidence)"
        }
    }
}

function Has-Bom {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) { return $false }
    $Bytes = [System.IO.File]::ReadAllBytes($Path)
    return $Bytes.Length -ge 3 -and $Bytes[0] -eq 239 -and $Bytes[1] -eq 187 -and $Bytes[2] -eq 191
}

function To-JsonText {
    param($Value)

    return ($Value | ConvertTo-Json -Depth 6) + [Environment]::NewLine
}

function Save-Or-Check {
    param([string]$Name, [string]$Json)

    $Path = Join-Path $ApiDir $Name
    if ($Check) {
        if (-not (Test-Path -LiteralPath $Path)) {
            throw "Missing generated API file: api/$Name"
        }
        if (Has-Bom $Path) {
            throw "API file has UTF-8 BOM: api/$Name"
        }
        $Existing = [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
        if ($Existing -ne $Json) {
            throw "API file is out of sync with CSV source: api/$Name"
        }
    } else {
        [System.IO.File]::WriteAllText($Path, $Json, $Utf8NoBom)
    }
}

$EventRows = Read-CsvFile "data/events.csv"
$Events = @($EventRows | ForEach-Object { Convert-Event $_ })
$FlowStages = @(Read-CsvFile "data/flowStages.csv" | ForEach-Object { Convert-FlowStage $_ })
$DistrictRows = Read-CsvFile "data/districts.csv"
$Districts = @($DistrictRows | ForEach-Object { Convert-District $_ $Events })
$Suggestions = @(Read-CsvFile "data/aiSuggestions.csv" | ForEach-Object { Convert-AiSuggestion $_ })

Assert-Unique $Districts "districtId"
Assert-Unique $Events "eventId"
Assert-Unique $FlowStages "key"
Assert-Unique $Suggestions "suggestionId"
Assert-References $Districts $Events $Suggestions $FlowStages

$OpenEvents = @($Events | Where-Object { $_.flowStage -lt 4 })
$Kpi = [ordered]@{
    total = $Events.Count
    pending = $OpenEvents.Count
    urgent = @($OpenEvents | Where-Object { $_.priority -eq "P0" }).Count
    overdue = @($OpenEvents | Where-Object { $_.isOverdue }).Count
    abnormalDistricts = @($Districts | Where-Object { $_.statusTone -eq "danger" -or $_.statusTone -eq "warning" }).Count
}

if (-not (Test-Path -LiteralPath $ApiDir)) {
    New-Item -ItemType Directory -Path $ApiDir | Out-Null
}

Save-Or-Check "districts.json" (To-JsonText $Districts)
Save-Or-Check "events.json" (To-JsonText $Events)
Save-Or-Check "flowStages.json" (To-JsonText $FlowStages)
Save-Or-Check "aiSuggestions.json" (To-JsonText $Suggestions)
Save-Or-Check "kpi.json" (To-JsonText $Kpi)

if ($Check) {
    Write-Host "CSV/API sync check passed."
} else {
    Write-Host "API JSON files generated from CSV source."
}
