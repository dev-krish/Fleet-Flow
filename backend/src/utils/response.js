/**
 * Send standard successful API response
 */
const sendSuccess = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * Send standard error API response
 */
const sendError = (res, message = 'Error occurred', statusCode = 500, errors = null) => {
  const responsePayload = {
    success: false,
    message,
  };
  
  if (errors) {
    responsePayload.errors = errors;
  }
  
  return res.status(statusCode).json(responsePayload);
};

module.exports = {
  sendSuccess,
  sendError,
};
