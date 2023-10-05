const express = require('express')
const app = express()
const port = 3000
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');
const { decode } = require('metar-decoder');
const { StatsD } = require('hot-shots');
const redis = require('redis');
const { setIntervalAsync, clearIntervalAsync } = require('set-interval-async');
// usar docker run -p 6379:6379 -it redis/redis-stack-server:latest para empezar el redis 
const parser = new XMLParser();

const statsd = new StatsD({
  host: 'graphite',
  port: 8125,
  prefix: 'artillery.' 
});


const client = redis.createClient({'url': 'redis://redis:6379'});

// const client = redis.createClient({
//   host: '127.0.0.1',
//   port: 6379
// })



app.get('/metar', async (req, res) => {
  station = req.query.station;
  clientMetar = await client.get(station)


  if(clientMetar){
    res.send(clientMetar);
  }else{
    const start = Date.now();
    axios.get(`https://www.aviationweather.gov/adds/dataserver_current/httpparam?dataSource=metars&requestType=retrieve&format=xml&stationString=${station}&hoursBeforeNow=1`)
  .then(response => {
    const end = Date.now();
    const duration = end - start;
    statsd.timing('metar_response_time', duration);
    const parsed = parser.parse(response.data);

    if (response.status == 200){
      if (parsed.response.data == ''){
        res.status(404).send("Please verify your OACI code!");
      }else {
          //console.log(parsed.response.data);
          try {
            client.set(station, parsed.response.data.METAR[0].raw_text);
            client.expire(station, 600);
            res.status(200).send(parsed.response.data.METAR[0].raw_text);
          } catch (error) {
            client.set(station, parsed.response.data.METAR.raw_text);
            client.expire(station, 600);
            res.status(200).send(parsed.response.data.METAR.raw_text);
          }
        } 
    }else{
      var status = response.status == 496 ? 500 : response.status;
      res.status(status).send();
    }
  })
}})

app.get('/quote', async (req,res)=>{
    client_quote = await client.get('quote');
    quote = JSON.parse(client_quote); 
    res.status(200).send(quote);
    await activePopulationQuote();
})

app.get('/ping', (req, res) => {
    res.status(200).send("pong");
});

app.get('/spaceflight_news', async (req, res) => {
    let titles = [];
    clientTitles = await client.get('titles');   
    titles = JSON.parse(clientTitles);  
    res.status(200).send(titles);
})

async function activePopulationSpaceFlight(){
  // Busco los datos para spaceflight apenas se abre la app
  let titles = [];
  const start = Date.now();
  const response = await axios.get(`http://api.spaceflightnewsapi.net/v3/articles?_limit=5`)
  const end = Date.now();
  const duration = end - start;
  statsd.timing('spaceflight_response_time', duration);
  response.data.forEach(element => {
    if(element.hasOwnProperty('title')){
        titles.push(element.title);
    }
  })
  clnt.set('titles', JSON.stringify(titles));
}

async function activePopulationQuote(){
  const start = Date.now();
  await axios.get(`https://api.quotable.io/quotes/random`)
    .then(function (quote_response) {
      if (quote_response.status == 200) {
        const end = Date.now();
        const duration = end - start;
        statsd.timing('quote_response_time', duration);
        let quote = {"Quote": quote_response.data[0]["content"], "Author": quote_response.data[0]["author"]};
        clnt.set('quote', JSON.stringify(quote));
      }
    });
}

app.listen(3000, async () => {
  clnt = await client.connect(); 
  console.log("Escuchando en el puerto", 3000);
  activePopulationSpaceFlight();
  activePopulationQuote();
  setIntervalAsync(async ()=> await activePopulationSpaceFlight(), 60000);
 })
