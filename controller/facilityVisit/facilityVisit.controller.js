// Backward-compatible controller entry point.
// Existing routes can keep requiring this file without changes.
module.exports = {
  ...require("./publicVisit.controller"),
  ...require("./adminSettings.controller"),
  ...require("./adminRequests.controller"),
};
