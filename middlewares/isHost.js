module.exports = (req, res, next) => {
  if (!req.session.isLoggedIn) {
    return res.redirect("/login");
  }
  if (!req.session.user || req.session.user.role !== "host") {
    return res.status(403).send("Forbidden");
  }
  next();
};
