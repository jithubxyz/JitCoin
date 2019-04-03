import { get } from 'got';

export interface Tracker {
	name: string;
	id: string;
	address: string;
}

interface Timings {
    response: number | null;
    start: number;
}

async function getTrackers(rootTrackerUrl: string) {
    const response = await get(`${rootTrackerUrl}/trackers`, { json: true });
    const { trackers } = response.body;
    return trackers as Tracker[];
}

async function checkLatencies(trackers: Tracker[]) {
    const stat: Array<{ tracker: Tracker, latency: number }> = [];

    for (const t of trackers) {
        const response = await get(t.address);
        const { start: startTime, response: responseTime } = ((response as any).timings as Timings);
        
        if (responseTime !== null) {
            stat.push({ tracker: t, latency: responseTime - startTime });
        }
    }

    return stat;
}

async function connect(rootTrackerUrl: string) {
    const trackers = await getTrackers(rootTrackerUrl);

}