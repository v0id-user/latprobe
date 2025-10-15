import sparkly from 'sparkly';
import type { EchoSample, EchoerResults } from './types';

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