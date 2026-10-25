const VisitSettings = require("../../model/VisitSettings");

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function isValidDateString(value) {
  if (!DATE_RE.test(value || "")) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

function dateKeyFromDate(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function currentDateKey() {
  // Uses the server's local calendar date. Configure the server timezone if needed.
  return dateKeyFromDate(new Date());
}

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function timeToMinutes(value) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(value) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

async function getOrCreateSettings() {
  let settings = await VisitSettings.findOne({ key: "facility-visit" });
  if (!settings) {
    try {
      settings = await VisitSettings.create({ key: "facility-visit" });
    } catch (error) {
      if (error.code !== 11000) throw error;
      settings = await VisitSettings.findOne({ key: "facility-visit" });
    }
  }
  return settings;
}

function getSlotsForDate(date, settings) {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  if (
    !settings.workingDays.includes(weekday) ||
    settings.blockedDates.includes(date)
  )
    return [];

  const start = timeToMinutes(settings.startTime);
  const end = timeToMinutes(settings.endTime);
  const duration = settings.slotDurationMinutes;
  const slots = [];
  for (let time = start; time + duration <= end; time += duration)
    slots.push(minutesToTime(time));
  return slots;
}

function isWithinBookingWindow(date) {
  const today = currentDateKey();
  const lastDate = dateKeyFromDate(addDays(new Date(`${today}T12:00:00`), 20));
  return date >= today && date <= lastDate;
}

module.exports = {
  DATE_RE,
  TIME_RE,
  isValidDateString,
  dateKeyFromDate,
  addDays,
  currentDateKey,
  currentMonthKey,
  timeToMinutes,
  minutesToTime,
  getOrCreateSettings,
  getSlotsForDate,
  isWithinBookingWindow,
};
