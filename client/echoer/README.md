# Echoer CLI - Performance Testing Tool

A command-line tool for testing Cloudflare Durable Objects performance with parallel clients and aggregated statistics.

## Installation

To install dependencies:

```bash
bun install
```

This project requires Bun v1.3.0 or later. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.

## Usage

### Basic Usage

Run with default settings (1 client, 100 samples):

```bash
bun run index.ts
```

Or use the npm script:

```bash
bun start
```

### CLI Options

```
Options:
  -c, --clients <number>     Number of parallel clients (default: 1)
  -s, --samples <number>     Number of samples per client (default: 100)
  -u, --url <url>           WebSocket URL (default: deployed)
                            Presets: "deployed", "local", or full URL
  -l, --location <hint>     Location hint: wnam, enam, sam, weur, eeur, apac, oc, afr, me (default: me)
  -p, --processing          Enable processing mode (default: false)
  -h, --help                Display help message
```

### Examples

Run 10 parallel clients with 50 samples each:
```bash
bun run index.ts --clients 10 --samples 50
```

Test with 5 clients in the Western Europe region with processing enabled:
```bash
bun run index.ts -c 5 -s 100 -l weur --processing
```

Test against local deployment with 3 clients:
```bash
bun run index.ts --url local --clients 3
```

Use custom WebSocket URL:
```bash
bun run index.ts --url wss://your-custom-url.com/ -c 5
```

### Location Hints

Available location hints:
- `wnam` - Western North America
- `enam` - Eastern North America
- `sam` - South America
- `weur` - Western Europe
- `eeur` - Eastern Europe
- `apac` - Asia Pacific
- `oc` - Oceania
- `afr` - Africa
- `me` - Middle East (default)

## Features

- **Parallel Client Execution**: Run multiple clients simultaneously to simulate high load
- **Aggregated Statistics**: View combined results across all clients including mean, min, max, and standard deviation
- **Individual Client Reports**: Each client displays its own performance metrics
- **NTP-style Clock Synchronization**: Uses NTP-style calculations for accurate RTT measurements with clock skew correction
- **Flexible Configuration**: All parameters configurable via CLI arguments

## Output

The tool provides:
1. Individual client results showing RTT, processing time, uplink, downlink, and clock offset
2. Aggregated statistics across all clients with comprehensive metrics
3. Visual table formatting for easy reading

## Development

This project was created using `bun init` in bun v1.3.0.
