import blessed from 'blessed';
import contrib from 'blessed-contrib';
import type { EchoSample, EchoerResults } from './types';
import type { WhereDoApiV3 } from './where-do';
import type { CgiTrace } from 'shared';
import { formatRegion } from './regions';

let screen: blessed.Widgets.Screen | null = null;
let progressBar: contrib.widget.Gauge | null = null;
let statusText: blessed.Widgets.TextElement | null = null;

/**
 * Initialize the blessed screen and progress indicator
 */
export function initializeProgressDisplay(totalClients: number, samplesPerClient: number): void {
    screen = blessed.screen({
        smartCSR: true,
        title: 'Echoer Performance Testing'
    });

    // Create progress bar
    progressBar = contrib.gauge({
        label: 'Collection Progress',
        stroke: 'green',
        fill: 'white',
        border: { type: 'line' },
        style: {
            border: { fg: 'cyan' }
        }
    } as any);

    // Create status text
    statusText = blessed.text({
        top: 'center',
        left: 'center',
        width: '50%',
        height: 5,
        align: 'center',
        valign: 'middle',
        content: `Collecting samples from ${totalClients} client(s)...\n0 / ${totalClients * samplesPerClient} samples collected`,
        style: {
            fg: 'white'
        }
    });

    screen.append(statusText);
    screen.append(progressBar);
    screen.render();

    // Exit on Escape, q, or Control-C
    screen.key(['escape', 'q', 'C-c'], () => {
        process.exit(0);
    });
}

/**
 * Update progress during sample collection
 */
export function updateProgress(current: number, total: number, clientId: number): void {
    if (!progressBar || !statusText || !screen) return;

    const percentage = Math.round((current / total) * 100);
    progressBar.setPercent(percentage);
    statusText.setContent(
        `Collecting samples...\nClient #${clientId}: ${current} / ${total} samples\n${percentage}%`
    );
    screen.render();
}

/**
 * Display final results in a comprehensive dashboard
 */
