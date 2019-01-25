var config = require('./config.js');
var Utils = require('./utils.js');
var Inquire = require('./inquire.js');
var Encryption = require('./encryption.js');

var server_url = config.server_url;
var server_port = config.server_port;
var utils = new Utils();
var encryption = new Encryption(config.key);

var express = require('express');
var tesseract = require('tesseract.js');
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
            var jwxt_id = encryption.decryptText(req.cookies.user.id);
            var jwxt_password = encryption.decryptText(req.cookies.user.password);
        } catch(err) {
            res.redirect(server_url + '/sign_out');
            res.end();
        }
        login = 1;
        if((!config.net_user || !config.net_password) && config.type === 0) {
            res.clearCookie('user');
            res.clearCookie('identity');
            res.redirect(server_url + '?message=访问教务系统错误，请重试');
            res.end();
        }
        var jwxt = new Inquire(jwxt_id, jwxt_password, config.type);
        try {
            jwxt.getCAPTCHA(validate_code_img, function(identity) {
                tesseract.recognize(validate_code_img, {
                    lang: 'eng'
                }).then(function(result) {
                    var ocr = result.text.replace(/\s+/g,"");
                    res.cookie('identity', encryption.encryptText(identity), {maxAge:6000000, path:'/', httpOnly:true});
                    res.render('home', {ocr, random_id, message, login, server_url});
                });
            });
        } catch(err) {
            res.clearCookie('user');
            res.clearCookie('identity');
            res.redirect(server_url + '?message=访问教务系统错误，请重试');
            res.end();
        }
    } else {
        login = 0;
        res.render('home', {random_id, message, login, server_url});
    }
});

app.get('/sign_in', function (req, res) {
    res.redirect(server_url);
    res.end();
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
            res.end();
        }
        res.redirect(server_url);
        res.end();
    } else {
        res.redirect(server_url + '?message=请输入正确的学号');
        res.end();
    }
});

app.get('/sign_out', function (req, res) {
    utils.deleteImgs();
    res.clearCookie('user');
    res.clearCookie('identity');
    res.redirect(server_url);
    res.end();
});

app.get('/get_grades', function (req, res) {
    res.redirect(server_url);
    res.end();
});

app.post('/get_grades', urlencodedParser, function (req, res) {
    utils.deleteImgs();
    if (!req.body.validate_code) {
        res.redirect(server_url + '?message=请输入验证码');
        res.end();
    }
    try {
        var jwxt_id = encryption.decryptText(req.cookies.user.id);
        var jwxt_password = encryption.decryptText(req.cookies.user.password);
    } catch(err) {
        res.redirect(server_url + '/sign_out');
        res.end();
    }
    var jwxt = new Inquire(jwxt_id, jwxt_password, config.type);
    try {
        jwxt.getGrades(req.body.method, req.body.validate_code, encryption.decryptText(req.cookies.identity), function(content, gpa) {
            res.render('grades', {server_url, gpa, content, type: req.body.method});
        });
    } catch(err) {
        res.redirect(server_url + '?message=尚未查询到成绩（请确认学号，密码和验证码均输入正确，以及确认验证码是否过期）');
        res.end();
    }
});

app.get('/logout.do', function (req, res) {
    res.redirect(server_url + '?message=尚未查询到成绩（请确认学号，密码和验证码均输入正确，以及确认验证码是否过期）');
    res.end();
});

var server = app.listen(server_port, function () {
    var host = server.address().address;
    var port = server.address().port;
    console.log("Successfully booted on http://%s:%s", host, port);
    console.log("URL: " + server_url);
});