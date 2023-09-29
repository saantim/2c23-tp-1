const express = require('express')
const app = express()
const port = 3000

app.get('/', (req, res) => {
    res.status(200).send('root');
});

app.get('/ping', (req, res) => {
    res.send("pong");
});


app.listen(port, () => console.log("Listening on ", port));