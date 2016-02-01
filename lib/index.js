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
    this.opt = require('../config.js');
    util.merge(this.opt, settings);
    this.opt.template = content;
    this.opt.macro = this.getAbsolutePath(this.opt.macro, this.opt.root);
    this.opt.commonMock = this.getAbsolutePath(this.opt.commonMock, this.opt.root);

    // 本地变量初始化
    this.vmFiles = [];
    this.jsFiles = [];
    this.jsBlocks = [];
    this.cssFiles = [];
    this.cssBlocks = [];
    this.mockFiles = [];
    this.framework = ''
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

        if (opt.template === '') {
            return '';
        }

        // 收集#script和#style依赖
        opt.template = this.compileStatic(opt.template);
        // 获取#parse引入的文件
        opt.template = this.compileParse(opt.template);
        // 获取所有依赖的context
        context = this.getContext();

        // 得到解析后的文件内容
        result = opt.parse ? new Engine(opt).render(context) : opt.template;
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
        var context = {},
            self = this,
            opt = this.opt,
            root = opt.root,
            arrFiles = [];

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
    // 解析内容中#parse引入的文件，收集同名css, js, mock文件
    compileParse: function(content) {
        var self = this,
            opt = this.opt,
            root = opt.root,
            regParse = /(#?)#parse\(\s*('|")([^\)]+)\2\s*\)/g;

        content = content.replace(regParse, function(match, comment, qoute, uri) {
            if(comment !== '') {
                return match;
            }
            var file = self.getAbsolutePath(uri, root);
            var result = '';
            var _cssArr, _jsFile, _mockFile;
            if(file) {
                self.vmFiles.push(file);
                result = util.read(file);
                // 收集css文件
                _cssArr = [
                    self.replaceExt(uri, '.scss'),
                    self.replaceExt(uri, '.less'),
                    self.replaceExt(uri, '.css')
                ];
                _cssArr.forEach(function(css) {
                    if(self.getAbsolutePath(css, root) && self.cssFiles.indexOf(css) === -1) {
                        self.cssFiles.push(css);
                    }
                });
                // 收集js文件
                _jsFile = self.replaceExt(uri, '.js');
                if(self.getAbsolutePath(_jsFile, root) && self.jsFiles.indexOf(_jsFile) === -1) {
                    self.jsFiles.push(_jsFile);
                }
                // 收集mock文件
                _mockFile = self.getAbsolutePath(self.replaceExt(uri, '.mock'), root);
                if(_mockFile && self.mockFiles.indexOf(_mockFile) === -1) {
                    self.mockFiles.push(_mockFile);
                }
                // 收集#script和#style依赖
                result = self.compileStatic(result);
                if(regParse.test(result)) {
                    result = self.compileParse(result);
                }
                // 开启模板解析时，返回文件内容，否则保持原样
                if(opt.parse) {
                    return result;
                } else {
                    return match;
                }
            } else {
                throw new Error('can not load:' + uri + ' [' + self.file.subpath + ']');
            }
        });
        return content;
    },
    /**
     * 解析静态资源标签#style, #framework, #script
     * @param content [String]
     * @return content [String] 将#style,#framework,#script替换为为空，后续统一加载依赖资源
     */
    compileStatic: function(content) {
        var self = this,
            opt = this.opt,
            regCss = /\s*(#?)#style\(\s*('|")([^\)]+)\2\s*\)/g,
            regCssBlock = /(\s*#style\(\)([\s\S]*?)#endstyle)\n?/g,
            regFrameWork = /\s*(#?)#framework\(\s*('|")([^\)]+)\2\s*\)/g,
            regScript = /\s*(#?)#script\(\s*('|")([^\)]+)\2\s*\)/g,
            regScriptBlock = /(\s*#script\(\)([\s\S]*?)#endscript)\n?/g;

        // 替换#style
        content = content.replace(regCss, function(match, comment, qoute, uri) {
            if(comment !== '') {
                return match;
            }
            if(self.cssFiles.indexOf(uri) === -1) {
                self.cssFiles.push(uri);
            }
            return '';
        });
        // 替换#style()...#endstyle
        content = content.replace(regCssBlock, function(match, css, block) {
            self.cssBlocks.push(block);
            return '';
        });
        // 替换#framework
        content = content.replace(regFrameWork, function(match, comment, qoute, uri) {
            if(comment !== '') {
                return match;
            }
            self.framework = uri;
            return '';
        });
        // 替换#script
        content = content.replace(regScript, function(match, comment, qoute, uri) {
            if(comment !== '') {
                return match;
            }
            if(self.jsFiles.indexOf(uri) === -1) {
                self.jsFiles.push(uri);
                // 引入同名css文件
                var arrCss = [
                    self.replaceExt(uri, '.css'),
                    self.replaceExt(uri, '.less'),
                    self.replaceExt(uri, '.sass')
                ];
                arrCss.forEach(function(css) {
                    if(self.getAbsolutePath(css, self.opt.root) && self.cssFiles.indexOf(css) === -1) {
                        self.cssFiles.push(css)
                    }
                });
            }
            return '';
        });
        // 替换#script() ... #endscript
        content = content.replace(regScriptBlock, function(match, script, block) {
            self.jsBlocks.push(block);
            return '';
        });
        return content;
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
            strFrameWork = '',
            strJs = '',
            rCssHolder = /<!--\s?WIDGET_CSS_HOLDER\s?-->/,
            rFrameWorkHolder = /<!--\s?WIDGET_FRAMEWORK_HOLDER\s?-->/,
            rJsHolder = /<!--\s?WIDGET_JS_HOLDER\s?-->/;

        // 拼接css文件引入
        this.cssFiles.forEach(function(_uri) {
            strCss += '    <link rel="stylesheet" href="' + _uri + '">\n';
        });
        // 拼接内嵌css代码块
        if(this.cssBlocks.length > 0) {
            strCss += '<style>';
            this.cssBlocks.forEach(function (block) {
                strCss += block;
            });
            strCss += '</style>\n';
        }
        if(rCssHolder.test(content)) {
            content = content.replace(rCssHolder, strCss);
        } else {
            // css放在</head>标签之前
            content = content.replace(/(<\/head>)/i, strCss + '$1');
        }

        // js modules框架引入
        if(this.framework !== '') {
            strFrameWork = '<script data-loader src="' + this.framework + '"></script>\n';
            if(rFrameWorkHolder.test(content)) {
                content.replace(rFrameWorkHolder, strFrameWork);
            } else {
                // js放在</body>标签之前
                content = content.replace(/(<\/body>)/i, strFrameWork + '$1');
            }
        }

        if(this.jsFiles.length > 0) {
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
                        strJs += '<script>require(["' + self.jsFiles.join('","') + '"]);</script>\n';
                        break;
                    case 'seajs.use':
                    case 'seajs':
                        strJs += '<script>seajs.use(["' + self.jsFiles.join('","') + '"]);</script>\n';
                }
            }
        }
        // 拼接内嵌js代码块
        if(this.jsBlocks.length > 0) {
            strJs += '<script type="text/javascript">\n';
            this.jsBlocks.forEach(function(block) {
                strJs += block;
            });
            strJs += '</script>\n';
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

        arr = arr.concat(this.vmFiles);
        arr = arr.concat(this.mockFiles);

        arr.forEach(function(_uri) {
            _uri && file.cache.addDeps(_uri);
        });
    }
};

module.exports = function(content, file, opt) {
    return new VMParser(content, file, opt);
};