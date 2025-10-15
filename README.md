# latprobe

> Distributed latency test suite for Cloudflare’s edge and Durable Objects.

---

### Overview
`latprobe` is a comprehensive performance testing suite for Cloudflare's edge infrastructure and Durable Objects. It measures true end-to-end latency using **NTP-style timestamping** (T1–T4) to correct for clock skew, providing precise metrics for:

- 🔄 **RTT** (round-trip time)  
- ⬆️ **Uplink delay** (client → server, skew-corrected)  
- ⬇️ **Downlink delay** (server → client, skew-corrected)  
- ⚙️ **Server processing time**  
- ⏱️ **Clock offset** between client ↔ edge  

Built as a CLI-first tool with support for **parallel load testing**, allowing you to simulate high-traffic scenarios with multiple concurrent clients and get aggregated performance statistics across all connections.

It's not just an echo test — it's a growing suite of **performance probes** for distributed edge systems.

---

### Probes
| Name | Purpose | Status |
|------|----------|--------|
| **Echoer** | Baseline RTT + offset measurement with parallel load testing | ✅ Ready |
| **Broadcaster** | Fan-out timing tests | 🚧 Planned |
| **Persistor** | Async storage latency | 🚧 Planned |

---

### Example Output

```text
╔════════════════════════════════════════════════════════════════╗
║              AGGREGATED RESULTS (ALL CLIENTS)                  ║
╚════════════════════════════════════════════════════════════════╝

Total Clients:  10
Total Samples:  500

┌─────────────────────────────────────────────────────────────┐
│ Metric          │   Mean   │   Min    │   Max    │  Std Dev │
├─────────────────────────────────────────────────────────────┤
│ RTT             │  80.22 ms│  75.10 ms│  95.43 ms│   4.32 ms│
│ Processing      │   0.50 ms│   0.20 ms│   1.80 ms│   0.25 ms│
│ Uplink          │  40.11 ms│  37.50 ms│  48.20 ms│   2.15 ms│
│ Downlink        │  40.11 ms│  37.40 ms│  47.23 ms│   2.17 ms│
│ Clock Offset    │ 175.42 ms│ 170.30 ms│ 180.15 ms│   2.89 ms│
└─────────────────────────────────────────────────────────────┘
```


---

### Usage

#### Run the Durable Object Candidate (Server)
```bash
# Install dependencies and generate types
cd doperf
bun install
bun run cf-typegen

# Run locally
bun run dev

# Or deploy to production
bun deploy
```

#### Run the Echoer CLI (Client)

The Echoer client is a powerful CLI tool for load testing with parallel clients and comprehensive statistics.

```bash
cd client/echoer
bun install

# Basic usage (1 client, 100 samples)
bun run index.ts

# Simulate high load with 10 parallel clients
bun run index.ts --clients 10 --samples 50

# Test specific region with processing enabled
bun run index.ts -c 5 -l weur --processing

# Test against local deployment
bun run index.ts --url local --clients 3

# View all options
bun run index.ts --help
```

**CLI Options:**
- `-c, --clients <number>` — Number of parallel clients (default: 1)
- `-s, --samples <number>` — Samples per client (default: 100)
- `-u, --url <url>` — WebSocket URL (`deployed`, `local`, or custom URL)
- `-l, --location <hint>` — Region hint: `wnam`, `enam`, `sam`, `weur`, `eeur`, `apac`, `oc`, `afr`, `me`
- `-p, --processing` — Enable processing mode (includes SQLite and computations)
- `-h, --help` — Display help message

**Features:**
- 🚀 Parallel client execution for load simulation
- 📊 Aggregated statistics (mean, min, max, std dev)
- 🎯 NTP-style clock synchronization for accurate measurements
- 🌍 Multi-region support with location hints
- 📈 Individual and aggregate result reporting

### Stack

- TypeScript + Bun
- Cloudflare Workers + Durable Objects
- Arktype for schema validation
- simple-statistics for metrics

### License

ISC © 2025 #V0ID (hey@v0id.me)