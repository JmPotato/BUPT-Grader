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
        var grades_sum = 0;
        var points_sum = 0;
        var all_points = 0;
        if (type === 'all')
            $('.table').last().remove();
        $('tr.odd').each(function(i, elem) {
            if ($(this).children().eq(5).text().replace(/\s+/g,"") === '任选')
                return 0;
            var grade = parseFloat($(this).children().eq(6).text().replace(/\s+/g,""));
            var point = parseFloat($(this).children().eq(4).text().replace(/\s+/g,""));
            if (!isNaN(grade)) {
                grades_sum += grade * point;
                points_sum += point;
            }
            if (!isNaN(point)) {
                all_points += point;
            }
        });
        if (grades_sum === 0 && all_points !== 0) {
            return 0
        } else {
            return grades_sum/points_sum;
        }
    };
};

module.exports = Calculator;