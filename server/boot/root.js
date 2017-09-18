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

    var request = require('request');
    var sha1 = require('sha1');

    router.use(function (req, res, next) {
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

        if (req.path == '/token') {

            getToken(req, res, next, config);
        } else if (req.path == '/ticket') {

            getTicket(req, res, next, config)
        } else {
            next();
        }

    })

    function getTicket(req, res, next, config) {
        var appId = req.query.appId;
        var url = req.query.url;
        if (_.isUndefined(url)) {
            res.writeHead(403, { "errcode": 100002, "errmsg": "url is Empty" });
            res.end();
            return;
        }  

        common.self_getToken(config.wechat.token, appId).then(function(data){
            common.self_getTicket(res, appId, data.access_token, url)
        },function(err){
            res.writeHead(500, err);
            res.end();            
        });
    }


    function getToken(req, res, next, config) {
        //根据token从redis中获取access_token  
        var appId = req.query.appId;

        common.self_getToken(config.wechat.token, appId).then(function(data){
            res.send(data);
        },function(err){
            res.writeHead(500, err);
            res.end();            
        });

    }
};
