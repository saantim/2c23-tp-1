const express = require('express')
const app = express()
const axios = require('axios');

app.get('/ping', (req, res) => {
    res.send("pong");
});

app.get('/spaceflight_news', async (req, res) => {
    const response = await axios.get(`http://api.spaceflightnewsapi.net/v3/articles?_limit=5`)
    
    let titles = [];

    response.data.forEach(element => {
        if(element.hasOwnProperty('title')){
            titles.push(element.title);
        }
    })

    res.status(200).send(titles);
})

app.listen(3000, () => console.log("Escuchando en el puerto", 3000))
