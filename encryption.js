var crypto = require('crypto');

function Encryption(key) {
    var key = key;
    this.encryptText = function (content) {
        var encrypted = '';
        var cip = crypto.createCipher('aes-256-cbc', key);
        encrypted += cip.update(content, 'utf8', 'hex');
        encrypted += cip.final('hex');
        return encrypted;
    };
    this.decryptText = function (content) {
        var decrypted = '';
        var decipher = crypto.createDecipher('aes-256-cbc', key);
        decrypted += decipher.update(content, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted
    };
};

module.exports = Encryption;