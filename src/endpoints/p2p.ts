import * as express from 'express';
import { getLastBlock, getJSONHeaderFromBlock } from '../misc/helper';
import { StatusResponse } from '../misc/interfaces';
import { RESPONSE_CODES } from '../misc/constants';

const app = express();

app.get('/status', async (req, res) => {
    const hash = await getLastBlockHash();
    if (hash !== null) {
        return res.json({ lastBlockHash: hash, code: RESPONSE_CODES.PASS } as StatusResponse);
    }

    return res.status(404).json({ message: 'No block found 🤠', code: RESPONSE_CODES.NO_BLOCK_ON_DISK });
});

export const start = (port: number) => {
    app.listen(port);
    console.log(`Listening on ${port} for external requests`);
};

async function getLastBlockHash() {
    const block = await getLastBlock();
    if (block !== null) {
        const header = getJSONHeaderFromBlock(block);

        return header.hash;
    }

    return null;
}