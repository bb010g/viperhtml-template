// @flow

const hyperHTML = require('hyperhtml');

import uaInfo from '../view/ua-info.js';

// if the main script is served deferred
// this is granted to work
// otherwise it might not work if async
document.addEventListener(
  'DOMContentLoaded',
  () => {
    const { body } = document;
    if (body === null) {
      throw new Error('body not present on DOM content load');
    }
    body.appendChild(uaInfo(hyperHTML.wire(body), self.navigator));
  },
  { once: true },
);
