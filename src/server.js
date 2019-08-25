const amqp = require('amqplib/callback_api');
class Server {
    constructor(connection,queus){ //,routing,rpc=true
        this.connection = connection;
        this.queus = queus;
        // this.routing = routing;
        // this.rpc = rpc
        this.start_server = this.start_server.bind(this);
        this.initChannels = this.initChannels.bind(this);   
        this.consumer = this.consumer.bind(this);
    }

    // Запускаем сервис
    run(reply) {
        this.reply = reply;
        amqp.connect(this.connection,this.start_server);
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
        if (Array.isArray(this.queus)) {
            for (let que of this.queus) {
                this.createChannels(que);
            }
        } else {
            this.createChannels(this.queus);
        }
    }

    createChannels(queus,channel) {
        this.channel.assertQueue(queus, {
            durable: true
        });
        this.channel.prefetch(1);
        console.log(' [x] Awaiting RPC requests');
        this.channel.consume(queus,this.consumer);
    }

    // Отдаем ответ Gateway
    consumer(msg) {
        let content = msg.content.toString();
        let res = this.reply(content);
        if (typeof res === 'object') {
            res = JSON.stringify(res);
        } else {
            res = res.toString();
        }

        // возвращаем ответ клиенту/сервису
        this.channel.sendToQueue(msg.properties.replyTo,
            Buffer.from(res), {
                correlationId: msg.properties.correlationId
            }
        );

        this.channel.ack(msg);
    }
}

module.exports =  Server;