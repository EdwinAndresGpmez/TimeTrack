param(
  [Parameter(Mandatory = $true)]
  [string]$Schema
)

$services = @(
  @{ Name = "patients-ms"; Cmd = "python manage.py prepare_tenant_schema --schema $Schema" },
  @{ Name = "schedule-ms"; Cmd = "python manage.py prepare_tenant_schema --schema $Schema" },
  @{ Name = "appointments-ms"; Cmd = "python manage.py prepare_tenant_schema --schema $Schema" },
  @{ Name = "professionals-ms"; Cmd = "python manage.py prepare_tenant_schema --schema $Schema" },
  @{ Name = "portal-ms"; Cmd = "python manage.py prepare_tenant_schema --schema $Schema" },
  @{ Name = "notification-ms"; Cmd = "python manage.py prepare_tenant_schema --schema $Schema" },
  @{ Name = "ia-ms"; Cmd = "python manage.py prepare_tenant_schema --schema $Schema" }
)

foreach ($svc in $services) {
  Write-Host "==> $($svc.Name): $($svc.Cmd)"
  docker compose exec $($svc.Name) sh -c "$($svc.Cmd)"
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Fallo en $($svc.Name). Abortando."
    exit 1
  }
}

Write-Host "OK: schemas preparados para '$Schema' en todos los microservicios."
