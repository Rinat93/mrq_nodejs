// const amqp = require('amqplib');
const {amqp, BaseService} = require('./base');
class Server extends BaseService {
    constructor(connection){ //,routing,rpc=true
        super(connection);
        // this.routing = routing;
        // this.rpc = rpc
        this.start_server = this.start_server.bind(this);
        // this.initChannels = this.initChannels.bind(this);   
        this.consumer = this.consumer.bind(this);
        // this.createExchangeRoute = this.createExchangeRoute.bind(this);
    }

    // Запускаем сервис
    async run(options) {
        if (options.route && options.exchange && options.queues && options.reply){
            this.options = options;
            await amqp.connect(this.connection).then(async (err,conn)=>{
                await this.start_server(err,conn)
            });
        } else {
            throw "Not options";
        }
    }

    // Стартуем сервер
    async start_server(err,connect) {
        if (err) {
            throw err;
        }
        connect.createChannel().then(async (err,conn)=>{
            // await this.initChannels(err,conn);
            this.create_channels(conn,this.options).then(()=>{
                this.consumer()
            })
        });
    }

    // Создание канала
    // async initChannels(err, channel) {
    //     this.channel = channel;

    //     if (err) {
    //         throw err;
    //     }
    //     if (Array.isArray(this.options.queues)) {
    //         for (let que of this.options.queues) {
    //             await this.createChannels(que);
    //         }
    //     } else {
    //         await this.createChannels(this.options.queues);
    //     }
    // }

    // // Создание канала
    // async createChannels(queues) {
    //     let ok =  await this.channel.assertExchange(this.options.exchange, 'direct', {
    //         durable: true
    //     })
    //     ok.then((err,ok)=>{
    //         console.log(ok)
    //         this.channel.assertQueue(queues, {},this.createExchangeRoute);
    //     })
    //     console.log(' [x] Awaiting RPC requests');
    // }

    // // Связываем очередь и роутер
    // async createExchangeRoute(err, q) {
    //     await this.channel.bindQueue(q.queue, this.options.exchange, this.options.route);
    //     await this.channel.consume(q.queue,this.consumer);
    // }

    // Отдаем ответ Gateway
    consumer(msg) {
        let content = msg.content.toString();
        let res = this.options.reply(content);
        if (typeof res === 'object') {
            res = JSON.stringify(res);
        } else {
            res = res.toString();
        }
        console.log(res)
        console.log("SERVER")
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