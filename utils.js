var fs = require('fs');

function Utils() {
    this.deleteImgs = function() {
        fs.readdir(__dirname + '/public/vc/', function(err, files) {
            if (err) {
                console.error(err);
            }
            files.forEach(function(file) {
                fs.unlinkSync(__dirname + '/public/vc/' + file);
            });
        });
    };
    
};

module.exports = Utils;