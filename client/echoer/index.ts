import { Echoer } from "./worker";
import { saveResultsToJson } from "./json-exporter";
import { initializeProgressDisplay, updateProgress, displayResults, cleanup } from "./graphs";
import type { CliConfig, DurableObjectLocationHint, EchoerResults } from "./types";
import { getWhereDoApiV3, type WhereDoApiV3 } from "./where-do";
import { cgiTrace } from "./cgi-trace";

// Available URL presets
const DEPLOYED_VERSION = "wss://doperf.cloudflare-c49.workers.dev/";
const LOCAL_DEPLOY_VERSION = "ws://localhost:8787/";

function printHelp() {
    console.log(`
Echoer CLI - Cloudflare Durable Objects Performance Testing Tool

Usage: bun run index.ts [options]

Options:
  -c, --clients <number>     Number of parallel clients (default: 1, max: 5)
  -s, --samples <number>     Number of samples per client (default: 100)
  -u, --url <url>           WebSocket URL (default: deployed)
                            Presets: "deployed", "local", or full URL
  -l, --location <hint>     Location hint: wnam, enam, sam, weur, eeur, apac, oc, afr, me (default: me)
  -p, --processing          Enable processing mode (default: false)
  -h, --help                Display this help message

Examples:
  bun run index.ts --clients 5 --samples 50
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
                const requestedClients = parseInt(nextArg, 10);
                if (requestedClients > 5) {
                    console.error("Error: --clients cannot be greater than 5");
                    process.exit(1);
                }
                config.clients = requestedClients;
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


async function main() {
    const ourCgiTrace = await cgiTrace();
    const config = parseArgs();

    // Fetch location data early
    let whereDoData: WhereDoApiV3 | null = null;
    try {
        whereDoData = await getWhereDoApiV3();
    } catch (error) {
        console.log(`⚠ Warning: Could not fetch location data: ${error}`);
    }
    
    // Small delay to let user see the config before dashboard takes over
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Initialize progress display
    initializeProgressDisplay(config.clients, config.samples);

    // Track total progress across all clients
    let totalCollected = 0;
    const totalSamples = config.clients * config.samples;

    const progressCallback = (clientId: number) => {
        totalCollected++;
        updateProgress(totalCollected, totalSamples, clientId);
    };

    // Create all clients with progress callback
    const clients: Echoer[] = [];
    for (let i = 1; i <= config.clients; i++) {
        clients.push(
            new Echoer(config.url, config.samples, config.processing, config.location, i, progressCallback)
        );
    }

    // Wait for all clients to complete in parallel
    try {
        const results = await Promise.all(
            clients.map(client => client.waitForCompletion())
        );

        // Display results in dashboard
        displayResults(results, whereDoData, ourCgiTrace);

        // Save results to JSON file
        const filename = await saveResultsToJson(results, config);

        // Keep dashboard visible - user can press 'q' to exit
        // The process will exit when user closes the dashboard
        
    } catch (error) {
        cleanup();
        console.error("\n✗ Error during execution:", error);
        process.exit(1);
    }
}

// Run the CLI
main();


// Location data integration complete - powered by where.durableobjects.live
