'use strict';

module.exports = function(Wechatevent) {
    var app = require('../../server/server');
    app.DisableSystemMethod(Wechatevent);
    var sha1 = require('sha1');
    var _ = require('underscore');
    var configs = require('../../config/config');
    var needle = require('needle');
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
    
    Wechatevent.ValidateWechatEvent = function (req, res, cb) {

        console.log("ValidateWechatEvent Begin")
        console.log(req.body.xml);
        var config = _.find(configs, function(item) {
            return item.wechat.weixinID == req.body.xml.tousername[0];
        })
        
        console.log('---------------'+config.wechat.appID);
        console.log(req.query);
        var q = req.query;
        var openid = q.openid; //微信加密签名  

        res.write(new Buffer("").toString("UTF-8"));
        res.end();
        
        
        
        if (!_.isEmpty(req.body.xml.event)) {
            var _event = req.body.xml.event[0];
            console.log(_event);

        }

        var url = config.wechat.wxEventurl;
        needle.post(encodeURI(url), req.body, {
            json: true
        }, function(err, resp) {
            console.log(resp);
        });        

    };

    Wechatevent.remoteMethod(
        'ValidateWechatEvent',
        {
            http: { verb: 'post' },
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
