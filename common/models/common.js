'use strict';

var Common = {};
var utils = require('../../common/models/utils')
var configs = require('../../config/config');
var wechatApi = require('../../common/models/wechatapi');
var request = require('request');
var sha1 = require('sha1');
var needle = require('needle');
var _ = require('underscore');
var jwtdecode = require('jwt-simple');
var rf = require("fs");
var jwt = require('jsonwebtoken');
var WXPay = require('weixin-pay');

var iconv = require("iconv-lite");


function raw(args) {
    var keys = Object.keys(args);
    keys = keys.sort()
    var newArgs = {};
    keys.forEach(function(key) {
        newArgs[key] = args[key];
    });
    var string = '';
    for (var k in newArgs) {
        string += '&' + k + '=' + newArgs[k];
    }
    string = string.substr(1);
    return string;
}

function paysignjs(appid, nonceStr, packages, mch_id, timeStamp, prepay_id, key) {
    var ret = {
        appid: appid,
        noncestr: nonceStr,
        package: packages,
        partnerid: mch_id,
        timestamp: timeStamp,
        prepayid: prepay_id
    };
    var string = raw(ret);

    var crypto = require('crypto');
    string = string + '&key=' + key;
    var sign = crypto.createHash('md5').update(string, 'utf8').digest('hex');
    return sign.toUpperCase();
}

function createTimeStamp() {
    return parseInt(new Date().getTime() / 1000) + '';
}

function createNonceStr() {
    return (new Date()).format('yyyyMMdd') + "-" + Math.random().toString(36).substr(2, 9);
}

function getIPAdress() {
    var interfaces = require('os').networkInterfaces();
    for (var devName in interfaces) {
        var iface = interfaces[devName];
        for (var i = 0; i < iface.length; i++) {
            var alias = iface[i];
            if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
                return alias.address;
            }
        }
    }
}

var main_DBConnect = {
    "host": "rm-wz9q9pyn85tbd3785o.mysql.rds.aliyuncs.com",
    "port": "3306",
    "database": "health",
    "password": "manKang@0307",
    "name": "main_DBConnect",
    "connector": "mysql",
    "user": "mankang",
    "multipleStatements": true,
    "pool": {
        "min": 0,
        "max": 10,
        "idleTimeoutMillis": 300
    }
};;

var connection = undefined;
var mysql = require('mysql');

function handleDisconnect() {
    connection = mysql.createConnection(main_DBConnect); // Recreate the connection, since
    // the old one cannot be reused.

    connection.connect(function(err) { // The server is either down
        if (err) { // or restarting (takes a while sometimes).
            console.log('error when connecting to db:', err);
            setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
        } // to avoid a hot loop, and to allow our node script to
    }); // process asynchronous requests in the meantime.
    // If you're also serving http, display a 503 error.
    connection.on('error', function(err) {
        console.log('db error', err);
        if (err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
            handleDisconnect(); // lost due to either server restart, or a
        } else { // connnection idle timeout (the wait_timeout
            throw err; // server variable configures this)
        }
    });
}

handleDisconnect();

