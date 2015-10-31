module.exports = function(content, file, settings) {
    return require('./lib')(content, file, settings).renderTpl();
};