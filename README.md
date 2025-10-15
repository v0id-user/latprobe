# Cloudflare Durable Objects Latency Testing



**Demo video:**

<video src="video/tool_use.mov" controls width="640">
Your browser does not support the video tag. You can download and view the video here: video/tool_use.mov
</video>

```bash
# Server
cd doperf && bun install && bun run dev

# Client
cd client/echoer && bun install
bun run index.ts --clients 5 --samples 50
```

**Options:**
- `--clients <number>` - Parallel clients (default: 1)
- `--samples <number>` - Samples per client (default: 100)
- `--location <region>` - Region hint (wnam, enam, weur, etc.)
- `--processing` - Enable processing mode
- `--url <url>` - WebSocket URL (deployed, local, or custom)

**Data Collected:**
- RTT, processing time, uplink/downlink delays (skew corrected)
- Client and server colo locations with airport names
- Regional distribution and likelihood data from where.durableobjects.live

Results saved to `results/results-<timestamp>.json`