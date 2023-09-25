const express = require('express')
const app = express()
const port = 3000

async function getQuote(){
    let res = await fetch(`https://api.quotable.io/quotes/random`).then(response => response.json());
    res = {"Quote": res[0]["content"], "Author": res[0]["author"]};
    return res;
  }



app.get('/quote', (req,res)=>{
    getQuote().then(response => res.send(response))
})