param([ValidateSet('interpreter','aot','stock-interpreter','stock-debug','public-interpreter','public-aot')][string]$Variant, [int]$Attempt=1)
$ErrorActionPreference = 'Stop'
$env:DOTNET_CLI_WORKLOAD_UPDATE_NOTIFY_DISABLE = 'true'
$taskRoot = Join-Path (Get-Location) 'packages/grid-blazor/experiments/aot-comparison'
$taskProject = 'packages/grid-blazor/experiments/serialization-investigation/SerializationInvestigation.csproj'
if ($Variant.StartsWith('public-')) { $taskProject = 'packages/grid-blazor/experiments/aot-comparison/public-host/PublicComponentHost.csproj' }
$taskOutput = Join-Path $taskRoot ('bin/' + $Variant)
$taskLabel = $Variant + $(if ($Attempt -gt 1) { '-attempt' + $Attempt } else { '' })
$taskLog = Join-Path $taskRoot ('logs/publish-' + $taskLabel + '.log')
$taskTiming = Join-Path $taskRoot ('publish-' + $taskLabel + '.json')
if ((Test-Path -LiteralPath $taskOutput) -or (Test-Path -LiteralPath $taskLog)) { throw 'Refusing to overwrite an earlier published artifact/log.' }
$taskAot = if ($Variant.EndsWith('aot')) { 'true' } else { 'false' }
$taskNative = if ($Variant.StartsWith('stock-')) { 'false' } else { 'true' }
$taskArguments = @('publish', $taskProject, '-c', 'Release', '--no-restore', '--nologo', '-v', 'normal', '-clp:PerformanceSummary',
  '-p:RuntimeFrameworkVersion=8.0.31', '-p:PublishTrimmed=true', '-p:TrimMode=partial',
  ('-p:WasmBuildNative=' + $taskNative), ('-p:RunAOTCompilation=' + $taskAot),
  ('-p:CompilerGeneratedFilesOutputPath=obj/ag-' + $Variant),
  ('-p:IntermediateOutputPath=obj/aot-comparison/' + $Variant + '/'),
  ('-p:OutputPath=bin/aot-comparison/' + $Variant + '/'), '-o', $taskOutput)
if ($Variant.StartsWith('public-')) { $taskArguments += @('-p:EmitCompilerGeneratedFiles=false', '-p:CompilerGeneratedFilesOutputPath=') }
if ($Variant -eq 'stock-debug') { $taskArguments += @('-p:BlazorEnableDebugging=true', '-p:WasmDebugLevel=-1') }
$taskWatch = [Diagnostics.Stopwatch]::StartNew()
& dotnet @taskArguments 2>&1 | Tee-Object -FilePath $taskLog
$taskExit = $LASTEXITCODE
$taskWatch.Stop()
@{ variant=$Variant; elapsedMs=$taskWatch.Elapsed.TotalMilliseconds; exitCode=$taskExit;
  commandArguments=$taskArguments; sdk='10.0.401'; runtime='8.0.31'; timestampUtc=[DateTime]::UtcNow.ToString('o')
} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $taskTiming -Encoding UTF8
exit $taskExit
