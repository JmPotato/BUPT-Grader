var config = require('./config.js');
var Calculator = require('./calculator.js');

var fs = require('fs');
var cheerio = require("cheerio");
var iconv = require('iconv-lite');
var request = require('request');
var tesseract = require('tesseract.js');

function Inquire(jwxt_id, jwxt_password, type) {
    var that = this;
    this.getCAPTCHA = function(validate_code_img) {
        const promise = new Promise(function(resolve, reject) {
            if(type === 0) {
                request.get({url: 'https://vpn.bupt.edu.cn/global-protect/login.esp', encoding: null, gzip: true}, function (error, response, body) {
                    try {
                        var ticket_1 = response.headers["set-cookie"].toString().substring(0,42);
                    } catch(err) {
                        reject(new Error("Faild to access Jwxt."));
                        return;
                    }
                    var post_headers = {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/11.1.2 Safari/605.1.15',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                        'Accept-Language': 'zh-CN,zh;q=0.9',
                        'Accept-Encoding': 'gzip, deflate',
                        'content-type': 'application/x-www-form-urlencoded',
                        'Connection': 'keep-alive',
                        'Cookie': ticket_1,
                    };
                    var form = {
                        prot: 'https:',
                        server: 'vpn.bupt.edu.cn',
                        inputStr: '',
                        action: 'getsoftware',
                        user: config.net_user,
                        passwd: config.net_password,
                        ok: 'Log In'
                    };
                    request.post({url: 'https://vpn.bupt.edu.cn/global-protect/login.esp', encoding: null, gzip: true, headers: post_headers, form: form}, function (error, response, body) {
                        request.get({url: 'https://vpn.bupt.edu.cn/global-protect/portal/portal.esp', encoding: null, headers: {'Cookie': ticket_1}}, function (error, response, body) {
                            try {
                                var ticket_2 = response.headers["set-cookie"].toString().substring(0,46);
                            } catch(err) {
                                reject(new Error("Faild to access Jwxt."));
                                return;
                            }
                            request.get({url: 'https://vpn.bupt.edu.cn/http/jwxt.bupt.edu.cn/validateCodeAction.do?gp-1&random=', encoding: null, headers: {'Cookie': ticket_1 + '; ' + ticket_2}}, function (error, response, body) {
                                try {
                                    var ticket_3 = response.headers["set-cookie"].toString().substring(0,46);
                                } catch(err) {
                                    reject(new Error("Faild to access Jwxt."));
                                    return;
                                }
                                var identity = ticket_1 + '; ' + ticket_2 + "; PAN_GP_CK_VER=2; PAN_GP_CACHE_LOCAL_VER_ON_SERVER=0; GP_CLIENT_CK_UPDATES=; PAN_GP_CK_VER_ON_CLIENT=2";
                                that.checkCAPTCHA(validate_code_img, identity).then(function(ocr) {
                                    resolve([ocr, identity]);
                                    return;
                                }).catch(err => {
                                    reject(err);
                                });
                            }).pipe(fs.createWriteStream(validate_code_img));
                        });
                    });
                });
            } else if(type === 1) {
                request.get({url: 'https://jwxt.bupt.edu.cn/validateCodeAction.do?gp-1&random=', encoding: null}, function (error, response, body) {
                    try {
                        var ticket_1 = response.headers["set-cookie"].toString();
                    } catch(err) {
                        reject(new Error("Faild to access Jwxt."));
                        return;
                    }
                    var identity = ticket_1;
                    that.checkCAPTCHA(validate_code_img, identity).then(function(ocr) {
                        resolve([ocr, identity]);
                        return;
                    }).catch(err => {
                        reject(err);
                    });
                }).pipe(fs.createWriteStream(validate_code_img));
            }
        });
        return promise;
    };
    this.checkCAPTCHA = function(img, identity) {
        const promise = new Promise(function(resolve, reject) {
            tesseract.recognize(img, {
                lang: 'eng'
            }).then(function(result) {
                var ocr = result.text.replace(/\s+/g,"");
                var correction = /^[a-zA-Z0-9]{4}$/;
                if(!correction.test(ocr)) {
                    reject(new Error("Wrong Result."));
                    return;
                } else {
                    var jwxt = new Inquire(jwxt_id, jwxt_password, config.type);
                    jwxt.getGrades('all', ocr, identity).then(grades => {
                        resolve(ocr);
                    }).catch(err => {
                        reject(err);
                        return;
                    });
                }
            }).catch(err => {
                reject(new Error("Wrong Result."));
            });
        });
        return promise;
    };
    this.getGrades = function(method, validate_code, identity) {
        const promise = new Promise(function(resolve, reject) {
            var grades = '';
            var jwxt_url = '';
            if(config.type === 0)
                jwxt_url = "https://vpn.bupt.edu.cn/http/jwxt.bupt.edu.cn";
            else
                jwxt_url = "https://jwxt.bupt.edu.cn";
            var post_headers = {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/11.1.2 Safari/605.1.15',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'content-type': 'application/x-www-form-urlencoded',
                'Connection': 'keep-alive',
                'Cookie': identity,
            };
            var get_headers = {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/11.1.2 Safari/605.1.15',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                'Cookie': identity,
            };
            var form = {
                type: 'sso',
                zjh: jwxt_id,
                mm: jwxt_password,
                v_yzm: validate_code,
            };
            request.post({url: jwxt_url + '/jwLoginAction.do', encoding: null, gzip: true, headers: post_headers, form: form}, function (error, response, body) {
                try {
                    var title = cheerio.load(iconv.decode(body, 'gb2312'));
                } catch(err) {
                    reject(new Error("Expired Login."));
                    return;
                }
                if(title("title").text() === "URP 综合教务系统 - 登录") {
                    reject(new Error("Bad Login."));
                    return;
                } else if (method === 'all') {
                    request.get({url: jwxt_url + '/gradeLnAllAction.do?type=ln&oper=sxinfo&lnsxdm=001', encoding: null, gzip: true, headers: get_headers}, function (error, r, body) {
                        try {
                            grades = iconv.decode(body, 'gb2312');
                        } catch(err) {
                            reject(new Error("Wrong Result."));
                            return;
                        }
                        var calculator = new Calculator(grades, 'all');
                        var content = calculator.purifyTable();
                        var gpa = calculator.calculateGPA();
                        if (!Boolean(content.text())) {
                            reject(new Error("Wrong Result."));
                            return;
                        }
                        resolve([content, gpa.toFixed(4)]);
                    });
                } else if (method === 'current') {
                    request.get({url: jwxt_url + '/bxqcjcxAction.do', encoding: null, gzip: true, headers: get_headers}, function (error, r, body) {
                        try {
                            grades = iconv.decode(body, 'gb2312');
                        } catch(err) {
                            reject(new Error("Wrong Result."));
                            return;
                        }
                        var calculator = new Calculator(grades, 'current');
                        var content = calculator.purifyTable();
                        var gpa = calculator.calculateGPA();
                        if (!Boolean(content.text())) {
                            reject(new Error("Wrong Result."));
                            return;
                        }
                        resolve([content, gpa.toFixed(4)]);
                    });
                }
            });
        });
        return promise;
    };
};

module.exports = Inquire;