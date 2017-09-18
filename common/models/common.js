'use strict';

module.exports = function (Common) {
    var utils = require('../../common/models/utils')
    var configs = require('../../config/config');
    var wechatApi = require('../../common/models/wechatapi')


    var self_getToken = function (token, appId) {
        return new Promise(function (resolve, reject) {
            utils.get(token).then(function (data) {

                if (data) { //获取到值--往下传递  
                    console.log('redis获取到值');
                    var p = { "access_token": data };
                    //res.send(p);
                    resolve(p);
                }
                else {        //没获取到值--从微信服务器端获取,并往下传递  
                    console.log('redis中无值');
                    wechatApi.updateAccessToken(appId).then(function (data) {
                        utils.set(token, `${data.access_token}`, 7180).then(function (result) {
                            if (result == 'OK') {
                                //res.send(data);
                                resolve(data);
                            }
                            else {
                                //res.writeHead(500, { "errcode": 100003, "errmsg": "redis error" });

                                reject({ "errcode": 100003, "errmsg": "redis error" });
                                //res.end();
                            }
                        })
                    })
                }
            })
        });
    }


    function _getTicket(res, appId, access_token, url) {

        var winxinconfig = {
            grant_type: 'client_credential',
            noncestr: Math.random().toString(36).substr(2, 15),
            ticketUrl: 'https://api.weixin.qq.com/cgi-bin/ticket/getticket',
            timestamp: Math.floor(Date.now() / 1000) //精确到秒
        }

        request(winxinconfig.ticketUrl + '?access_token=' + access_token + '&type=jsapi', function (error, resp, json) {
            if (!error && resp.statusCode == 200) {
                var ticketMap = JSON.parse(json);
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
};
