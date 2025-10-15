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
export function displayResults(
    results: EchoerResults[],
    whereDoData: WhereDoApiV3 | null,
    clientCgiTrace: CgiTrace
): void {
    // Clear the progress line
    console.log('\n');
    
    // Gather all samples and calculate stats
    const allSamples = results.flatMap(r => r.samples);
    const observedColos = [...new Set(allSamples.map(s => s.cgiTrace.colo).filter(Boolean))];

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
    console.log(`  Colo: ${clientCgiTrace.colo || 'Unknown'}`);
    console.log(`  Region: ${clientCgiTrace.loc || 'Unknown'}`);
    console.log();
    console.log('SERVER COLOS OBSERVED:');
    if (observedColos.length === 0) {
        console.log('  No colo information available');
    } else {
        console.log(`  ${observedColos.join(', ')}`);
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
