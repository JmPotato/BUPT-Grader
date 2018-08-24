'use strict';

var jwxt_id = ''; //学号
var jwxt_password = ''; //教务系统密码

var fs = require("fs");
var path = require('path');
var request = require('request');
var iconv = require('iconv-lite');
var bodyParser = require('body-parser');

var express = require('express');
var app = express();
var urlencodedParser = bodyParser.urlencoded({ extended: false })
 
var post_headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/11.1.2 Safari/605.1.15',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Accept-Encoding': 'gzip, deflate',
    'content-type': 'application/x-www-form-urlencoded',
    'Connection': 'keep-alive',
    'Cookie': '',
};
var get_headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/11.1.2 Safari/605.1.15',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Accept-Encoding': 'gzip, deflate',
    'Connection': 'keep-alive',
    'Cookie': '',
};

app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
    function renderPage () {res.sendFile(__dirname + '/public/validate.html');};
    setTimeout(renderPage, 3000);
    request.get({url: 'http://jwxt.bupt.edu.cn/validateCodeAction.do?random=', encoding: null}, function (error, response, body) {
        post_headers.Cookie = response.headers["set-cookie"].toString().substring(0, 32);
        get_headers.Cookie = response.headers["set-cookie"].toString().substring(0, 32);
    }).pipe(fs.createWriteStream(__dirname + '/public/validate_code.jpg'));
});

app.post('/get_grades', urlencodedParser, function (req, res) {
    var form = {
        type: 'sso',
        zjh: jwxt_id,
        mm: jwxt_password,
        v_yzm: req.body.validate_code,
    };
    request.post({url: 'http://jwxt.bupt.edu.cn/jwLoginAction.do', encoding: null, gzip: true, headers: post_headers, form: form}, function (error, response, body) {
        if (req.body.method === 'all') {
            request.get({url:'http://jwxt.bupt.edu.cn/gradeLnAllAction.do?type=ln&oper=sxinfo&lnsxdm=001', encoding: null, gzip: true, headers: get_headers}, function (error, r, body) {
                var html = iconv.decode(body, 'gb2312');
                res.send(html);
            });
        } else if (req.body.method === 'current') {
            request.get({url:'http://jwxt.bupt.edu.cn/bxqcjcxAction.do', encoding: null, gzip: true, headers: get_headers}, function (error, r, body) {
                var html = iconv.decode(body, 'gb2312');
                res.send(html);
            });
        }
    });
});

var server = app.listen(8080, function () {
    var host = server.address().address;
    var port = server.address().port;
    console.log("Successfully booted, url: http://%s:%s", host, port);
});