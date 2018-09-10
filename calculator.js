'use strict';

var cheerio = require("cheerio");

function Calculator(grades, type) {
    var $ = cheerio.load(grades);
    this.purifyTable = function () {
        if (type === 'current')
            return $("table.displayTag").removeClass('displayTag').addClass('table').attr('cellpadding', null).attr('width', null).attr('cellspacing', null).attr('border', null).attr('id', null);
        if (type === 'all')
            return $("table.titleTop2").removeClass('titleTop2').addClass('table').attr('cellpadding', null).attr('width', null).attr('cellspacing', null).attr('border', null);
    };
    this.calculateGPA = function () {
        var point_1 = /^[0-9]+(.[0-9]{1})?$/
        var point_2 = /^.[0-9]{2}?$/
        var mark = /^\d{2}$/
        if (type === 'current') {
            //return result;
        }
        if (type === 'all') {
            //return result;
        }
    };
};

module.exports = Calculator;