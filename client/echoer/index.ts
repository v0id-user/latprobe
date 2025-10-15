import { Echoer } from "./worker";
import { saveResultsToJson } from "./json-exporter";
import { initializeProgressDisplay, updateProgress, displayResults, cleanup } from "./graphs";
import type { CliConfig, DurableObjectLocationHint, EchoerResults } from "./types";
import { getWhereDoApiV3, type WhereDoApiV3 } from "./where-do";
import { cgiTrace } from "./cgi-trace";
import { regions } from "./regions";

// Validation constants
const MIN_CLIENTS = 1;
const MAX_CLIENTS = 5;
const MIN_SAMPLES = 1;
const MAX_SAMPLES = 10000;
const VALID_LOCATIONS: DurableObjectLocationHint[] = ["wnam", "enam", "sam", "weur", "eeur", "apac", "oc", "afr", "me"];
const URL_PRESETS = {
    deployed: "wss://doperf.cloudflare-c49.workers.dev/",
    local: "ws://localhost:8787/"
};


// Validation functions
function validateClients(value: string): number {
    const trimmed = value.trim();
    if (!trimmed) {
        throw new Error("Clients value cannot be empty");
    }
    
    // Check for non-numeric characters (except leading/trailing whitespace)
    if (!/^\d+$/.test(trimmed)) {
        throw new Error(`Invalid clients value: "${value}". Must be a positive integer.`);
    }
    
    const num = parseInt(trimmed, 10);
    if (isNaN(num) || !Number.isInteger(num)) {
        throw new Error(`Invalid clients value: "${value}". Must be an integer.`);
    }
    if (num < MIN_CLIENTS || num > MAX_CLIENTS) {
        throw new Error(`Clients must be between ${MIN_CLIENTS} and ${MAX_CLIENTS}. Got: ${num}`);
    }
    return num;
}

function validateSamples(value: string): number {
    const trimmed = value.trim();
    if (!trimmed) {
        throw new Error("Samples value cannot be empty");
    }
    
    // Check for non-numeric characters (except leading/trailing whitespace)
    if (!/^\d+$/.test(trimmed)) {
        throw new Error(`Invalid samples value: "${value}". Must be a positive integer.`);
    }
    
    const num = parseInt(trimmed, 10);
    if (isNaN(num) || !Number.isInteger(num)) {
        throw new Error(`Invalid samples value: "${value}". Must be an integer.`);
    }
    if (num < MIN_SAMPLES || num > MAX_SAMPLES) {
        throw new Error(`Samples must be between ${MIN_SAMPLES} and ${MAX_SAMPLES}. Got: ${num}`);
    }
    return num;
}

function validateLocation(value: string): DurableObjectLocationHint {
    if (!VALID_LOCATIONS.includes(value as DurableObjectLocationHint)) {
        throw new Error(`Invalid location: "${value}". Valid options: ${VALID_LOCATIONS.join(", ")}`);
    }
    return value as DurableObjectLocationHint;
}

function validateUrl(value: string): string {
    if (!value || typeof value !== "string") {
        throw new Error("URL cannot be empty");
    }
    
    const trimmedValue = value.trim();
    if (!trimmedValue) {
        throw new Error("URL cannot be empty or whitespace only");
    }
    
    // Check for preset values
    if (trimmedValue in URL_PRESETS) {
        return URL_PRESETS[trimmedValue as keyof typeof URL_PRESETS];
    }
    
    // Validate URL format
    try {
        const url = new URL(trimmedValue);
        if (!["ws:", "wss:"].includes(url.protocol)) {
            throw new Error(`Invalid protocol: "${url.protocol}". Must be ws: or wss:`);
        }
        
        // Additional URL validation
        if (!url.hostname) {
            throw new Error("URL must include a hostname");
        }
        
        // Warn about potentially problematic URLs
        if (url.hostname === "localhost" && url.protocol === "wss:") {
            throw new Error("Cannot use wss: protocol with localhost. Use ws: instead.");
        }
        
        return trimmedValue;
    } catch (error) {
        if (error instanceof Error && error.message.startsWith("Invalid protocol:")) {
            throw error;
        }
        throw new Error(`Invalid URL format: "${trimmedValue}". Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
}

function sanitizeString(value: string): string {
    return value.trim().replace(/[<>|&$`;]/g, ""); // Remove potentially dangerous characters
}

class CliError extends Error {
    constructor(message: string, public readonly suggestion?: string) {
        super(message);
        this.name = "CliError";
    }
}

