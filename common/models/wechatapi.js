

var wechatApi = {};
var configs = require('../../config/config');
var utils = require('./utils');
var _ = require('underscore');

//获取access_token  
wechatApi.updateAccessToken = function (appId) {

    var config = _.find(configs, function (item) {
        return item.wechat.appID == appId;
    })

    var appID = config.wechat.appID;
    var appSecret = config.wechat.appSecret;
    var api = {
        accessToken: `${config.wechat.prefix}token?grant_type=client_credential`,
        upload: `${config.wechat.prefix}media/upload?`
    }

    var url = `${api.accessToken}&appid=${appID}&secret=${appSecret}`;
    //console.log(url);  
    var option = {
        url: url,
        json: true
    };

    return new Promise(function (resolve, reject) {
        utils.request(option).then(function (data) {

            resolve(data);
        },function(err){
            reject(err);
        })
    });
}


module.exports = wechatApi;
