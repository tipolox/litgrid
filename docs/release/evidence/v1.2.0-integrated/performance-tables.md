Integrated qualification after PR #42. Milliseconds unless specified; p50 / p95 (min–max; sample count), nearest rank. Historical v1.1.0 has index selection and does not implement stable keys; `keyed` is the identical configured workload, not identical functionality. `legacy` omits rowKey on both versions.

| Case | Rows | Columns | Version | Adoption | Two-frame presentation | Scroll | Selection | Max cells |
|---|---:|---:|---|---|---|---|---|---:|
| keyed | 30000 | 120 | historical-v1.1.0 | 10.70 / 18.70 (4.20–76.90; n=60) | 33.70 / 57.30 (20.30–113.70; n=60) | 38.10 / 61.10 (16.60–83.80; n=600) | 6.50 / 10.80 (2.80–16.70; n=600) | 260 |
| keyed | 30000 | 120 | optimized-integrated | 16.40 / 29.70 (7.10–33.90; n=60) | 40.40 / 69.10 (23.60–77.00; n=60) | 39.20 / 59.50 (17.30–109.70; n=600) | 7.00 / 12.10 (3.30–20.50; n=600) | 260 |
| keyed | 30000 | 200 | historical-v1.1.0 | 11.10 / 18.10 (4.00–21.30; n=60) | 40.40 / 60.30 (20.00–69.20; n=60) | 42.60 / 63.80 (9.90–125.60; n=600) | 8.20 / 13.70 (3.80–23.00; n=600) | 260 |
| keyed | 30000 | 200 | optimized-integrated | 16.70 / 27.40 (7.20–33.70; n=60) | 47.10 / 68.60 (24.80–80.80; n=60) | 43.60 / 64.10 (16.80–128.50; n=600) | 8.50 / 14.90 (3.60–39.90; n=600) | 260 |
| keyed | 100000 | 120 | historical-v1.1.0 | 11.30 / 25.40 (3.90–26.80; n=60) | 36.40 / 58.60 (21.10–88.90; n=60) | 38.20 / 57.10 (13.80–81.70; n=600) | 5.50 / 8.40 (3.00–18.50; n=600) | 260 |
| keyed | 100000 | 120 | optimized-integrated | 38.40 / 57.90 (16.00–79.90; n=60) | 71.30 / 102.00 (31.60–148.40; n=60) | 38.20 / 58.70 (16.70–91.70; n=600) | 5.80 / 10.20 (3.30–21.10; n=600) | 260 |
| keyed | 100000 | 200 | historical-v1.1.0 | 12.60 / 24.60 (3.80–29.10; n=60) | 37.70 / 67.00 (20.20–76.60; n=60) | 39.60 / 59.50 (14.60–110.30; n=600) | 7.00 / 11.20 (3.70–22.50; n=600) | 260 |
| keyed | 100000 | 200 | optimized-integrated | 37.70 / 66.20 (17.80–82.20; n=60) | 71.00 / 120.70 (33.50–136.00; n=60) | 39.30 / 59.80 (16.80–74.20; n=600) | 7.20 / 13.10 (3.60–28.70; n=600) | 260 |
| legacy | 30000 | 120 | historical-v1.1.0 | 10.50 / 22.20 (3.30–92.40; n=60) | 32.40 / 64.00 (17.50–150.30; n=60) | 35.80 / 54.90 (18.10–81.40; n=600) | 6.20 / 10.20 (2.80–27.10; n=600) | 260 |
| legacy | 30000 | 120 | optimized-integrated | 10.20 / 20.30 (3.00–28.20; n=60) | 35.40 / 60.10 (16.50–67.50; n=60) | 35.80 / 57.50 (16.40–73.90; n=600) | 6.10 / 10.10 (2.70–15.20; n=600) | 260 |
| legacy | 30000 | 200 | historical-v1.1.0 | 10.50 / 17.30 (3.70–20.20; n=60) | 35.70 / 53.30 (19.30–61.90; n=60) | 37.70 / 59.90 (16.10–97.30; n=600) | 7.30 / 11.20 (3.30–19.00; n=600) | 260 |
| legacy | 30000 | 200 | optimized-integrated | 11.40 / 18.90 (2.90–21.90; n=60) | 36.20 / 65.80 (17.90–97.10; n=60) | 37.80 / 60.50 (16.70–105.90; n=600) | 7.30 / 12.80 (3.70–25.40; n=600) | 260 |
| legacy | 100000 | 120 | historical-v1.1.0 | 11.20 / 24.10 (3.30–35.80; n=60) | 34.30 / 60.30 (15.00–75.50; n=60) | 35.80 / 52.50 (16.70–105.60; n=600) | 5.10 / 9.20 (2.80–22.00; n=600) | 260 |
| legacy | 100000 | 120 | optimized-integrated | 10.80 / 26.60 (3.20–30.40; n=60) | 34.00 / 62.70 (17.10–66.00; n=60) | 35.50 / 54.90 (14.60–73.60; n=600) | 5.30 / 10.30 (2.70–31.20; n=600) | 260 |
| legacy | 100000 | 200 | historical-v1.1.0 | 12.50 / 23.10 (3.60–29.60; n=60) | 36.90 / 62.50 (17.00–76.20; n=60) | 36.50 / 56.30 (11.70–101.50; n=600) | 6.40 / 10.90 (3.10–22.20; n=600) | 260 |
| legacy | 100000 | 200 | optimized-integrated | 10.90 / 21.60 (3.30–28.00; n=60) | 35.00 / 51.90 (16.30–67.90; n=60) | 36.50 / 55.70 (17.20–109.60; n=600) | 6.50 / 11.20 (3.40–19.30; n=600) | 260 |

