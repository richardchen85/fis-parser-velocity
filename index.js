var Engine = require('velocity').Engine,
    path = require('path'),
    util = fis.util;

/**
 * fis-parser-velocity
 * @param content
 * @param file
 * @param settings
 * @returns {String} 编译后的html内容
 */
function VMParser(content, file, settings) {
    this.file = file;
    // 配置文件读取
    this.opt = require('./config.js');
    util.merge(this.opt, settings);
    this.opt.template = content;
    this.opt.macro = this.getAbsolutePath(this.opt.macro, this.opt.root);
    this.opt.commonMock = this.getAbsolutePath(this.opt.commonMock, this.opt.root);

    // 本地变量初始化
    this.vmFiles = [];
    this.jsFiles = [];
    this.cssFiles = [];
    this.mockFiles = [];
}

VMParser.prototype = {
    constructor: VMParser,
    /**
     * 对文件内容进行渲染
     */
    renderTpl: function() {
        var self = this,
            opt = this.opt,
            file = this.file,
            root = opt.root,
            context = {},
            result = opt.template;

        if (result === '') {
            return result;
        }

        // 获取#parse引入的文件
        this.getParseFiles();

        // 获取所有依赖的context
        context = this.getContext();

        // 得到解析后的文件内容
        result = opt.parse ? new Engine(opt).render(context) : result;
        // 收集#script和#css依赖
        result = this.getStaticFils(result);
        // 添加依赖到输入内容
        result = this.addStatics(result);

        // 添加依赖缓存，用于同步更新
        this.addDeps();

        return result;
    },
    /**
     * 读取所有依赖的mock文件，并加入页面依赖缓存，用于同步更新
     * @return
     *  [Object]
     */
    getContext: function() {
        var context = {};
        var self = this;
        var opt = this.opt;
        var root = opt.root;
        var arrFiles = [];

        // 添加全局mock到context
        if(opt.commonMock) {
            arrFiles.push(opt.commonMock);
        }

        // 将页面文件同名mock文件加入context
        var pageMock = this.getAbsolutePath(this.replaceExt(this.file.subpath, '.mock'), root);
        if(pageMock) {
            arrFiles.push(pageMock);
        }

        // 将#parse引入的mock文件加入context
        arrFiles = arrFiles.concat(this.mockFiles);

        arrFiles.forEach(function(_file) {
            if(_file) {
                util.merge(context, require(_file));
                delete require.cache[_file];
            }
        });

        return context;
    },
    /**
     * 通过内容获取所有#parse引用的文件，保存同名css, js, mock文件路径
     */
    getParseFiles: function() {
        var self = this,
            opt = this.opt,
            root = opt.root,
            file = this.getAbsolutePath(this.file.subpath, root),
            content = file ? util.read(file) : '',
            regParse = /(#?)#parse\(\s*('|")([^\)]+)\2\s*\)/g,
            _tmpArr;

        while((_tmpArr = regParse.exec(content)) !== null) {
            var _uri = _tmpArr[3];
            var _cssArr, _jsFile, _mockFile;
            if(_tmpArr[1] !== '' || self.vmFiles.indexOf(_uri) >= 0) {
                continue;
            }
            _cssArr = [
                self.replaceExt(_uri, '.scss'),
                self.replaceExt(_uri, '.less'),
                self.replaceExt(_uri, '.css')
            ];
            _cssArr.forEach(function(css) {
                if(self.getAbsolutePath(css, root)) {
                    self.cssFiles.push(css);
                }
            });
            _jsFile = self.replaceExt(_uri, '.js');
            if(self.getAbsolutePath(_jsFile, root)) {
                self.jsFiles.push(_jsFile);
            }
            _mockFile = self.getAbsolutePath(self.replaceExt(_uri, '.mock'), root);
            if(_mockFile) {
                self.mockFiles.push(_mockFile);
            }
            self.vmFiles.push(_uri);
            self.getParseFiles(_uri, opt);
        }
    },
    /**
     * 通过内容获取所有#script和#css引入的文件, 如果js文件有同名css文件，一并加入进来
     * @param content [String]
     * @return content [String] 将#script和#css替换为为空，后续统一加载依赖资源
     */
    getStaticFils: function(content) {
        var self = this,
            scriptResult,
            cssResult;

        // 收集#script引入的js文件
        scriptResult= this.compileScript(content);
        content = scriptResult.content;
        this.jsFiles.concat(scriptResult.scripts);
        // 检测js同名css文件
        scriptResult.scripts.forEach(function(uri) {
            var arrCss = [
                self.replaceExt(uri, '.css'),
                self.replaceExt(uri, '.less'),
                self.replaceExt(uri, '.sass')
            ];
            arrCss.forEach(function(css) {
                if(self.getAbsolutePath(css)) {
                    self.cssFiles.push(css)
                }
            });
        });
        // 收集#css引入的css文件
        cssResult = this.compileCss(content);
        content = cssResult.content;
        this.cssFiles.concat(cssResult.css);

        return content;
    },
    /**
     * 通过内容获取所有#script引用的文件
     * @param content
     * @return [Object]
     *   {
     *     content: [String] 替换过后的内容
     *     scripts: [Array] 收集到的script文件
     *   }
     */
    compileScript: function(content) {
        var arrScript = [],
            regScript = /\s*(#?)#script\(\s*('|")([^\)]+)\2\s*\)/g;
        content = content.replace(regScript, function(match, comment, qoute, uri) {
            var result = '';
            arrScript.push(uri);
            return '';
        });
        return {
            content: content,
            scripts: arrScript
        };
    },
    /**
     * 通过内容获取所有#css引用的文件
     * @param content
     * @return [Object]
     *   {
     *     content: [String] 替换过后的内容
     *     css: [Array] 收集到的css文件
     *   }
     */
    compileCss: function(content) {
        var arrCss = [],
            regCss = /\s*(#?)#css\(\s*('|")([^\)]+)\2\s*\)/g;
        content = content.replace(regCss, function(match, comment, qoute, uri) {
            var result = '';
            arrCss.push(uri);
            return '';
        });
        return {
            content: content,
            css: arrCss
        };
    },
    /** 替换文件的扩展名
     * @example
     * replaceExt('/widget/a/a.html', '.css') => '/widget/a/a.css'
     */
    replaceExt: function(pathname, ext) {
        return pathname.substring(0, pathname.lastIndexOf('.')) + ext;
    },
    /**
     * 返回文件绝对路径，因为root为数组，所以每个root都得判断一下
     * @param file {String} 文件相对路径
     * @param root {Array} root目录数组
     * @return {String} 返回文件绝对路径或者null
     */
    getAbsolutePath: function(file, root) {
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
    },
    /**
     * 添加静态资源依赖
     */
    addStatics: function(content) {
        var self = this,
            opt = this.opt,
            loader = opt.loader || null,// 模块化加载函数名称[requirejs|modjs|seajs]
            loadSync = opt.loadSync,
            root = opt.root,
            strCss = '',
            strJs = '',
            rCssHolder = /<!--\s?WIDGET_CSS_HOLDER\s?-->/,
            rJsHolder = /<!--\s?WIDGET_JS_HOLDER\s?-->/;

        // 拼接css文件引入
        this.cssFiles.forEach(function(_uri) {
            strCss += '    <link rel="stylesheet" href="' + _uri + '">\n';
        });
        // 非模块化直接拼接script标签
        this.jsFiles.forEach(function(_uri) {
            strJs += '<script src="' + _uri + '"></script>\n';
        });
        // 模块化加载
        if(loader) {
            // 如果未开启同步加载，先清空strJs
            if(!loadSync) {
                strJs = '';
            }
            switch(loader) {
                case 'require':
                case 'requirejs':
                case 'modjs':
                    strJs += '<script>require(["' + this.jsFiles.join('","') + '"]);</script>\n';
                    break;
                case 'seajs.use':
                case 'seajs':
                    strJs += '<script>seajs.use(["' + this.jsFiles.join('","') + '"]);</script>\n';
            }
        }

        if(rCssHolder.test(content)) {
            content = content.replace(rCssHolder, strCss);
        } else {
            // css放在</head>标签之前
            content = content.replace(/(<\/head>)/i, strCss + '$1');
        }

        if(rJsHolder.test(content)) {
            content = content.replace(rJsHolder, strJs);
        } else {
            // js放在</body>标签之前
            content = content.replace(/(<\/body>)/i, strJs + '$1');
        }

        return content;
    },
    /*
     * 将所有引入的vm和mock文件加入依赖缓存，用于文件修改时，自动编译
     */
    addDeps: function() {
        var self = this,
            opt = this.opt,
            file = this.file,
            root = opt.root,
            arr = [];

        // 添加全局mock到context
        if(opt.commonMock) {
            arr.push(opt.commonMock);
        }

        // 将页面文件同名mock文件加入context
        var pageMock = this.getAbsolutePath(this.replaceExt(this.file.subpath, '.mock'), root);
        if(pageMock) {
            arr.push(pageMock);
        }

        arr = arr.concat(this.vmFiles.map(function(vm) {
            return self.getAbsolutePath(vm, root);
        }));
        arr = arr.concat(this.mockFiles);

        arr.forEach(function(_uri) {
            _uri && file.cache.addDeps(_uri);
        });
    }
};

module.exports = function(content, file, settings) {
    return new VMParser(content, file, settings).renderTpl();
};