const STORAGE_KEY = "courtMageBalanceBestScore";
const MAX_TURNS = 10;
const ACTIONS_PER_TURN = 2;
const EVENT_RATE = 0.4;

const SUPPORT_KEYS = ["church", "crown", "people"];

const initialState = {
  turn: 1,
  actionsLeft: ACTIONS_PER_TURN,
  church: 50,
  crown: 50,
  people: 50,
  magic: 3,
  gold: 0,
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
  magic: "魔力",
  gold: "金貨"
};

const actions = [
  {
    id: "churchWork",
    name: "教会工作",
    magicCost: 0,
    effect: {
      church: [11, 17],
      crown: [-2, 0],
      people: [-2, 0],
      gold: [3, 6]
    }
  },
  {
    id: "crownWork",
    name: "王権工作",
    magicCost: 0,
    effect: {
      crown: [11, 17],
      church: [-2, 0],
      people: [-2, 0],
      gold: [3, 6]
    }
  },
  {
    id: "peopleWork",
    name: "民衆工作",
    magicCost: 0,
    effect: {
      people: [11, 17],
      church: [-2, 0],
      crown: [-2, 0],
      gold: [3, 6]
    }
  },
  {
    id: "magicChurchWork",
    name: "魔力：教会工作",
    magicCost: 3,
    effect: {
      magic: [-3, -3],
      church: [22, 32],
      crown: [-3, 1],
      people: [-3, 1],
      gold: [6, 12]
    }
  },
  {
    id: "magicCrownWork",
    name: "魔力：王権工作",
    magicCost: 3,
    effect: {
      magic: [-3, -3],
      crown: [22, 32],
      church: [-3, 1],
      people: [-3, 1],
      gold: [6, 12]
    }
  },
  {
    id: "magicPeopleWork",
    name: "魔力：民衆工作",
    magicCost: 3,
    effect: {
      magic: [-3, -3],
      people: [22, 32],
      church: [-3, 1],
      crown: [-3, 1],
      gold: [6, 12]
    }
  },
  {
    id: "magicResearch",
    name: "魔術研究",
    magicCost: 0,
    effect: {
      magic: [5, 8],
      gold: [0, 2]
    }
  },
  {
    id: "fundraising",
    name: "金策",
    magicCost: 0,
    effect: {
      gold: [12, 20],
      church: [-1, 0],
      crown: [-1, 0],
      people: [-1, 0]
    }
  }
];

const events = [
  {
    name: "疫病の噂",
    text: "疫病の噂が広まり、民衆が動揺した。",
    effect: {
      people: [-10, -6],
      church: [0, 4]
    }
  },
  {
    name: "王の増税",
    text: "王の増税により国庫は潤ったが、民衆は疲弊した。",
    effect: {
      crown: [3, 8],
      people: [-12, -8],
      gold: [4, 8]
    }
  },
  {
    name: "司教の介入",
    text: "司教が宮廷に口を挟み、王権との緊張が高まった。",
    effect: {
      church: [5, 10],
      crown: [-6, -2]
    }
  },
  {
    name: "豊作",
    text: "豊作により民衆は落ち着き、市場にも金が巡った。",
    effect: {
      people: [5, 10],
      gold: [3, 8]
    }
  },
  {
    name: "宮廷の陰謀",
    text: "宮廷の陰謀が巡り、王権の威信に傷がついた。",
    effect: {
      crown: [-10, -6],
      church: [-2, 2]
    }
  }
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
    logs: ["宮廷の帳簿が開かれた。三勢力の均衡を保て。"]
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
  document.getElementById("stats-grid").innerHTML = ["magic", "gold"].map((key) => `
    <div class="stat">
      <span>${statLabels[key]}</span>
      <strong>${state[key]}</strong>
    </div>
  `).join("");
}

