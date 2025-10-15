import { mean, min, max, standardDeviation } from "simple-statistics";
import { mkdir } from "node:fs/promises";
import type { CliConfig, JsonOutput, EchoerResults } from "./types";

function generateJsonOutput(results: EchoerResults[], config: CliConfig): JsonOutput {
    const allSamples = results.flatMap(r => r.samples);
    const totalSamples = allSamples.length;

    // Extract all metrics
    const allRtts = allSamples.map(s => s.rtt);
    const allProcs = allSamples.map(s => s.proc);
    const allUplinks = allSamples.map(s => s.uplink);
    const allDownlinks = allSamples.map(s => s.downlink);
    const allOffsets = allSamples.map(s => s.offset);

    // Calculate aggregated statistics
    const aggregatedStats = {
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

    // Build the complete JSON structure
    return {
        timestamp: new Date().toISOString(),
        configuration: {
            clients: config.clients,
            samples: config.samples,
            url: config.url,
            location: config.location,
            processing: config.processing
        },
        clients: results.map((result, index) => ({
            clientId: index + 1,
            samples: result.samples,
            averages: result.averages
        })),
        aggregated: {
            totalSamples,
            statistics: aggregatedStats
        }
    };
}

export async function saveResultsToJson(results: EchoerResults[], config: CliConfig): Promise<string> {
    // Generate JSON output
    const jsonOutput = generateJsonOutput(results, config);

    // Create results directory if it doesn't exist
    const resultsDir = "./results";
    await mkdir(resultsDir, { recursive: true });

    // Generate timestamped filename
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const filename = `${resultsDir}/results-${timestamp}.json`;

    // Write JSON file with pretty formatting
    await Bun.write(filename, JSON.stringify(jsonOutput, null, 2));

    return filename;
}

