# Interactive Server transport-loss regression

This host uses the production Blazor component, serializer, JS module and real
Server circuit. It does not replace the synchronization gate or simulate the
browser transport. `ObservedRuntime` counts interop and delays one call by 250 ms
so the driver can cut the actual socket before dispatch. Its no-token overload
now preserves the underlying runtime's configured timeout.

The original QA files under `.qa-release-20261014/` are read-only evidence.
`QaFixture.razor` and `qa-reproduction.mjs` preserve that fixture/sequence in a
separate host, with portable paths and fresh output filenames. `/b11` links the
unchanged B1.1 fixture for its existing correctness drivers. `/` is the new
two-grid fault regression.

## Run

From the repository root:

```powershell
dotnet build packages/grid-blazor/experiments/b11-reconnect/Host.csproj -c Release
# In a separate terminal, from this experiment directory:
dotnet bin/Release/net8.0/Host.dll --urls http://127.0.0.1:5271
```

The host uses a **five-second test-only framework interop deadline** and 60-second
retained-circuit lifetime. Production still uses the host's own settings, normally
a one-minute interop deadline. Override this host with
`LITGRID_TEST_INTEROP_SECONDS=60` to verify that normal deadline, or
`LITGRID_TEST_RETENTION_SECONDS=1` on a second host/port to test circuit expiry.

```powershell
$env:LITGRID_PLAYWRIGHT_MODULE='C:/path/to/node_modules/playwright'
$env:LITGRID_CHROMIUM_PATH='C:/path/to/chrome.exe'
$env:LITGRID_BROWSER_URL='http://127.0.0.1:5271'
$env:LITGRID_RECONNECT_OUTPUT='packages/grid-blazor/experiments/b11-reconnect/new-reconnect.json'
node packages/grid-blazor/experiments/b11-reconnect/run.mjs
```

Installed `playwright` and its default Chromium work when the two path variables
are unset. Drivers refuse existing output filenames. They set browser networking
offline **and explicitly close the native `_blazor` WebSocket**; offline mode
alone does not reliably close an existing socket.

The driver runs three cycles in Automatic and three in Legacy, with two grids.
It starts a refresh, queues another, schedules a third while offline, and schedules
an item notification while offline. A direct no-token runtime call verifies the
framework deadline independently. Same-circuit reconnection must return true;
failed calls must complete, later refreshes must display current cells on both
grids, and Automatic notifications must resume independently. It also checks
setter failure/retry, repeated initialization callbacks, connected/offline disposal,
subscription release and idempotence. Condition waits have diagnostic deadlines.

For the expiry host, set `LITGRID_RECONNECT_TERMINATED=1`, its URL and a new output
filename. Reconnection must return false, followed by successful reload/new circuit.
For the pre-fix timeout comparison, set `LITGRID_RECONNECT_EXPECT_STALL=1` with the
uncorrected component. It asserts that the runtime control times out while the
original and queued grid refreshes remain pending.

## Original QA sequence

Serve the preserved QA published Server on 5263 for the unchanged before run.
For an after run, start this host on 5273 with `LITGRID_TEST_INTEROP_SECONDS=60`:

```powershell
$env:LITGRID_BROWSER_URL='http://127.0.0.1:5273/qa'
$env:LITGRID_RECONNECT_OBSERVE_MS='70000'
$env:LITGRID_RECONNECT_EXPECT_RECOVERY='1'
$env:LITGRID_RECONNECT_OUTPUT='packages/grid-blazor/experiments/b11-reconnect/new-original-sequence.json'
node packages/grid-blazor/experiments/b11-reconnect/qa-reproduction.mjs
```

The 70-second observation spans the normal one-minute timeout. Recovery assertions
require a canceled original call, zero in-flight operations, a completed second
refresh and same-circuit recovery. This wait is browser test observation, not a
production timeout. `before.json`, `timeout-before.json` and
`default-timeout-after.json` retain the decisive before/after runs.

## Validation evidence

The primary final runs are `reconnect-final.json` (**56 checks / six cycles**),
`expired-final.json` (**five checks**), WASM/Server `*-retry-final.json` (**seven
each**), `*-modes-final.json` (**58 each**) and `*-correctness-final.json` (**13
each**). Existing WASM browser validation is in `wasm-browser-final-results.log`.
The report at `docs/blazor-release-blockers-20261014.md` records counts, build
qualifications and limitations. Logs, earlier runs and published `bin/` artifacts
are local evidence, not shipping assets.

`verify-assets.mjs` compares the tracked shipping JS/map to both final WASM outputs
and actual Server HTTP responses, and compares map contents to current TypeScript:

```powershell
$env:LITGRID_FRESHNESS_OUTPUT='packages/grid-blazor/experiments/b11-reconnect/new-assets.json'
node packages/grid-blazor/experiments/b11-reconnect/verify-assets.mjs
```

Release-note extraction is local and read-only:
`node scripts/extract-changelog.mjs 1.1.0`. Versions remain 1.0.3. Nothing here
authorizes a release, publication, deployment or a commit.
