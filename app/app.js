const express = require('express')
const app = express()
const port = 3000
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');
const { decode } = require('metar-decoder');
const { StatsD } = require('hot-shots');
const parser = new XMLParser();

const statsd = new StatsD({
  host: 'graphite',
  port: 8125,
  prefix: 'artillery.' 
});

app.get('/metar', (req, res) => {
  station = req.query.station;
  const start = Date.now();
  axios.get(`https://www.aviationweather.gov/adds/dataserver_current/httpparam?dataSource=metars&requestType=retrieve&format=xml&stationString=${station}&hoursBeforeNow=1`)
  .then(response => {
    const end = Date.now();
    const duration = end - start;
    statsd.timing('metar_response_time', duration);

    const parsed = parser.parse(response.data);

    if (parsed.response.data == ''){
      res.status(404).send("Please verify your OACI code!");

    } else {
      const decoded = decode(parsed.response.data.METAR.raw_text);
      res.status(200).send(decoded);
    }

  })
  .catch(err => {
    res.status(500).send(`Error: ${err}`);
  });

})

app.get('/quote', async (req,res)=>{
    const start = Date.now();
    await axios.get(`https://api.quotable.io/quotes/random`)
    .then(function (quote_response) {
      const end = Date.now();
      const duration = end - start;
      statsd.timing('quote_response_time', duration);
      let quote = {"Quote": quote_response.data[0]["content"], "Author": quote_response.data[0]["author"]};
      res.status(200).send(quote);
    })
    .catch(function (error){
      res.status(500).send(`Error: ${error}`);
    });
    
})

app.get('/ping', (req, res) => {
    res.send("pong");
});

app.get('/spaceflight_news', async (req, res) => {
    const start = Date.now();
    const response = await axios.get(`http://api.spaceflightnewsapi.net/v3/articles?_limit=5`);
    const end = Date.now();
    const duration = end - start;
    statsd.timing('spaceflight_response_time', duration);
    
    let titles = [];

    response.data.forEach(element => {
        if(element.hasOwnProperty('title')){
            titles.push(element.title);
        }
    })

    res.status(200).send(titles);
})

app.listen(3000, () => console.log("Escuchando en el puerto", 3000))