export function displayResults(
    results: EchoerResults[],
    whereDoData: WhereDoApiV3 | null,
    clientCgiTrace: CgiTrace
): void {
    // Clear progress display
    if (screen) {
        screen.destroy();
    }

    // Create new screen for results
    screen = blessed.screen({
        smartCSR: true,
        title: 'Echoer Performance Results'
    });

    const grid = new contrib.grid({ rows: 12, cols: 12, screen: screen });

    // === ROW 1-2: Title and Summary ===
    const titleBox = grid.set(0, 0, 1, 12, blessed.box, {
        content: `{center}{bold}ECHOER PERFORMANCE RESULTS{/bold}{/center}`,
        tags: true,
        style: {
            fg: 'cyan',
            border: { fg: 'cyan' }
        },
        border: { type: 'line' }
    });

    // === ROW 2-5: Line Charts for Metrics ===
    const rttLine = grid.set(1, 0, 4, 6, contrib.line, {
        style: { line: 'yellow', text: 'green', baseline: 'black' },
        label: 'RTT Over Time (ms)',
        showLegend: true,
        legend: { width: 20 }
    });

    const procLine = grid.set(1, 6, 4, 6, contrib.line, {
        style: { line: 'cyan', text: 'green', baseline: 'black' },
        label: 'Processing Time (ms)',
        showLegend: true,
        legend: { width: 20 }
    });

    // === ROW 5-8: Bar Chart + Location Info ===
    const barChart = grid.set(5, 0, 3, 6, contrib.bar, {
        label: 'Per-Client RTT Comparison (ms)',
        barWidth: 8,
        barSpacing: 2,
        maxHeight: 200,
        style: { fg: 'green' }
    });

    const locationBox = grid.set(5, 6, 3, 6, blessed.box, {
        label: 'Location Information',
        content: '',
        tags: true,
        scrollable: true,
        alwaysScroll: true,
        scrollbar: {
            ch: ' ',
            track: { bg: 'cyan' },
            style: { inverse: true }
        },
        style: {
            fg: 'white',
            border: { fg: 'cyan' }
        },
        border: { type: 'line' }
    });

    // === ROW 8-12: Statistics Table ===
    const statsTable = grid.set(8, 0, 4, 12, contrib.table, {
        keys: true,
        fg: 'white',
        selectedFg: 'white',
        selectedBg: 'blue',
        interactive: false,
        label: 'Aggregated Statistics',
        width: '100%',
        height: '100%',
        border: { type: 'line', fg: 'cyan' },
        columnSpacing: 3,
        columnWidth: [16, 12, 12, 12, 12]
    });

    // Populate RTT Line Chart
    const rttChartData = results.map((result, idx) => ({
        title: `Client ${idx + 1}`,
        x: result.samples.map((_, i) => String(i + 1)),
        y: result.samples.map(s => s.rtt),
        style: { line: ['yellow', 'cyan', 'green', 'magenta', 'red'][idx % 5] }
    }));
    rttLine.setData(rttChartData);

    // Populate Processing Time Line Chart
    const procChartData = results.map((result, idx) => ({
        title: `Client ${idx + 1}`,
        x: result.samples.map((_, i) => String(i + 1)),
        y: result.samples.map(s => s.proc),
        style: { line: ['cyan', 'yellow', 'green', 'magenta', 'red'][idx % 5] }
    }));
    procLine.setData(procChartData);

    // Populate Bar Chart
    const barData = {
        titles: results.map((_, idx) => `Client ${idx + 1}`),
        data: results.map(r => Math.round(r.averages.rtt * 100) / 100)
    };
    barChart.setData(barData);

    // Populate Location Box
    const allSamples = results.flatMap(r => r.samples);
    const observedColos = [...new Set(allSamples.map(s => s.cgiTrace.colo).filter(Boolean))];
    const clientColo = clientCgiTrace.colo || 'Unknown';
    const clientLoc = clientCgiTrace.loc || 'Unknown';

    let locationContent = `{bold}Client Location:{/bold}\n`;
    locationContent += `  Colo: ${clientColo}\n`;
    locationContent += `  Region: ${clientLoc}\n\n`;
    locationContent += `{bold}Server Colos Observed:{/bold}\n`;
    
    if (observedColos.length === 0) {
        locationContent += `  No colo information available\n`;
    } else {
        locationContent += `  ${observedColos.join(', ')}\n\n`;
        
        if (whereDoData) {
            locationContent += `{bold}Regional Distribution:{/bold}\n`;
        const regionCounts: { [key: string]: number } = {};
        observedColos.forEach(colo => {
            if (colo && whereDoData.colos[colo]) {
                const region = whereDoData.colos[colo].nearestRegion;
                regionCounts[region] = (regionCounts[region] || 0) + 1;
            }
        });
        
            Object.entries(regionCounts).forEach(([region, count]) => {
                locationContent += `  ${formatRegion(region)}: ${count} colo(s)\n`;
            });
            
            locationContent += `\n{bold}Coverage:{/bold} ${(whereDoData.coverage * 100).toFixed(1)}%\n`;
        }
    }
    
    locationContent += `\n{dim}Data: where.durableobjects.live{/dim}`;
    locationBox.setContent(locationContent);

    // Populate Statistics Table
    const allRtts = allSamples.map(s => s.rtt);
    const allProcs = allSamples.map(s => s.proc);
    const allUplinks = allSamples.map(s => s.uplink);
    const allDownlinks = allSamples.map(s => s.downlink);
    const allOffsets = allSamples.map(s => s.offset);

    const calcStats = (values: number[]) => {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);
        return { mean, min, max, stdDev };
    };

    const rttStats = calcStats(allRtts);
    const procStats = calcStats(allProcs);
    const uplinkStats = calcStats(allUplinks);
    const downlinkStats = calcStats(allDownlinks);
    const offsetStats = calcStats(allOffsets);

    statsTable.setData({
        headers: ['Metric', 'Mean (ms)', 'Min (ms)', 'Max (ms)', 'StdDev (ms)'],
        data: [
            ['RTT', rttStats.mean.toFixed(2), rttStats.min.toFixed(2), rttStats.max.toFixed(2), rttStats.stdDev.toFixed(2)],
            ['Processing', procStats.mean.toFixed(2), procStats.min.toFixed(2), procStats.max.toFixed(2), procStats.stdDev.toFixed(2)],
            ['Uplink', uplinkStats.mean.toFixed(2), uplinkStats.min.toFixed(2), uplinkStats.max.toFixed(2), uplinkStats.stdDev.toFixed(2)],
            ['Downlink', downlinkStats.mean.toFixed(2), downlinkStats.min.toFixed(2), downlinkStats.max.toFixed(2), downlinkStats.stdDev.toFixed(2)],
            ['Clock Offset', offsetStats.mean.toFixed(2), offsetStats.min.toFixed(2), offsetStats.max.toFixed(2), offsetStats.stdDev.toFixed(2)]
        ]
    });

    // Exit on Escape, q, or Control-C
    screen.key(['escape', 'q', 'C-c'], () => {
        if (screen) screen.destroy();
        process.exit(0);
    });

    screen.render();
}

/**
 * Clean up and destroy the screen
 */
export function cleanup(): void {
    if (screen) {
        screen.destroy();
        screen = null;
    }
}
