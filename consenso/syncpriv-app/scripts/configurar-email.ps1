$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
Write-Host 'Configurar Gmail como remetente do Consenso (uma vez para todo o sistema).'
Write-Host 'Ative a verificacao em duas etapas e crie uma senha de app chamada Consenso:'
Write-Host 'https://myaccount.google.com/apppasswords'
Write-Host 'Use uma conta dedicada ao Consenso, se possivel. Nao use sua senha normal.'
$senderEmail = Read-Host 'Endereco Gmail remetente'
Write-Host 'O assistente enviara UM teste para esse mesmo endereco e publicara as funcoes no Firebase pepperhatapps.'
if ((Read-Host 'Continuar? Digite SIM') -cne 'SIM') { exit 0 }
$smtpSecurePassword = Read-Host 'Senha de app (16 letras; entrada oculta)' -AsSecureString
$smtpPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($smtpSecurePassword)
try {
    $smtpPlainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($smtpPointer)
    $smtpPayload = @{ email = $senderEmail; password = $smtpPlainPassword } | ConvertTo-Json -Compress
    $smtpPayload | node (Join-Path $PSScriptRoot 'setup-gmail.cjs')
    if ($LASTEXITCODE -ne 0) { throw 'Configuracao interrompida. Confira a mensagem acima.' }
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($smtpPointer)
    $smtpPlainPassword = $null
    $smtpPayload = $null
    $smtpSecurePassword.Dispose()
}
