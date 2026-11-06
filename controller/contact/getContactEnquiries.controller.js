const ContactEnquiry = require("../../model/ContactEnquiryModel");

const getContactEnquiries = async (req, res) => {
  try {
    const {
      tab = "inbox",
      search = "",
      status = "",
      page = 1,
      limit = 10,
    } = req.query;

    // Validate query parameters
    const currentPage = Math.max(parseInt(page, 10) || 1, 1);
    const pageLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

    if (!["inbox", "archived"].includes(tab)) {
      return res.status(400).json({
        success: false,
        message: "Invalid enquiry tab.",
      });
    }

    if (status && !["new", "viewed"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid enquiry status.",
      });
    }

    const filter = {
      isArchived: tab === "archived",
    };

    if (status && tab === "inbox") {
      filter.status = status;
    }

    const trimmedSearch = String(search).trim();

    if (trimmedSearch) {
      const escapedSearch = trimmedSearch.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&",
      );

      const searchRegex = new RegExp(escapedSearch, "i");

      filter.$or = [
        { referenceId: searchRegex },
        { name: searchRegex },
        { email: searchRegex },
        { company: searchRegex },
        { phone: searchRegex },
        { "enquiryType.name": searchRegex },
      ];
    }

    const skip = (currentPage - 1) * pageLimit;

    const [enquiries, total, newCount, viewedCount, archivedCount] =
      await Promise.all([
        ContactEnquiry.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(pageLimit)
          .lean(),

        ContactEnquiry.countDocuments(filter),

        ContactEnquiry.countDocuments({
          isArchived: false,
          status: "new",
        }),

        ContactEnquiry.countDocuments({
          isArchived: false,
          status: "viewed",
        }),

        ContactEnquiry.countDocuments({
          isArchived: true,
        }),
      ]);

    return res.status(200).json({
      success: true,
      data: enquiries,
      pagination: {
        total,
        page: currentPage,
        limit: pageLimit,
        totalPages: Math.ceil(total / pageLimit),
      },
      counts: {
        new: newCount,
        viewed: viewedCount,
        inbox: newCount + viewedCount,
        archived: archivedCount,
      },
    });
  } catch (error) {
    console.error("Get contact enquiries error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load contact enquiries.",
    });
  }
};

module.exports = getContactEnquiries;
