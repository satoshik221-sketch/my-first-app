const STORAGE_KEY = "courtMageBalanceBestScore";
const MAX_TURNS = 10;
const ACTIONS_PER_TURN = 2;

const initialState = {
  turn: 1,
  actionsLeft: ACTIONS_PER_TURN,
  church: 50,
  crown: 50,
  people: 50,
  gold: 20,
  magic: 12,
  fame: 0,
  suspicion: 10,
  logs: [],
  lastEvent: "今は静かだ。",
  gameOver: false,
  defeatReason: "",
  ending: "",
  score: 0
};

const statLabels = {
  church: "教会支持",
  crown: "王権支持",
  people: "民衆支持",
  gold: "金貨",
  magic: "魔力",
  fame: "名声",
  suspicion: "疑惑"
};

const actions = [
  {
    id: "donate",
    name: "教会に寄進",
    balances: ["church"],
    effects: { church: 14, crown: -3, people: -2, gold: -6, suspicion: -4 },
    cost: { gold: 6 }
  },
  {
    id: "serveKing",
    name: "王に仕える",
    balances: ["crown"],
    effects: { crown: 14, church: -3, people: -4, gold: 9, suspicion: 4 },
    cost: {}
  },
  {
    id: "savePeople",
    name: "民衆を救う",
    balances: ["people"],
    effects: { people: 14, church: 2, crown: -5, gold: -4, magic: -3, fame: 6 },
    cost: { gold: 4, magic: 3 }
  },
  {
    id: "courtMagic",
    name: "宮廷魔術を披露",
    balances: ["church", "crown", "people"],
    effects: { church: 3, crown: 3, people: 3, gold: 6, magic: -2, fame: 3, suspicion: 4 },
    cost: { magic: 2 }
  },
  {
    id: "forbiddenStudy",
    name: "禁術研究",
    balances: [],
    effects: { magic: 14, church: -8, suspicion: 9, gold: -4 },
    cost: { gold: 4 }
  }
];

const events = [
  { name: "疫病の噂", text: "疫病の噂が広まり、民の不安が魔術師へ向いた。", effects: { people: -6, suspicion: 3 } },
  { name: "王の増税", text: "王の増税により国庫は潤ったが、民衆は疲弊した。", effects: { crown: 5, people: -8, gold: 6 } },
  { name: "異端告発", text: "異端告発の声が礼拝堂から上がった。", effects: { church: -8, suspicion: 8 } },
  { name: "豊作", text: "豊作により市場は満ち、民の顔に明るさが戻った。", effects: { people: 6, gold: 5 } },
  { name: "宮廷の陰謀", text: "宮廷の陰謀が巡り、王の信頼にひびが入った。", effects: { crown: -6, fame: -3, suspicion: 4 } }
];

let state = { ...initialState };

const screens = {
  title: document.getElementById("title-screen"),
  game: document.getElementById("game-screen"),
  result: document.getElementById("result-screen")
};

document.getElementById("start-button").addEventListener("click", startGame);
document.getElementById("retry-button").addEventListener("click", startGame);
document.getElementById("back-title-button").addEventListener("click", showTitle);

function startGame() {
  state = {
    ...initialState,
    logs: ["宮廷の帳簿が開かれた。均衡を保て。"]
  };
  showScreen("game");
  render();
}

function showTitle() {
  showScreen("title");
  renderBestScore();
}

function showScreen(name) {
  Object.values(screens).forEach((screen) => screen.classList.remove("active"));
  screens[name].classList.add("active");
}

function render() {
  renderBestScore();
  renderTurn();
  renderSupports();
  renderStats();
  renderActions();
  renderEvent();
  renderLog();
}

function renderBestScore() {
  document.getElementById("title-best-score").textContent = getBestScore();
}

function renderTurn() {
  document.getElementById("turn-display").textContent = `${Math.min(state.turn, MAX_TURNS)} / ${MAX_TURNS}`;
  document.getElementById("actions-display").textContent = `${state.actionsLeft} / ${ACTIONS_PER_TURN}`;
}

function renderSupports() {
  const supportData = [
    { key: "church", className: "church" },
    { key: "crown", className: "crown" },
    { key: "people", className: "people" }
  ];

  document.getElementById("support-gauges").innerHTML = supportData.map((item) => {
    const value = state[item.key];
    const danger = value <= 20 ? " danger" : "";
    return `
      <div class="gauge ${item.className}${danger}">
        <div class="gauge-head">
          <span>${statLabels[item.key]}</span>
          <strong>${value}</strong>
        </div>
        <div class="bar"><div class="bar-fill" style="width:${value}%"></div></div>
      </div>
    `;
  }).join("");
}

