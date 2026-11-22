const STORAGE_KEY = "paisalens-demo-v1";
const DEFAULT_BUDGET = 5000;
const categories = ["Food", "Travel", "Education", "Shopping", "Other"];
const $ = (id) => document.getElementById(id);
const today = new Date().toISOString().slice(0, 10);
$("expenseDate").value = today;

let state = loadState();
let chart = null;

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.expenses)) return {
      expenses: saved.expenses,
      budget: Number(saved.budget) || DEFAULT_BUDGET,
      goal: saved.goal || null
    };
  } catch (e) {}
  return { expenses: [], budget: DEFAULT_BUDGET, goal: null };
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function money(value) { return "₹" + Math.round(Number(value) || 0).toLocaleString("en-IN"); }
function totalSpent() { return state.expenses.reduce((sum, item) => sum + item.amount, 0); }
function categoryTotals() {
  const result = {};
  categories.forEach(c => result[c] = 0);
  state.expenses.forEach(e => result[e.category] = (result[e.category] || 0) + e.amount);
  return result;
}
function safeText(value) {
  return String(value).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}
function render() {
  const spent = totalSpent(), remaining = state.budget - spent;
  $("budgetStat").textContent = money(state.budget);
  $("spentStat").textContent = money(spent);
  $("remainingStat").textContent = money(remaining);
  $("spentCaption").textContent = `${Math.round(spent / state.budget * 100)}% of your budget used`;
  $("budgetInput").value = state.budget;
  $("budgetProgressText").textContent = `${money(spent)} / ${money(state.budget)}`;
  $("budgetProgressBar").style.width = Math.min(100, spent / state.budget * 100) + "%";
  $("budgetMessage").textContent = remaining >= 0
    ? `${money(remaining)} remains in your planned budget.`
    : `You are ${money(Math.abs(remaining))} over your planned budget. Review your entries and adjust your plan if needed.`;

  const rows = [...state.expenses].sort((a,b) => b.date.localeCompare(a.date));
  $("expenseRows").innerHTML = rows.map(e => `<tr><td>${safeText(e.name)}</td><td><span class="badge-category">${safeText(e.category)}</span></td><td class="muted">${safeText(e.date)}</td><td class="right">${money(e.amount)}</td><td><button class="delete-btn" data-delete="${e.id}">Delete</button></td></tr>`).join("");
  $("recentRows").innerHTML = rows.slice(0,4).map(e => `<tr><td>${safeText(e.name)}</td><td><span class="badge-category">${safeText(e.category)}</span></td><td class="muted">${safeText(e.date)}</td><td class="right">${money(e.amount)}</td></tr>`).join("");
  $("expenseEmpty").hidden = rows.length > 0;
  $("recentEmpty").hidden = rows.length > 0;
  $("expenseCount").textContent = `${rows.length} entr${rows.length === 1 ? "y" : "ies"}`;

  const totals = categoryTotals(), max = Math.max(1, ...Object.values(totals));
  $("categorySummary").innerHTML = categories.map(c => `<div class="category-item"><span>${c}</span><div class="category-track"><div class="category-fill" style="width:${totals[c] / max * 100}%"></div></div><span class="category-amount">${money(totals[c])}</span></div>`).join("");

  renderChart(totals);
  renderInsights();
  renderGoal();
  saveState();
}
function renderChart(totals) {
  const values = categories.map(c => totals[c]);
  $("emptyChart").hidden = values.every(v => v === 0);
  if (!window.Chart) return;
  const ctx = $("spendingChart").getContext("2d");
  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: "doughnut",
    data: { labels: categories, datasets: [{ data: values, backgroundColor: ["#7659df","#f29b65","#4eabc0","#e77b9d","#a6a0bd"], borderWidth: 3, borderColor: "#fff" }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 7, padding: 16, font: { size: 10 } } } } }
  });
}
function makeInsights() {
  const spent = totalSpent(), remaining = state.budget - spent, totals = categoryTotals();
  const largest = categories.reduce((a,b) => totals[a] >= totals[b] ? a : b, "Food");
  const topAmount = totals[largest];
  const result = [];
  result.push({title:"Budget check", text: spent === 0 ? "Add a few expenses to receive a spending summary." : remaining >= 0 ? `You have ${money(remaining)} left from your ${money(state.budget)} planned budget. Keep recording expenses to maintain an accurate picture.` : `Your recorded expenses are ${money(Math.abs(remaining))} above your planned budget. Review the entries and consider adjusting your plan.`});
  if (spent > 0) result.push({title:"Largest category", text:`${largest} is currently your largest recorded category at ${money(topAmount)} (${Math.round(topAmount/spent*100)}% of recorded spending). This is an observation, not a judgement.`});
  const count = state.expenses.length;
  result.push({title:"Tracking habit", text: count < 3 ? "Try recording each expense for a week. More complete entries make your summary more useful." : `You have recorded ${count} expenses. Keeping entries up to date helps you notice patterns over time.`});
  if (state.goal) {
    const pct = Math.min(100, state.goal.saved / state.goal.target * 100);
    result.push({title:"Savings goal", text:`Your "${state.goal.name}" goal is ${Math.round(pct)}% complete. You have recorded ${money(state.goal.saved)} of ${money(state.goal.target)}.`});
  }
  return result;
}
function renderInsights() {
  const insights = makeInsights();
  $("dashboardInsight").textContent = insights[0].text;
  $("insightCards").innerHTML = insights.map(i => `<div class="insight-card"><b>✦ ${safeText(i.title)}</b><p>${safeText(i.text)}</p></div>`).join("");
}
function renderGoal() {
  const box = $("goalDisplay");
  if (!state.goal) { box.textContent = "Create a savings goal to see your progress."; return; }
  const pct = Math.min(100, state.goal.saved / state.goal.target * 100);
  box.innerHTML = `<strong>${safeText(state.goal.name)}</strong><div>${money(state.goal.saved)} saved of ${money(state.goal.target)}</div><div class="goal-progress"><span style="width:${pct}%"></span></div><div class="goal-meta">${Math.round(pct)}% complete · ${money(Math.max(0,state.goal.target-state.goal.saved))} to go</div>`;
}
function showPage(name) {
  document.querySelectorAll(".page").forEach(p => p.classList.toggle("active", p.id === `page-${name}`));
  document.querySelectorAll(".nav-link").forEach(b => b.classList.toggle("active", b.dataset.page === name));
  const titles = {dashboard:"Dashboard",expenses:"Expenses",budget:"Budget planner",insights:"AI insights"};
  $("pageTitle").textContent = titles[name] || "Dashboard";
  $("sidebar").classList.remove("open");
  window.scrollTo({top:0,behavior:"smooth"});
}
document.querySelectorAll("[data-page]").forEach(b => b.addEventListener("click", () => showPage(b.dataset.page)));
document.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click", () => showPage(b.dataset.go)));
$("menuBtn").addEventListener("click", () => $("sidebar").classList.toggle("open"));

