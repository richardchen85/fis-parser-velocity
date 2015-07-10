var Engine = require('velocity').Engine,
    Parser = require('velocity').parser,
    path = require('path'),
    fs = require('fs'),
    util = require('util');

/**
 * 通过内容获取需要的上下文，读取引入文件的同名json文件
 * @return
 *  Object{}
 */
function getContext(content) {
    var context = {},
        dataFiles = [];

    dataFiles = getParseFiles(content);console.log(dataFiles)
    
    dataFiles.forEach(function(data) {
        var file = replaceExt(data, 'json');
        if(fs.existsSync(file)) {
            var json = JSON.parse(fs.readFileSync(file));
            for(var cnxt in json) {
                context[cnxt] = json[cnxt];
            }
        }
    });

    return context;
}

/**
 * 读取指定文件内容
 */
function readFile(filepath, encoding) {
    var result = '';
    if(fs.existsSync(filepath)) {
        result = fs.readFileSync(filepath, {encoding: encoding});
    }

    return result;
}

/**
 * 通过内容获取所有引用的文件
 * @return
 *   [filepath, filepath...]
 */
function getWidgets(filepath, root) {
    var file = path.join(root, filepath),
        result = [],
        content = readFile(file, root.encoding),
        ast = Parser.parse(content);

    if(!ast.body) {
        return result;
    }
    ast.body.forEach(function(p) {
        var value;
        if(p.type != 'Parse') {
            return;
        }
        value = p.argument.value;
        if(result.includes(value)) {
            return;
        }
        result.push(value);
        result = result.concat(getWidgets(value, root));
    });

    return result;
}

/** 替换文件的扩展名
 * e.g.
 *   replaceExt('/widget/a/a.html', 'json') => '/widget/a/a.json'
 */
function replaceExt(pathname, ext) {
    return pathname.substring(0, pathname.lastIndexOf('.') - 1) + ext;
}

function renderTpl(content, file, settings) {
    var context, renderResult;
    //clone opt, because velocity may modify opt
    var opt = {};
    for (var p in settings) {
        if (settings.hasOwnProperty(p)) {
            opt[p] = settings[p];
        }
    }

    if (content === '') {
        return content;
    }

    opt.filePath = file.path;
    opt.template = content;

    context = getContext(content);
    renderResult = new Engine(opt).render(context);

    return renderResult;
}

/** 
 * @params
 *  content: file content
 *  file: fis File object
 *  settings: fis plugin config
 *  e.g.
 *  {
 *   root: 'widget/',
 *   encoding: 'utf-8'
 *  }
 * @return => parsed html content
 */
module.exports = function(content, file, settings) {
    var widgets = [];
    //clone opt, because velocity may modify opt
    var opt = {};
    for (var p in settings) {
        if (settings.hasOwnProperty(p)) {
            opt[p] = settings[p];
        }
    }
    opt.root = file.realpath.replace(file.subpath, '');

    widgets = getWidgets(file.subpath, opt.encoding);
    console.log(widgets);

    //return renderTpl(content, file, settings);
};