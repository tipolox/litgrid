Timings are milliseconds, nearest-rank p50 / p95 (min–max; n). `main` means keyed main at 206192e; `optimized` has the same keyed guarantees. Raw qualification scripts call these `v110` and `candidate` for compatibility; paired files compare main, not v1.1.0.

| Rows | Columns | Version | Adoption | Two-frame presentation wait | Scroll | Selection update | Max cells |
|---:|---:|---|---|---|---|---|---:|
| 30000 | 120 | main | 18.40 / 47.10 (8.40–113.60; n=60) | 37.70 / 86.00 (21.90–154.10; n=60) | 35.10 / 55.00 (15.00–82.10; n=600) | 5.50 / 10.10 (2.60–19.60; n=600) | 260 |
| 30000 | 120 | optimized | 11.60 / 30.30 (5.10–34.70; n=60) | 33.50 / 66.00 (19.20–80.60; n=60) | 35.80 / 56.40 (17.50–77.80; n=600) | 5.80 / 9.50 (2.40–19.10; n=600) | 260 |
| 30000 | 200 | main | 17.70 / 34.80 (7.20–41.70; n=60) | 37.50 / 70.10 (20.60–76.50; n=60) | 34.90 / 57.40 (16.00–84.50; n=600) | 6.50 / 12.90 (2.90–23.10; n=600) | 260 |
| 30000 | 200 | optimized | 12.50 / 23.00 (4.70–31.10; n=60) | 31.00 / 63.10 (14.30–83.00; n=60) | 35.40 / 60.00 (16.60–109.40; n=600) | 6.40 / 13.80 (2.90–20.10; n=600) | 260 |
| 100000 | 120 | main | 46.90 / 94.50 (21.10–164.40; n=60) | 68.90 / 128.10 (38.70–193.50; n=60) | 33.60 / 50.90 (16.70–67.50; n=600) | 4.30 / 9.00 (2.20–24.00; n=600) | 260 |
| 100000 | 120 | optimized | 28.90 / 58.20 (10.40–67.20; n=60) | 54.80 / 100.10 (20.80–118.50; n=60) | 33.80 / 52.60 (12.20–75.80; n=600) | 4.40 / 8.30 (2.10–28.20; n=600) | 260 |
| 100000 | 200 | main | 53.40 / 101.10 (21.10–125.30; n=60) | 79.00 / 132.70 (34.60–175.30; n=60) | 35.30 / 54.40 (10.40–76.10; n=600) | 6.10 / 11.60 (2.90–26.30; n=600) | 260 |
| 100000 | 200 | optimized | 30.10 / 48.20 (10.50–80.30; n=60) | 53.70 / 92.10 (22.10–122.70; n=60) | 34.80 / 58.40 (16.60–97.50; n=600) | 6.00 / 10.90 (2.80–21.90; n=600) | 260 |

Heap values are whole-page MiB snapshots after grid removal, before the next collection; these are not retained-leak measurements.

| Version | GC protocol | Heap MiB p50 / p95 (range; n) |
|---|---|---|
| main | forced | 10.92 / 19.85 (5.58–20.27; n=120) |
| main | natural | 23.69 / 50.12 (2.49–61.16; n=120) |
| optimized | forced | 9.92 / 17.62 (5.71–18.06; n=120) |
| optimized | natural | 23.50 / 42.57 (2.48–58.20; n=120) |

| React rows | Fresh config | Version | Update incl. two frames | React Profiler actual duration |
|---:|---|---|---|---|
| 30000 | false | main | 33.30 / 34.70 (29.60–35.10; n=50) | 0.20 / 0.40 (0.00–0.60; n=50) |
| 30000 | false | optimized | 33.20 / 34.60 (32.00–34.90; n=50) | 0.20 / 0.40 (0.00–0.40; n=50) |
| 30000 | true | optimized | 33.20 / 34.50 (31.10–36.10; n=50) | 0.20 / 0.30 (0.00–0.40; n=50) |
| 30000 | true | main | 33.30 / 34.60 (30.30–35.30; n=50) | 0.10 / 0.30 (0.00–0.50; n=50) |
| 100000 | false | main | 44.80 / 74.60 (26.20–77.50; n=50) | 0.10 / 0.30 (0.00–0.40; n=50) |
| 100000 | false | optimized | 33.20 / 34.60 (19.10–34.70; n=50) | 0.10 / 0.30 (0.00–0.50; n=50) |
| 100000 | true | optimized | 33.10 / 34.60 (19.70–35.00; n=50) | 0.10 / 0.20 (0.00–0.40; n=50) |
| 100000 | true | main | 46.90 / 101.30 (30.20–131.30; n=50) | 0.10 / 0.40 (0.00–1.00; n=50) |

