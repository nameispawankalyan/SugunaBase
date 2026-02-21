$body = @{
    code = "module.exports = async (event) => { return { status: 'success', message: 'Hello ' + event.name + ' from SugunaBase Docker Cloud Functions!' }; };"
} | ConvertTo-Json

# Deploy the function
Invoke-RestMethod -Uri "http://localhost:3005/deploy/helloUser" -Method Post -Body $body -ContentType "application/json"

Write-Host "Wait 5-10 seconds for the docker image to be built..."
Start-Sleep -Seconds 10

# Run the function
$event = @{ name = "Suguna Developer" } | ConvertTo-Json
$result = Invoke-RestMethod -Uri "http://localhost:3005/run/helloUser" -Method Post -Body $event -ContentType "application/json"

Write-Host "Function Result:"
$result | ConvertTo-Json -Depth 5