Whole-page heap snapshots after grid removal and before the next collection. MiB; these are not retained-leak measurements.

| Case | Version | GC | Heap MiB |
|---|---|---|---|
| keyed | historical-v1.1.0 | forced | 8.56 / 11.85 (4.40–13.23; n=120) |
| keyed | historical-v1.1.0 | natural | 20.80 / 36.97 (2.50–51.51; n=120) |
| keyed | optimized-integrated | forced | 9.72 / 17.11 (5.61–18.34; n=120) |
| keyed | optimized-integrated | natural | 21.99 / 36.54 (2.39–50.43; n=120) |
| legacy | historical-v1.1.0 | forced | 8.54 / 13.13 (4.39–16.56; n=120) |
| legacy | historical-v1.1.0 | natural | 19.92 / 45.04 (2.50–73.71; n=120) |
| legacy | optimized-integrated | forced | 8.09 / 13.36 (4.74–14.14; n=120) |
| legacy | optimized-integrated | natural | 20.31 / 42.89 (2.51–68.80; n=120) |

| React rows | Fresh config | Version | Update including two frames | React render actual duration |
|---:|---|---|---|---|
| 30000 | false | historical-v1.1.0 | 33.30 / 34.80 (24.60–36.00; n=150) | 0.20 / 0.50 (0.00–1.00; n=150) |
| 30000 | false | optimized-integrated | 33.30 / 34.60 (28.70–36.40; n=150) | 0.20 / 0.60 (0.00–1.00; n=150) |
| 30000 | true | historical-v1.1.0 | 33.40 / 34.80 (28.00–37.60; n=150) | 0.20 / 0.50 (0.00–0.80; n=150) |
| 30000 | true | optimized-integrated | 33.30 / 34.60 (29.20–36.60; n=150) | 0.20 / 0.50 (0.00–1.20; n=150) |
| 100000 | false | historical-v1.1.0 | 33.30 / 34.50 (26.30–35.60; n=150) | 0.20 / 0.40 (0.00–0.70; n=150) |
| 100000 | false | optimized-integrated | 33.30 / 34.50 (18.20–34.90; n=150) | 0.20 / 0.30 (0.00–0.70; n=150) |
| 100000 | true | historical-v1.1.0 | 33.30 / 35.00 (17.30–42.90; n=150) | 0.20 / 0.30 (0.00–0.50; n=150) |
| 100000 | true | optimized-integrated | 33.30 / 34.60 (22.20–36.80; n=150) | 0.20 / 0.30 (0.00–0.50; n=150) |

| First click rows | Columns | Version | DOM dispatch | Through Lit update | Two-frame wait |
|---:|---:|---|---|---|---|
| 30000 | 120 | historical-v1.1.0 | 0.10 / 0.30 (0.10–1.10; n=20) | 6.30 / 10.50 (3.10–10.80; n=20) | 31.80 / 33.10 (21.00–36.10; n=20) |
| 30000 | 120 | optimized-integrated | 0.30 / 1.30 (0.10–1.60; n=20) | 7.00 / 10.30 (3.30–14.10; n=20) | 28.50 / 36.80 (22.10–39.60; n=20) |
| 30000 | 200 | historical-v1.1.0 | 0.20 / 0.70 (0.10–0.90; n=20) | 6.30 / 12.90 (4.10–14.10; n=20) | 30.40 / 33.70 (19.50–36.00; n=20) |
| 30000 | 200 | optimized-integrated | 0.20 / 0.50 (0.10–0.50; n=20) | 7.30 / 11.20 (5.30–11.60; n=20) | 29.10 / 35.60 (18.40–37.10; n=20) |
| 100000 | 120 | historical-v1.1.0 | 0.10 / 0.80 (0.00–0.90; n=20) | 5.10 / 10.30 (3.10–15.30; n=20) | 29.60 / 35.70 (12.90–39.90; n=20) |
| 100000 | 120 | optimized-integrated | 0.20 / 0.40 (0.10–0.60; n=20) | 5.90 / 11.70 (2.70–13.80; n=20) | 29.50 / 33.70 (15.30–33.70; n=20) |
| 100000 | 200 | historical-v1.1.0 | 0.20 / 0.40 (0.10–0.50; n=20) | 7.90 / 13.10 (5.20–19.40; n=20) | 28.10 / 35.40 (10.40–37.60; n=20) |
| 100000 | 200 | optimized-integrated | 0.20 / 0.40 (0.10–0.50; n=20) | 6.20 / 13.20 (3.50–14.00; n=20) | 31.70 / 35.70 (22.30–36.40; n=20) |

