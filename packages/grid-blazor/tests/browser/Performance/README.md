# Isolated Blazor ingestion experiment

These files are test tooling, not package implementation. Both paths use the
existing bundled adapter and engine. No npm/Node dependency is introduced into
the consumer host; Node and Playwright are used only by the external test runner.

Build and run the existing WebAssembly browser host in Release:

```powershell
dotnet build packages/grid-blazor/tests/browser/BrowserHost.csproj -c Release
dotnet run --project packages/grid-blazor/tests/browser/BrowserHost.csproj -c Release --no-build --urls http://127.0.0.1:5186
```

In a second terminal, point to an external Playwright installation and Chromium:

```powershell
$env:LITGRID_PLAYWRIGHT_MODULE = 'C:/path/to/node_modules/playwright'
# Optional, when using a separately installed Chromium:
$env:LITGRID_CHROMIUM_PATH = 'C:/path/to/chrome.exe'
node packages/grid-blazor/tests/browser/Performance/run.mjs
```

The runner opens `/?performance`, uses fresh browser contexts for each
workload/mode, runs A/B/C twice and D once per mode, then checks serialization
semantics, cleanup and real UI cancellation. The extreme original transfer is
followed by one independent whole-collection serialization probe for attribution;
the probe is outside the ingestion interval. Do not repeatedly run D.

Optional controls:

- `LITGRID_PERFORMANCE_WORKLOADS=A,B,C` selects fixtures.
- `LITGRID_PERFORMANCE_WORKLOADS=,` runs only the dispatch/compatibility/cancellation controls.
- `LITGRID_PERFORMANCE_MODES=legacy,prototype` selects modes.
- `LITGRID_SKIP_COMPATIBILITY=1` skips semantic/cancellation tests.
- `LITGRID_PERFORMANCE_OUTPUT=...` sets the raw JSON output.
- `LITGRID_BROWSER_URL=http://127.0.0.1:5186` sets the host.
- `LITGRID_PERFORMANCE_HOST=...` labels the build in the output.
- `LITGRID_LOADING_SCREENSHOT=...` captures loading feedback before the cancellation click.

For the isolated Server host, use the same runner against port 5187:

```powershell
dotnet build packages/grid-blazor/tests/browser/Performance/Server/ServerHost.csproj -c Release
dotnet run --project packages/grid-blazor/tests/browser/Performance/Server/ServerHost.csproj -c Release --no-build --urls http://127.0.0.1:5187
```

For a small Server investigation set `LITGRID_BROWSER_URL` to port 5187,
`LITGRID_PERFORMANCE_WORKLOADS=A,B`,
`LITGRID_PERFORMANCE_HOST=Release net8.0 Blazor Server, loopback`, and use a
separate output filename. Local loopback timings are not WAN predictions.

`results.json` is the retained full WebAssembly experiment. Supplementary runs
are named explicitly in the report. Smoke output is developmental evidence and
does not enter the final comparison.

Read `docs/blazor-performance-prototype.md` for the methodology, limits,
attribution, compatibility findings and integration decision. This prototype
uses soft batch/row size thresholds: a converter executes synchronously and a
large row may allocate before the size rejection. It is not a hard memory quota
or a guarantee of bounded execution time.
