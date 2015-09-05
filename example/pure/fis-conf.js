var root = fis.project.getProjectPath()
var util = fis.util
var vmConf = {
    loadJs: true,
    macro: '/macro.vm',
    commonMock: '/commonMock.mock',
    root: [root, root + '/page']
}

// 使用fis-parser-velocity直接编译html文件
fis
    .match('*.vm', {
        parser: fis.plugin('velocity', vmConf),
        rExt: '.html',
        loaderLang: 'html'
    })
    .match('{/page/macro,/widget/**}.{vm,json}', {
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
        parser: fis.plugin('velocity', tmpVelocity),
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