Common.DoSQL = function(SQL) {
    return new Promise(function(resolve, reject) {

        console.log(SQL);

        connection.query(SQL, function(err, result) {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
}
const fs = require('fs');
const path = require('path');
const Alipay = require('alipay2');


//http://0.0.0.0:3000/alipayorders?appId=wxdb5ce1271ea3e6d6&inside_no=20180223-a01fwp9ir&notifyUrl=http://style.man-kang.com:8800/api/weChatEvents/wxnotify&fee=1
Common.CreateOrders_AliPay = function(res, req, config) {
    // 目前支付宝秘钥文件，放在config目录下，aliPay的AppID命名的子目录内
    // 后期大量客户使用时，考虑将文件内容放入DB，但导入时不能直接放入因为有回车符，建议读出内容后，用base64加密后放入，使用时用base64解密
    // 文件读出后，base64编码
    // var _base64 = fs.readFileSync(path.join(__dirname, '../../config/',config.wechat.alipay.aliAppID.toString(),'/rsa_private_key.pem')).toString('base64');
    // // base64解码
    // var _context = Buffer(_base64, 'base64').toString();

    const alipay = new Alipay({
        notify_url: req.query.notifyUrl,
        appId: config.wechat.alipay.aliAppID,
        appKey: fs.readFileSync(path.join(__dirname, '../../config/', config.wechat.alipay.aliAppID.toString(), '/rsa_private_key.pem')),
        alipayPublicKey: fs.readFileSync(path.join(__dirname, '../../config/', config.wechat.alipay.aliAppID.toString(), '/rsa_public_key.pem')),
        charset: 'utf-8',
        sign_type: 'RSA'
    });
    console.log(req.query.notifyUrl);

    var _out_trade_no = (new Date()).format('yyyyMMdd') + "-alipay" + Math.random().toString(36).substr(2, 9);

    var _fee = req.query.fee;

    alipay.precreate({
        subject: config.wechat.alipay.companyName,
        out_trade_no: _out_trade_no,
        total_amount: _fee,
        timeout_express: '10m'
    }).then(function(result) {

        result.out_trade_no = _out_trade_no;
        result.app_id = config.wechat.alipay.aliAppID;
        result.in_trade_no = req.query.inside_no;
        console.log(result);

        res.send(result);
    }).catch(function(err) {
        console.log(err);
        res.send(err);
    });


}


// 支付返回签名错误时，检查微信商户平台-》账户中心-》API安全-》API秘钥要设置，缺省设置为appSecret，
Common.CreateOrders = function(res, req, config) {
    //http://0.0.0.0:3000/createorders?appId=wxdb5ce1271ea3e6d6&fee=1&notifyUrl=http://gl.eshine.cn/wechatnotify&inside_no=123232423&openid=xxxxxxxxxxxx
    var fee = req.query.fee;
    var notifyurl = req.query.notifyUrl;

    var wxpay = WXPay({
        appid: config.wechat.appID,
        mch_id: config.wechat.mch_id,
        partner_key: config.wechat.paySecret, //微信商户平台API密钥
        pfx: '' //微信商户平台证书
    });

    var _out_trade_no = (new Date()).format('yyyyMMdd') + "-wxpay" + Math.random().toString(36).substr(2, 9);

    var _openid = '';
    var payType = 'NATIVE';
    if (!_.isUndefined(req.query.openid)) {
        _openid = req.query.openid;
        payType = 'JSAPI'
    }

    console.log("payType:" + payType);
    if (payType == 'NATIVE') {
        wxpay.createUnifiedOrder({
            body: '支付',
            out_trade_no: _out_trade_no,
            total_fee: fee,
            spbill_create_ip: getIPAdress(),
            notify_url: notifyurl,
            trade_type: payType,
            product_id: '1234567890'
        }, function(err, result) {
            result.out_trade_no = _out_trade_no;
            result.inside_no = req.query.inside_no;

            var nonce_str = createNonceStr();
            var timeStamp = createTimeStamp();
            var prepay_id = result.prepay_id;

            //生成移动端app调用签名  
            var _paySignjs = paysignjs(config.wechat.appID, nonce_str, 'Sign=WXPay', config.wechat.mch_id, timeStamp, prepay_id, config.wechat.partner_key);
            var args = {
                appId: config.wechat.appID,
                timeStamp: timeStamp,
                nonceStr: nonce_str,
                signType: "MD5",
                mch_id: config.wechat.mch_id,
                prepay_id: prepay_id,
                paySign: _paySignjs,
                out_trade_no: _out_trade_no,
                in_trade_no: req.query.inside_no,
                code_url: result.code_url //微信支付生成二维码，在此处返回
            };

            result.threePay = args;

            console.log(result);
            res.send(result);
        });
    } else {
        console.log('JSAPI paymode')
        wxpay.getBrandWCPayRequestParams({
            openid: req.query.openid,
            body: '支付',
            detail: '公众号支付',
            out_trade_no: _out_trade_no,
            total_fee: fee,
            spbill_create_ip: getIPAdress(),
            notify_url: notifyurl
        }, function(err, result) {
            // in express
            if (!err) {
                console.log(err);
                res.send(err);
            } else {
                console.log(result);
                res.send(result);
            }

        });
    }


}

Common.QueryOrders = function(res, req, config) {

    var trade_no = req.query.out_trade_no;

    var wxpay = WXPay({
        appid: config.wechat.appID,
        mch_id: config.wechat.mch_id,
        partner_key: config.wechat.appSecret, //微信商户平台API密钥
        pfx: '' //微信商户平台证书
    });

    wxpay.queryOrder({
        out_trade_no: trade_no
    }, function(err, order) {
        console.log(order);
        res.send(order);
    });
}

Common.CloseOrders = function(res, req, config) {

    var trade_no = req.query.out_trade_no;

    var wxpay = WXPay({
        appid: config.wechat.appID,
        mch_id: config.wechat.mch_id,
        partner_key: config.wechat.appSecret, //微信商户平台API密钥
        pfx: '' //微信商户平台证书
    });

    wxpay.closeOrder({
        out_trade_no: trade_no
    }, function(err, order) {
        console.log(order);
        res.send(order);
    });
}

Common.GetAddressFromLBS_GD = function(location_x, location_y) {
    return new Promise(function(resolve, reject) {
        var url = "http://restapi.amap.com/v3/geocode/regeo?location=" + location_y + "," + location_x + "&key=974a2c2c4f3fdbc1892cc70aa679dc01";

        needle.get(encodeURI(url), null, function(err, localInfo) {

            if (err) {
                reject(err);
            } else {
                if (localInfo.body.status == 1) {
                    resolve(localInfo.body.regeocode);
                } else {
                    reject(localInfo.body);
                }
            }
        });
    });
}


Common.GetAddressFromLBS_TX = function(location_x, location_y) {
    return new Promise(function(resolve, reject) {
        var url = "http://apis.map.qq.com/ws/geocoder/v1/?location=" + location_x + "," + location_y + "&key=6UWBZ-BRKR3-YWG3Y-337NE-DRCMZ-EGBF7";

        needle.get(encodeURI(url), null, function(err, localInfo) {

            if (err) {
                reject(err);
            } else {
                if (localInfo.body.status == 0) {
                    resolve(localInfo.body.result);
                } else {
                    reject(localInfo.body);
                }
            }
        });
    });
}

Common.requestMediaList = function(access_token, offset, count) {
    return new Promise(function(resolve, reject) {
        var url = "https://api.weixin.qq.com/cgi-bin/material/batchget_material?access_token=" + access_token;
        var data = {
            "type": "news",
            "offset": offset,
            "count": count
        };
        needle.post(encodeURI(url), JSON.stringify(data), {
            'Content-Type': 'text/plain'
        }, function(err, mediaList) {
            // you can pass params as a string or as an object.
            if (err) {
                reject(err);
            } else {
                var _body = iconv.decode(mediaList.body, 'utf-8');
                resolve(JSON.parse(_body));
            }
        });
    });
}

Common.CreateMenu = function(menu, access_token) {

    return new Promise(function(resolve, reject) {
        var url = "https://api.weixin.qq.com/cgi-bin/menu/create?access_token=" + access_token;

        needle.post(encodeURI(url), menu, {
            json: true
        }, function(err, resp) {
            // you can pass params as a string or as an object.
            if (err) {
                //cb(err, { status: 0, "result": "" });
                EWTRACE(err.message);
                reject(err);
            } else {
                resolve(resp.body);
            }
        });
    });
}

Common.SendTemplate = function(data, access_token) {

    return new Promise(function(resolve, reject) {
        var url = "https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=" + access_token;

        needle.post(encodeURI(url), data, {
            json: true
        }, function(err, resp) {
            // you can pass params as a string or as an object.
            if (err) {
                //cb(err, { status: 0, "result": "" });
                EWTRACE(err.message);
                reject(err);
            } else {
                resolve(resp.body);
            }
        });
    });
}

Common.GetTokenFromOpenID = function(userinfo, time) {
    delete userinfo.exp;
    if (_.isUndefined(time)) {
        time = '1d';
    }
    var cert = rf.readFileSync("jwt_rsa_private_key.pem", "utf-8");
    return new Promise(function(resolve, reject) {
        jwt.sign(userinfo, cert, {
            algorithm: 'RS256',
            expiresIn: time
        }, function(err, token) {
            if (err) {
                reject(err);
            } else {
                resolve(token);
            }
        });
    });
}

Common.GetOpenIDFromToken = function(token) {

    var rf = require("fs");
    var secret = rf.readFileSync("jwt_rsa_public_key.pem", "utf-8");
    var decoded = null;
    try {
        decoded = jwtdecode.decode(token, secret);
        console.log(token);
        console.log(decoded);
        return decoded;
    } catch (err) {
        throw (err);
    }
}

var configs = require('../../config/config');

Common.self_getToken = function(token, appId) {
    return new Promise(function(resolve, reject) {

        var config = _.find(configs, function(item) {
            return item.wechat.appID == appId;
        })

        // 设置第三方Token获取url，自动从第三方源获取access_token后返回
        if (!_.isUndefined(config.wechat.threeToken) && config.wechat.threeToken.length > 0) {

            request(encodeURI(config.wechat.threeToken),
                function(error, resp, json) {

                    if (!error && resp.statusCode == 200) {
                        var body = JSON.parse(json);
                        resolve(body.access_token);
                    } else {
                        reject({
                            "errcode": 100003,
                            "errmsg": err.message
                        });
                    }
                });
            return;
        }

        utils.get(token).then(function(data) {

            if (data) { //获取到值--往下传递  
                console.log('redis获取到值');
                var p = {
                    "access_token": data
                };
                resolve(p);
            } else { //没获取到值--从微信服务器端获取,并往下传递  
                console.log('redis中无值');
                wechatApi.updateAccessToken(appId).then(function(data) {
                    console.log(data);
                    if (_.isUndefined(data.errcode)) {
                        utils.set(token, `${data.access_token}`, 7180).then(function(result) {

                            if (result == 'OK') {
                                resolve(data);
                            } else {
                                reject({
                                    "errcode": 100003,
                                    "errmsg": "redis error"
                                });
                            }

                        })
                    } else {
                        reject({
                            "errcode": 100003,
                            "errmsg": data.errmsg
                        });
                    }
                })

            }
        })
    });
}

Common.self_sendNotify = function(res, access_token, openId, context) {

    var url = "https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token=" + access_token;

    var SendData = {
        "touser": openId,
        "msgtype": "text",
        "text": {
            "content": context
        }
    };

    needle.post(encodeURI(url), SendData, {
        json: true
    }, function(error, resp) {

        if (!error) {
            console.log(resp.body);
            if (_.isUndefined(resp.body.errcode)) {
                res.send(resp.body);
            } else {
                res.writeHead(403, resp.body);
                res.end(JSON.stringify(resp.body));
            }
        } else {
            res.writeHead(403, error);
            res.end(JSON.stringify(error));
        }

    })
}

Common.self_getNickName = function(res, access_token, openId) {

    request('https://api.weixin.qq.com/cgi-bin/user/info?access_token=' + access_token + "&openid=" + openId + "&lang=zh_CN", function(error, resp, json) {

        if (!error && resp.statusCode == 200) {
            var body = JSON.parse(json);
            console.log(body);
            if (_.isUndefined(body.errcode)) {
                res.send(body);
            } else {
                res.writeHead(403, body);
                res.end(JSON.stringify(body));
            }

        } else {
            res.send(resp);
        }
    })
}

Common.self_getNickNameByToken = function(res, access_token, openId) {
    return new Promise(function(resolve, reject) {
        request('https://api.weixin.qq.com/cgi-bin/user/info?access_token=' + access_token + "&openid=" + openId + "&lang=zh_CN", function(error, resp, json) {

            if (!error && resp.statusCode == 200) {
                var body = JSON.parse(json);
                console.log(body);
                if (_.isUndefined(body.errcode)) {
                    Common.GetTokenFromOpenID(body).then(function(data) {
                        resolve(data);
                    });
                } else {
                    reject(body);
                }

            } else {
                reject(error);
            }
        })
    });
}


Common.self_getTicket = function(res, access_token, url, appId) {

    var winxinconfig = {
        grant_type: 'client_credential',
        noncestr: Math.random().toString(36).substr(2, 15),
        ticketUrl: 'https://api.weixin.qq.com/cgi-bin/ticket/getticket',
        timestamp: Math.floor(Date.now() / 1000) //精确到秒
    }
    if (utils.get('ticket-'+appId)) {
        console.log('ticket 有值， 名称：'+'ticket-'+appId)
        var jsapi_ticket = utils.get('ticket-'+appId);
        console.log('jsapi_ticket=' + jsapi_ticket + '&noncestr=' + winxinconfig.noncestr + '&timestamp=' + winxinconfig.timestamp + '&url=' + url);
        var resp = {
            noncestr: winxinconfig.noncestr,
            timestamp: winxinconfig.timestamp,
            url: url,
            appid: appId,
            signature: sha1('jsapi_ticket=' + jsapi_ticket + '&noncestr=' + winxinconfig.noncestr + '&timestamp=' + winxinconfig.timestamp + '&url=' + url)
        };
        res.send(Data);
    } else {
        url = decodeURI(url);
        request(winxinconfig.ticketUrl + '?access_token=' + access_token + '&type=jsapi', function(error, resp, json) {
            if (!error && resp.statusCode == 200) {
                
                var ticketMap = JSON.parse(json);
                utils.set('ticket-'+appId, ticketMap.ticket);
                console.log('jsapi_ticket=' + ticketMap.ticket + '&noncestr=' + winxinconfig.noncestr + '&timestamp=' + winxinconfig.timestamp + '&url=' + url);
                var Data = {
                    noncestr: winxinconfig.noncestr,
                    timestamp: winxinconfig.timestamp,
                    url: url,
                    appid: appId,
                    signature: sha1('jsapi_ticket=' + ticketMap.ticket + '&noncestr=' + winxinconfig.noncestr + '&timestamp=' + winxinconfig.timestamp + '&url=' + url)
                };

                res.send(Data);
            } else {
                res.send(resp);
            }
        })
    }
}

Common.self_getQRCode = function(res, access_token, strQR, type) {

    var pp = {
        "expire_seconds": 2592000,
        "action_name": type,
        "action_info": {
            "scene": {
                "scene_str": strQR
            }
        }
    };
    var url = "https://api.weixin.qq.com/cgi-bin/qrcode/create?access_token=" + access_token;

    needle.post(encodeURI(url), pp, {
        json: true
    }, function(err, resp) {
        // you can pass params as a string or as an object.
        if (err) {
            res.writeHead(500, err);
            res.end(err.message);
        } else {
            console.log(resp.body.url);
            res.send(resp.body.url);
        }
    });
}


module.exports = Common;