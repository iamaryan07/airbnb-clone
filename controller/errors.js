exports.pageNotFound = (req, res, next) => {
  res
    .status(404)
    .render("404", {
      pageTitle: "Page not found",
      isLoggedIn: req.session.isLoggedIn,
      user: req.session.user,
    });
};
