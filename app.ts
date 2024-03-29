import * as express from 'express';
import * as path from 'path';
import * as favicon from 'serve-favicon';
import * as logger from 'morgan';
import * as cookieParser from 'cookie-parser';
import * as bodyParser from 'body-parser';
import * as xrpc from "xrpc";
import { newPost, getPost, editPost, getCategories, newMediaObject } from './metaweblog';
import { getUserBlogs } from './blogger';

var app = express();

class ExpressError extends Error {
  status: number;
}

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(xrpc.xmlRpc);
app.post('/RPC', xrpc.route({
  metaWeblog: {
    newPost: newPost,
    getPost: getPost,
    editPost: editPost,
    getCategories: getCategories,
    newMediaObject: newMediaObject
  },
  blogger: {
    getUsersBlogs: getUserBlogs,
  }
}))

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new ExpressError('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
