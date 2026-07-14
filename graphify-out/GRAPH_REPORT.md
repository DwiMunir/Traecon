# Graph Report - treacon  (2026-07-14)

## Corpus Check
- 17 files · ~7,337 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 141 nodes · 212 edges · 13 communities (11 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `652e18a6`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 11|Community 11]]

## God Nodes (most connected - your core abstractions)
1. `Spec MVP — Threads Reader Mode (Chrome Extension)` - 12 edges
2. `timeAnchors()` - 9 edges
3. `compilerOptions` - 9 edges
4. `render()` - 7 edges
5. `scripts` - 6 edges
6. `runReader()` - 6 edges
7. `boot()` - 6 edges
8. `extractThread()` - 6 edges
9. `quoteContainerIn()` - 5 edges
10. `openViaSpaNav()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `runReader()` --calls--> `buildThread()`  [EXTRACTED]
  src/content.ts → src/pipeline.ts
- `runReader()` --calls--> `extractThread()`  [EXTRACTED]
  src/content.ts → src/extractor.ts
- `onReaderClick()` --calls--> `requestAutoOpen()`  [EXTRACTED]
  src/content.ts → src/extractor.ts
- `openViaSpaNav()` --calls--> `requestAutoOpen()`  [EXTRACTED]
  src/content.ts → src/extractor.ts
- `boot()` --calls--> `consumeAutoOpen()`  [EXTRACTED]
  src/content.ts → src/extractor.ts

## Import Cycles
- None detected.

## Communities (13 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.19
Nodes (19): boot(), debounce(), ensureButtons(), makeButton(), onReaderClick(), openViaSpaNav(), runReader(), waitFor() (+11 more)

### Community 1 - "Community 1"
Cohesion: 0.17
Nodes (17): cleanupUiLines(), extractPost(), findButtonMount(), getAuthor(), getColumnPosts(), getFocusedPostNode(), getPostAnchor(), getPostGroups() (+9 more)

### Community 2 - "Community 2"
Cohesion: 0.17
Nodes (15): buildThread(), CONT, COUNTER, EMOJI_MARKER, LANJUT, LEADING_MARKER, MergedThread, mergePosts() (+7 more)

### Community 3 - "Community 3"
Cohesion: 0.12
Nodes (15): devDependencies, @crxjs/vite-plugin, typescript, vite, vitest, name, private, scripts (+7 more)

### Community 4 - "Community 4"
Cohesion: 0.12
Nodes (15): 10. Open Questions (non-blocking), 11. Definisi Selesai MVP, 1. Problem Statement, 2. Goals, 3. Non-Goals (v1), 4. User Stories, 5. Requirements, 6. Aturan Normalisasi (pipeline merge) (+7 more)

### Community 5 - "Community 5"
Cohesion: 0.23
Nodes (13): arc(), BG, capsule(), chunk(), coverage(), crc32(), crcTable, deg() (+5 more)

### Community 6 - "Community 6"
Cohesion: 0.18
Nodes (10): compilerOptions, isolatedModules, lib, module, moduleResolution, noEmit, skipLibCheck, strict (+2 more)

### Community 7 - "Community 7"
Cohesion: 0.44
Nodes (7): close(), el(), ensureOverlay(), onKeydown(), open(), showError(), showProgress()

### Community 8 - "Community 8"
Cohesion: 0.33
Nodes (5): Aset visual, Chrome Web Store — Submission Kit, Langkah submit, Listing, Privacy tab

## Knowledge Gaps
- **56 isolated node(s):** `OUT`, `crcTable`, `BG`, `FG`, `name` (+51 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `OUT`, `crcTable`, `BG` to the rest of the system?**
  _56 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._