'use strict';
const {src, dest, series, watch, lastRun, parallel} = require('gulp');
const gutil = require('gulp-util');
const pug = require('gulp-pug');
const sass = require('gulp-sass');
const packageImporter = require('node-sass-package-importer');
const typescript = require('gulp-typescript');
const rename = require('gulp-rename');
const plumber = require('gulp-plumber');
const notify = require('gulp-notify');
const autoprefixer = require('gulp-autoprefixer');
const browserSync = require('browser-sync').create();
const prettify = require('gulp-prettify');
const htmlhint = require('gulp-htmlhint');
const min_html = require('gulp-htmlmin');
const min_css = require('gulp-css');
const uglify = require('gulp-uglify');
const uncss = require('gulp-uncss');
const PUBLIC_PATH = 'dist/pretty';

const PATHS = {
  pug: {
    src: './src/pug/**/!(_)*.pug',
    dest: './dist/pretty',
  },
  styles: {
    src: './src/scss/**/*.*css',
    dest: './dist/pretty/css',
  },
  scripts: {
    src: './src/typescript/**/*.ts',
    dest: './dist/pretty/js',
  },
  statics: {
    src: './src/static/**',
    dest: './dist/pretty/static'
  }
};
const MINI_PATHS = {
  html: {
    src: PATHS.pug.dest + '/**/!(_)*.html',
    dest: './dist/mini',
  },
  styles: {
    src: PATHS.styles.dest + '/**/*.css',
    dest: './dist/mini/css',
  },
  scripts: {
    src: PATHS.scripts.dest + '/**/*.js',
    dest: './dist/mini/js',
  },
  statics: {
    src: PATHS.statics.dest + "/**",
    dest: './dist/mini/static'
  }
};

// methods
function errorHandler(err, stats) {
  if (err || (stats && stats.compilation.errors.length > 0)) {
    const error = err || stats.compilation.errors[0].error;
    notify.onError({message: '<%= error.message %>'})(error);
    this.emit('end');
  }
}

// pug
function pugFiles() {
  const option = {
    pretty: true,
  };
  return src(PATHS.pug.src)
    .pipe(plumber({errorHandler: errorHandler}))
    .pipe(pug(option))
    .pipe(dest(PATHS.pug.dest));
}

// html
function htmlFiles() {
  return src(MINI_PATHS.html.src)
    .pipe(
      min_html({
        collapseWhitespace: true,
        removeComments: true,
        collapseBooleanAttributes: true,
        removeAttributeQuotes: true,
        removeEmptyAttributes: true,
        minifyJS: true,
        minifyCSS: true,
      }),
    )
    .pipe(dest(MINI_PATHS.html.dest));
}

// scss
function styles() {
  return src(PATHS.styles.src)
    .pipe(plumber({errorHandler: errorHandler}))
    .pipe(
      sass({
        outputStyle: 'expanded',
        importer: packageImporter({
          extensions: ['.scss', '.css'],
        }),
      }),
    )
    .pipe(
      autoprefixer({
        cascade: false,
      }),
    )
    .pipe(dest(PATHS.styles.dest))
    .pipe(
      rename(function (path) {
        if (/^style_/.test(path.basename)) {
          path.basename = 'style_latest';
        }
      }),
    )
    .pipe(dest(PATHS.styles.dest))
    .pipe(browserSync.stream());
}

// css
function cssStyles() {
  return src(MINI_PATHS.styles.src)
    .pipe(uncss({
      html: MINI_PATHS.html.src
    }))
    .pipe(min_css())
    .pipe(dest(MINI_PATHS.styles.dest));
}

// typescript
function ts() {
  return src(PATHS.scripts.src)
    .pipe(
      typescript({
        target: 'ES3',
      }),
    )
    .js.pipe(dest(PATHS.scripts.dest));
}

// javascript
function js() {
  return src(MINI_PATHS.scripts.src).pipe(uglify()).pipe(dest(MINI_PATHS.scripts.dest));
}

// static
function staticFiles() {
  return src(PATHS.statics.src).pipe(dest(PATHS.statics.dest));
}

// static mini
function staticFilesMini() {
  return src(MINI_PATHS.statics.src).pipe(dest(MINI_PATHS.statics.dest));
}

// server
const browserSyncOption = {
  open: false,
  port: 3000,
  ui: {
    port: 3001,
  },
  server: {
    baseDir: PATHS.pug.dest, // output directory,
    index: 'index.html',
  },
};
function browsersync(done) {
  browserSync.init(browserSyncOption);
  done();
}

// browser reload
function browserReload(done) {
  browserSync.reload();
  done();
  console.info('Browser reload completed');
}

// watch
function watchFiles(done) {
  watch(PATHS.pug.src, series(pugFiles, browserReload));
  watch(PATHS.styles.src, styles);
  watch(PATHS.scripts.src, ts);
  done();
}

// commands
exports.default = series(
  parallel(styles, pugFiles, ts, staticFiles),
  series(browsersync, watchFiles),
);

exports.build = series(
  parallel(styles, pugFiles, ts, staticFiles),
  parallel(cssStyles, htmlFiles, js, staticFilesMini),
);