function renderStats() {
  const stats = ["gold", "magic", "fame", "suspicion"];
  document.getElementById("stats-grid").innerHTML = stats.map((key) => {
    const warning = key === "suspicion" && state.suspicion >= 75 ? " warning" : "";
    return `
      <div class="stat${warning}">
        <span>${statLabels[key]}</span>
        <strong>${state[key]}</strong>
      </div>
    `;
  }).join("");
}

function renderActions() {
  const bestKeys = getLowestSupports();
  document.getElementById("actions-list").innerHTML = actions.map((action) => {
    const affordable = canAfford(action);
    const isBest = action.balances.some((key) => bestKeys.includes(key));
    return `
      <button class="action-button ${isBest ? "best" : ""} ${affordable ? "" : "unaffordable"}" data-action="${action.id}">
        <strong>${action.name}</strong>
        <span>${formatEffects(action.effects)}${isBest ? " / 最善手候補" : ""}${affordable ? "" : " / 資源不足"}</span>
      </button>
    `;
  }).join("");

  document.querySelectorAll(".action-button").forEach((button) => {
    button.addEventListener("click", () => performAction(button.dataset.action));
  });
}

function renderEvent() {
  document.getElementById("event-display").textContent = state.lastEvent;
}

function renderLog() {
  document.getElementById("log-list").innerHTML = state.logs
    .slice(0, 10)
    .map((log) => `<li>${log}</li>`)
    .join("");
}

function performAction(actionId) {
  if (state.gameOver) return;

  const action = actions.find((item) => item.id === actionId);
  if (!action) return;

  if (!canAfford(action)) {
    addLog(`${action.name}は資源不足で実行できない。`);
    render();
    return;
  }

  const bestKeys = getLowestSupports();
  const isBest = action.balances.some((key) => bestKeys.includes(key));
  const result = rollResult(isBest);
  const adjustedEffects = adjustEffects(action.effects, result.multiplier);

  applyEffects(adjustedEffects);
  state.actionsLeft -= 1;

  addLog(`${action.name}: ${result.label}${isBest ? "、最善手" : ""}。${formatEffects(adjustedEffects)}`);
  checkGameOver();

  if (!state.gameOver && state.actionsLeft <= 0) {
    endTurn();
  }

  render();
}

function canAfford(action) {
  return Object.entries(action.cost).every(([key, amount]) => state[key] >= amount);
}

function getLowestSupports() {
  const values = { church: state.church, crown: state.crown, people: state.people };
  const min = Math.min(...Object.values(values));
  return Object.entries(values).filter(([, value]) => value === min).map(([key]) => key);
}

function rollResult(isBest) {
  const roll = Math.random();
  const table = isBest
    ? [{ limit: 0.10, label: "失敗", multiplier: 0.5 }, { limit: 0.75, label: "成功", multiplier: 1 }, { limit: 1, label: "大成功", multiplier: 1.5 }]
    : [{ limit: 0.25, label: "失敗", multiplier: 0.5 }, { limit: 0.85, label: "成功", multiplier: 1 }, { limit: 1, label: "大成功", multiplier: 1.5 }];

  return table.find((entry) => roll < entry.limit);
}

function adjustEffects(effects, multiplier) {
  return Object.fromEntries(Object.entries(effects).map(([key, value]) => {
    const adjusted = value > 0 ? Math.round(value * multiplier) : value;
    return [key, adjusted];
  }));
}

function applyEffects(effects) {
  Object.entries(effects).forEach(([key, value]) => {
    state[key] += value;
  });
  normalizeState();
}

function normalizeState() {
  ["church", "crown", "people", "suspicion"].forEach((key) => {
    state[key] = clamp(state[key], 0, 100);
  });
  ["gold", "magic", "fame"].forEach((key) => {
    state[key] = Math.max(0, state[key]);
  });
}

function endTurn() {
  addLog(`ターン${state.turn}終了。自然変動が発生。`);
  applyEffects({ church: -4, crown: -4, people: -4, suspicion: 4, magic: 2 });

  applyBalanceBonus();
  applyImbalancePenalty();
  maybeTriggerEvent();
  checkGameOver();

  if (state.gameOver) {
    render();
    return;
  }

  if (state.turn >= MAX_TURNS) {
    finishGame();
    return;
  }

  state.turn += 1;
  state.actionsLeft = ACTIONS_PER_TURN;
}

