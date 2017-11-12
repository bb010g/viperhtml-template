// @flow
import cdn from './cdn.js';
import compressed from './compressed.js';
import console from 'consolemd';
import fs from 'fs';
import http from 'http';
import indexPage from '../view/index.js';
import { join } from 'path';
import noCache from './no-cache.js';
import stats from '../stats.json';
import viperHTML from 'viperhtml';

// local variables
// which asset should be served as static (CDN optimizations)?
const STATIC_ASSET = /^\/(?:js\/|css\/|img\/|assets\/|favicon\.ico|manifest.json)/;

// is this a PWA ? If the file client/sw.js exists we assume it is
// eslint-disable-next-line no-sync
const IS_PWA = fs.existsSync(join(__dirname, '..', 'client', 'sw.js'));

// if needed, always serve a fresh new Service Worker file
const SW_FILE = /^\/sw\.js(?:\?|#|$)/;

// which bundle file?
const BUNDLE = stats.assets.find(asset => asset.name === 'bundle.js');

// shall we render asynchronously ?
const through = viperHTML.async();
// otherwise we could bind a context or use a wire
// const through = viperHTML.wire();

/* eslint-disable no-process-env */
const PORT: number =
  process.env.PORT == null ? 3000 : Number.parseInt(process.env.PORT);
const IP: string = process.env.IP || '0.0.0.0';
/* eslint-enable no-process-env */

// App

export type ViperModel = {
  title: string,
  language: string,
  script: { src: string, deferred: boolean },
  isPWA: boolean,
  style: string,
  body: $ReadOnlyArray<Promise<string> | string>,
};

http
  .createServer((req, res) => {
    // Service Worker
    if (IS_PWA && SW_FILE.test(req.url)) {
      noCache(req, res, join(__dirname, '..', '..', 'public', 'sw.js'), {
        'Content-Type': 'application/javascript',
      });
      return;
    }

    // static content
    if (STATIC_ASSET.test(req.url)) {
      cdn(req, res);
      return;
    }

    // dynamic HTML content (index only in this case)
    const output = compressed(req, res, {
      'Content-Type': 'text/html',
    });

    indexPage(
      // each resolved chunk will be written right away
      through(chunk => output.write(chunk)),
      {
        title: 'viperHTML',
        language: 'en',
        script: {
          src: `${stats.publicPath}/${BUNDLE.name}`,
          deferred: true,
        },
        isPWA: IS_PWA,
        style: viperHTML.minify.css(`
          html {
            font-family: sans-serif;
            text-align: center;
          }`),
        body: [
          // the order is preserved, no matter when async chunks get resolved
          new Promise(res_ => setTimeout(res_, 100, '<h1>')),
          'viperHTML',
          new Promise(res_ => setTimeout(res_, 20, '</h1><hr>')),
          new Promise(res_ =>
            setTimeout(res_, 300, 'does <strong>asynchronous'),
          ),
          '</strong> too',
        ],
      },
    )
      .then(() => output.end())
      .catch(err => {
        console.error(err);
        res.end();
      });
  })
  .listen(PORT, IP, undefined, function listenCallback() {
    const address = this.address();
    setTimeout(
      console.log,
      1000,
      ` #green(✔) *viperHTML* app http://${
        IS_PWA ? 'localhost' : address.address
      }:${address.port}/`,
    );
  });
