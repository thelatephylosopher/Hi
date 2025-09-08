// /middleware/authMiddleware.js

const isAuthenticated = (req, res, next) => {
  // Check if a user object exists on the session
  if (req.session.user) {
    // If logged in, proceed to the next function (the controller)
    return next();
  } else {
    // If not logged in, send an unauthorized error
    res.status(401).json({ message: 'Unauthorized: Not logged in.' });
  }
};

module.exports = { isAuthenticated };