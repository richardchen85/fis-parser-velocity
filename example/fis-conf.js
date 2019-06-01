'use strict'

const root = fis.project.getProjectPath();
const util = fis.util;
let packed = false;
let vmConf = {
  loader: 'requirejs', // null,requirejs,modjs,seajs
  loadSync: false,
  macro: '/macro.vm',
  commonMock: '/commonMock.mock',
  root: [root + '/root', root + '/root/page']
};

// 模块化勾子
if (vmConf.loader) {
  if (vmConf.loader !== 'seajs') {
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
  .match('/root/(**.*)', {
    release: '$1'
  })
  .match('*.vm', {
    parser: (content, file) => {
      return require('../')(content, file, vmConf);
    },
    rExt: '.html',
    loaderLang: 'html'
  })
  .match('/root/{page/macro,widget/**}.{vm,json}', {
    release: false
  })
  .match('/root/**.mock', {
    release: false
  })
  .match('/root/widget/**.js', {
    // 只有选择了模块化框架后才执行模块化
    isMod: vmConf.loader ? true : false,
  })
  .match('/root/widget/config.js', {
    isMod: false
  })

// 合并配置
if (packed) {
  fis
    .match('/root/widget/**.css', {
      packTo: '/root/widget/widget_pkg.css'
    })
    .match('/root/widget/**.js', {
      packTo: '/root/widget/widget_pkg.js'
    })
}

// 只发布VM文件
let tmpVelocity = util.merge({
  parse: false
}, vmConf);
fis
  .media('prod')
  .match('*', {
    deploy: fis.plugin('local-deliver', {
      to: './output/static'
    })
  })
  .match('*.vm', {
    parser: (content, file) => {
      return require('../')(content, file, tmpVelocity);
    },
    rExt: '.vm',
    deploy: fis.plugin('local-deliver', {
      to: './output/template'
    })
  })
  .match('/root/page/(**.vm)', {
    release: '$1'
  })
  .match('/root/(widget/**.vm)', {
    release: '$1'
  })
