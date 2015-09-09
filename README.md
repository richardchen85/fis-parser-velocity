# fis-parser-velocity
A parser for fis to compile velocity template（基于fis的velocity模板解释器）

从0.2.0版本开始，模拟数据文件扩展名从.json变成了.mock，主要考虑velocity tools的需求，.mock文件内容其实是一个`nodejs`模块，可以满足velocity tools调用方法，如`$util.add(1,1)`输出 `2`。

## 组件化实现方法
<pre>
<code>
widget
 └ header
   ├ header.vm
   ├ header.js
   ├ header.mock
   └ header.css
</code>
</pre>
使用`#parse('widget/header/header.vm')`指令引入`header`组件，插件会自动将`header.js`和`header.scss`插入html文档中，并将`header.mock`文件的内容作为解析`header`组件的数据源。

默认组件的css和js文件会分别插入`</head>`和`</body>`标签之前，也可以自定义插入位置，css插入占位符为`<!--WIDGET_CSS_HOLDER-->`，js插入占位符为`<!--WIDGET_JS_HOLDER-->`。

.vm或.mock文件修改后，页面会自动重新编译，如果开启了livereload，可以自动刷新预览最新修改。

按条件引入组件时，无论条件是否成立都引入，纯前端项目不能做到按需要加载，没办法。如：
```html
#if($isLogin)
  #parse('widget/userinfo/userinfo.vm')
#else
  #parse('widget/userlogin/userlogin.vm')
#end
```
会认为需要同时引入`userinfo`和`userlogin`的静态资源。

## 使用方法
```js
fis.match('*.vm', {
  parser: fis.plugin('velocity', {
    // 是否引入js
    loadJs: true,
    /**
     * 模块化加载框架 [requirejs|modjs|seajs]
     * 为null时，每个js文件用script标签引入
     *   e.g.
     *   <script src="/widget/a/a.js"></script>
     *   <script src="/widget/b/b.js"></script>
     * 为requirejs|modjs|seajs时
     *   e.g.
     *   require(["/widget/a/a.js", "/widget/b/b.js"]);
     *   或者
     *   seajs.use(["/widget/a/a.js", "/widget/b/b.js"]);
     */
    loader: null,
    /**
     * 是否进行同步加载，默认为false，loader设置不为null时生效
     * 因为allInOne打包时会被忽略异步依赖，所以使用allInOne时需要开启同步依赖
     */
    loadSync: false,
    // 全局macro文件，相对于root
    macro: '/page/macro.vm',
    // 是否编译内容，默认为true，为false时不编译velocity语法，只引用资源依赖
    parse: true,
    // 全局的mock文件，相对于root，默认为null
    commonMock: null,
    // velocity的root配置，默认为项目根目录
    root: [fis.project.getProjectPath()]
  }),
  // 将扩展名发布为html
  rExt: '.html',
  // 以html文件类型作为fis3-postpackager-loader语言分析
  loaderLang: 'html'
});
```
使用模块化框架时，请参考[fis3-postpackager-loader](https://github.com/fex-team/fis3-postpackager-loader)的使用规范，如果页面中没有明确使用require.js|mod.js|sea.js是，对引用模块化框架的`script`标签加`data-loader`属性，即`<script data-loader src='/path/to/xxx.js'></script>`，这样才能正确插入`sourcemap`。