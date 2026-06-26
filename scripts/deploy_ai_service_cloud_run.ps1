param(
  [string]$ServiceName = "ai-service",
  [string]$Region = "asia-southeast1",
  [string]$ArtifactRepo = "ciel-ai",
  [switch]$AllowUnauthenticated = $true
)

$ErrorActionPreference = "Stop"

function Parse-DotEnv {
  param([string]$Path)

  if (-not (Test-Path $Path)) {
    throw "Missing env file at $Path"
  }

  $vars = @{}
  foreach ($line in [System.IO.File]::ReadAllLines($Path)) {
    $trimmed = $line.Trim()
    if ([string]::IsNullOrWhiteSpace($trimmed) -or $trimmed.StartsWith("#")) {
      continue
    }
    $idx = $trimmed.IndexOf("=")
    if ($idx -le 0) {
      continue
    }
    $key = $trimmed.Substring(0, $idx).Trim()
    $value = $trimmed.Substring($idx + 1).Trim()
    if (
      ($value.StartsWith('"') -and $value.EndsWith('"')) -or
      ($value.StartsWith("'") -and $value.EndsWith("'"))
    ) {
      $value = $value.Substring(1, $value.Length - 2)
    }
    $vars[$key] = $value
  }
  return $vars
}

function Require-Key {
  param(
    [hashtable]$Vars,
    [string]$Key
  )
  if (-not $Vars.ContainsKey($Key) -or [string]::IsNullOrWhiteSpace($Vars[$Key])) {
    throw "Required key '$Key' missing or empty in ai_service/.env"
  }
}

$projectId = (& gcloud config get-value project).Trim()
if ([string]::IsNullOrWhiteSpace($projectId) -or $projectId -eq "(unset)") {
  throw "No default gcloud project set. Run: gcloud config set project <PROJECT_ID>"
}

$repoRoot = Resolve-Path "$PSScriptRoot\.."
$envPath = Join-Path $repoRoot "ai_service\.env"
$clientProdEnvPath = Join-Path $repoRoot "client\.env.prod"
$envVars = Parse-DotEnv -Path $envPath

Require-Key -Vars $envVars -Key "SUPABASE_URL"
Require-Key -Vars $envVars -Key "SUPABASE_SERVICE_KEY"
Require-Key -Vars $envVars -Key "FOUNDRY_ENDPOINT"
Require-Key -Vars $envVars -Key "FOUNDRY_API_KEY"
Require-Key -Vars $envVars -Key "FOUNDRY_DEPLOYMENT_GPT"
Require-Key -Vars $envVars -Key "AI_SERVICE_API_KEY"

$envVars["ENVIRONMENT"] = "production"

# Production startup rejects localhost CORS origins.
$corsOrigins = @()
if (Test-Path $clientProdEnvPath) {
  $clientEnvVars = Parse-DotEnv -Path $clientProdEnvPath
  $siteUrl = $clientEnvVars["NEXT_PUBLIC_SITE_URL"]
  if (-not [string]::IsNullOrWhiteSpace($siteUrl)) {
    $corsOrigins += ([Uri]$siteUrl).GetLeftPart([System.UriPartial]::Authority)
  }
}
if ($corsOrigins.Count -eq 0) {
  throw "Set NEXT_PUBLIC_SITE_URL in client/.env.prod so CORS_ORIGINS can be configured for production."
}
$envVars["CORS_ORIGINS"] = ($corsOrigins | ConvertTo-Json -Compress)

$requiredApis = @(
  "run.googleapis.com",
  "artifactregistry.googleapis.com",
  "cloudbuild.googleapis.com"
)

Write-Host "Using gcloud project: $projectId"
Write-Host "Enabling required APIs..."
try {
  & gcloud services enable $requiredApis --project $projectId | Out-Null
} catch {
  Write-Warning "Could not enable one or more APIs automatically. Continuing with current project state."
}

Write-Host "Ensuring Artifact Registry repository '$ArtifactRepo' exists in $Region..."
$repoExists = $true
& gcloud artifacts repositories describe $ArtifactRepo `
  --location $Region `
  --project $projectId | Out-Null
