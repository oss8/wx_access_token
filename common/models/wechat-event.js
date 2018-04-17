'use strict';

module.exports = function(Wechatevent) {
    var app = require('../../server/server');
    app.DisableSystemMethod(Wechatevent);
    var sha1 = require('sha1');

    Wechatevent.ValidateWechatEvent = function (req, res, cb) {

        var token = 'zhiliankeji9999';
        var q = req.query;

        console.log(q);
        var signature = q.signature; //微信加密签名  
        var nonce = q.nonce; //随机数  
        var timestamp = q.timestamp; //时间戳  
        var echostr = q.echostr; //随机字符串  

        console.log('signature: ' + signature);
        console.log('echostr: ' + echostr);
        console.log('timestamp: ' + timestamp);
        console.log('nonce: ' + nonce);


        var str = [timestamp + '', nonce + '', token].sort().join('');
        console.log('加密前Str: ' + str);
        console.log('加密后Str: ' + sha1(str));

        if (sha1(str) == signature) {

            res.writeHeader(200, { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' })
            res.write(new Buffer(echostr).toString("UTF-8"));
            res.end();
            console.log('Send OK');

        } else {
            res.writeHeader(200, { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' })
            res.write(new Buffer(echostr).toString("UTF-8"));
            res.end();
            console.log('Send OK');
        }
    };

    Wechatevent.remoteMethod(
        'ValidateWechatEvent',
        {
            http: { verb: 'get' },
            description: '微信服务器验证',
            accepts: [{
                arg: 'req', type: 'object',
                http: function (ctx) {
                    return ctx.req;
                },
                description: '{"token":""}'
            },
            {
                arg: 'res', type: 'object',
                http: function (ctx) {
                    return ctx.res;
                },
                description: '{"token":""}'
            }
            ],
            returns: { arg: 'echostr', type: 'number', root: true }

        }
    );    
};
