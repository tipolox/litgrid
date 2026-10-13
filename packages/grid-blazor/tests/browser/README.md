# Real Blazor WebAssembly browser tests

This .NET 8 test host references the local wrapper and its bundled assets.
It exercises actual .NET-to-JavaScript serialization, rather than simulating it
with `JsonSerializer` or fake JS interop. It is not a shipped demo/package.

Build the client bundle before the host:

```powershell
pnpm.cmd install --frozen-lockfile
pnpm.cmd build
dotnet build packages/grid-blazor/tests/browser/BrowserHost.csproj -c Release
dotnet run --project packages/grid-blazor/tests/browser/BrowserHost.csproj -c Release --no-build --urls http://127.0.0.1:5186
```

In another terminal, run the tests with an externally installed Playwright
package and its Chromium browser. Either make `playwright` resolvable by Node,
or point to an existing `playwright`/`playwright-core` module directory:

```powershell
$env:LITGRID_PLAYWRIGHT_MODULE = 'C:\path\to\node_modules\playwright'
node packages/grid-blazor/tests/browser/run.mjs
```

For a separate tool install without changing this repository's dependencies:

```powershell
npm.cmd install --prefix .private/blazor-browser-tools playwright
.private/blazor-browser-tools/node_modules/.bin/playwright.cmd install chromium
$env:LITGRID_PLAYWRIGHT_MODULE = "$PWD\.private\blazor-browser-tools\node_modules\playwright"
```

`LITGRID_BROWSER_URL` overrides the local host URL. Set
`LITGRID_BROWSER_SCREENSHOT` to a local PNG path to capture failures.
Set `LITGRID_BROWSER_STRESS=1` to additionally run the combined 30,000-row /
120-column transfer (3.6 million values). It uses longer timeouts because the
legacy data serialization path can block WebAssembly for a substantial duration.

The runner verifies display/nulls/numeric/date/attribute keys, sorting and
filtering, pointer resizing/reordering, visibility, parent rerenders, explicit
schema precedence, additions/removals/empty schemas, programmatic compatibility,
legacy inference, same-reference mutation, persistence through disposal/remount,
keyboard navigation, 30,000 rows and 120 columns with scrolling, rapid scenario
changes, mobile page overflow, and unexpected console errors.
It also verifies A -> B -> A namespace switching with different schemas,
saved/unsaved/null destinations, key-only changes, subsequent user persistence,
and unmounting while an actual module response is delayed before remounting.

The large scenario intentionally retains legacy row serialization on parent
rerenders. Timings printed by this runner are observations on the test machine,
not comparative performance benchmarks or performance guarantees.
