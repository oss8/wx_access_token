'use strict';

module.exports = function (server) {
    // Install a `/` route that returns server status
    var router = server.loopback.Router();
    router.get('/', server.loopback.status());
    server.use(router);
    var _ = require('underscore');

    var utils = require('../../common/models/utils')
    var configs = require('../../config/config');
    var wechatApi = require('../../common/models/wechatapi')
    var common = require('../../common/models/common')

    router.use(function (req, res, next) {
        var appId = req.query.appId;
        if (_.isUndefined(appId)) {
            appId = 'wx397644d24ec87fd1';
        }

        var config = _.find(configs, function (item) {
            return item.wechat.appID == appId;
        })

        if (_.isUndefined(config)) {
            console.log("403, AppID is not find");
            res.writeHead(403, { "errcode": 100001, "errmsg": "AppID is not find" });
            res.end("AppID is not find");
            return;
        }

        if (req.path == '/token') {

            getToken(req, res, next, config);
        } else if (req.path == '/ticket') {

            getTicket(req, res, next, config)
        } else if (req.path == '/qrcode') {

            getQRCode(req, res, next, config)
        } else if (req.path == '/nickname') {

            getNickName(req, res, next, config)
        } else if (req.path == '/sendnotify') {

            sendNotify(req, res, next, config)
        } else if (req.path == '/getToken') {

            getToken(req, res, next)
        } else if (req.path == '/GetOpenID') {

            getOpenId(req, res, next)
        } else {
            next();
        }

    })

    function getToken(req, res, next) {
        //根据token从redis中获取access_token  

        Common.GetTokenFromOpenID(req.body).then(function(data){
            res.send(data);
        },function(err){
            res.writeHead(500, err);
            res.end(err.message);
        });
    }

    function getOpenId(req, res, next, config) {
        //根据token从redis中获取access_token  

        var token = req.query.token;
        if (_.isUndefined(token)) {
            console.log("403, token is Empty");
            res.writeHead(403, { "errcode": 100002, "errmsg": "token is Empty" });
            res.end("token is Empty");
            return;
        }
        Common.GetOpenIDFromToken(token).then(function(data){
            res.send(data);
        },function(err){
            res.writeHead(500, err);
            res.end(err.message);
        });
        
    }    


    function sendNotify(req, res, next, config) {
        //根据token从redis中获取access_token  
        var appId = req.query.appId;
        var openid = req.query.openid;
        var context = req.query.context;

        if (_.isUndefined(openid)) {
            console.log("403, openid is Empty");
            res.writeHead(403, { "errcode": 100002, "errmsg": "openid is Empty" });
            res.end("openid is Empty");
            return;
        }

        if (_.isUndefined(context)) {
            console.log("403, context is Empty");
            res.writeHead(403, { "errcode": 100002, "errmsg": "context is Empty" });
            res.end("context is Empty");
            return;
        }

        common.self_getToken(config.wechat.token, appId).then(function (data) {
            common.self_sendNotify(res, data.access_token, openid, context)
        }, function (err) {
            res.writeHead(500, err);
            res.end();
        });

    }

    function getNickName(req, res, next, config) {
        //根据token从redis中获取access_token  
        var appId = req.query.appId;
        var openid = req.query.openid;
        if (_.isUndefined(openid)) {
            console.log("403, openid is Empty");
            res.writeHead(403, { "errcode": 100002, "errmsg": "openid is Empty" });
            res.end("openid is Empty");
            return;
        }
        common.self_getToken(config.wechat.token, appId).then(function (data) {
            common.self_getNickName(res, data.access_token, openid)
        }, function (err) {
            res.writeHead(500, err);
            res.end();
        });

    }

    function getQRCode(req, res, next, config) {
        //根据token从redis中获取access_token  
        var appId = req.query.appId;
        var QRCode = req.query.QRCode;
        if (_.isUndefined(QRCode)) {
            console.log("403, QRCode is Empty");
            res.writeHead(403, { "errcode": 100002, "errmsg": "QRCode is Empty" });
            res.end("QRCode is Empty");
            return;
        }
        common.self_getToken(config.wechat.token, appId).then(function (data) {
            common.self_getQRCode(res, data.access_token, QRCode)
        }, function (err) {
            res.writeHead(500, err);
            res.end();
        });

    }


    function getTicket(req, res, next, config) {
        var appId = req.query.appId;
        var url = req.query.url;
        if (_.isUndefined(url)) {
            console.log("403, url is Empty");
            res.writeHead(403, { "errcode": 100002, "errmsg": "url is Empty" });
            res.end("url is Empty");
            return;
        }

        common.self_getToken(config.wechat.token, appId).then(function (data) {
            common.self_getTicket(res, data.access_token, url)
        }, function (err) {
            res.writeHead(500, err);
            res.end();
        });
    }


    function getToken(req, res, next, config) {
        //根据token从redis中获取access_token  
        var appId = req.query.appId;

        common.self_getToken(config.wechat.token, appId).then(function (data) {
            res.send(data);
        }, function (err) {
            res.writeHead(500, err);
            res.end();
        });

    }
};
