var path = require('path'),
    fs = require('fs'),
    velocity = require('../index.js');

var content = fs.readFileSync('./index.html', {encoding: 'utf-8'}),
    file = {
        path: path.resolve('./index.html')
    },
    settings = {
        root: './'
    };

velocity(content, file, settings);