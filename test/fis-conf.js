// 使用fis-parser-velocity直接编译html文件
fis.match('*.vm', {
        parser: fis.plugin('velocity', {
            loadJs: true,
            loader: 'require'
        }),
        rExt: '.html',
        loaderLang: 'html'
    })
    // 加添scss编译
    .match('*.scss', {
        rExt: '.css',
        parser: fis.plugin('sass')
    })