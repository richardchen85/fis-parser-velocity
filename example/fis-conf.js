'use strict'

const root = fis.project.getProjectPath();
const util = fis.util;
let packed = true;
let vmConf = {
    loader: 'requirejs',// null,requirejs,modjs,seajs
    loadSync: true,
    macro: '/macro.vm',
    commonMock: '/commonMock.mock',
    root: [root, root + '/page']
};

// 模块化勾子
if(vmConf.loader) {
    if(vmConf.loader !== 'seajs') {
        fis.hook('amd');
    } else {
        fis.hook('cmd');
    }
}

// 打包配置
fis.match('::package', {
    postpackager: fis.plugin('loader', {
        //resourceType: 'amd',
        useInlineMap: true,
        //allInOne: true
    })
});

// 使用fis-parser-velocity直接编译html文件
fis
    .match('*.vm', {
        parser: (content, file) => {
            return require('../')(content, file, vmConf);
        },
        rExt: '.html',
        loaderLang: 'html'
    })
    .match('{/page/macro,/widget/**}.{vm,json}', {
        release: false
    })
    .match('/page/**.mock', {
        release: false
    })
    // 加添scss编译
    .match('*.scss', {
        rExt: '.css',
        parser: fis.plugin('node-sass')
    })

// 合并配置
if(packed) {
    fis
        .match('/widget/**.{scss,css}', {
            packTo: '/widget/widget_pkg.css'
        })
        .match('/widget/**.js', {
            // 只有选择了模块化框架后才执行模块化
            isMod: vmConf.loader ? true : false,
            packTo: '/widget/widget_pkg.js'
        })
        .match('/widget/config.js', {
            isMod: false
        })
}

// 只发布VM文件
let tmpVelocity = util.merge({parse: false}, vmConf);
fis
    .media('vm')
    .match('*.vm', {
        parser: (content, file) => {
            return require('../')(content, file, tmpVelocity);
        },
        rExt: '.vm',
        deploy: fis.plugin('local-deliver', {
            to: './output/template'
        })
    })
    .match('/page/(**.vm)', {
        release: '$1'
    })
    .match('/widget/**.vm', {
        release: '$0'
    })