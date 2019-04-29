import fetch from 'node-fetch';

export interface Tracker {
	name: string;
	id: string;
	address: string;
}

export interface Client {
    id: string;
    walletId: string;
    lastHeartbeat: number;
}

interface LatencyResult {
    tracker: Tracker;
    latency: number;
}

async function getTrackers(rootTrackerUrl: string) {
    const { trackers } = await fetch(`${rootTrackerUrl}/trackers`, { method: "GET" }).then(r => r.json());
    return trackers as Tracker[];
}

async function checkLatencies(trackers: Tracker[]) {
    const stat: Array<{ tracker: Tracker, latency: number }> = [];

    for (const t of trackers) {
        const startTime = Date.now();
        await fetch(t.address, { method: 'GET' });
        const responseTime = Date.now();
        
        if (responseTime !== null) {
            stat.push({ tracker: t, latency: responseTime - startTime });
        }
    }

    return stat;
}

async function getTrackerClients(tracker: Tracker): Promise<Client[]> {
    const { clients } = await fetch(`${tracker.address}/clients`, { method: 'GET' }).then(r => r.json());
    return clients;
}

export async function getClients(rootTrackerUrl: string) {
    const trackers = await fetchTrackers(rootTrackerUrl);
    const clients = (await Promise.all(trackers.map(t => getTrackerClients(t.tracker)))).flat();
    return clients;
}

export async function fetchTrackers(rootTrackerUrl: string) {
    const trackers = (await getTrackers(rootTrackerUrl)).map((t) => {
        t.address = `http://10.16.106.8:6000`; // for testing purposes
        return t;
    });
    const latencies = await checkLatencies(trackers);
    return latencies.sort(sortLatency);
}

function sortLatency(a: LatencyResult, b: LatencyResult) {
    if (a.latency > b.latency) {
        return 1;
    }
    if (a.latency === b.latency) {
        return 0;
    }
    return -1;
}