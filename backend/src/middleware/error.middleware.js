const errorMiddleware = (err, req, res, next) => {
  let statusCode = err.statusCode;
  
  if (!statusCode) {
    if (err.name === 'ValidationError' || err.name === 'CastError') {
      statusCode = 400;
    } else {
      statusCode = 500;
    }
  }
  
  res.status(statusCode).json({
    status: 'error',
    message: err.message || 'Internal Server Error',
    code: err.code || (statusCode === 400 ? 'BAD_REQUEST' : 'INTERNAL_ERROR'),
    // Chỉ in ra Stack Trace nếu đang ở môi trường Development
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};

module.exports = { errorMiddleware };

