const express = require('express');
const gateway = require('../src/server');
const client = require('../src/client');
const app = express();
const server_gateway = new gateway('amqp://localhost','hello');
const clients = new client('amqp://localhost','');
let index = 1;
server_gateway.run((a)=>{
    index += 1;
    return {'a':index}
});

async function midd(req,res,next){
    await clients.run({a:2},'hello',next,req);
    // req.data = clients.res;
    
}


app.use(midd);

app.get('/', function (req, res) {
    console.log(1)
  res.json(req.data);
});

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});