First interaction is the first DOM cell.click() on a cold mounted grid, before scrolling or selection. It excludes physical input hardware and does not claim compositor paint timing.

| Rows | Columns | Version | Click dispatch | Click through Lit update | Two-frame wait |
|---:|---:|---|---|---|---|
| 30000 | 120 | main | 0.20 / 0.80 (0.10–1.50; n=20) | 7.80 / 12.80 (4.60–14.70; n=20) | 25.90 / 36.00 (20.50–38.10; n=20) |
| 30000 | 120 | optimized | 0.30 / 0.90 (0.10–1.00; n=20) | 6.70 / 10.60 (4.80–13.50; n=20) | 24.40 / 35.60 (20.50–36.30; n=20) |
| 30000 | 200 | main | 0.20 / 0.40 (0.00–0.40; n=20) | 6.20 / 14.60 (3.50–15.20; n=20) | 27.20 / 35.20 (19.20–39.40; n=20) |
| 30000 | 200 | optimized | 0.20 / 0.30 (0.10–0.50; n=20) | 6.50 / 13.50 (3.80–14.10; n=20) | 31.00 / 39.20 (18.20–44.10; n=20) |
| 100000 | 120 | main | 0.20 / 0.40 (0.10–0.90; n=20) | 4.30 / 9.40 (3.10–10.70; n=20) | 27.60 / 36.60 (10.20–37.20; n=20) |
| 100000 | 120 | optimized | 0.20 / 0.30 (0.10–0.30; n=20) | 4.60 / 10.20 (3.30–10.30; n=20) | 28.90 / 35.30 (19.30–38.50; n=20) |
| 100000 | 200 | main | 0.20 / 0.30 (0.00–0.40; n=20) | 5.10 / 8.20 (2.50–14.30; n=20) | 25.60 / 36.60 (6.30–36.90; n=20) |
| 100000 | 200 | optimized | 0.20 / 0.40 (0.10–0.40; n=20) | 6.50 / 12.00 (3.00–12.80; n=20) | 28.90 / 34.20 (11.20–36.90; n=20) |

Allocation sampling is separate from timing runs: CDP sampling interval 32768 bytes, including sampled objects collected by minor/major GC. Values estimate allocated MiB over 30 synchronizations, not exact byte counts or retained heap. Fixture rows were allocated before sampling.

| Rows | Phase | Version | Sync count | Sampled allocated MiB |
|---:|---|---|---:|---:|
| 30000 | cold | main | 30 | 58.11 |
| 30000 | cold | optimized | 30 | 41.16 |
| 30000 | repeated | main | 30 | 56.22 |
| 30000 | repeated | optimized | 30 | 3.35 |
| 100000 | cold | main | 30 | 216.82 |
| 100000 | cold | optimized | 30 | 156.42 |
| 100000 | repeated | main | 30 | 216.08 |
| 100000 | repeated | optimized | 30 | 11.48 |

Core controls are separate profiled batches, with fixture creation outside each sync timer. First selection is immediate after synchronization, includes no DOM, and uses a single-row replace intent. Forced GC occurs before each 30-sample operation batch, not before each sample.

