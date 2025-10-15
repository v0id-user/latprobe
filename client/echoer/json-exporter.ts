import { mean, min, max, standardDeviation } from "simple-statistics";
import { mkdir } from "node:fs/promises";
import type { CliConfig, JsonOutput, EchoerResults } from "./types";
import { getWhereDoApiV3, type WhereDoApiV3 } from "./where-do";

function generateJsonOutput(results: EchoerResults[], config: CliConfig, whereDoData: WhereDoApiV3 | null): JsonOutput {
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

    // Extract unique colos from all samples
    const observedColos = [...new Set(allSamples.map(s => s.cgiTrace.colo).filter((colo): colo is string => colo !== null))];

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
        },
        metadata: {
            attribution: "Location data from where.durableobjects.live",
            whereDoData: whereDoData || null,
            observedColos
        }
    };
}

export async function saveResultsToJson(results: EchoerResults[], config: CliConfig): Promise<string> {
    // Fetch WhereDoApiV3 data
    let whereDoData: WhereDoApiV3 | null = null;
    try {
        whereDoData = await getWhereDoApiV3();
    } catch (error) {
        console.warn("Warning: Could not fetch location data from where.durableobjects.live:", error);
    }

    // Generate JSON output
    const jsonOutput = generateJsonOutput(results, config, whereDoData);

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