function applyBalanceBonus() {
  const minSupport = Math.min(state.church, state.crown, state.people);
  const effects = {};

  if (minSupport >= 60) addToEffects(effects, { gold: 5, fame: 3 });
  if (minSupport >= 75) addToEffects(effects, { gold: 8, fame: 4, suspicion: -3 });
  if (minSupport >= 90) addToEffects(effects, { gold: 15, fame: 8, suspicion: -6 });

  if (Object.keys(effects).length) {
    applyEffects(effects);
    addLog(`均衡ボーナス: ${formatEffects(effects)}`);
  }
}

function applyImbalancePenalty() {
  const supports = [state.church, state.crown, state.people];
  const gap = Math.max(...supports) - Math.min(...supports);
  const effects = {};

  if (gap >= 35) addToEffects(effects, { suspicion: 8 });
  if (gap >= 50) addToEffects(effects, { suspicion: 15, fame: -5 });

  if (Object.keys(effects).length) {
    applyEffects(effects);
    addLog(`偏りペナルティ: ${formatEffects(effects)}`);
  }
}

function maybeTriggerEvent() {
  if (Math.random() >= 0.4) {
    state.lastEvent = "このターン、目立った出来事はなかった。";
    return;
  }

  const event = events[Math.floor(Math.random() * events.length)];
  applyEffects(event.effects);
  state.lastEvent = `${event.name}: ${event.text}`;
  addLog(`ランダムイベント: ${event.name}。${formatEffects(event.effects)}`);
}

function checkGameOver() {
  const reasons = [
    [state.church <= 0, "異端審問"],
    [state.crown <= 0, "追放"],
    [state.people <= 0, "暴動"],
    [state.suspicion >= 100, "魔女裁判"],
    [state.gold < 0, "破産"]
  ];

  const failed = reasons.find(([condition]) => condition);
  if (failed) {
    state.gameOver = true;
    state.defeatReason = failed[1];
    addLog(`ゲームオーバー: ${state.defeatReason}`);
    finishGame();
  }
}

function finishGame() {
  state.gameOver = true;
  state.score = calculateScore();
  state.ending = state.defeatReason ? "敗北" : getEnding();
  const best = getBestScore();
  const isNewBest = state.score > best;

  if (isNewBest) {
    localStorage.setItem(STORAGE_KEY, String(state.score));
  }

  document.getElementById("ending-title").textContent = state.ending;
  document.getElementById("defeat-reason").textContent = state.defeatReason ? `敗北理由: ${state.defeatReason}` : "10ターンを生き延びた。";
  document.getElementById("final-score").textContent = state.score;
  document.getElementById("new-best").classList.toggle("hidden", !isNewBest);
  document.getElementById("final-stats").innerHTML = ["church", "crown", "people", "gold", "magic", "fame", "suspicion"].map((key) => `
    <div class="stat">
      <span>${statLabels[key]}</span>
      <strong>${state[key]}</strong>
    </div>
  `).join("");

  showScreen("result");
}

function getEnding() {
  const supports = [state.church, state.crown, state.people];
  const minSupport = Math.min(...supports);

  if (minSupport >= 95 && state.gold >= 120 && state.fame >= 50 && state.suspicion < 45) return "完全勝利";
  if (minSupport >= 80 && state.gold >= 80 && state.suspicion < 65) return "大成功";
  if (minSupport >= 60 && state.suspicion < 80) return "良好";
  return "生存";
}

function calculateScore() {
  const supports = [state.church, state.crown, state.people];
  const minSupport = Math.min(...supports);
  const averageSupport = supports.reduce((sum, value) => sum + value, 0) / supports.length;
  return Math.round(
    state.gold * 3 +
    state.fame * 2 +
    state.magic +
    minSupport * 8 +
    averageSupport * 2 -
    state.suspicion * 3
  );
}

function getBestScore() {
  return Number(localStorage.getItem(STORAGE_KEY) || 0);
}

function addToEffects(target, source) {
  Object.entries(source).forEach(([key, value]) => {
    target[key] = (target[key] || 0) + value;
  });
}

function addLog(message) {
  state.logs.unshift(message);
  state.logs = state.logs.slice(0, 10);
}

function formatEffects(effects) {
  return Object.entries(effects).map(([key, value]) => {
    const sign = value > 0 ? "+" : "";
    return `${statLabels[key]}${sign}${value}`;
  }).join(" / ");
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

showTitle();
