const VisitRequest = require("../../model/VisitRequest");
const {
  isValidDateString,
  currentMonthKey,
  currentDateKey,
  dateKeyFromDate,
  addDays,
} = require("./shared");

const ALLOWED_STATUSES = [
  "Pending",
  "Approved",
  "Cancelled",
  "Completed",
  "Rejected",
];

exports.getAdminRequests = async (req, res) => {
  try {
    const { date } = req.query;
    if (date) {
      if (!isValidDateString(date))
        return res.status(400).json({
          success: false,
          message: "Provide a valid date in YYYY-MM-DD format.",
        });
      const requests = await VisitRequest.find({ visitDate: date }).sort({
        visitTime: 1,
        createdAt: 1,
      });
      return res.json({
        success: true,
        date,
        count: requests.length,
        requests,
      });
    }

    const month = req.query.month || currentMonthKey();
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
      return res
        .status(400)
        .json({ success: false, message: "Provide month in YYYY-MM format." });
    const [year, monthNumber] = month.split("-").map(Number);
    const start = `${month}-01`;
    const nextMonthDate = new Date(Date.UTC(year, monthNumber, 1));
    const end = `${nextMonthDate.getUTCFullYear()}-${String(nextMonthDate.getUTCMonth() + 1).padStart(2, "0")}-01`;
    const requests = await VisitRequest.find({
      visitDate: { $gte: start, $lt: end },
    }).sort({ visitDate: 1, visitTime: 1 });
    return res.json({ success: true, month, count: requests.length, requests });
  } catch (error) {
    console.error("Get admin visit requests failed:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to load visit requests." });
  }
};

exports.getUpcomingRequests = async (req, res) => {
  try {
    const today = currentDateKey();
    const lastDate = dateKeyFromDate(
      addDays(new Date(`${today}T12:00:00`), 20),
    );
    const requests = await VisitRequest.find({
      visitDate: { $gte: today, $lte: lastDate },
    }).sort({ visitDate: 1, visitTime: 1 });
    return res.json({
      success: true,
      from: today,
      through: lastDate,
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error("Get upcoming visit requests failed:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load upcoming visit requests.",
    });
  }
};

exports.getArchiveRequests = async (req, res) => {
  try {
    const { month } = req.query;
    if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return res.status(400).json({
        success: false,
        message: "Provide archive month in YYYY-MM format.",
      });
    }
    const [year, monthNumber] = month.split("-").map(Number);
    const start = `${month}-01`;
    const nextMonthDate = new Date(Date.UTC(year, monthNumber, 1));
    const end = `${nextMonthDate.getUTCFullYear()}-${String(nextMonthDate.getUTCMonth() + 1).padStart(2, "0")}-01`;
    const requests = await VisitRequest.find({
      visitDate: { $gte: start, $lt: end },
    }).sort({ visitDate: 1, visitTime: 1 });
    return res.json({ success: true, month, count: requests.length, requests });
  } catch (error) {
    console.error("Get archived visit requests failed:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load archived visit requests.",
    });
  }
};

exports.updateRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remark } = req.body;

    // Validate the requested status.
    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request status.",
      });
    }

    // A remark is required for every status change.
    if (
      typeof remark !== "string" ||
      !remark.trim() ||
      remark.trim().length > 1000
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a remark (maximum 1000 characters).",
      });
    }

    const request = await VisitRequest.findById(id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Visit request not found.",
      });
    }

    const previousStatus = request.status || "Pending";

    // Don't create duplicate history entries for the same status.
    if (previousStatus === status) {
      return res.status(400).json({
        success: false,
        message: "The request already has this status.",
      });
    }

    // Identify the authenticated admin where possible.
    const changedBy =
      req.user?._id?.toString() ||
      req.user?.id?.toString() ||
      req.user?.email ||
      "";

    request.status = status;

    request.statusHistory.push({
      previousStatus,
      newStatus: status,
      remark: remark.trim(),
      changedAt: new Date(),
      changedBy,
    });

    await request.save();

    return res.status(200).json({
      success: true,
      message: "Visit request status updated successfully.",
      request,
    });
  } catch (error) {
    console.error("Update visit request status error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update visit request status.",
    });
  }
};
