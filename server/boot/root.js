'use strict';

module.exports = function(server) {
    // Install a `/` route that returns server status
    var router = server.loopback.Router();
    router.get('/', server.loopback.status());
    server.use(router);
    var _ = require('underscore');
    var uuid = require('node-uuid');

    var utils = require('../../common/models/utils')
    var configs = require('../../config/config');
    var wechatApi = require('../../common/models/wechatapi')
    var common = require('../../common/models/common')

    router.use(function(req, res, next) {
        var appId = req.query.appId;
        if (_.isUndefined(appId)) {
            appId = 'wx397644d24ec87fd1';
        }

        var config = _.find(configs, function(item) {
            return item.wechat.appID == appId;
        })

        if (_.isUndefined(config)) {
            console.log("403, AppID is not find");
            res.writeHead(403, {
                "errcode": 100001,
                "errmsg": "AppID is not find"
            });
            res.end("AppID is not find");
            return;
        }

        if (req.path == '/token') {

            getToken(req, res, next, config);
        } else if (req.path == '/ticket') {

            getTicket(req, res, next, config)
        } else if (req.path == '/qrcode') {

            getQRCode(req, res, next, config, 'QR_STR_SCENE')
        } else if (req.path == '/limitqrcode') {

            getQRCode(req, res, next, config, 'QR_LIMIT_STR_SCENE')
        } else if (req.path == '/nickname') {

            getNickName(req, res, next, config)
        } else if (req.path == '/sendnotify') {

            sendNotify(req, res, next, config)
        } else if (req.path == '/sendtemplate') {

            sendTemplate(req, res, next, config)
        } else if (req.path == '/encrypt') {

            GetTokenFromOpenID(req, res, next)
        } else if (req.path == '/decrypt') {

            GetOpenID(req, res, next)
        } else if (req.path == '/getlisence') {

            GetLisence(req, res, next)
        } else if (req.path == '/authentication') {

            Authentication(req, res, next)
        } else if (req.path == '/createmenu') {

            CreateMenu(req, res, next, config)
        } else if (req.path == '/getaddress') {

            getAddress(req, res, next)
        } else if (req.path == '/getaddress2') {

            getAddress2(req, res, next)
        } else if (req.path == '/createorders') {

            common.CreateOrders(res, req, config);
        } else if (req.path == '/queryorders') {

            common.QueryOrders(res, req, config);
        } else if (req.path == '/closeorders') {

            common.CloseOrders(res, req, config);
        } else {
            next();
        }
    })

    function getAddress2(req, res, next) {
        //根据token从redis中获取access_token  
        var location_x = req.query.location_x;
        var location_y = req.query.location_y;

        common.GetAddressFromLBS_GD(location_x, location_y).then(function(data) {
            console.log(data);
            res.send(data);
        }, function(err) {
            res.writeHead(500, {
                "errcode": 100003,
                "errmsg": err.message
            });
            res.end(err.message);
        });
    }

    function getAddress(req, res, next) {
        //根据token从redis中获取access_token  
        var location_x = req.query.location_x;
        var location_y = req.query.location_y;

        common.GetAddressFromLBS_TX(location_x, location_y).then(function(data) {
            console.log(data);
            res.send(data);
        }, function(err) {
            res.writeHead(500, {
                "errcode": 100003,
                "errmsg": err.message
            });
            res.end(err.message);
        });
    }

    var parsePostBody = function(req, done) {
        var arr = [];
        var chunks;

        req.on('data', buff => {
            arr.push(buff);
        });

        req.on('end', () => {
            chunks = Buffer.concat(arr);
            done(chunks);
        });
    };

    function sendTemplate(req, res, next, config) {
        //根据token从redis中获取access_token 
        var appId = req.query.appId;

        parsePostBody(req, (chunks) => {
            var str = chunks.toString();
            var WXData = JSON.parse(chunks.toString());
            common.self_getToken(config.wechat.token, appId).then(function(token) {
                common.CreateMenu(menu, token.access_token).then(function(data) {
                    console.log(data);
                    res.send(data);
                }, function(err) {
                    res.writeHead(500, {
                        "errcode": 100003,
                        "errmsg": err.message
                    });
                    res.end(err.message);
                });
            });
        });
    }

    function CreateMenu(req, res, next, config) {
        //根据token从redis中获取access_token 
        var appId = req.query.appId;

        parsePostBody(req, (chunks) => {
            var str = chunks.toString();
            var menu = JSON.parse(chunks.toString());
            common.self_getToken(config.wechat.token, appId).then(function(token) {
                common.CreateMenu(menu, token.access_token).then(function(data) {
                    console.log(data);
                    res.send(data);
                }, function(err) {
                    res.writeHead(500, {
                        "errcode": 100003,
                        "errmsg": err.message
                    });
                    res.end(err.message);
                });
            });
        });
    }

    function GetTokenFromOpenID(req, res, next) {
        //根据token从redis中获取access_token 

        parsePostBody(req, (chunks) => {
            var body = JSON.parse(chunks.toString());
            common.GetTokenFromOpenID(body).then(function(data) {
                res.send(data);
            }, function(err) {
                res.writeHead(500, {
                    "errcode": 100003,
                    "errmsg": err.message
                });
                res.end(err.message);
            });
        });
    }

    function GetLisence(req, res, next) {
        //根据token从redis中获取access_token 

        parsePostBody(req, (chunks) => {
            try {
                var body = JSON.parse(chunks.toString());
                var data = common.GetOpenIDFromToken(body.token);

                console.log(data);
                var bsSQL = "select userid from ac_users where openid = '"+data.openid+"'";
                Common.DoSQL(bsSQL).then(function(result){
                    if ( result.lenght > 0 ){
                        var user = {
                            'openid': result[0].userid
                        };
                        common.GetTokenFromOpenID(user, '1h').then(function(resdata) {
    
                            res.send({
                                status: 0,
                                "result": resdata
                            });
                        }, function(err) {
                            res.writeHead(500, {
                                "errcode": 100003,
                                "errmsg": err.message
                            });
                            res.end(err.message);
                        });
                    }else{
                        res.writeHead(500, {
                            "errcode": 100004,
                            "errmsg": '用户未找到'
                        });
                        res.end('用户未找到');                        
                    }

                })


            } catch (error) {
                res.writeHead(500, {
                    "errcode": 100003,
                    "errmsg": error.message
                });
                res.end(error.message);
            }
        });
    }

    function Authentication(req, res, next) {

        parsePostBody(req, (chunks) => {
            var body = JSON.parse(chunks.toString());
            var data = common.GetOpenIDFromToken(body.vgdecoderesult);

            console.log(data);
            var openList = [];
            openList.push('https://u.wechat.com/ECQyBQ05Gt9zAJ6bEn42gzI');
            openList.push('https://u.wechat.com/EE-4qLrqzioUWCVyOuo3Ut0');
            openList.push('https://u.wechat.com/EJNCZJLvGQZfpz8Gdvokm6k');
            openList.push('oFVZ-1M21POeEOX2gejWRkDE-EWw');

            var find = _.find(openList, function(fitem) {
                return fitem == data.openid;
            })

            if (!_.isUndefined(find)) {
                //EWTRACE('send ok');
                res.send("code=0000&&desc=ok");
            } else {
                //EWTRACE('send bad');
                res.send("code=0001&&desc=bad");
            }
            res.end();
        });
    }

    function GetOpenID(req, res, next, config) {
        //根据token从redis中获取access_token  

        var token = req.query.token;
        if (_.isUndefined(token)) {
            console.log("403, token is Empty");
            res.writeHead(403, {
                "errcode": 100002,
                "errmsg": "token is Empty"
            });
            res.end("token is Empty");
            return;
        }

        try {
            var data = common.GetOpenIDFromToken(token);
            res.send(data);

        } catch (err) {
            res.writeHead(500, {
                "errcode": 100003,
                "errmsg": err.message
            });
            res.end(err.message);
        };

    }


    function sendNotify(req, res, next, config) {
        //根据token从redis中获取access_token  
        var appId = req.query.appId;
        var openid = req.query.openid;
        var context = req.query.context;

        if (_.isUndefined(openid)) {
            console.log("403, openid is Empty");
            res.writeHead(403, {
                "errcode": 100002,
                "errmsg": "openid is Empty"
            });
            res.end("openid is Empty");
            return;
        }

        if (_.isUndefined(context)) {
            console.log("403, context is Empty");
            res.writeHead(403, {
                "errcode": 100002,
                "errmsg": "context is Empty"
            });
            res.end("context is Empty");
            return;
        }

        common.self_getToken(config.wechat.token, appId).then(function(data) {
            common.self_sendNotify(res, data.access_token, openid, context)
        }, function(err) {
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
            res.writeHead(403, {
                "errcode": 100002,
                "errmsg": "openid is Empty"
            });
            res.end("openid is Empty");
            return;
        }
        common.self_getToken(config.wechat.token, appId).then(function(data) {
            common.self_getNickName(res, data.access_token, openid)
        }, function(err) {
            res.writeHead(500, err);
            res.end();
        });

    }

    function getQRCode(req, res, next, config, type) {
        //根据token从redis中获取access_token  
        var appId = req.query.appId;
        var QRCode = req.query.QRCode;
        if (_.isUndefined(QRCode)) {
            console.log("403, QRCode is Empty");
            res.writeHead(403, {
                "errcode": 100002,
                "errmsg": "QRCode is Empty"
            });
            res.end("QRCode is Empty");
            return;
        }
        common.self_getToken(config.wechat.token, appId).then(function(data) {
            common.self_getQRCode(res, data.access_token, QRCode, type)
        }, function(err) {
            res.writeHead(500, err);
            res.end();
        });

    }


    function getTicket(req, res, next, config) {
        var appId = req.query.appId;
        var url = req.query.url;
        if (_.isUndefined(url)) {
            console.log("403, url is Empty");
            res.writeHead(403, {
                "errcode": 100002,
                "errmsg": "url is Empty"
            });
            res.end("url is Empty");
            return;
        }

        common.self_getToken(config.wechat.token, appId).then(function(data) {
            common.self_getTicket(res, data.access_token, url)
        }, function(err) {
            res.writeHead(500, err);
            res.end();
        });
    }


    function getToken(req, res, next, config) {
        //根据token从redis中获取access_token  
        var appId = req.query.appId;

        common.self_getToken(config.wechat.token, appId).then(function(data) {
            res.send(data);
        }, function(err) {
            res.writeHead(500, err);
            res.end();
        });

    }
};