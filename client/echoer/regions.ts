// taken from https://github.com/helloimalastair/where-durableobjects-live/blob/main/packages/shared/src/index.ts
const regions = {
	wnam: "Western North America",
	enam: "Eastern North America",
	sam: "South America",
	weur: "Western Europe",
	eeur: "Eastern Europe",
	apac: "Asia-Pacific",
	oc: "Oceania",
	afr: "Africa",
	me: "Middle East"
} as const;

const jurisdictions = {
	fedramp: "FedRAMP",
	eu: "European Union"
} as const;

const statuses = [
	"operational",
	"outage",
	"maintenance",
	"unknown",
] as const;

/**
 * Format a region code with its full name
 * @param code - Region code (e.g., "weur")
 * @returns Formatted string like "weur (Western Europe)"
 */
export function formatRegion(code: string): string {
	const regionName = regions[code as keyof typeof regions];
	return regionName ? `${code} (${regionName})` : code;
}

export { regions, jurisdictions, statuses };

type Region = keyof typeof regions;
type Jurisdiction = keyof typeof jurisdictions;
type Status = typeof statuses[number];

export type { Region, Jurisdiction, Status };


// ============== #V0ID added region formatting functions ==============

/**
 * Fetches airport data from OpenFlights and extracts full name for a given IATA code
 * Equivalent to: curl -s https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat | awk -F',' '$5 == "\"MXP\"" { gsub(/"/,""); print $2 " — " $3 ", " $4 }'
 * @param iataCode - IATA airport code (e.g., "MXP")
 * @returns Formatted string like "Milan Malpensa Airport — Milan, Italy"
 */
export async function extractColoFullName(iataCode: string): Promise<string> {
    try {
        // Fetch airport data from OpenFlights
        const response = await fetch('https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat');
        const data = await response.text();
        
        // Split by lines and process each airport record
        const lines = data.split('\n');
        
        for (const line of lines) {
            if (!line.trim()) continue;
            
            // Split by comma and handle quoted fields
            const fields = parseCsvLine(line);
            
            // Check if the IATA code matches (field index 4, 0-based)
            // Format: ID, Name, City, Country, IATA, ICAO, Latitude, Longitude, Altitude, Timezone, DST, Tz, Type, Source
            if (fields.length > 4 && fields[4] === `"${iataCode}"`) {
                // Extract and clean the fields (remove quotes)
                const name = fields[1]?.replace(/"/g, '') || '';
                const city = fields[2]?.replace(/"/g, '') || '';
                const country = fields[3]?.replace(/"/g, '') || '';
                
                // Format: "Name — City, Country"
                return `${name} — ${city}, ${country}`;
            }
        }
        
        return iataCode; // Return original code if not found
    } catch (error) {
        console.error('Error fetching airport data:', error);
        return iataCode; // Return original code on error
    }
}

/**
 * Parse a CSV line handling quoted fields properly
 * @param line - CSV line to parse
 * @returns Array of field values
 */
function parseCsvLine(line: string): string[] {
    const fields: string[] = [];
    let currentField = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
            currentField += char; // Keep the quotes
        } else if (char === ',' && !inQuotes) {
            fields.push(currentField);
            currentField = '';
        } else {
            currentField += char;
        }
    }
    
    // Add the last field
    fields.push(currentField);
    
    return fields;
}