| Rows | GC protocol | Operation | Version | Sync | First selection | Heap MiB after batch |
|---:|---|---|---|---|---|---:|
| 30000 | forced | cold-keyed | main | 6.40 / 11.50 (4.50–12.50; n=30) | 0.00 / 0.20 (0.00–0.60; n=30) | 9.01 |
| 30000 | forced | cold-unkeyed | main | 0.10 / 0.30 (0.00–1.60; n=30) | 0.00 / 0.00 (0.00–0.10; n=30) | 4.13 |
| 30000 | forced | same-array | main | 7.00 / 12.00 (4.20–18.30; n=30) | 0.00 / 0.10 (0.00–0.10; n=30) | 21.37 |
| 30000 | forced | replaced-same-keys | main | 6.80 / 18.70 (4.10–19.00; n=30) | 0.00 / 0.10 (0.00–0.10; n=30) | 13.87 |
| 30000 | forced | changed-last | main | 11.10 / 17.00 (4.20–17.20; n=30) | 0.00 / 0.10 (0.00–0.20; n=30) | 19.23 |
| 30000 | forced | duplicate-last | main | 9.10 / 14.60 (4.50–14.90; n=30) | 0.00 / 0.10 (0.00–0.10; n=30) | 9.85 |
| 30000 | forced | config-only | main | 7.30 / 12.30 (3.20–13.50; n=30) | 0.00 / 0.10 (0.00–0.20; n=30) | 4.13 |
| 30000 | forced | cold-keyed | optimized | 3.70 / 6.30 (2.20–6.40; n=30) | 0.00 / 0.10 (0.00–0.50; n=30) | 9.16 |
| 30000 | forced | cold-unkeyed | optimized | 0.00 / 0.30 (0.00–1.90; n=30) | 0.00 / 0.00 (0.00–0.10; n=30) | 3.54 |
| 30000 | forced | same-array | optimized | 0.60 / 2.90 (0.40–4.60; n=30) | 0.00 / 0.10 (0.00–0.10; n=30) | 3.65 |
| 30000 | forced | replaced-same-keys | optimized | 0.50 / 1.10 (0.40–3.00; n=30) | 0.00 / 0.10 (0.00–0.10; n=30) | 7.85 |
| 30000 | forced | changed-last | optimized | 2.20 / 4.90 (1.70–5.20; n=30) | 0.00 / 0.10 (0.00–0.10; n=30) | 9.39 |
| 30000 | forced | duplicate-last | optimized | 2.20 / 4.00 (1.70–4.20; n=30) | 0.00 / 0.10 (0.00–0.10; n=30) | 9.37 |
| 30000 | forced | config-only | optimized | 3.00 / 6.10 (2.20–6.50; n=30) | 0.00 / 0.10 (0.00–0.10; n=30) | 8.58 |
| 30000 | natural | cold-keyed | main | 8.80 / 18.00 (4.50–20.90; n=30) | 0.00 / 0.20 (0.00–0.70; n=30) | 14.71 |
| 30000 | natural | cold-unkeyed | main | 0.10 / 2.70 (0.00–3.20; n=30) | 0.00 / 0.00 (0.00–0.00; n=30) | 14.77 |
| 30000 | natural | same-array | main | 5.70 / 12.80 (4.30–14.00; n=30) | 0.00 / 0.10 (0.00–0.10; n=30) | 37.77 |
| 30000 | natural | replaced-same-keys | main | 5.10 / 10.80 (3.60–14.50; n=30) | 0.00 / 0.10 (0.00–0.10; n=30) | 21.25 |
| 30000 | natural | changed-last | main | 4.00 / 6.00 (3.60–7.20; n=30) | 0.00 / 0.10 (0.00–0.10; n=30) | 30.10 |
| 30000 | natural | duplicate-last | main | 7.70 / 12.30 (3.60–12.60; n=30) | 0.00 / 0.10 (0.00–0.10; n=30) | 38.27 |
| 30000 | natural | config-only | main | 6.30 / 11.40 (2.50–13.40; n=30) | 0.00 / 0.10 (0.00–0.10; n=30) | 80.57 |
| 30000 | natural | cold-keyed | optimized | 4.30 / 6.40 (3.00–6.90; n=30) | 0.00 / 0.10 (0.00–0.10; n=30) | 9.76 |
| 30000 | natural | cold-unkeyed | optimized | 0.00 / 0.10 (0.00–2.50; n=30) | 0.00 / 0.00 (0.00–0.00; n=30) | 9.05 |
| 30000 | natural | same-array | optimized | 1.00 / 1.80 (0.70–3.90; n=30) | 0.00 / 0.10 (0.00–0.10; n=30) | 10.05 |
| 30000 | natural | replaced-same-keys | optimized | 0.90 / 3.60 (0.60–3.80; n=30) | 0.00 / 0.10 (0.00–0.10; n=30) | 13.47 |
| 30000 | natural | changed-last | optimized | 3.90 / 5.90 (2.60–6.30; n=30) | 0.00 / 0.10 (0.00–0.20; n=30) | 28.79 |
| 30000 | natural | duplicate-last | optimized | 3.80 / 7.20 (3.10–9.00; n=30) | 0.00 / 0.10 (0.00–0.20; n=30) | 23.34 |
| 30000 | natural | config-only | optimized | 9.90 / 15.50 (6.20–19.20; n=30) | 0.00 / 0.10 (0.00–0.10; n=30) | 33.91 |
| 100000 | forced | cold-keyed | optimized | 17.30 / 33.50 (10.50–35.70; n=30) | 0.00 / 0.10 (0.00–0.20; n=30) | 43.63 |
| 100000 | forced | cold-unkeyed | optimized | 0.10 / 0.40 (0.00–0.50; n=30) | 0.00 / 0.00 (0.00–0.00; n=30) | 14.73 |
| 100000 | forced | same-array | optimized | 3.00 / 4.30 (1.90–12.80; n=30) | 0.00 / 0.20 (0.00–0.70; n=30) | 14.70 |
| 100000 | forced | replaced-same-keys | optimized | 2.70 / 5.90 (2.00–14.90; n=30) | 0.00 / 0.10 (0.00–0.20; n=30) | 40.34 |
| 100000 | forced | changed-last | optimized | 25.00 / 38.30 (20.00–45.20; n=30) | 0.00 / 0.20 (0.00–0.20; n=30) | 1.03 |
| 100000 | forced | duplicate-last | optimized | 21.50 / 34.80 (16.10–40.10; n=30) | 0.00 / 0.10 (0.00–0.10; n=30) | 1.03 |
| 100000 | forced | config-only | optimized | 44.40 / 66.20 (40.80–66.50; n=30) | 0.00 / 0.10 (0.00–0.10; n=30) | 45.10 |
| 100000 | forced | cold-keyed | main | 62.00 / 74.10 (50.00–78.80; n=30) | 0.00 / 0.10 (0.00–0.30; n=30) | 10.52 |
| 100000 | forced | cold-unkeyed | main | 0.60 / 2.80 (0.10–7.50; n=30) | 0.00 / 0.10 (0.00–0.40; n=30) | 26.72 |
| 100000 | forced | same-array | main | 64.90 / 82.50 (55.90–85.90; n=30) | 0.00 / 0.10 (0.00–0.20; n=30) | 1.03 |
| 100000 | forced | replaced-same-keys | main | 70.70 / 108.90 (55.10–118.20; n=30) | 0.00 / 0.10 (0.00–0.20; n=30) | 33.32 |
| 100000 | forced | changed-last | main | 62.50 / 86.40 (56.20–91.70; n=30) | 0.00 / 0.10 (0.00–0.20; n=30) | 1.03 |
| 100000 | forced | duplicate-last | main | 61.30 / 72.40 (54.00–88.80; n=30) | 0.00 / 0.10 (0.00–0.30; n=30) | 1.03 |
| 100000 | forced | config-only | main | 39.50 / 45.70 (36.10–61.60; n=30) | 0.00 / 0.10 (0.00–0.20; n=30) | 1.04 |
| 100000 | natural | cold-keyed | optimized | 24.70 / 45.20 (17.10–56.00; n=30) | 0.00 / 0.10 (0.00–0.10; n=30) | 1.04 |
| 100000 | natural | cold-unkeyed | optimized | 0.10 / 0.50 (0.00–10.70; n=30) | 0.00 / 0.00 (0.00–0.00; n=30) | 10.64 |
| 100000 | natural | same-array | optimized | 2.80 / 4.80 (2.20–5.80; n=30) | 0.00 / 0.10 (0.00–0.80; n=30) | 33.58 |
| 100000 | natural | replaced-same-keys | optimized | 2.60 / 4.50 (2.00–4.70; n=30) | 0.00 / 0.10 (0.00–0.30; n=30) | 36.07 |
| 100000 | natural | changed-last | optimized | 24.30 / 29.80 (20.20–33.40; n=30) | 0.00 / 0.10 (0.00–0.20; n=30) | 68.43 |
| 100000 | natural | duplicate-last | optimized | 24.00 / 38.50 (17.60–41.30; n=30) | 0.00 / 0.10 (0.00–0.10; n=30) | 1.20 |
| 100000 | natural | config-only | optimized | 44.50 / 54.20 (34.00–58.60; n=30) | 0.00 / 0.10 (0.00–0.10; n=30) | 1.20 |
| 100000 | natural | cold-keyed | main | 56.10 / 75.00 (30.50–83.50; n=30) | 0.00 / 0.10 (0.00–0.10; n=30) | 1.04 |
| 100000 | natural | cold-unkeyed | main | 0.40 / 0.80 (0.10–14.60; n=30) | 0.00 / 0.00 (0.00–0.10; n=30) | 21.01 |
| 100000 | natural | same-array | main | 59.00 / 81.00 (43.30–100.50; n=30) | 0.00 / 0.40 (0.00–0.40; n=30) | 41.24 |
| 100000 | natural | replaced-same-keys | main | 30.50 / 64.70 (17.90–70.50; n=30) | 0.00 / 0.10 (0.00–0.20; n=30) | 1.20 |
| 100000 | natural | changed-last | main | 53.90 / 78.50 (41.20–86.80; n=30) | 0.00 / 0.10 (0.00–0.20; n=30) | 1.20 |
| 100000 | natural | duplicate-last | main | 60.50 / 74.10 (34.60–75.00; n=30) | 0.00 / 0.10 (0.00–0.10; n=30) | 1.20 |
| 100000 | natural | config-only | main | 40.30 / 50.90 (29.30–59.60; n=30) | 0.00 / 0.10 (0.00–0.20; n=30) | 1.04 |

