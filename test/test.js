// register global variable
Object.defineProperty(global, 'fis', {
  enumerable: true,
  writable: false,
  value: require('fis3')
});

var expect = require('chai').expect;
var path = require('path');
var util = fis.util;

var opt = {
  root: [path.resolve('.')]
};
var file = {
  subpath: './index.vm'
};
var content = fis.util.read(file.subpath);
var parser = new require('../lib')(content, file, opt);

describe('VMParser', function() {
  it('replaceExt', function() {
    var source = '/widget/header/header.vm';
    var result = '/widget/header/header.mock';
    expect(parser.replaceExt(source, '.mock')).to.equal(result);
  });

  it('getAbsolutePath', function() {
    var file = '/index.vm';
    expect(parser.getAbsolutePath(file, opt.root)).to.equal(path.resolve(opt.root[0] + '/' + file));
  });

  it('compileParse', function() {
    parser.compileParse(content);
    expect(parser.vmFiles).to.have.length(2);
    expect(parser.mockFiles).to.have.length(2);
  });

  it('compileStatic', function() {
    parser.compileStatic(content);
    expect(parser.cssFiles).to.have.length(1);
    expect(parser.framework).to.equal('static/lib/require.js');
    expect(parser.jsFiles).to.have.length(2);
  });

  it('getContext', function() {
    var context = parser.getContext();
    expect(context).to.have.property('header');
    expect(context).to.have.property('footer');
  });

});