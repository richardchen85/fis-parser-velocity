// 使用fis-parser-velocity直接编译html文件
fis.match('*.html', {
        parser: fis.plugin('velocity', {
            encoding: 'utf-8',
            loader: 'require'
        })
    })
    // 加添scss编译
    .match('*.scss', {
        rExt: '.css',
        parser: fis.plugin('sass')
    })