var root = fis.project.getProjectPath()
var util = fis.util
var vmConf = {
    loadJs: true,
    macro: '/macro.vm',
    commonMock: '/commonMock.mock',
    root: [root, root + '/page']
}

fis.match('::package', {
    postpackager: fis.plugin('loader')
})

// 使用fis-parser-velocity直接编译html文件
fis
    .match('*.vm', {
        parser: function(content, file) {
            return require('../../')(content, file, vmConf);
        },
        rExt: '.html',
        loaderLang: 'html'
    })
    .match('{/page/macro,/widget/**}.{vm,json,mock}', {
        release: false
    })
    .match('/page/**.mock', {
        release: false
    })
    // 加添scss编译
    .match('*.scss', {
        rExt: '.css',
        parser: fis.plugin('sass')
    })
    .match('/widget/**.js', {
        isMod: true
    })

// 只发布VM文件
var tmpVelocity = util.merge({parse: false}, vmConf);
fis
    .media('vm')
    .match('*.vm', {
        parser: function(content, file) {
            return require('../../')(content, file, tmpVelocity);
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