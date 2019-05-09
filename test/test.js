'use strict'
// register global variable
Object.defineProperty(global, 'fis', {
  enumerable: true,
  writable: false,
  value: require('fis3')
});
const expect = require('chai').expect;
const path = require('path');
const util = fis.util;
let opt = {
  root: [path.resolve('.')]
};
let file = {
  subpath: './index.vm'
};
let content = fis.util.read(file.subpath);
const parser = new require('../lib')(content, file, opt);
describe('VMParser', () => {
  it('replaceExt', () => {
    let source = '/widget/header/header.vm';
    let result = '/widget/header/header.mock';
    expect(parser.replaceExt(source, '.mock')).to.equal(result);
  });
  it('getAbsolutePath', () => {
    let file = '/index.vm';
    expect(parser.getAbsolutePath(file, opt.root)).to.equal(path.resolve(opt.root[0] + '/' + file));
  });
  it('compileParse', () => {
    parser.compileParse(content);
    expect(parser.vmFiles).to.have.length(4);
    expect(parser.mockFiles).to.have.length(3);
  });
  it('compileStatic', () => {
    parser.compileStatic(content);
    expect(parser.cssFiles).to.have.length(1);
    expect(parser.framework).to.equal('static/lib/require.js');
    expect(parser.jsFiles).to.have.length(2);
  });
  it('getContext', () => {
    let context = parser.getContext();
    expect(context).to.have.property('header');
    expect(context).to.have.property('footer');
  });
});