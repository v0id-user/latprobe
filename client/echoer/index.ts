import { Echoer, type EchoerResults } from "./worker";
import { mean, min, max, standardDeviation } from "simple-statistics";

// Available URL presets
const DEPLOYED_VERSION = "wss://doperf.cloudflare-c49.workers.dev/";
const LOCAL_DEPLOY_VERSION = "ws://localhost:8787/";

// Type for location hints
type DurableObjectLocationHint = "wnam" | "enam" | "sam" | "weur" | "eeur" | "apac" | "oc" | "afr" | "me";

// CLI Configuration
interface CliConfig {
    clients: number;
    samples: number;
    url: string;
    location: DurableObjectLocationHint;
    processing: boolean;
}

function printHelp() {
    console.log(`
Echoer CLI - Cloudflare Durable Objects Performance Testing Tool

Usage: bun run index.ts [options]

Options:
  -c, --clients <number>     Number of parallel clients (default: 1)
  -s, --samples <number>     Number of samples per client (default: 100)
  -u, --url <url>           WebSocket URL (default: deployed)
                            Presets: "deployed", "local", or full URL
  -l, --location <hint>     Location hint: wnam, enam, sam, weur, eeur, apac, oc, afr, me (default: me)
  -p, --processing          Enable processing mode (default: false)
  -h, --help                Display this help message

Examples:
  bun run index.ts --clients 10 --samples 50
  bun run index.ts -c 5 -s 100 -l weur --processing
  bun run index.ts --url local --clients 3
`);
}

function parseArgs(): CliConfig {
    const args = process.argv.slice(2);
    const config: CliConfig = {
        clients: 1,
        samples: 100,
        url: DEPLOYED_VERSION,
        location: "me",
        processing: false
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        const nextArg = args[i + 1];

        switch (arg) {
            case "-h":
            case "--help":
                printHelp();
                process.exit(0);
                break;

            case "-c":
            case "--clients":
                if (!nextArg || isNaN(Number(nextArg))) {
                    console.error("Error: --clients requires a number");
                    process.exit(1);
                }
                config.clients = parseInt(nextArg, 10);
                i++;
                break;

            case "-s":
            case "--samples":
                if (!nextArg || isNaN(Number(nextArg))) {
                    console.error("Error: --samples requires a number");
                    process.exit(1);
                }
                config.samples = parseInt(nextArg, 10);
                i++;
                break;

            case "-u":
            case "--url":
                if (!nextArg) {
                    console.error("Error: --url requires a value");
                    process.exit(1);
                }
                if (nextArg === "deployed") {
                    config.url = DEPLOYED_VERSION;
                } else if (nextArg === "local") {
                    config.url = LOCAL_DEPLOY_VERSION;
                } else {
                    config.url = nextArg;
                }
                i++;
                break;

            case "-l":
            case "--location":
                if (!nextArg) {
                    console.error("Error: --location requires a value");
                    process.exit(1);
                }
                config.location = nextArg as DurableObjectLocationHint;
                i++;
                break;

            case "-p":
            case "--processing":
                config.processing = true;
                break;

            default:
                console.error(`Unknown argument: ${arg}`);
                printHelp();
                process.exit(1);
        }
    }

    return config;
}

