var root = fis.project.getProjectPath()
var util = fis.util
var mod = true
var vmConf = {
    loadJs: true,
    loader: 'seajs',
    loadSync: true,
    macro: '/macro.vm',
    commonMock: '/commonMock.mock',
    root: [root, root + '/page']
}

if(mod) {
    fis.hook('cmd', {
        baseUrl: '/'
    })
    fis.match('::package', {
        postpackager: fis.plugin('loader', {
            resourceType: 'cmd',
            useInlineMap: true,
            //allInOne: true
        })
    })
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
    .match('/widget/**.scss', {
        packTo: '/widget/widget_pkg.css'
    })
    .match('/widget/**.js', {
        isMod: true,
        packTo: '/widget/widget_pkg.js'
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