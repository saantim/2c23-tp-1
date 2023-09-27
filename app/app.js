const express = require('express')
const app = express()
const port = 3000
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');
const { decode } = require('metar-decoder');
const parser = new XMLParser();

app.get('/metar', (req, res) => {
  station = req.query.station;
  
  axios.get(`https://www.aviationweather.gov/adds/dataserver_current/httpparam?dataSource=metars&requestType=retrieve&format=xml&stationString=${station}&hoursBeforeNow=1`)
  .then(response => {
    const parsed = parser.parse(response.data);

    if (parsed.response.data == ''){
      res.send("Please verify your OACI code!");

    } else {
      const decoded = decode(parsed.response.data.METAR.raw_text);
      res.send(decoded);
    }

  })
  .catch(err => {
    res.send("Error, please try again", err);
  });

})

app.get('/quote', async (req,res)=>{
    const quote_response = await axios.get(`https://api.quotable.io/quotes/random`);
    let quote = {"Quote": quote_response.data[0]["content"], "Author": quote_response.data[0]["author"]};
    
    res.status(200).send(quote);
})

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