function renderActions() {
  document.getElementById("actions-list").innerHTML = actions.map((action) => {
    const usable = canUseAction(action);
    return `
      <button class="action-button ${usable ? "" : "unaffordable"}" data-action="${action.id}">
        <strong>${action.name}</strong>
        <span>${formatEffectRanges(action.effect)}${usable ? "" : " / 魔力不足"}</span>
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

  if (!canUseAction(action)) {
    addLog(`${action.name}: 魔力が足りません。`);
    render();
    return;
  }

  const applied = applyEffect(action.effect);
  state.actionsLeft -= 1;
  addLog(`${action.name}: ${formatEffects(applied)}`);

  checkGameOver();

  if (!state.gameOver && state.actionsLeft <= 0) {
    endTurn();
  }

  render();
}

function canUseAction(action) {
  return state.magic >= action.magicCost;
}

function endTurn() {
  addLog(`ターン${state.turn}終了。三勢力の支持が低下。`);
  applyFixedEffect({ church: -4, crown: -4, people: -4 });

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

function maybeTriggerEvent() {
  if (Math.random() >= EVENT_RATE) {
    state.lastEvent = "このターン、目立った出来事はなかった。";
    return;
  }

  const event = events[randInt(0, events.length - 1)];
  const applied = applyEffect(event.effect);
  state.lastEvent = `${event.name}: ${event.text}`;
  addLog(`ランダムイベント: ${event.name}。${formatEffects(applied)}`);
}

function applyEffect(effect) {
  const applied = {};

  Object.entries(effect).forEach(([key, range]) => {
    const value = randInt(range[0], range[1]);
    state[key] += value;
    applied[key] = value;
  });

  normalizeState();
  return applied;
}

function applyFixedEffect(effect) {
  Object.entries(effect).forEach(([key, value]) => {
    state[key] += value;
  });
  normalizeState();
}

function normalizeState() {
  SUPPORT_KEYS.forEach((key) => {
    state[key] = clamp(state[key], 0, 100);
  });
  state.magic = Math.max(0, state.magic);
  state.gold = Math.max(0, state.gold);
}

function checkGameOver() {
  const reason = getDefeatReason();

  if (reason) {
    state.gameOver = true;
    state.defeatReason = reason;
    addLog(`ゲームオーバー: ${reason}`);
    finishGame();
  }
}

function getDefeatReason() {
  if (state.church <= 0) return "異端審問";
  if (state.crown <= 0) return "追放";
  if (state.people <= 0) return "暴動";
  return "";
}

function finishGame() {
  state.gameOver = true;
  state.score = calculateScore();
  state.ending = state.defeatReason ? "敗北" : getEnding();
  addLog(`最終結果: ${state.ending}、スコア${state.score}`);

  const best = getBestScore();
  const isNewBest = state.score > best;

  if (isNewBest) {
    localStorage.setItem(STORAGE_KEY, String(state.score));
  }

  document.getElementById("ending-title").textContent = state.ending;
  document.getElementById("defeat-reason").textContent = state.defeatReason ? `敗北理由: ${state.defeatReason}` : "10ターンを生き延びた。";
  document.getElementById("final-score").textContent = state.score;
  document.getElementById("new-best").classList.toggle("hidden", !isNewBest);
  document.getElementById("final-stats").innerHTML = ["church", "crown", "people", "magic", "gold"].map((key) => `
    <div class="stat">
      <span>${statLabels[key]}</span>
      <strong>${state[key]}</strong>
    </div>
  `).join("");

  showScreen("result");
}

function getEnding() {
  const all55 = state.church >= 55 && state.crown >= 55 && state.people >= 55;
  const all65 = state.church >= 65 && state.crown >= 65 && state.people >= 65;
  const all75 = state.church >= 75 && state.crown >= 75 && state.people >= 75;

  if (all75 && state.gold >= 180) return "完全勝利";
  if (all65 && state.gold >= 140) return "大成功";
  if (all55) return "良好";
  return "生存";
}

function calculateScore() {
  const minSupport = Math.min(state.church, state.crown, state.people);
  const averageSupport = (state.church + state.crown + state.people) / 3;

  return Math.round(
    state.gold * 5 +
    minSupport * 10 +
    averageSupport * 3 +
    state.magic * 2
  );
}

function getBestScore() {
  return Number(localStorage.getItem(STORAGE_KEY) || 0);
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

function formatEffectRanges(effect) {
  return Object.entries(effect).map(([key, range]) => {
    const [min, max] = range;
    const signMin = min > 0 ? "+" : "";
    const signMax = max > 0 ? "+" : "";

    if (min === max) {
      return `${statLabels[key]}${signMin}${min}`;
    }

    return `${statLabels[key]}${signMin}${min}〜${signMax}${max}`;
  }).join(" / ");
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

showTitle();
