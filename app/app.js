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
const redis = require('redis');
const { setIntervalAsync, clearIntervalAsync } = require('set-interval-async');
// usar docker run -p 6379:6379 -it redis/redis-stack-server:latest para empezar el redis 


const client = redis.createClient({
  host: '127.0.0.1',
  port: 6379
})



app.get('/metar', async (req, res) => {
  station = req.query.station;
  const start = Date.now();
  clientMetar = await client.get(station)

  if(clientMetar){
    res.send(JSON.parse(clientMetar));
  }else{
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
      client.set(station, JSON.stringify(decoded));
      client.expire(station, 3600);
      res.status(200).send(decoded);
    }

  })
  .catch(err => {
    res.status(500).send(`Error: ${err}`);
  });
  }

  

})

app.get('/quote', async (req,res)=>{
    const start = Date.now();
    client_quote = await client.get('quote');
    quote = JSON.parse(client_quote); 
    activePopulationQuote();
    
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
  
    clientTitles = await client.get('titles');

    if (clientTitles){
      titles = JSON.parse(clientTitles);  
    }else{
      response.data.forEach(element => {
        if(element.hasOwnProperty('title')){
            titles.push(element.title);
        }
      })
      clnt.set('titles', JSON.stringify(titles), (err, reply)=> {
        if (err) console.log(err);

        console.log(reply);
      
      
      });
      clnt.expire('titles', 300);
    }


    res.status(200).send(titles);
})

async function activePopulationSpaceFlight(){
  // Busco los datos para spaceflight apenas se abre la app
  let titles = [];
  const response = await axios.get(`http://api.spaceflightnewsapi.net/v3/articles?_limit=5`)
  response.data.forEach(element => {
    if(element.hasOwnProperty('title')){
        titles.push(element.title);
    }
  })
  clnt.set('titles', JSON.stringify(titles));
 

}

async function activePopulationQuote(){
  const quote_response = await axios.get(`https://api.quotable.io/quotes/random`);
  let quote = {"Quote": quote_response.data[0]["content"], "Author": quote_response.data[0]["author"]};
  clnt.set('quote', JSON.stringify(quote));
}


app.listen(3000, async () => {
  clnt = await client.connect(); 
  console.log("Escuchando en el puerto", 3000);
  activePopulationSpaceFlight();
  activePopulationQuote();
  setIntervalAsync(async ()=> await activePopulationSpaceFlight(), 60000);
  setIntervalAsync(async ()=> await activePopulationQuote(), 60000); })
