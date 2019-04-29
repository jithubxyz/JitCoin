import { Tracker, Client } from './tracker';
import fetch from 'node-fetch';

export async function registerAsClient(tracker: Tracker) {
    const { id } = await fetch(`${tracker.address}/clients`, { method: 'POST', body: JSON.stringify({}) }).then(r => r.json());
    console.log(`Registered to ${tracker.name} as client ${id}`);
    return {
        id
    } as Client;
}

export function sendHeartbeat(tracker: Tracker, client: Client) {
    return fetch(`${tracker.address}/heartbeat`, { method: 'POST', body: JSON.stringify({ id: client.id }) }).then(r => r.json());
}