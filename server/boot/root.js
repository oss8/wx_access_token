'use strict';

module.exports = function(server) {
    // Install a `/` route that returns server status
    var router = server.loopback.Router();
    router.get('/', server.loopback.status());
    server.use(router);
    var _ = require('underscore');
    var uuid = require('node-uuid');
    var querystring = require("querystring");
    var utils = require('../../common/models/utils')
    var configs = require('../../config/config');
    var wechatApi = require('../../common/models/wechatapi')
    var common = require('../../common/models/common')
    var request = require('request');
    router.use(function(req, res, next) {

        if ( req.path.indexOf('/api') == 0 ){
            next();
            return;
        
        }
        var appId = req.query.appId;
        var bu = "";
        console.log("appId:" + appId);
        if (_.isUndefined(appId)) {
            appId = 'wx397644d24ec87fd1';
        }

        if ( appId.indexOf("_") > 0 ){
            appId = appId.substr(0,appId.indexOf("_"));
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
        } else if (req.path == '/wechat_userinfo') {

            wechat_userinfo(req, res, next, config)            
        } else if (req.path == '/wechat_callback') {

            wechat_callback(req, res, next, config)               
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
        } else if (req.path == '/requestMediaList') {

            requestMediaList(req, res, next, config)
        } else if (req.path == '/getaddress') {

            getAddress(req, res, next)
        } else if (req.path == '/getaddress2') {

            getAddress2(req, res, next)
        } else if (req.path == '/createorders') {

            common.CreateOrders(res, req, config);
        } else if (req.path == '/alipayorders') {

            common.CreateOrders_AliPay(res, req, config);
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
            res.send(err);
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
            res.send(err);
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

    // 需要在微信后台，设置白名单
    function wechat_callback(req, res, next, config) {
        //根据token从redis中获取access_token 

        console.log("wechat_callback begin")
        console.log(req.query);
        var appId = req.query.appId;
        var bu = appId.substr(appId.indexOf("_")+1,appId.length);
        var appId = appId.substr(0,appId.indexOf("_"));
        var _state = req.query.state;

        //console.log("https://api.weixin.qq.com/sns/oauth2/access_token?appid="+appId+"&secret="+config.wechat.appSecret+"&code="+req.query.code+"&grant_type=authorization_code");
        request("https://api.weixin.qq.com/sns/oauth2/access_token?appid="+appId+"&secret="+config.wechat.appSecret+"&code="+req.query.code+"&grant_type=authorization_code", function(error, resp, json) {

            if (!error && resp.statusCode == 200) {
                var body = JSON.parse(json);
                console.log(body);
                if (_.isUndefined(body.errcode)) {
                    if ( body.scope == 'snsapi_base'){
                        common.self_getToken(config.wechat.token, appId).then(function(data) {
                            common.self_getNickNameByToken(res, body.access_token, body.openid).then(function(token){
                                console.log(token);
                                var url = bu + (bu.indexOf('?') > 0 ? "&" : "?") + querystring.stringify({ token: token }) + "&status=" + _state;
                                console.log(url);
                                res.setHeader('Location', url);
                                res.writeHead(302);
                                res.end();
    
                            }, function(err) {
                                res.send(err);
                            });                
                        },function(err){
                            res.send(err);
                        }); 
                    }
                    else{
                        common.self_getNickNameByToken2(res, body.access_token, body.openid).then(function(token){
                            console.log(token);
                            var url = bu + (bu.indexOf('?') > 0 ? "&" : "?") + querystring.stringify({ token: token }) + "&status=" + _state;
                            console.log(url);
                            res.setHeader('Location', url);
                            res.writeHead(302);
                            res.end();

                        }, function(err) {
                            res.send(err);
                        }); 
                    }
                } else {
                    res.send(body);
                }
    
            } else {
                res.send(resp);
            }            
        });
    }

    function wechat_userinfo(req, res, next, config) {
        //根据token从redis中获取access_token 

        console.log(req.query);
        console.log('------------------------------------')
        var appId = req.query.appId;
        var str = req.query.bu
        var scope = req.query.scope;
        if ( _.isUndefined(scope)) {
            scope = 'snsapi_base';
        }
        //var callback = "http://" + req.headers.host + "/wechat_callback?bu="+str;
        var callback = config.wechat.wechat_callback + querystring.stringify({ appId: appId + "_" + str });
        var url = "https://open.weixin.qq.com/connect/oauth2/authorize?appid="+appId+"&redirect_uri="+encodeURI(callback)+"&response_type=code&scope="+scope+"&state=STATE#wechat_redirect";

        res.setHeader('Location', url);
        res.writeHead(302);
        res.end();
    }

    function sendTemplate(req, res, next, config) {
        //根据token从redis中获取access_token 
        var appId = req.query.appId;

        parsePostBody(req, (chunks) => {
            var str = chunks.toString();
            console.log(str);
            var WXData = JSON.parse(chunks.toString());
            common.self_getToken(config.wechat.token, appId).then(function(token) {
                common.SendTemplate(WXData, token.access_token).then(function(data) {
                    console.log(data);
                    res.send(data);
                }, function(err) {
                    res.send(err);
                });
            },function(err){
                res.send(err);
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
                    res.send(err);
                });
            },function(err){
                res.send(err);
            });
        });
    }

    function requestMediaList(req, res, next, config) {
        //根据token从redis中获取access_token 
        var appId = req.query.appId;
        var offset = req.query.offset;
        var count = req.query.count;

        common.self_getToken(config.wechat.token, appId).then(function(token) {
            common.requestMediaList(token.access_token, offset, count).then(function(data) {
                console.log(data);
                res.send(data);
            },function(err){
                res.send(err);
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
                res.send(err);
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

                var user = {
                    'openid': data.openid
                };
                console.log(user);
                common.GetTokenFromOpenID(user, '1h').then(function(resdata) {

                    res.send({
                        status: 0,
                        "result": resdata
                    });
                }, function(err) {
                    res.send(err);
                });

            } catch (error) {
                console.log(error.message);
                res.send({
                    "errcode": 100003,
                    "errmsg": error.message
                });
            }
        });
    }

    function GetOpenID(req, res, next, config) {
        //根据token从redis中获取access_token  

        var token = req.query.token;
        if (_.isUndefined(token)) {
            console.log("403, token is Empty");
            res.send({
                "errcode": 100002,
                "errmsg": "token is Empty"
            });
            return;
        }

        try {
            var data = common.GetOpenIDFromToken(token);
            res.send(data);

        } catch (err) {
            res.send({
                "errcode": 100003,
                "errmsg": err.message
            });
        };

    }

    //http://style.man-kang.com:3000/sendnotify?appId=wx397644d24ec87fd1&openid=oFVZ-1Mf3yxWLWHQPE_3BhlVFnGU&context=test
    function sendNotify(req, res, next, config) {
        //根据token从redis中获取access_token  
        var appId = req.query.appId;
        var openid = req.query.openid;
        var context = req.query.context;

        if (_.isUndefined(openid)) {
            console.log("403, openid is Empty");
            res.send({
                "errcode": 100002,
                "errmsg": "openid is Empty"
            });
            return;
        }

        if (_.isUndefined(context)) {
            console.log("403, context is Empty");
            res.send({
                "errcode": 100002,
                "errmsg": "context is Empty"
            });
            res.end("context is Empty");
            return;
        }

        common.self_getToken(config.wechat.token, appId).then(function(data) {
            common.self_sendNotify(res, data.access_token, openid, context)
        },function(err){
            res.send(err);
        });

    }


    //http://style.man-kang.com:3000/nickname?appId=wx397644d24ec87fd1&openid=oFVZ-1Mf3yxWLWHQPE_3BhlVFnGU
    function getNickName(req, res, next, config) {
        //根据token从redis中获取access_token  
        var appId = req.query.appId;
        var openid = req.query.openid;
        if (_.isUndefined(openid)) {
            console.log("403, openid is Empty");
            res.send({
                "errcode": 100002,
                "errmsg": "openid is Empty"
            });
            return;
        }
        common.self_getToken(config.wechat.token, appId).then(function(data) {
            common.self_getNickName(res, data.access_token, openid)
        },function(err){
            res.send(err);
        });

    }

    //http://style.man-kang.com:3000/qrcode?appId=wx397644d24ec87fd1&QRCode=www.baidu.com
    function getQRCode(req, res, next, config, type) {
        //根据token从redis中获取access_token  
        var appId = req.query.appId;
        var QRCode = req.query.QRCode;
        if (_.isUndefined(QRCode)) {
            console.log("403, QRCode is Empty");
            res.send({
                "errcode": 100002,
                "errmsg": "QRCode is Empty"
            });
            return;
        }
        common.self_getToken(config.wechat.token, appId).then(function(data) {
            common.self_getQRCode(res, data.access_token, QRCode, type)
        },function(err){
            res.send(err);
        });

    }

    //http://style.man-kang.com:3000/ticket?appId=wx397644d24ec87fd1&url=www.baidu.com
    function getTicket(req, res, next, config) {
        var appId = req.query.appId;
        var url = req.query.url;
        if (_.isUndefined(url)) {
            console.log("403, url is Empty");
            res.send({
                "errcode": 100002,
                "errmsg": "url is Empty"
            });
            return;
        }

        common.self_getToken(config.wechat.token, appId).then(function(data) {
            common.self_getTicket(res, data.access_token, url, appId)
        },function(err){
            res.send(err);
        });
    }


    function getToken(req, res, next, config) {
        //根据token从redis中获取access_token  
        var appId = req.query.appId;

        common.self_getToken(config.wechat.token, appId).then(function(data) {
            res.send(data);
        },function(err){
            res.send(err);
        });

    }
};