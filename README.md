# fis-parser-velocity
A parser for fis to compile velocity template（基于fis的velocity模板解释器）
# document
```js
fis.match('*.html', {
	parser: fis.plugin('velocity', {
		encoding: 'utf-8'
	});
});
```