// 使用fis-parser-velocity直接编译html文件
fis.match('*.vm', {
        parser: function(file, content) {
            return require('../index.js')(file, content, {
                loadJs: true,
                loader: null
            });
        },
        rExt: '.html',
        loaderLang: 'html'
    })
    .match('/widget/**.vm', {
        release: false
    })
    // 加添scss编译
    .match('*.scss', {
        rExt: '.css',
        parser: fis.plugin('sass')
    })