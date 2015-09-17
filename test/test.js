// register global variable
Object.defineProperty(global, 'fis', {
  enumerable: true,
  writable: false,
  value: require('fis3')
});

var expect = require('chai').expect;
var parser = require('../index2');
var path = require('path');

describe('VMParser', function() {
  it('VMParser.replaceExt', function() {
    expect(parser.replaceExt('/widget/header/header.vm', '.mock')).to.equal('/widget/header/header.mock');
  });

  it('VMParser.getAbsolutePath', function() {
    var file = '/page/macro.vm';
    var root = [
      path.resolve('.') + '/example/pure'
    ];
    expect(parser.getAbsolutePath(file, root)).to.equal(path.resolve(root[0] + '/' + file));
  });

  it('VMParser.getParseFiles', function() {
    var filepath = 'index.vm';
    var opt = {
      root: [__dirname + '/parse']
    };
    expect(parser.getParseFiles(filepath, opt)).to.have.length(3);
  });


  it('VMParser.getContext', function() {
    var file = 'index.vm';
    var opt = {
      root: [__dirname + '/parse']
    };
    var widgets = parser.getParseFiles(file, opt);
    var pageFile = {
      subpath: file
    };
    expect(parser.getContext(widgets, pageFile, opt.root)).to.have.property('script');
    expect(parser.getContext(widgets, pageFile, opt.root)).to.have.property('header');

  });

});