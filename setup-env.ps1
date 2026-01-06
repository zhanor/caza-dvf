# Script de configuration de l'environnement PostgreSQL
# Ce script crée le fichier .env.local avec les identifiants de connexion
# 
# ⚠️ SÉCURITÉ : Ce script demande les identifiants à l'utilisateur
# pour éviter de stocker des mots de passe en clair dans le code.

Write-Host "🔐 Configuration de la base de données PostgreSQL" -ForegroundColor Cyan
Write-Host ""

# Demander les identifiants à l'utilisateur
$dbHost = Read-Host "Host (défaut: localhost)"
if ([string]::IsNullOrWhiteSpace($dbHost)) { $dbHost = "localhost" }

$dbUser = Read-Host "User (défaut: postgres)"
if ([string]::IsNullOrWhiteSpace($dbUser)) { $dbUser = "postgres" }

$dbPassword = Read-Host "Password" -AsSecureString
$dbPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPassword)
)

$dbName = Read-Host "Database (défaut: postgres)"
if ([string]::IsNullOrWhiteSpace($dbName)) { $dbName = "postgres" }

$dbPort = Read-Host "Port (défaut: 5432)"
if ([string]::IsNullOrWhiteSpace($dbPort)) { $dbPort = "5432" }

$envContent = @"
# Configuration de la base de données PostgreSQL
DB_HOST=$dbHost
DB_USER=$dbUser
DB_PASSWORD=$dbPasswordPlain
DB_NAME=$dbName
DB_PORT=$dbPort
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

