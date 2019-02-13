import * as express from 'express';
import { PORT } from './misc/constants';
const app = express();

app.post('/mine', express.json(), async (req, res) => {
    const amount = req.body.amount;
    res.send(req.body.test);

    //res.send('JIT!');
});

app.listen(PORT, () => {
    console.log(`server is up and running! We are listening on ${PORT}`);
});
