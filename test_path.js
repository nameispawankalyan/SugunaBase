const express = require('express');
const app = express();

app.use('/v1/payments/:projectId', (req, res, next) => {
    console.log('Original:', req.originalUrl);
    console.log('Matched:', req.url);
    res.send({ original: req.originalUrl, matched: req.url });
});

app.listen(8888, () => console.log('Test server on 8888'));
