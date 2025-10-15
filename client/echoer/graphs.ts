import sparkly from 'sparkly';
import type { EchoSample, EchoerResults } from './types';
import type { WhereDoApiV3 } from './where-do';

/**
 * Generate a sparkline graph for a metric from samples
 */
export function generateSparkline(values: number[]): string {
    if (values.length === 0) return '';
    return sparkly(values);
}

/**
 * Create sparklines for all metrics from samples
 */
export interface MetricSparklines {
    rtt: string;
    proc: string;
    uplink: string;
    downlink: string;
    offset: string;
}

export function createMetricSparklines(samples: EchoSample[]): MetricSparklines {
    return {
        rtt: generateSparkline(samples.map(s => s.rtt)),
        proc: generateSparkline(samples.map(s => s.proc)),
        uplink: generateSparkline(samples.map(s => s.uplink)),
        downlink: generateSparkline(samples.map(s => s.downlink)),
        offset: generateSparkline(samples.map(s => s.offset))
    };
}

/**
 * Display individual client results with sparklines
 */
export function displayClientResults(results: EchoerResults, clientId: number): void {
    const sparklines = createMetricSparklines(results.samples);
    
    console.log(`\nClient #${clientId}:`);
    console.log(`  RTT          ${results.averages.rtt.toFixed(2).padStart(7)} ms  ${sparklines.rtt}`);
    console.log(`  Processing   ${results.averages.proc.toFixed(2).padStart(7)} ms  ${sparklines.proc}`);
    console.log(`  Uplink       ${results.averages.uplink.toFixed(2).padStart(7)} ms  ${sparklines.uplink}`);
    console.log(`  Downlink     ${results.averages.downlink.toFixed(2).padStart(7)} ms  ${sparklines.downlink}`);
    console.log(`  Clock Offset ${results.averages.offset.toFixed(2).padStart(7)} ms  ${sparklines.offset}`);
}

/**
 * Display per-client comparison sparklines
 */
export function displayPerClientComparison(results: EchoerResults[]): void {
    if (results.length <= 1) return;
    
    console.log(`\nPer-Client RTT Comparison:`);
    
    results.forEach((result, index) => {
        const clientId = index + 1;
        const sparkline = generateSparkline(result.samples.map(s => s.rtt));
        const avg = result.averages.rtt.toFixed(2);
        console.log(`  Client ${clientId}: ${avg} ms avg  ${sparkline}`);
    });
}

/**
 * Display location metadata summary for all samples
 */
export function displayLocationMetadata(results: EchoerResults[], whereDoData: WhereDoApiV3 | null): void {
    const allSamples = results.flatMap(r => r.samples);
    const observedColos = [...new Set(allSamples.map(s => s.cgiTrace.colo).filter(Boolean))];
    
    if (observedColos.length === 0) {
        console.log(`\nLocation Metadata: No colo information available`);
        return;
    }

    console.log(`\nLocation Metadata:`);
    console.log(`  Observed Colos: ${observedColos.join(', ')}`);
    
    if (whereDoData) {
        console.log(`  WhereDo Coverage: ${(whereDoData.coverage * 100).toFixed(1)}%`);
        
        // Show region distribution for observed colos
        const regionCounts: { [key: string]: number } = {};
        observedColos.forEach(colo => {
            if (colo && whereDoData.colos[colo]) {
                const region = whereDoData.colos[colo].nearestRegion;
                regionCounts[region] = (regionCounts[region] || 0) + 1;
            }
        });
        
        if (Object.keys(regionCounts).length > 0) {
            console.log(`  Regional Distribution:`);
            Object.entries(regionCounts).forEach(([region, count]) => {
                console.log(`    ${region.toUpperCase()}: ${count} colo(s)`);
            });
        }
    }
    
    console.log(`  Attribution: Location data powered by where.durableobjects.live`);
}

/**
 * Display detailed CGI trace information for each client
 */
export function displayClientLocationDetails(results: EchoerResults[]): void {
    console.log(`\nDetailed Location Information:`);
    
    results.forEach((result, index) => {
        const clientId = index + 1;
        const colos = [...new Set(result.samples.map(s => s.cgiTrace.colo).filter(Boolean))];
        const locations = [...new Set(result.samples.map(s => s.cgiTrace.loc).filter(Boolean))];
        
        console.log(`\n  Client #${clientId}:`);
        console.log(`    Colos: ${colos.length > 0 ? colos.join(', ') : 'Unknown'}`);
        console.log(`    Locations: ${locations.length > 0 ? locations.join(', ') : 'Unknown'}`);
        
        // Show sample-by-sample colo if multiple colos
        if (colos.length > 1) {
            console.log(`    Colo Progression:`);
            result.samples.slice(0, 10).forEach((sample, i) => { // Show first 10 samples
                console.log(`      Sample ${i + 1}: ${sample.cgiTrace.colo || 'Unknown'} (${sample.rtt.toFixed(1)}ms)`);
            });
            if (result.samples.length > 10) {
                console.log(`      ... and ${result.samples.length - 10} more samples`);
            }
        }
    });
}