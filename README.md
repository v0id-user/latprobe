# latprobe

> Distributed latency test suite for Cloudflare’s edge and Durable Objects.

---

### Overview
`latprobe` measures true end-to-end latency across Cloudflare’s edge using **NTP-style timestamping** (T1–T4) to correct for clock skew.  
It provides precise metrics for:

- RTT (round-trip time)  
- One-way uplink/downlink delay  
- Server processing time  
- Clock offset between client ↔ edge  

It’s not just an echo test — it’s a growing suite of **performance probes** for edge systems.

---

### Probes
| Name | Purpose |
|------|----------|
| **Echoer** | Baseline RTT + offset measurement |
| **Queueer** | Queue latency under load |
| **Broadcaster** | Fan-out timing tests |
| **Persistor** | Async storage latency |

---

### Example Output

```text
--- Echoer Summary ---
Samples: 100
RTT avg: 80.22 ms
Proc avg: 0.00 ms
Up avg: 40.11 ms
Down avg: 40.11 ms
Offset avg: 175.42 ms
```


---

### Usage

#### Run the Durable Object Candidate
```bash
# Install dependencies and generate types
cd doperf
bun install
bun run cf-typegen

# Run
bun run dev

# Or deploy
bun deploy
```

#### Run the Echoer client
```bash
cd echoer
bun install
bun run index.ts
```

### Stack

- TypeScript + Bun
- Cloudflare Workers + Durable Objects
- Arktype for schema validation
- simple-statistics for metrics

### License

ISC © 2025 #V0ID (hey@v0id.me)