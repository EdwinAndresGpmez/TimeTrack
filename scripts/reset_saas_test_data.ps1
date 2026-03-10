Write-Host "==> Reiniciando datos de pruebas SaaS (flush por microservicio)..."

$services = @(
  "auth-ms",
  "tenant-billing-ms",
  "patients-ms",
  "schedule-ms",
  "appointments-ms",
  "professionals-ms",
  "portal-ms",
  "notification-ms",
  "ia-ms"
)

foreach ($svc in $services) {
  Write-Host "---- ${svc}: flush"
  docker compose exec $svc python manage.py flush --noinput
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Fallo flush en $svc"
    exit 1
  }
}

Write-Host "==> Sembrando catalogo de planes/features en tenant-billing-ms"
docker compose exec tenant-billing-ms python manage.py seed_saas_catalog
if ($LASTEXITCODE -ne 0) {
  Write-Error "Fallo seed_saas_catalog"
  exit 1
}

Write-Host "==> Regenerando permisos y menu base en auth-ms"
docker compose exec auth-ms python manage.py sync_routes
if ($LASTEXITCODE -ne 0) {
  Write-Error "Fallo sync_routes"
  exit 1
}

Write-Host "OK: datos limpiados y catalogo base listo."
