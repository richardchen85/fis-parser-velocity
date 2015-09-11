var Engine = require('velocity').Engine,
    path = require('path'),
    util = fis.util;

/**
 * 读取组件同名mock文件，并加入页面依赖缓存，用于同步更新
 * @return
 *  [Object]
 */
function getContext(widgets, pageFile, root) {
    var context = {};

    widgets = util.isArray(widgets) ? widgets : [widgets];
    widgets.forEach(function(widget) {
        // 如果是页面文件，则不加入依赖缓存
        var dep = widget !== pageFile.subpath;
        var file = getAbsolutePath(replaceExt(widget, '.mock'), root);
        if(file) {
            util.merge(context, require(file));
            delete require.cache[file];
            addDeps(pageFile, file);
            if(dep) {
                addDeps(pageFile, getAbsolutePath(widget, root));
            }
        }
    });

    return context;
}

/**
 * 通过内容获取所有#parse引用的文件
 * @return
 *   [filepath, filepath...]
 */
function getParseFiles(filepath, opt) {
    var file = getAbsolutePath(filepath, opt.root),
        result = [],
        content = file ? util.read(file) : '',
        regParse = /(#?)#parse\(('|")([^\)]+)\2\)/g,
        _tmpArr;

    while((_tmpArr = regParse.exec(content)) !== null) {
        if(_tmpArr[1] !== '' || result.indexOf(_tmpArr[3]) >= 0) {
            continue;
        }
        result.push(_tmpArr[3]);
        result = result.concat(getParseFiles(_tmpArr[3], opt));
    }

    return result;
}

/** 替换文件的扩展名
 * @example
 * replaceExt('/widget/a/a.html', '.css') => '/widget/a/a.css'
 */
function replaceExt(pathname, ext) {
    return pathname.substring(0, pathname.lastIndexOf('.')) + ext;
}

/**
 * 返回文件绝对路径，因为root为数组，所以每个root都得判断一下
 * @param file {String} 文件相对路径
 * @param root {Array} root目录数组
 * @return {String} 返回文件绝对路径或者null
 */
function getAbsolutePath(file, root) {
    var result = null;
    if(!file || !root || !util.isArray(root)) {
        return result;
    }
    for(var i = 0; i < root.length; i++) {
        if(util.exists(path.join(root[i], file))) {
            result = path.join(root[i], file);
            break;
        }
    }
    return result;
}

/**
 * 添加静态资源依赖
 */
function addStatics(widgets, content, file, opt) {
    var
        // css文件数组
        arrCss = [],
        // js文件数组
        arrJs = [],
        // js拼接字符串
        strJs = '',
        loadJs = opt.loadJs,
        // 模块化加载函数名称[requirejs|modjs|seajs]
        loader = opt.loader || null,
        loadSync = opt.loadSync,
        root = opt.root,
        rCssHolder = /<!--\s?WIDGET_CSS_HOLDER\s?-->/,
        rJsHolder = /<!--\s?WIDGET_JS_HOLDER\s?-->/;

    widgets.forEach(function(widget) {
        widget = widget[0] === '/' ? widget : '/' + widget;
        var
            scssFile = replaceExt(widget, '.scss'),
            lessFile = replaceExt(widget, '.less'),
            cssFile = replaceExt(widget, '.css'),
            jsFile = replaceExt(widget, '.js');

        if(getAbsolutePath(scssFile, root)) {
            arrCss.push('<link rel="stylesheet" href="' + scssFile + '">\n');
        }
        if(getAbsolutePath(lessFile, root)) {
            arrCss.push('<link rel="stylesheet" href="' + lessFile + '">\n')
        }
        if(getAbsolutePath(cssFile, root)) {
            arrCss.push('<link rel="stylesheet" href="' + cssFile + '">\n');
        }
        if(loadJs && getAbsolutePath(jsFile, root)) {
            arrJs.push(jsFile);
        }
    });

    // 非模块化直接拼接script标签
    arrJs.forEach(function(jsFile) {
        strJs += '<script src="' + jsFile + '"></script>\n';
    });
    if(loader) {
        // 如果未开启同步加载，先清空strJs
        if(!loadSync) {
            strJs = '';
        }
        switch(loader) {
            case 'require':
            case 'requirejs':
            case 'modjs':
                strJs += '<script>require(["' + arrJs.join('","') + '"]);</script>\n';
                break;
            case 'seajs.use':
            case 'seajs':
                strJs += '<script>seajs.use(["' + arrJs.join('","') + '"]);</script>\n';
        }
    }

    if(rCssHolder.test(content)) {
        content = content.replace(rCssHolder, arrCss.join(''));
    } else {
        // css放在</head>标签之前
        content = content.replace(/(<\/head>)/i, arrCss.join('') + '$1');
    }

    if(rJsHolder.test(content)) {
        content = content.replace(rJsHolder, strJs);
    } else {
        // js放在</body>标签之前
        content = content.replace(/(<\/body>)/i, strJs + '$1');
    }

    return content;
}

/**
 * 对文件内容进行渲染
 */
function renderTpl(content, file, opt) {
    var widgets,
        context = {},
        commonMock = opt.commonMock,
        root = opt.root,
        parse = opt.parse;

    if (content === '') {
        return content;
    }

    // 获取#parse引入的文件
    widgets = getParseFiles(file.subpath, opt);

    // 添加全局mock到context
    if(commonMock) {
        util.merge(context, require(commonMock));
        delete require.cache[commonMock];
        addDeps(file, commonMock);
    }

    // 将页面文件同名mock文件加入context
    util.merge(context, getContext(file.subpath, file, root));

    // 将widgets的mock文件加入context
    util.merge(context, getContext(widgets, file, root));

    // 得到解析后的文件内容
    content = parse ? new Engine(opt).render(context) : content;

    // 添加widgets的js和css依赖到输入内容
    content = addStatics(widgets, content, file, opt);

    return content;
}

/*
 * 对引入本widget的文件添加FIS依赖，当本widget模板文件修改时，自动编译
 * @param {Object} a
 * @param {Object} b
 */
function addDeps(a, b) {
    if (a && a.cache && b) {
        if (b.cache) {
            a.cache.mergeDeps(b.cache);
        }
        a.cache.addDeps(b.realpath || b);
    }
}

/**
 * fis-parser-velocity
 * @param content
 * @param file
 * @param settings
 * @returns {String} 编译后的html内容
 */
module.exports = function(content, file, settings) {
    var opt = require('./config.js');
    util.merge(opt, settings);
    opt.template = content;
    opt.macro = getAbsolutePath(opt.macro, opt.root);
    opt.commonMock = getAbsolutePath(opt.commonMock, opt.root);
    return renderTpl(content, file, opt);
};