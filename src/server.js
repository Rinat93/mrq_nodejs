const amqp = require('amqplib/callback_api');
class Server {
    constructor(connection){ //,routing,rpc=true
        this.connection = connection;
        // this.routing = routing;
        // this.rpc = rpc
        this.start_server = this.start_server.bind(this);
        this.initChannels = this.initChannels.bind(this);   
        this.consumer = this.consumer.bind(this);
        this.createExchangeRoute = this.createExchangeRoute.bind(this);
    }

    // Запускаем сервис
    run(options) {
        if (options.route && options.exchange && options.queues && options.reply){
            this.options = options;
            amqp.connect(this.connection,this.start_server);
        } else {
            throw "Not options";
        }
    }

    // Стартуем сервер
    start_server(err,connect) {
        if (err) {
            throw err;
        }
        connect.createChannel(this.initChannels);
    }

    // Создание канала
    initChannels(err, channel) {
        this.channel = channel;
        if (err) {
            throw err;
        }
        if (Array.isArray(this.options.queues)) {
            for (let que of this.options.queues) {
                this.createChannels(que);
            }
        } else {
            this.createChannels(this.options.queues);
        }
    }

    // Создание канала
    createChannels(queues) {
        this.channel.assertExchange(this.options.exchange, 'direct', {
            durable: true
        });
        this.channel.assertQueue(queues, {},this.createExchangeRoute);
        console.log(' [x] Awaiting RPC requests');
    }

    // Связываем очередь и роутер
    createExchangeRoute(err, q) {
        this.channel.bindQueue(q.queue, this.options.exchange, this.options.route);
        this.channel.consume(q.queue,this.consumer);
    }

    // Отдаем ответ Gateway
    consumer(msg) {
        let content = msg.content.toString();
        let res = this.options.reply(content);
        if (typeof res === 'object') {
            res = JSON.stringify(res);
        } else {
            res = res.toString();
        }
        // возвращаем ответ клиенту/сервису
        this.channel.publish(msg.properties.replyTo.queue,msg.properties.exchange,
            Buffer.from(res), {
                correlationId: msg.properties.correlationId
            }
        );

        this.channel.ack(msg);
    }
}

module.exports =  Server;