if ($LASTEXITCODE -ne 0) {
  $repoExists = $false
}
if (-not $repoExists) {
  & gcloud artifacts repositories create $ArtifactRepo `
    --repository-format docker `
    --location $Region `
    --description "Ciel AI service container images" `
    --project $projectId | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to create Artifact Registry repository '$ArtifactRepo' in $Region."
  }
}

$imageTag = "$Region-docker.pkg.dev/$projectId/$ArtifactRepo/${ServiceName}:$(Get-Date -Format 'yyyyMMdd-HHmmss')"

Write-Host "Building and pushing image: $imageTag"
& gcloud builds submit `
  --project $projectId `
  --config "$repoRoot\cloudbuild.ai-service.yaml" `
  --substitutions "_IMAGE_TAG=$imageTag" `
  "$repoRoot" | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "Cloud Build failed."
}

$deployEnv = [ordered]@{
  ENVIRONMENT = $envVars["ENVIRONMENT"]
  SUPABASE_URL = $envVars["SUPABASE_URL"]
  SUPABASE_SERVICE_KEY = $envVars["SUPABASE_SERVICE_KEY"]
  FOUNDRY_ENDPOINT = $envVars["FOUNDRY_ENDPOINT"]
  FOUNDRY_API_KEY = $envVars["FOUNDRY_API_KEY"]
  FOUNDRY_DEPLOYMENT_GPT = $envVars["FOUNDRY_DEPLOYMENT_GPT"]
  AI_SERVICE_API_KEY = $envVars["AI_SERVICE_API_KEY"]
  FOUNDRY_REASONING_MODEL = $envVars["FOUNDRY_REASONING_MODEL"]
  FOUNDRY_REASONING_EFFORT_GENERATION = $envVars["FOUNDRY_REASONING_EFFORT_GENERATION"]
  FOUNDRY_REASONING_EFFORT_CRITIQUE = $envVars["FOUNDRY_REASONING_EFFORT_CRITIQUE"]
  MAX_TOKENS_TOC_GENERATION = $envVars["MAX_TOKENS_TOC_GENERATION"]
  MAX_TOKENS_CRITIQUE = $envVars["MAX_TOKENS_CRITIQUE"]
  MAX_TOKENS_GRANT_SECTION = $envVars["MAX_TOKENS_GRANT_SECTION"]
  ENABLE_TOC_CRITIQUE = $envVars["ENABLE_TOC_CRITIQUE"]
  ENABLE_STREAMING = $envVars["ENABLE_STREAMING"]
  LOG_LEVEL = $envVars["LOG_LEVEL"]
  CORS_ORIGINS = $envVars["CORS_ORIGINS"]
}

$tmpEnvFile = [System.IO.Path]::GetTempFileName()
try {
  $lines = @()
  foreach ($entry in $deployEnv.GetEnumerator()) {
    if ([string]::IsNullOrWhiteSpace($entry.Value)) {
      continue
    }
    $escaped = $entry.Value.Replace("\", "\\").Replace('"', '\"')
    $lines += "$($entry.Key): ""$escaped"""
  }
  [System.IO.File]::WriteAllLines($tmpEnvFile, $lines)
} catch {
  throw "Failed to write temporary Cloud Run env file: $($_.Exception.Message)"
}

$deployArgs = @(
  "run", "deploy", $ServiceName,
  "--project", $projectId,
  "--region", $Region,
  "--image", $imageTag,
  "--platform", "managed",
  "--port", "8000",
  "--env-vars-file", $tmpEnvFile
)

if ($AllowUnauthenticated) {
  $deployArgs += "--allow-unauthenticated"
}

Write-Host "Deploying Cloud Run service: $ServiceName"
try {
  & gcloud @deployArgs | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "Cloud Run deployment failed."
  }
} finally {
  if (Test-Path $tmpEnvFile) {
    Remove-Item $tmpEnvFile -Force
  }
}

$serviceUrl = (& gcloud run services describe $ServiceName `
  --project $projectId `
  --region $Region `
  --format "value(status.url)").Trim()

Write-Host ""
Write-Host "Cloud Run deployment completed."
Write-Host "Service URL: $serviceUrl"
Write-Host "Set the same AI_SERVICE_API_KEY in Vercel and ai_service/.env before deploying."
