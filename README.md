# Cloudflare Durable Objects Performance Testing

Performance testing tool for Cloudflare Durable Objects using NTP-style timing.

## Data Collected

**Network Metrics:**
- **RTT** - Round-trip time (client → server → client)
- **Uplink** - Client to server delay (skew-corrected)
- **Downlink** - Server to client delay (skew-corrected)
- **Processing** - Server processing time
- **Clock Offset** - Time difference between client and server

**Location Data:**
- Client colo and region (from CGI trace)
- Server colos observed during testing
- Regional distribution of server locations

## Usage

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

## Output

Results saved to `results/results-<timestamp>.json` with:
- Aggregated statistics (mean, min, max, std dev)
- Per-client breakdowns
- Location metadata
- Raw sample data