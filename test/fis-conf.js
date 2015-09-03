var root = fis.project.getProjectPath()
var util = fis.util
var mod = false
var vmConf = {
    loadJs: true,
    loader: null,
    macro: '/macro.vm',
    root: [root, root + '/page']
}

if(mod) {
    fis.hook('amd', {
        baseUrl: '/'
    })
    fis.match('::package', {
        postpackager: fis.plugin('loader', {
            useInlineMap: true
        })
    })
}

// 使用fis-parser-velocity直接编译html文件
fis
    .match('*.vm', {
        parser: function(file, content) {
            return require('../index.js')(file, content, vmConf);
        },
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
    .media('tmpl')
    .match('*.vm', {
        parser: function(file, content) {
            return require('../index.js')(file, content, tmpVelocity);
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