| External declared total | Keyed | Loaded | Commit | Immediate selection | Identity reads per commit | Max mounted rows |
|---:|---|---:|---|---|---|---:|
| 352 | false | 20 | 1.50 / 3.10 (0.80–15.30; n=150) | 0.00 / 0.10 (0.00–0.50; n=150) | 0.00 / 0.00 (0.00–0.00; n=150) | 13 |
| 352 | true | 20 | 1.50 / 3.10 (0.80–9.70; n=150) | 0.10 / 0.20 (0.00–1.40; n=150) | 20.00 / 20.00 (20.00–20.00; n=150) | 13 |
| 30000 | false | 20 | 1.40 / 3.50 (0.70–7.70; n=150) | 0.00 / 0.10 (0.00–0.20; n=150) | 0.00 / 0.00 (0.00–0.00; n=150) | 13 |
| 30000 | true | 20 | 1.70 / 3.50 (0.90–6.20; n=150) | 0.10 / 0.20 (0.00–1.50; n=150) | 20.00 / 20.00 (20.00–20.00; n=150) | 13 |
| 100000 | false | 20 | 1.50 / 2.40 (0.80–6.80; n=150) | 0.00 / 0.10 (0.00–0.10; n=150) | 0.00 / 0.00 (0.00–0.00; n=150) | 13 |
| 100000 | true | 20 | 1.60 / 3.20 (1.10–6.90; n=150) | 0.10 / 0.20 (0.00–0.70; n=150) | 20.00 / 20.00 (20.00–20.00; n=150) | 13 |
| 1000000000 | false | 20 | 1.30 / 2.70 (0.70–5.20; n=150) | 0.00 / 0.10 (0.00–0.40; n=150) | 0.00 / 0.00 (0.00–0.00; n=150) | 13 |
| 1000000000 | true | 20 | 1.40 / 2.70 (0.80–7.00; n=150) | 0.10 / 0.20 (0.00–0.30; n=150) | 20.00 / 20.00 (20.00–20.00; n=150) | 13 |

Core controls profile the optimized source only, no DOM/network, n=90 per case across the three keyed qualification runs.

| Rows | rowKey | Core cold setData |
|---:|---|---|
| 30000 | false | 0.00 / 0.10 (0.00–0.80; n=90) |
| 30000 | true | 4.30 / 7.80 (2.40–10.40; n=90) |
| 100000 | false | 0.20 / 0.40 (0.00–10.70; n=90) |
| 100000 | true | 23.80 / 34.50 (13.00–41.30; n=90) |

Allocation/GC profiles are separate from timing runs. Allocation values are estimates over 30 syncs at a 32768-byte sampling interval, including collected objects. GC values are attributed CPU sample time, not exact pauses. Fixtures are allocated before sampling. These profiles compare historical index-only v1.1.0 with optimized keyed source.

| Rows | Phase | Version | Sampled allocation MiB | GC sample ms | Profile ms |
|---:|---|---|---:|---:|---:|
| 30000 | cold | historical-v1.1.0 | 10.33 | 6.62 | 28.44 |
| 30000 | cold | optimized-integrated | 41.04 | 9.63 | 111.78 |
| 30000 | repeated | historical-v1.1.0 | 10.30 | 4.94 | 28.66 |
| 30000 | repeated | optimized-integrated | 3.53 | 3.31 | 44.67 |
| 100000 | cold | historical-v1.1.0 | 34.36 | 12.04 | 40.40 |
| 100000 | cold | optimized-integrated | 155.55 | 41.91 | 580.92 |
| 100000 | repeated | historical-v1.1.0 | 34.36 | 13.74 | 58.26 |
| 100000 | repeated | optimized-integrated | 11.51 | 18.03 | 148.80 |