function aggregateResults(results: EchoerResults[]): void {
    const allSamples = results.flatMap(r => r.samples);
    const totalSamples = allSamples.length;

    // Extract all metrics
    const allRtts = allSamples.map(s => s.rtt);
    const allProcs = allSamples.map(s => s.proc);
    const allUplinks = allSamples.map(s => s.uplink);
    const allDownlinks = allSamples.map(s => s.downlink);
    const allOffsets = allSamples.map(s => s.offset);

    // Calculate aggregated statistics
    const stats = {
        rtt: {
            mean: mean(allRtts),
            min: min(allRtts),
            max: max(allRtts),
            stdDev: standardDeviation(allRtts)
        },
        proc: {
            mean: mean(allProcs),
            min: min(allProcs),
            max: max(allProcs),
            stdDev: standardDeviation(allProcs)
        },
        uplink: {
            mean: mean(allUplinks),
            min: min(allUplinks),
            max: max(allUplinks),
            stdDev: standardDeviation(allUplinks)
        },
        downlink: {
            mean: mean(allDownlinks),
            min: min(allDownlinks),
            max: max(allDownlinks),
            stdDev: standardDeviation(allDownlinks)
        },
        offset: {
            mean: mean(allOffsets),
            min: min(allOffsets),
            max: max(allOffsets),
            stdDev: standardDeviation(allOffsets)
        }
    };

    console.log("\n");
    console.log("╔════════════════════════════════════════════════════════════════╗");
    console.log("║              AGGREGATED RESULTS (ALL CLIENTS)                  ║");
    console.log("╚════════════════════════════════════════════════════════════════╝");
    console.log(`\nTotal Clients:  ${results.length}`);
    console.log(`Total Samples:  ${totalSamples}`);
    console.log(`\n┌─────────────────────────────────────────────────────────────┐`);
    console.log(`│ Metric          │   Mean   │   Min    │   Max    │  Std Dev │`);
    console.log(`├─────────────────────────────────────────────────────────────┤`);
    console.log(`│ RTT             │ ${stats.rtt.mean.toFixed(2).padStart(6)} ms│ ${stats.rtt.min.toFixed(2).padStart(6)} ms│ ${stats.rtt.max.toFixed(2).padStart(6)} ms│ ${stats.rtt.stdDev.toFixed(2).padStart(6)} ms│`);
    console.log(`│ Processing      │ ${stats.proc.mean.toFixed(2).padStart(6)} ms│ ${stats.proc.min.toFixed(2).padStart(6)} ms│ ${stats.proc.max.toFixed(2).padStart(6)} ms│ ${stats.proc.stdDev.toFixed(2).padStart(6)} ms│`);
    console.log(`│ Uplink          │ ${stats.uplink.mean.toFixed(2).padStart(6)} ms│ ${stats.uplink.min.toFixed(2).padStart(6)} ms│ ${stats.uplink.max.toFixed(2).padStart(6)} ms│ ${stats.uplink.stdDev.toFixed(2).padStart(6)} ms│`);
    console.log(`│ Downlink        │ ${stats.downlink.mean.toFixed(2).padStart(6)} ms│ ${stats.downlink.min.toFixed(2).padStart(6)} ms│ ${stats.downlink.max.toFixed(2).padStart(6)} ms│ ${stats.downlink.stdDev.toFixed(2).padStart(6)} ms│`);
    console.log(`│ Clock Offset    │ ${stats.offset.mean.toFixed(2).padStart(6)} ms│ ${stats.offset.min.toFixed(2).padStart(6)} ms│ ${stats.offset.max.toFixed(2).padStart(6)} ms│ ${stats.offset.stdDev.toFixed(2).padStart(6)} ms│`);
    console.log(`└─────────────────────────────────────────────────────────────┘\n`);
}

async function main() {
    const config = parseArgs();

    console.log("╔════════════════════════════════════════════════════════════════╗");
    console.log("║          Echoer Performance Testing Tool - Starting            ║");
    console.log("╚════════════════════════════════════════════════════════════════╝");
    console.log(`\nConfiguration:`);
    console.log(`  Parallel Clients: ${config.clients}`);
    console.log(`  Samples per Client: ${config.samples}`);
    console.log(`  URL: ${config.url}`);
    console.log(`  Location Hint: ${config.location}`);
    console.log(`  Processing Mode: ${config.processing ? "Enabled" : "Disabled"}`);
    console.log(`\nStarting ${config.clients} parallel client(s)...\n`);

    // Create all clients
    const clients: Echoer[] = [];
    for (let i = 1; i <= config.clients; i++) {
        clients.push(
            new Echoer(config.url, config.samples, config.processing, config.location, i)
        );
    }

    // Wait for all clients to complete in parallel
    try {
        const results = await Promise.all(
            clients.map(client => client.waitForCompletion())
        );

        // Display aggregated results
        aggregateResults(results);

        console.log("✓ All clients completed successfully!\n");
        process.exit(0);
    } catch (error) {
        console.error("\n✗ Error during execution:", error);
        process.exit(1);
    }
}

// Run the CLI
main();
