const amqp = require('amqplib');

class Client {
    constructor(connection){ //,routing,rpc=true
        this.connection = connection;
        // this.routing = routing;
        // this.rpc = rpc
        this.start_server = this.start_server.bind(this);
        this.initChannels = this.initChannels.bind(this);   
        this.consumer = this.consumer.bind(this);
        this.clients_callback = this.clients_callback.bind(this);
    }

    // Запускаем сервис
    async run(options) {
        if (options.body && options.req && options.queue_service && options.next && options.route && options.exchange && options.queues){
            this.options = options;
            amqp.connect(this.connection).then(async (conn)=>{
               await this.start_server(conn)
            });
        } else {
            throw "Not options";
        }
    }

    // Стартуем сервер клиента
    async start_server(connect) {
        this.connect = connect;
        this.connect.createChannel().then(async (channel)=>{
            await this.initChannels(channel)
        })
    }

    // Инициализация для создания канала
    async initChannels(channel) {
        this.channel = channel;
        if (Array.isArray(this.options.queues)) {
            for (let que of this.options.queues) {
                await this.createChannels(que);
            }
        } else {
            await this.createChannels(this.options.queues);
        }
    }

    // Создание канала
    async createChannels(queus) {
        let ok =  this.channel.assertExchange(this.options.exchange, 'direct', {
            durable: true
        });

        ok = ok.then(async ()=>{
            return await this.channel.assertQueue(this.options.queues, {});
        }).then(async (qok) => {
            return await this.clients_callback(qok);

        });

        // await this.channel.assertQueue(this.options.queues, {}, this.clients_callback);
        
    }
    // Выполняем отправку запроса в сервис 
    async clients_callback(q) {
        this.channel.bindQueue(this.options.queue_service, this.options.exchange, this.options.route);
        // Дожидаемся ответа от сервера
        await this.channel.consume(this.options.queues,this.consumer, {
            noAck: true
        });
        
        // Индификатор отправителя
        this.correlationId = await this.generateUuid();
        await this.channel.publish(this.options.exchange,this.options.route,
            Buffer.from(JSON.stringify(this.options.body)),
            { 
                correlationId: this.correlationId, 
                replyTo: q.queue,
                exchange: this.options.exchange
            }
        );
    }
    
    // Отдаем ответ Gateway
    async consumer(msg) {
        if (msg.properties.correlationId == this.correlationId) {
            console.log(msg)
            this.options.req.data = msg.content.toString();
            this.options.next();
            // setTimeout(() => { 
            //     this.connect.close(); 
            // }, 500);
        }
    }

    async generateUuid() {
        return Math.random().toString() +
            Math.random().toString() +
            Math.random().toString();
    }
}

module.exports = Client;