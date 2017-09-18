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

    var request = require('request');
    var sha1 = require('sha1');

    router.use(function (req, res, next) {

        if (req.path == '/token') {
            getToken(req, res, next);
        } else if (req.path == '/ticket') {
            getTicket(req, res, next)
        } else {
            next();
        }

    })

    function getTicket(req, res, next) {
        var appId = req.query.appId;
        var url = req.query.url;

        if (_.isUndefined(appId)) {
            appId = 'wx397644d24ec87fd1';
        }

        if (_.isUndefined(url)) {
            res.writeHead(403, { "errcode": 100002, "errmsg": "url is Empty" });
            res.end();
            return;
        }

        var config = _.find(configs, function (item) {
            return item.wechat.appID == appId;
        })

        if (_.isUndefined(config)) {
            res.writeHead(403, { "errcode": 100001, "errmsg": "AppID is not find" });
            res.end();
            return;
        }

        self_getToken(config.wechat.token, appId).then(function(data){
            _getTicket(res, appId, data.access_token, url)
        },function(err){
            res.writeHead(500, err);
            res.end();            
        });
        
        // utils.get(config.wechat.token).then(function (data) {

        //     if (data) { //获取到值--往下传递  
        //         console.log('getTicket redis获取到值');
        //         _getTicket(res, appId, data, url)
        //     }
        //     else {  //没获取到值--从微信服务器端获取,并往下传递  
        //         wechatApi.updateAccessToken(appId).then(function (accessData) {

        //             console.log('getTicket redis中无值');
        //             utils.set(config.wechat.token, `${accessData.access_token}`, 7180).then(function (result) {
        //                 if (result == 'OK') {
        //                     _getTicket(res, appId, accessData.access_token, url)
        //                 }
        //                 else {
        //                     res.writeHead(500, { "errcode": 100003, "errmsg": "redis error" });
        //                     res.end();
        //                 }
        //             })
        //         })
        //     }
        // });
    }
 


    function getToken(req, res, next) {
        //根据token从redis中获取access_token  
        var appId = req.query.appId;
        if (_.isUndefined(appId)) {
            appId = 'wx397644d24ec87fd1';
        }

        var config = _.find(configs, function (item) {
            return item.wechat.appID == appId;
        })

        if (_.isUndefined(config)) {
            res.writeHead(403, { "errcode": 100001, "errmsg": "AppID is not find" });
            res.end();
            return;
        }
        self_getToken(config.wechat.token, appId).then(function(data){
            res.send(data);
        },function(err){
            res.writeHead(500, err);
            res.end();            
        });

        // utils.get(config.wechat.token).then(function (data) {

        //     if (data) { //获取到值--往下传递  
        //         console.log('redis获取到值');
        //         var p = { "access_token": data };
        //         res.send(p);
        //     }
        //     else {        //没获取到值--从微信服务器端获取,并往下传递  
        //         console.log('redis中无值');
        //         wechatApi.updateAccessToken(appId).then(function (data) {
        //             utils.set(config.wechat.token, `${data.access_token}`, 7180).then(function (result) {
        //                 if (result == 'OK') {
        //                     res.send(data);
        //                 }
        //                 else {
        //                     res.writeHead(500, { "errcode": 100003, "errmsg": "redis error" });
        //                     res.end();
        //                 }
        //             })
        //         })
        //     }
        // })
    }
};
