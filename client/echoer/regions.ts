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