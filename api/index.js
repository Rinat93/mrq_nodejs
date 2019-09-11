const express = require('express');
const gateway = require('../src/server');
const client = require('../src/client');
const app = express();
const server_gateway = new gateway('amqp://localhost');
const clients = new client('amqp://localhost');
let index = 1;

server_gateway.run({
  route: 'test',
  exchange: 'test',
  queues: 'hello3',
  reply: (a)=>{
    // console.log(a)
    index += 1;
    return {'a':index+1} 
  }
});

async function midd(req,res,next){
    await clients.run({
      req: req,
      next: next,
      body: {a:2},
      queue_service: 'hello3',
      route: 'test',
      exchange: 'test',
      queues: 'hello2'
    });
    // req.data = clients.res;
    
}


app.use(midd);

app.get('/', function (req, res) {
  res.json(req.data);
});

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});
