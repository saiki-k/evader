const path = require('path');

const del = require('del');
const merge = require('merge-stream');

const { series, src, dest } = require('gulp');
const concat = require('gulp-concat');
const rename = require('gulp-rename');
const uglify = require('gulp-uglify');
const cleanCSS = require('gulp-clean-css');
const htmlreplace = require('gulp-html-replace');
const htmlmin = require('gulp-htmlmin');

const destDirectory = './build/';
const destAssetsDirectory = path.join(destDirectory, 'assets');

function clean() {
	return del([destDirectory], { force: true });
}

function assets() {
	const generalAssetsTask = src('./src/assets/**/*.{ico,png}').pipe(dest(destAssetsDirectory));
	const audioAssetsTask = src('./src/assets/audio/**/*.{webm,mp3}').pipe(dest(`${destAssetsDirectory}/audio`));

	return merge(generalAssetsTask, audioAssetsTask);
}

function styles() {
	return src('./src/assets/**/*.css')
		.pipe(concat('evader.css'))
		.pipe(cleanCSS())
		.pipe(rename('evader.min.css'))
		.pipe(dest(destAssetsDirectory));
}

function scripts() {
	const files = [
		'./src/lib/dependencies/iNoBounce.js',
		'./src/lib/dependencies/howler.min.js',

		'./src/lib/evader/index.js',
		'./src/lib/evader/config.js',
		'./src/lib/evader/utils.js',
		'./src/lib/evader/game.js',
		'./src/lib/evader/game.options.js',
		'./src/lib/evader/state.js',
		'./src/lib/evader/state.persistence.js',
		'./src/lib/evader/view.js',
		'./src/lib/evader/audio.js',
		'./src/lib/evader/init.js',
	];

	return src(files)
		.pipe(concat('evader.js'))
		.pipe(uglify())
		.pipe(rename('evader.min.js'))
		.pipe(dest(destAssetsDirectory));
}

function html() {
	return src('./src/index.html')
		.pipe(
			htmlreplace({
				css: 'assets/evader.min.css',
				js: 'assets/evader.min.js',
			})
		)
		.pipe(htmlmin({ collapseWhitespace: true }))
		.pipe(dest(destDirectory));
}

exports.default = series(clean, assets, styles, scripts, html);
