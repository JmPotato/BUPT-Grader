const config = require('./config.js');
const Utils = require('./utils.js');
const Inquire = require('./inquire.js');
const Encryption = require('./encryption.js');

const server_url = config.server_url;
const server_port = config.server_port;
const utils = new Utils();
const encryption = new Encryption(config.key);

const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

const urlencodedParser = bodyParser.urlencoded({ extended: false })
const app = express();

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
    if(req.cookies.captcha)
        res.clearCookie('captcha');
    if(req.cookies.identity)
        res.clearCookie('identity');
    if(req.param('message'))
        var message = req.param('message');
    else
        var message = '';
    if (req.cookies.user) {
        if(req.cookies.first)
            var first = true;
        else
            var first = false;
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
            res.redirect(server_url + '?message=服务器配置错误');
            res.end();
        }
        var jwxt = new Inquire(jwxt_id, jwxt_password, config.type);
        jwxt.getCAPTCHA(validate_code_img).then(result => {
            res.cookie('captcha', encryption.encryptText(result[0]), {maxAge:6000000, path:'/', httpOnly:true});
            res.cookie('identity', encryption.encryptText(result[1]), {maxAge:6000000, path:'/', httpOnly:true});
            res.clearCookie('first');
            res.render('home', {message, login, server_url});
        }).catch(err => {
            if(err.message === "Wrong Result.") {
                res.clearCookie('captcha');
                res.clearCookie('identity');
                res.redirect(server_url);
                res.end();
            } else if(err.message === "Bad Login." && first) {
                res.clearCookie('user');
                res.clearCookie('captcha');
                res.clearCookie('identity');
                res.redirect(server_url + '?message=学号或密码错误');
                res.end();
            } else if(err.message === "Faild to access Jwxt.") {
                res.clearCookie('user');
                res.clearCookie('captcha');
                res.clearCookie('identity');
                res.redirect(server_url + '?message=教务系统访问错误');
            } else {
                res.clearCookie('captcha');
                res.clearCookie('identity');
                res.redirect(server_url + '?message=' + message);
                res.end();
            }
        });
    } else {
        login = 0;
        res.clearCookie('first');
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
            res.cookie('first', 'first',{maxAge:2678400000,path:'/',httpOnly:true});
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
    try {
        var jwxt_id = encryption.decryptText(req.cookies.user.id);
        var jwxt_password = encryption.decryptText(req.cookies.user.password);
        var identity = encryption.decryptText(req.cookies.identity);
        var captcha = encryption.decryptText(req.cookies.captcha);
    } catch(err) {
        res.redirect(server_url + '/sign_out');
        res.end();
    }
    var jwxt = new Inquire(jwxt_id, jwxt_password, config.type);
    jwxt.getGrades(req.body.method, captcha, identity).then(grades => {
        res.render('grades', {server_url, gpa: grades[1], content: grades[0], type: req.body.method});
    }).catch(err => {
        if(err.message === "Expired Login.") {
            res.redirect(server_url + '?message=登陆信息过期，请重新查询');
            res.end();
        } else {
            res.redirect(server_url + '?message=尚未查询到成绩（请确认学号、密码均输入正确后重试）');
            res.end();
        }
    });
});

var server = app.listen(server_port, function () {
    var host = server.address().address;
    var port = server.address().port;
    console.log("Successfully booted on http://%s:%s", host, port);
    console.log("URL: " + server_url);
});