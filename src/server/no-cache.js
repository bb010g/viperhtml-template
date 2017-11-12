import compressed from './compressed.js';
import fs from 'fs';

const flush = function(_err, data) {
  this.write(data);
  this.end();
};

export default (req, res, file, headers) => {
  fs.readFile(
    file,
    'utf8',
    flush.bind(
      compressed(
        req,
        res,
        Object.assign(
          {
            'Cache-Control': 'private, no-cache, no-store, must-revalidate',
            Expires: '-1',
            Pragma: 'no-cache',
          },
          headers,
        ),
      ),
    ),
  );
};