function printHelp() {
    console.log(`
Echoer CLI - Cloudflare Durable Objects Performance Testing Tool

Usage: bun run index.ts <options>

Note: At least one option must be provided. This tool is designed for performance testing and requires explicit configuration.

Options:
  -c, --clients <number>     Number of parallel clients (${MIN_CLIENTS}-${MAX_CLIENTS}, default: 1)
  -s, --samples <number>     Number of samples per client (${MIN_SAMPLES}-${MAX_SAMPLES}, default: 100)
  -u, --url <url>           WebSocket URL (default: deployed)
                            Presets: "deployed", "local", or full WebSocket URL (ws:// or wss://)
  -l, --location <hint>     Location hint (default: me)
                            Valid options: ${VALID_LOCATIONS.join(", ")}
  -p, --processing          Enable processing mode (default: false)
  -h, --help                Display this help message

Examples:
  # Basic performance test with multiple clients
  bun run index.ts --clients 3 --samples 100
  
  # Test with custom location and processing
  bun run index.ts -c 2 -s 50 -l weur --processing
  
  # Test against local development server
  bun run index.ts --url local --clients 2 --samples 200
  
  # Test against custom WebSocket endpoint
  bun run index.ts --url wss://example.com:8080/ws --samples 100
  
  # Quick test with minimal configuration
  bun run index.ts --samples 10

Validation:
  • Clients: Integer between ${MIN_CLIENTS} and ${MAX_CLIENTS}
  • Samples: Integer between ${MIN_SAMPLES} and ${MAX_SAMPLES}
  • URL: Valid WebSocket URL (ws:// or wss://) or preset name
  • Location: Must be one of the valid Cloudflare regions
`);
}

