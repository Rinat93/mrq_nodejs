const amqp = require('amqplib/callback_api');
class Client {
    constructor(connection,queus){ //,routing,rpc=true
        this.connection = connection;
        this.queus = queus;
        // this.routing = routing;
        // this.rpc = rpc
        this.start_server = this.start_server.bind(this);
        this.initChannels = this.initChannels.bind(this);   
        this.consumer = this.consumer.bind(this);
        this.clients_callback = this.clients_callback.bind(this);
    }

    // Запускаем сервис
    async run(body,name,next,req) {
        this.body = body;
        this.name_service = name;
        this.req = req;
        this.next = next;
        await amqp.connect(this.connection,this.start_server);
    }

    // Стартуем сервер клиента
    async start_server(err,connect) {
        if (err) {
            throw err;
        }
        this.connect = connect;
        await this.connect.createChannel(this.initChannels);
    }

    // Инициализация для создания канала
    async initChannels(err, channel) {
        this.channel = channel;
        if (err) {
            throw err;
        }
        if (Array.isArray(this.queus)) {
            for (let que of this.queus) {
                await this.createChannels(que);
            }
        } else {
            await this.createChannels(this.queus);
        }
    }

    // Создание канала
    async createChannels(queus) {
        await this.channel.assertQueue(queus, {
            exclusive: true
        }, this.clients_callback);
        
    }

    // Выполняем отправку запроса в сервис 
    async clients_callback(error2, q) {
        if (error2) {
            throw error2;
        }
        // Дожидаемся ответа от сервера
        await this.channel.consume(this.queus,this.consumer, {
            noAck: true
        });
        
        // Индификатор отправителя
        this.correlationId = await this.generateUuid();
        await this.channel.sendToQueue(this.name_service,
            Buffer.from(JSON.stringify(this.body)),
            { 
                correlationId: this.correlationId, 
                replyTo: q.queue 
            }
        );
    }

    // Отдаем ответ Gateway
    async consumer(msg) {
        if (msg.properties.correlationId == this.correlationId) {
            this.req.data = msg.content.toString();
            this.next();
            setTimeout(() => { 
                this.connect.close(); 
            }, 500);
        }
    }

    async generateUuid() {
        return Math.random().toString() +
            Math.random().toString() +
            Math.random().toString();
    }
}

module.exports = Client;