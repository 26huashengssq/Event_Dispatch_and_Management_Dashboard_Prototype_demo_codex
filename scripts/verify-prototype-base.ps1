$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$Failures = New-Object System.Collections.Generic.List[string]

$RequiredFiles = @(
    "index.html",
    "assets/css/styles.css",
    "assets/js/app.js",
    "assets/js/data.js"
)

$RequiredHtmlMarkers = @(
    'id="district-overview"',
    'id="event-list"',
    'id="event-detail"',
    'id="ai-suggestions"',
    'data-render="districts"',
    'data-render="events"',
    'data-render="event-detail"',
    'data-render="ai-suggestions"',
    'script type="module"'
)

$RequiredDataExports = @(
    "export const districts",
    "export const events",
    "export const aiSuggestions"
)

foreach ($File in $RequiredFiles) {
    $Path = Join-Path $Root $File
    if (-not (Test-Path -LiteralPath $Path)) {
        $Failures.Add("Missing required file: $File")
    }
}

$HtmlPath = Join-Path $Root "index.html"
if (Test-Path -LiteralPath $HtmlPath) {
    $Html = Get-Content -LiteralPath $HtmlPath -Raw -Encoding UTF8
    foreach ($Marker in $RequiredHtmlMarkers) {
        if (-not $Html.Contains($Marker)) {
            $Failures.Add("index.html missing marker: $Marker")
        }
    }
}

$DataPath = Join-Path $Root "assets/js/data.js"
if (Test-Path -LiteralPath $DataPath) {
    $Data = Get-Content -LiteralPath $DataPath -Raw -Encoding UTF8
    foreach ($Marker in $RequiredDataExports) {
        if (-not $Data.Contains($Marker)) {
            $Failures.Add("data.js missing export: $Marker")
        }
    }

    $DistrictCount = ([regex]::Matches($Data, "districtId:")).Count
    $EventCount = ([regex]::Matches($Data, "eventId:")).Count
    $SuggestionCount = ([regex]::Matches($Data, "suggestionId:")).Count

    if ($DistrictCount -lt 4) {
        $Failures.Add("data.js should define at least 4 district records")
    }
    if ($EventCount -lt 4) {
        $Failures.Add("data.js should define at least 4 event records")
    }
    if ($SuggestionCount -lt 2) {
        $Failures.Add("data.js should define at least 2 AI suggestion records")
    }
}

if ($Failures.Count -gt 0) {
    Write-Error ("Prototype base verification failed:`n- " + ($Failures -join "`n- "))
    exit 1
}

Write-Host "Prototype base verification passed."
