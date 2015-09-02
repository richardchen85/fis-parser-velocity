var root = fis.project.getProjectPath()
var mod = false

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
            return require('../index.js')(file, content, {
                loadJs: true,
                loader: null,
                macro: '/macro.vm',
                root: [root, root + '/page']
            });
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

