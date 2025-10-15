import { extractColoFullName } from './regions';
import type { EchoerResults } from './types';
import type { WhereDoApiV3 } from './where-do';
import type { CgiTrace } from 'shared';

/**
 * Initialize the progress display
 */
export function initializeProgressDisplay(totalClients: number, samplesPerClient: number): void {
    console.log(`\nCollecting samples from ${totalClients} client(s)...`);
    console.log(`Total samples to collect: ${totalClients * samplesPerClient}\n`);
}

/**
 * Update progress during sample collection
 */
export function updateProgress(current: number, total: number, clientId: number): void {
    const percentage = Math.round((current / total) * 100);
    process.stdout.write(`\rProgress: ${current} / ${total} samples (${percentage}%) - Client #${clientId}`);
}

/**
 * Display final results
 */
export async function displayResults(
    results: EchoerResults[],
    clientCgiTrace: CgiTrace,
    whereDoData?: WhereDoApiV3 | null
): Promise<void> {
    // Clear the progress line
    console.log('\n');
    
    // Gather all samples and calculate stats
    const allSamples = results.flatMap(r => r.samples);
    // Collect unique non-null colos only, deduplicated, and safely type them as string
    const observedColos = Array.from(new Set(
        allSamples.map(s => s.cgiTrace.colo).filter((v): v is string => typeof v === 'string' && !!v)
    ));
    const observedColoFullNames = await Promise.all(observedColos.map(colo => extractColoFullName(colo || '')));

    const calcStats = (values: number[]) => {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);
        return { mean, min, max };
    };

    const allRtts = allSamples.map(s => s.rtt);
    const allProcs = allSamples.map(s => s.proc);
    const allUplinks = allSamples.map(s => s.uplink);
    const allDownlinks = allSamples.map(s => s.downlink);

    const rttStats = calcStats(allRtts);
    const procStats = calcStats(allProcs);
    const uplinkStats = calcStats(allUplinks);
    const downlinkStats = calcStats(allDownlinks);

    // Display results
    console.log('═════════════════════════════════════════════════════');
    console.log('           ECHOER PERFORMANCE RESULTS');
    console.log('═════════════════════════════════════════════════════');
    console.log();
    console.log(`Clients: ${results.length} | Total Samples: ${allSamples.length}`);
    console.log();
    console.log('CLIENT LOCATION:');
    const clientColoFullName = clientCgiTrace.colo ? await extractColoFullName(clientCgiTrace.colo) : 'Unknown';
    console.log(`  Colo: ${clientCgiTrace.colo || 'Unknown'} ${clientCgiTrace.colo ? `(${clientColoFullName})` : ''}`);
    console.log(`  Region: ${clientCgiTrace.loc || 'Unknown'}`);
    console.log();
    console.log('SERVER COLOS OBSERVED:');
    if (observedColos.length === 0) {
        console.log('  No colo information available');
    } else if (whereDoData && clientCgiTrace.colo) {
        // Display with likelihood information and full names
        const clientColoData = whereDoData.colos[clientCgiTrace.colo];
        if (clientColoData) {
            for (let i = 0; i < observedColos.length; i++) {
                const colo = observedColos[i];
                if (!colo) continue; // Skip null/undefined colos
                const coloFullName = observedColoFullNames[i];
                const hostData = clientColoData.hosts[colo];
                if (hostData) {
                    const likelihoodPercent = (hostData.likelihood * 100).toFixed(1);
                    console.log(`  ${colo} (${coloFullName}): ${likelihoodPercent}% likelihood (where.durableobjects.live)`);
                } else {
                    console.log(`  ${colo} (${coloFullName}): (likelihood data unavailable)`);
                }
            }
        } else {
            // Display with full names even when likelihood data is unavailable
            for (let i = 0; i < observedColos.length; i++) {
                const colo = observedColos[i];
                if (!colo) continue;
                const coloFullName = observedColoFullNames[i];
                console.log(`  ${colo} (${coloFullName})`);
            }
            console.log(`  (client colo not found in location data)`);
        }
    } else {
        // Display with full names
        for (let i = 0; i < observedColos.length; i++) {
            const colo = observedColos[i];
            if (!colo) continue;
            const coloFullName = observedColoFullNames[i];
            console.log(`  ${colo} (${coloFullName})`);
        }
    }
    console.log();
    console.log('PERFORMANCE METRICS:');
    console.log(`  RTT:        Mean: ${rttStats.mean.toFixed(2)}ms | Min: ${rttStats.min.toFixed(2)}ms | Max: ${rttStats.max.toFixed(2)}ms`);
    console.log(`  Processing: Mean: ${procStats.mean.toFixed(2)}ms | Min: ${procStats.min.toFixed(2)}ms | Max: ${procStats.max.toFixed(2)}ms`);
    console.log(`  Uplink:     Mean: ${uplinkStats.mean.toFixed(2)}ms | Min: ${uplinkStats.min.toFixed(2)}ms | Max: ${uplinkStats.max.toFixed(2)}ms`);
    console.log(`  Downlink:   Mean: ${downlinkStats.mean.toFixed(2)}ms | Min: ${downlinkStats.min.toFixed(2)}ms | Max: ${downlinkStats.max.toFixed(2)}ms`);
    console.log();
    console.log('═════════════════════════════════════════════════════');
    console.log();
}

/**
 * Clean up
 */
export function cleanup(): void {
    console.log();
}
