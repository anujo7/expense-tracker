// Expense Tracker Widget for Scriptable (iOS)
// Copy this entire script into the Scriptable app

const API_URL = "https://YOUR_VERCEL_URL/api/widget-data"
const WIDGET_SECRET = "YOUR_WIDGET_SECRET"
const EMAIL = "anujparashar07@gmail.com"
const APP_URL = "https://YOUR_VERCEL_URL"

// Colors
const BG = new Color("#0a0a0a")
const CARD = new Color("#141414")
const ACCENT = new Color("#6366f1")
const GREEN = new Color("#10b981")
const RED = new Color("#ef4444")
const AMBER = new Color("#f59e0b")
const WHITE = new Color("#ffffff")
const GRAY = new Color("#9ca3af")
const DIM = new Color("#6b7280")

async function fetchData() {
  const req = new Request(`${API_URL}?email=${encodeURIComponent(EMAIL)}`)
  req.headers = { Authorization: `Bearer ${WIDGET_SECRET}` }
  req.timeoutInterval = 10
  try {
    return await req.loadJSON()
  } catch (e) {
    return null
  }
}

function addCard(stack, callback) {
  const card = stack.addStack()
  card.backgroundColor = CARD
  card.cornerRadius = 14
  card.setPadding(12, 14, 12, 14)
  card.layoutVertically()
  callback(card)
  return card
}

function addLabel(stack, text, font, color) {
  const t = stack.addText(text)
  t.font = font
  t.textColor = color
  t.lineLimit = 1
  return t
}

function createSmallWidget(data) {
  const w = new ListWidget()
  w.backgroundColor = BG
  w.setPadding(16, 16, 16, 16)
  w.url = APP_URL

  if (!data) {
    addLabel(w, "Unable to load", Font.mediumSystemFont(14), GRAY)
    addLabel(w, "Tap to open app", Font.regularSystemFont(11), DIM)
    return w
  }

  addLabel(w, "Today's Spend", Font.semiboldSystemFont(11), GRAY)
  w.addSpacer(4)
  addLabel(w, data.today.formatted, Font.boldSystemFont(24), WHITE)
  w.addSpacer(2)

  if (data.today.transactions > 0 && data.today.topCategory) {
    addLabel(w, `${data.today.transactions} txn · ${data.today.topCategory}`, Font.regularSystemFont(11), DIM)
  } else {
    addLabel(w, "No expenses yet", Font.regularSystemFont(11), GREEN)
  }

  w.addSpacer(12)

  if (data.month.budgetPct !== null) {
    const pctColor = data.month.budgetPct > 100 ? RED : data.month.budgetPct > 80 ? AMBER : GREEN
    addLabel(w, `${data.month.budgetPct}% of budget used`, Font.mediumSystemFont(11), pctColor)

    const barBg = w.addStack()
    barBg.backgroundColor = new Color("#1e1e1e")
    barBg.cornerRadius = 3
    barBg.size = new Size(0, 6)

    w.addSpacer(4)
    if (data.month.remainingFormatted) {
      const remaining = data.month.remaining
      const rColor = remaining >= 0 ? GREEN : RED
      const rText = remaining >= 0 ? `${data.month.remainingFormatted} left` : `${data.month.remainingFormatted} over`
      addLabel(w, rText, Font.semiboldSystemFont(11), rColor)
    }
  } else {
    addLabel(w, `Month: ${data.month.formatted}`, Font.mediumSystemFont(11), GRAY)
  }

  return w
}

function createMediumWidget(data) {
  const w = new ListWidget()
  w.backgroundColor = BG
  w.setPadding(16, 16, 16, 16)
  w.url = APP_URL

  if (!data) {
    addLabel(w, "Unable to load data", Font.mediumSystemFont(14), GRAY)
    addLabel(w, "Tap to open app", Font.regularSystemFont(12), DIM)
    return w
  }

  // Header
  const header = w.addStack()
  header.centerAlignContent()
  addLabel(header, "Expense Tracker", Font.semiboldSystemFont(13), ACCENT)
  header.addSpacer()
  const time = new Date(data.updatedAt)
  const timeStr = time.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
  addLabel(header, timeStr, Font.regularSystemFont(10), DIM)

  w.addSpacer(10)

  // Main row with two cards
  const row = w.addStack()
  row.spacing = 10

  // Left card — Today
  addCard(row, (card) => {
    addLabel(card, "TODAY", Font.semiboldSystemFont(9), DIM)
    card.addSpacer(6)
    addLabel(card, data.today.formatted, Font.boldSystemFont(20), WHITE)
    card.addSpacer(4)
    if (data.today.transactions > 0) {
      addLabel(card, `${data.today.transactions} transactions`, Font.regularSystemFont(10), GRAY)
      if (data.today.topCategory) {
        card.addSpacer(2)
        addLabel(card, `Top: ${data.today.topCategory}`, Font.mediumSystemFont(10), ACCENT)
      }
    } else {
      addLabel(card, "No spend yet!", Font.mediumSystemFont(10), GREEN)
    }
  })

  // Right card — Month
  addCard(row, (card) => {
    addLabel(card, "THIS MONTH", Font.semiboldSystemFont(9), DIM)
    card.addSpacer(6)
    addLabel(card, data.month.formatted, Font.boldSystemFont(20), WHITE)
    card.addSpacer(4)
    if (data.month.budgetPct !== null) {
      const pctColor = data.month.budgetPct > 100 ? RED : data.month.budgetPct > 80 ? AMBER : GREEN
      addLabel(card, `${data.month.budgetPct}% of ${data.month.budgetFormatted}`, Font.mediumSystemFont(10), pctColor)
      card.addSpacer(2)
      if (data.month.dailyAllowanceFormatted && data.month.remaining > 0) {
        addLabel(card, `${data.month.dailyAllowanceFormatted}/day left`, Font.regularSystemFont(10), GRAY)
      } else if (data.month.remaining <= 0) {
        addLabel(card, "Over budget!", Font.semiboldSystemFont(10), RED)
      }
    } else {
      addLabel(card, `Avg: ${data.month.dailyAvgFormatted}/day`, Font.regularSystemFont(10), GRAY)
    }
  })

  // Bottom row
  w.addSpacer(8)
  const bottom = w.addStack()
  bottom.centerAlignContent()

  addLabel(bottom, `Yesterday: ${data.yesterday.formatted}`, Font.regularSystemFont(10), GRAY)
  bottom.addSpacer()
  addLabel(bottom, `${data.month.daysLeft}d left in month`, Font.regularSystemFont(10), DIM)

  return w
}

// Main
const data = await fetchData()
const widgetFamily = config.widgetFamily || "medium"

let widget
if (widgetFamily === "small") {
  widget = createSmallWidget(data)
} else {
  widget = createMediumWidget(data)
}

if (config.runsInWidget) {
  Script.setWidget(widget)
} else {
  if (widgetFamily === "small") {
    widget.presentSmall()
  } else {
    widget.presentMedium()
  }
}

Script.complete()
