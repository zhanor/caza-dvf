# Script de configuration de l'environnement PostgreSQL
# Ce script crée le fichier .env.local avec les identifiants de connexion

$envContent = @"
# Configuration de la base de données PostgreSQL
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=Maison2026!
DB_NAME=postgres
DB_PORT=5432
DB_SSL=false
"@

$envFile = ".env.local"

if (Test-Path $envFile) {
    Write-Host "⚠️  Le fichier $envFile existe déjà." -ForegroundColor Yellow
    $overwrite = Read-Host "Voulez-vous le remplacer ? (O/N)"
    if ($overwrite -ne "O" -and $overwrite -ne "o") {
        Write-Host "❌ Opération annulée." -ForegroundColor Red
        exit
    }
}

$envContent | Out-File -FilePath $envFile -Encoding utf8 -NoNewline

Write-Host "✅ Fichier $envFile créé avec succès !" -ForegroundColor Green
Write-Host ""
Write-Host "Configuration appliquée :" -ForegroundColor Cyan
Write-Host "  - Host: localhost" -ForegroundColor Gray
Write-Host "  - User: postgres" -ForegroundColor Gray
Write-Host "  - Database: postgres" -ForegroundColor Gray
Write-Host "  - Port: 5432" -ForegroundColor Gray
Write-Host ""
Write-Host "Vous pouvez maintenant démarrer l'application avec 'npm run dev'" -ForegroundColor Green