Sampled GC time is attributed CPU-profile sample time, not an exact GC pause measurement. Profiles include fixtures and selection work as well as synchronization. All GC heap snapshots cover the whole page.

| Rows | Version | GC protocol | Sampled GC ms | Profile duration ms | Before / after work / after collection MiB |
|---:|---|---|---:|---:|---|
| 30000 | main | forced | 183.93 | 2031.93 | 0.71 / 4.13 / 0.91 |
| 30000 | optimized | forced | 85.72 | 650.08 | 0.91 / 8.58 / 1.00 |
| 30000 | main | natural | 49.31 | 1470.09 | 1.00 / 80.57 / 1.01 |
| 30000 | optimized | natural | 54.69 | 1023.61 | 1.01 / 33.91 / 1.01 |
| 100000 | optimized | forced | 434.44 | 4725.36 | 1.01 / 45.10 / 1.02 |
| 100000 | main | forced | 612.85 | 12402.76 | 1.02 / 1.04 / 1.02 |
| 100000 | optimized | natural | 243.98 | 4534.33 | 1.02 / 1.20 / 1.02 |
| 100000 | main | natural | 327.60 | 10213.71 | 1.02 / 1.04 / 1.02 |

| External declared total | Loaded rows | Optimized commit |
|---:|---:|---|
| 352 | 20 | 0.40 / 1.00 (0.10–28.30; n=150) |
| 30000 | 20 | 0.50 / 1.00 (0.10–2.60; n=150) |
| 100000 | 20 | 0.40 / 0.90 (0.10–2.10; n=150) |
| 1000000000 | 20 | 0.40 / 0.80 (0.10–1.60; n=150) |
