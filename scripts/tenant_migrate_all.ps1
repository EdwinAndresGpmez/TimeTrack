param(
  [Parameter(Mandatory = $true)]
  [string]$Schema,
  [switch]$TruncateTarget,
  [switch]$DryRun
)

$services = @(
  @{ Name = "patients-ms"; Cmd = "python manage.py migrate_public_to_tenant --schema $Schema" },
  @{ Name = "schedule-ms"; Cmd = "python manage.py migrate_public_to_tenant --schema $Schema" },
  @{ Name = "appointments-ms"; Cmd = "python manage.py migrate_public_to_tenant --schema $Schema" },
  @{ Name = "professionals-ms"; Cmd = "python manage.py migrate_public_to_tenant --schema $Schema" },
  @{ Name = "portal-ms"; Cmd = "python manage.py migrate_public_to_tenant --schema $Schema" },
  @{ Name = "notification-ms"; Cmd = "python manage.py migrate_public_to_tenant --schema $Schema" },
  @{ Name = "ia-ms"; Cmd = "python manage.py migrate_public_to_tenant --schema $Schema" }
)

foreach ($svc in $services) {
  $cmd = $svc.Cmd
  if ($TruncateTarget) { $cmd += " --truncate-target" }
  if ($DryRun) { $cmd += " --dry-run" }

  Write-Host "==> $($svc.Name): $cmd"
  docker compose exec $($svc.Name) $cmd
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Fallo en $($svc.Name). Abortando."
    exit 1
  }
}

Write-Host "OK: migracion ejecutada para '$Schema' en todos los microservicios."
