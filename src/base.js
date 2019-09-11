const amqp = require('amqplib');

class BaseService {
    constructor(connections){
        this.connection = connections;
    }
    
    // Создание канала
    async create_channels(conn,options,handle) {
        let ch =  conn.createChannel();
        ch.then(function(ch){
            return Promise.all([
                ch.assertQueu(options.queues),
                ch.assertExchange(options.exchange, 'direct', {
                    durable: true
                }),
                ch.bindQueue(options.queues, options.exchange, options.route),
                ch.consume(options.queues, handle)
            ])
        });
        return ch;
    }
}


module.exports.amqp =  amqp;
module.exports.BaseService = BaseService;