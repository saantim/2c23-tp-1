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
