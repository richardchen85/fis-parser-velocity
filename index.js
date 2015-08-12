var Engine = require('velocity').Engine,
    Parser = require('velocity').parser,
    path = require('path'),
    fs = require('fs'),
    util = require('util');

/**
 * 通过内容获取需要的上下文，读取引入文件的同名json文件
 * @return
 *  [Object]
 */
function getContext(widgets, opt) {
    var context = {};

    widgets.forEach(function(widget) {
        var file = path.join(opt.root, replaceExt(widget, 'json'));
        if(fs.existsSync(file)) {
            var json = JSON.parse(fs.readFileSync(file, { encoding: opt.encoding }));
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
function getWidgets(filepath, opt) {
    var file = path.join(opt.root, filepath),
        result = [],
        content = readFile(file, opt.encoding),
        ast = Parser.parse(content);

    if(!ast.body) {
        return result;
    }
    ast.body.forEach(function(p) {
        var value;
        // 只要#parse引入的文件
        if(p.type != 'Parse') {
            return;
        }
        value = p.argument.value;
        if(result.indexOf(value) >= 0) {
            return;
        }
        result.push(value);
        result = result.concat(getWidgets(value, opt));
    });

    return result;
}

/** 替换文件的扩展名
 * e.g.
 *   replaceExt('/widget/a/a.html', 'json') => '/widget/a/a.json'
 */
function replaceExt(pathname, ext) {
    return pathname.substring(0, pathname.lastIndexOf('.') + 1) + ext;
}

/**
 * 添加静态资源依赖
 */
function addStatics(widgets, content, opt) {
    var 
        // css文件数组
        arrCss = [],
        // js文件数组
        arrJs = [],
        // js拼接字符串
        strJs,
        // 模块化加载函数名称[require|seajs.use]
        loader = opt.loader || null,
        root = util.isArray(opt.root) ? opt.root[0] : opt.root;
    
    widgets.forEach(function(widget) {
        var scssFile = replaceExt(widget, 'scss'),
            lessFile = replaceExt(widget, 'less'),
            cssFile = replaceExt(widget, 'css'),
            jsFile = replaceExt(widget, 'js');
            
        if(fs.existsSync(path.join(root, scssFile))) {
            arrCss.push('<link rel="stylesheet" href="' + scssFile + '">\n');
        }
        if(fs.existsSync(path.join(root, lessFile))) {
            arrCss.push('<link rel="stylesheet" href="' + lessFile + '">\n')
        }
        if(fs.existsSync(path.join(root, cssFile))) {
            arrCss.push('<link rel="stylesheet" href="' + cssFile + '">\n');
        }
        if(fs.existsSync(path.join(root, jsFile))) {
            // 模块化加载，只保存文件路径
            if(loader) {
                arrJs.push(jsFile);
            } else {
                arrJs.push('<script src="' + jsFile + '"></script>\n');
            }
        }
    });
    // 非模块化直接拼接script标签
    if(!loader) {
        strJs = arrJs.join('');
    } else {
        // 模块化加载依赖
        // e.g. require(["a", "b]);
        strJs = '<script>' + loader + '(["' + arrJs.join('","') + '"]);</script>'
    }
    // css放在</head>标签之前
    content = content.replace(/(<\/head>)/i, arrCss.join('') + '$1');
    // js放在</body>标签之前
    content = content.replace(/(<\/body>)/i, strJs + '$1');
    
    return content;
}

/** 
 * 对文件内容进行渲染
 */
function renderTpl(content, file, opt) {
    var widgets, context, renderResult;
    
    if (content === '') {
        return content;
    }
    
    widgets = getWidgets(file.subpath, opt);
    context = getContext(widgets, opt);
    renderResult = new Engine(opt).render(context);
    
    renderResult = addStatics(widgets, renderResult, opt);

    return renderResult;
}

/** 
 * params:
 *  content: file content
 *  file: fis File object
 *  settings: fis plugin config
 *  e.g.
 *  {
 *    encoding: 'utf-8',
 *    loader: [require|seajs.use] // 模块化加载函数
 *  }
 * @return
 *   [String] parsed html content
 */
module.exports = function(content, file, settings) {
    //clone opt, because velocity may modify opt
    var opt = {
        encoding: 'utf-8'
    };
    for (var p in settings) {
        if (settings.hasOwnProperty(p)) {
            opt[p] = settings[p];
        }
    }
    opt.root = file.realpath.replace(file.subpath, '');
    opt.template = content;

    return renderTpl(content, file, opt);
};