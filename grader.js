var config = require('./config.js');
var Utils = require('./utils.js');
var Calculator = require('./calculator.js');
var Encryption = require('./encryption.js');

var server_url = config.server_url;
var server_port = config.server_port;
var utils = new Utils();
var encryption = new Encryption(config.key);

var fs = require('fs');
var cheerio = require("cheerio");
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

app.all('*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", req.headers.origin);
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "POST,GET");
    res.header("Access-Control-Allow-Credentials", true);
    next();
});

app.get('/', function (req, res) {
    var login = 0;
    var random_id = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5);
    var validate_code_img = __dirname + '/public/vc/validate_code_' + random_id + '.jpg';
    var message = req.param('message');
    if (req.cookies.identity)
        res.clearCookie('identity');
    if (req.cookies.user) {
        try {
            encryption.decryptText(req.cookies.user.id);
        } catch(err) {
            res.redirect(server_url + '/sign_out');
            res.end();
        }
        login = 1;
        request.get({url: 'http://10.3.255.178:9001/validateCodeAction.do?random=', encoding: null}, function (error, response, body) {
            var identity = response.headers["set-cookie"].toString().substring(0,46);
            if (!error) {
                try {
                    res.cookie('identity', encryption.encryptText(identity),{maxAge:3000000, path:'/', httpOnly:true});
                } catch(err) {
                    res.clearCookie('user');
                    res.clearCookie('identity');
                    res.redirect(server_url + '?message=访问教务系统错误，请重试');
                    return 0;
                }
            } else {
                res.clearCookie('user');
                res.clearCookie('identity');
                res.redirect(server_url + '?message=访问教务系统错误，请重试');
                return 0;
            }
            res.render('home', {random_id, message, login, server_url});
        }).pipe(fs.createWriteStream(validate_code_img));
    } else {
        login = 0;
        res.render('home', {random_id, message, login, server_url});
    }
});

app.get('/sign_in', function (req, res) {
    res.redirect(server_url);
});

app.post('/sign_in', urlencodedParser, function (req, res) {
    res.clearCookie('user');
    res.clearCookie('identity');
    var re_id = /^\d{10}$/;
    if (re_id.test(req.body.id) && req.body.password !== '') {
        try {
            res.cookie('user', {id: encryption.encryptText(req.body.id), password: encryption.encryptText(req.body.password)},{maxAge:2678400000,path:'/',httpOnly:true});
        } catch(err) {
            res.redirect(server_url);
        }
        res.redirect(server_url);
    } else {
        res.redirect(server_url + '?message=请输入正确的学号');
    }
});

app.get('/sign_out', function (req, res) {
    utils.deleteImgs();
    res.clearCookie('user');
    res.clearCookie('identity');
    res.redirect(server_url);
});

app.get('/get_grades', function (req, res) {
    res.redirect(server_url);
});

app.post('/get_grades', urlencodedParser, function (req, res) {
    utils.deleteImgs();
    if (!req.body.validate_code) {
        res.redirect(server_url + '?message=请输入验证码');
    }
    var post_headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/11.1.2 Safari/605.1.15',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Accept-Encoding': 'gzip, deflate',
        'content-type': 'application/x-www-form-urlencoded',
        'Connection': 'keep-alive',
        'Cookie': encryption.decryptText(req.cookies.identity),
    };
    var get_headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/11.1.2 Safari/605.1.15',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Cookie': encryption.decryptText(req.cookies.identity),
    };
    var form = {
        type: 'sso',
        zjh: encryption.decryptText(req.cookies.user.id),
        mm: encryption.decryptText(req.cookies.user.password),
        v_yzm: req.body.validate_code,
    };
    var grades = '';
    request.post({url: 'http://10.3.255.178:9001/jwLoginAction.do', encoding: null, gzip: true, headers: post_headers, form: form}, function (error, response, body) {
        if (req.body.method === 'all') {
            request.get({url:'http://10.3.255.178:9001/gradeLnAllAction.do?type=ln&oper=sxinfo&lnsxdm=001', encoding: null, gzip: true, headers: get_headers}, function (error, r, body) {
                grades = iconv.decode(body, 'gb2312');
                var calculator = new Calculator(grades, 'all');
                var content = calculator.purifyTable();
                var gpa = calculator.calculateGPA();
                if (!Boolean(content.text())) {
                    res.redirect(server_url + '?message=尚未查询到成绩（请确认学号，密码和验证码均输入正确，以及确认验证码是否过期）');
                    return 0;
                }
                res.render('grades', {server_url, gpa, content, type: 'all'});
            });
        } else if (req.body.method === 'current') {
            request.get({url:'http://10.3.255.178:9001/bxqcjcxAction.do', encoding: null, gzip: true, headers: get_headers}, function (error, r, body) {
                grades = iconv.decode(body, 'gb2312');
                var calculator = new Calculator(grades, 'current');
                var content = calculator.purifyTable();
                var gpa = calculator.calculateGPA();
                if (!Boolean(content.text())) {
                    res.redirect(server_url + '?message=尚未查询到成绩（请确认学号，密码和验证码均输入正确，以及确认验证码是否过期）');
                    return 0;
                }
                res.render('grades', {server_url, gpa, content, type: 'current'});
            });
        }
    });
});

app.get('/logout.do', function (req, res) {
    res.redirect(server_url + '?message=尚未查询到成绩（请确认学号，密码和验证码均输入正确，以及确认验证码是否过期）');
});

var server = app.listen(server_port, function () {
    var host = server.address().address;
    var port = server.address().port;
    console.log("Successfully booted on http://%s:%s", host, port);
    console.log("URL: " + server_url);
});