$("expenseForm").addEventListener("submit", event => {
  event.preventDefault();
  const name = $("expenseName").value.trim();
  const amount = Number($("expenseAmount").value);
  const date = $("expenseDate").value;
  if (!name || !Number.isFinite(amount) || amount <= 0 || !date) return alert("Please enter a valid name, amount and date.");
  state.expenses.push({id: Date.now().toString(), name, amount, category: $("expenseCategory").value, date});
  $("expenseForm").reset(); $("expenseDate").value = today;
  render(); showPage("expenses");
});
document.addEventListener("click", event => {
  const id = event.target.dataset.delete;
  if (id && confirm("Delete this expense?")) { state.expenses = state.expenses.filter(e => e.id !== id); render(); }
});
$("budgetForm").addEventListener("submit", event => {
  event.preventDefault();
  const amount = Number($("budgetInput").value);
  if (!Number.isFinite(amount) || amount <= 0) return alert("Enter a budget greater than zero.");
  state.budget = amount; render(); alert("Budget updated.");
});
$("goalForm").addEventListener("submit", event => {
  event.preventDefault();
  const name = $("goalName").value.trim(), target = Number($("goalTarget").value), saved = Number($("goalSaved").value);
  if (!name || target <= 0 || saved < 0) return alert("Please enter valid goal details.");
  state.goal = {name,target,saved}; render(); alert("Savings goal saved.");
});
$("sampleBtn").addEventListener("click", () => {
  if (state.expenses.length && !confirm("Add sample expenses to your existing list?")) return;
  const samples = [
    ["Lunch",150,"Food"],["Bus pass",300,"Travel"],["Notebook",120,"Education"],
    ["Snacks",90,"Food"],["College printouts",80,"Education"],["T-shirt",450,"Shopping"]
  ];
  samples.forEach((s,i) => state.expenses.push({id:(Date.now()+i).toString(),name:s[0],amount:s[1],category:s[2],date:today}));
  render();
});
$("refreshInsights").addEventListener("click", renderInsights);
render();
