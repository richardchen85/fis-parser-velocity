var path = require('path'),
    fs = require('fs'),
    velocity = require('../index.js');

var content = fs.readFileSync('./index.html', {encoding: 'utf-8'}),
    file = {
        realpath: path.resolve('./index.html'),
        subpath: '\index.html'
    },
    settings = {
        encoding: 'utf-8'
    };

var result = velocity(content, file, settings);
console.log(result);