function parseArgs(): CliConfig {
    const args = process.argv.slice(2);
    
    // Require at least one argument (except help)
    if (args.length === 0) {
        throw new CliError(
            "No arguments provided. At least one option must be specified.",
            "Run with --help to see available options and examples."
        );
    }

    const config: CliConfig = {
        clients: 1,
        samples: 100,
        url: URL_PRESETS.deployed,
        location: "me",
        processing: false,
        locationExplicitlySet: false
    };

    // Track processed arguments to detect duplicates
    const processedArgs = new Set<string>();

    try {
        for (let i = 0; i < args.length; i++) {
            const arg = sanitizeString(args[i] || "");
            const nextArg = args[i + 1];

            // Check for duplicate arguments
            const baseArg = arg.replace(/^-+/, ""); // Remove leading dashes
            if (processedArgs.has(baseArg)) {
                throw new CliError(
                    `Duplicate argument: ${arg}`,
                    "Each option can only be specified once per command."
                );
            }

            switch (arg) {
                case "-h":
                case "--help":
                    printHelp();
                    process.exit(0);
                    break;

                case "-c":
                case "--clients":
                    processedArgs.add("clients");
                    if (!nextArg) {
                        throw new CliError(
                            `Missing value for ${arg}`,
                            `Usage: ${arg} <number> (${MIN_CLIENTS}-${MAX_CLIENTS})`
                        );
                    }
                    try {
                        config.clients = validateClients(nextArg);
                    } catch (error) {
                        throw new CliError(
                            `Invalid clients value: ${error instanceof Error ? error.message : "Unknown error"}`,
                            `Use: ${arg} <number> where number is between ${MIN_CLIENTS} and ${MAX_CLIENTS}`
                        );
                    }
                    i++;
                    break;

                case "-s":
                case "--samples":
                    processedArgs.add("samples");
                    if (!nextArg) {
                        throw new CliError(
                            `Missing value for ${arg}`,
                            `Usage: ${arg} <number> (${MIN_SAMPLES}-${MAX_SAMPLES})`
                        );
                    }
                    try {
                        config.samples = validateSamples(nextArg);
                    } catch (error) {
                        throw new CliError(
                            `Invalid samples value: ${error instanceof Error ? error.message : "Unknown error"}`,
                            `Use: ${arg} <number> where number is between ${MIN_SAMPLES} and ${MAX_SAMPLES}`
                        );
                    }
                    i++;
                    break;

                case "-u":
                case "--url":
                    processedArgs.add("url");
                    if (!nextArg) {
                        throw new CliError(
                            `Missing value for ${arg}`,
                            `Usage: ${arg} <url> (deployed|local|<websocket-url>)`
                        );
                    }
                    try {
                        config.url = validateUrl(nextArg);
                    } catch (error) {
                        throw new CliError(
                            `Invalid URL value: ${error instanceof Error ? error.message : "Unknown error"}`,
                            `Use: ${arg} deployed|local|<websocket-url> (must start with ws:// or wss://)`
                        );
                    }
                    i++;
                    break;

                case "-l":
                case "--location":
                    processedArgs.add("location");
                    if (!nextArg) {
                        throw new CliError(
                            `Missing value for ${arg}`,
                            `Usage: ${arg} <hint> (${VALID_LOCATIONS.join("|")})`
                        );
                    }
                    try {
                        config.location = validateLocation(nextArg);
                        config.locationExplicitlySet = true;
                    } catch (error) {
                        throw new CliError(
                            `Invalid location value: ${error instanceof Error ? error.message : "Unknown error"}`,
                            `Use: ${arg} <hint> where hint is one of: ${VALID_LOCATIONS.join(", ")}`
                        );
                    }
                    i++;
                    break;

                case "-p":
                case "--processing":
                    processedArgs.add("processing");
                    config.processing = true;
                    break;

                default:
                    // Check if it looks like an option but is unknown
                    if (arg.startsWith("-")) {
                        throw new CliError(
                            `Unknown option: ${arg}`,
                            "Run with --help to see available options."
                        );
                    } else {
                        throw new CliError(
                            `Unexpected argument: ${arg}`,
                            "All arguments must be options. Run with --help to see available options."
                        );
                    }
            }
        }

        return config;

    } catch (error) {
        if (error instanceof CliError) {
            console.error(`\n✗ ${error.message}`);
            if (error.suggestion) {
                console.error(`   💡 ${error.suggestion}`);
            }
        } else {
            console.error(`\n✗ Unexpected error: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
        console.error("\nRun with --help for usage information.");
        process.exit(1);
    }
}


function validateConfiguration(config: CliConfig): void {
    // Additional cross-parameter validation
    const totalSamples = config.clients * config.samples;
    if (totalSamples > 50000) {
        throw new CliError(
            `Total samples too high: ${totalSamples} (${config.clients} clients × ${config.samples} samples)`,
            "Consider reducing clients or samples to avoid overwhelming the server. Maximum recommended: 50,000 total samples."
        );
    }

    // Warn about potentially expensive configurations
    if (config.clients > 3 && config.samples > 500) {
        console.log(`⚠ Warning: High load configuration detected (${config.clients} clients, ${config.samples} samples each)`);
        console.log(`   This may take a while and could impact server performance.`);
    }
}

async function main() {
    try {
        const ourCgiTrace = await cgiTrace();
        const config = parseArgs();

        // Validate final configuration
        validateConfiguration(config);

        // Display configuration summary
        console.log(`\nStarting Echoer CLI with configuration:`);
        console.log(`   • Clients: ${config.clients}`);
        console.log(`   • Location: ${config.location} (${regions[config.location]})`);
        console.log(`   • Samples per client: ${config.samples}`);
        console.log(`   • Total samples: ${config.clients * config.samples}`);
        console.log(`   • URL: ${config.url}`);
        console.log(`   • Location: ${config.location}`);
        if (!config.locationExplicitlySet) {
            console.log(`   ℹ️  Location defaulted to: me (Middle East)`);
        }
        console.log(`   • Processing mode: ${config.processing ? "enabled" : "disabled"}`);
        console.log();

        // Fetch location data early
        let whereDoData: WhereDoApiV3 | null = null;
        try {
            whereDoData = await getWhereDoApiV3();
        } catch (error) {
            console.log(`⚠ Warning: Could not fetch location data: ${error}`);
        }

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
        const results = await Promise.all(
            clients.map(client => client.waitForCompletion())
        );

        // Display results
        displayResults(results, ourCgiTrace, whereDoData);

        // Save results to JSON file
        await saveResultsToJson(results, config);
        
        console.log("\n✅ Test completed successfully!");
        
    } catch (error) {
        cleanup();
        if (error instanceof CliError) {
            console.error(`\n✗ Configuration Error: ${error.message}`);
            if (error.suggestion) {
                console.error(`   💡 ${error.suggestion}`);
            }
        } else {
            console.error("\n✗ Error during execution:", error instanceof Error ? error.message : error);
        }
        console.error("\nRun with --help for usage information.");
        process.exit(1);
    }
}

// Run the CLI
main();


// Location data integration complete - powered by where.durableobjects.live
