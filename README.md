# fis-parser-velocity
A parser for fis to compile velocity template（基于fis的velocity模板解释器）

## 组件化实现方法
<pre>
<code>
widget
 ├ header
 | ├ header.tpl
 | ├ header.js
 | ├ header.json
 | └ header.css
</code>
</pre>
使用`#parse('widget/header/header.tpl')`指令引入`header`组件，插件会自动将`header.js`和`header.scss`插入html文档中，并将`header.json`文件的内容作为解析`header`组件的数据源。

## 使用方法
```js
fis.match('*.html', {
	parser: fis.plugin('velocity', {
		encoding: 'utf-8',
		// 模块化加载函数 [require|seajs.use]
		// 为null时，每个js文件用script标签引入<script src="/widget/a/a.js"></script><script src="/widget/b/b.js"></script>
		// 为require或者seajs.use时，会是require(["/widget/a/a.js", "/widget/b/b.js"]);
		loader: null
	});
});
```
