'use strict';

var fs = require('fs');
var ejs = require('ejs')
var path = require('path');
var express = require('express');
var request = require('request');
var iconv = require('iconv-lite');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');

var urlencodedParser = bodyParser.urlencoded({ extended: false })

var app = express();
app.use(express.static(__dirname + '/public'));
app.use(cookieParser());
app.set('views', __dirname + '/public');
app.set("view engine", "html");
app.engine('html', require('ejs').renderFile);

var server_url = 'http://127.0.0.1:8080';
var jwxt_id = ''; //学号
var jwxt_password = ''; //教务系统密码

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

app.all('*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", req.headers.origin);
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Credentials",true);
    next();
});

app.get('/', function (req, res) {
    var login = 0;
    function renderPage () {res.render('validate', {login, server_url});};
    if (req.cookies.user) {
        login = 1;
        jwxt_id = req.cookies.user.id;
        jwxt_password = req.cookies.user.password;
        request.get({url: 'http://jwxt.bupt.edu.cn/validateCodeAction.do?random=', encoding: null}, function (error, response, body) {
            post_headers.Cookie = response.headers["set-cookie"].toString().substring(0, 32);
            get_headers.Cookie = response.headers["set-cookie"].toString().substring(0, 32);
        }).pipe(fs.createWriteStream(__dirname + '/public/validate_code.jpg'));
    } else {
        login = 0;
        jwxt_id = '';
        jwxt_password = '';
    }
    setTimeout(renderPage, 3000);
});

app.post('/sign_in', urlencodedParser, function (req, res) {
    res.clearCookie('user');
    var re_id = /^\d{10}$/;
    if (re_id.test(req.body.id) && req.body.password !== '') {
        res.cookie('user', {id: req.body.id,password: req.body.password},{maxAge:2678400000,path:'/',httpOnly:true});
    }
    res.redirect(server_url);
});

app.get('/sign_out', function (req, res) {
    res.clearCookie('user');
    jwxt_id = '';
    jwxt_password = '';
    res.redirect(server_url);
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