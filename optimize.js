// optimize.js
// 宮廷魔術師の均衡術 最適行動探索ツール
// ビームサーチで「完全勝利かつ高スコア」を狙う行動列を探す
// 実行: node optimize.js

const BEAM_WIDTH = 500;
const SAMPLES_PER_ACTION = 8;
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
  gameOver: false,
  defeatReason: "",
  history: [],
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
      gold: [3, 6],
    },
  },
  {
    id: "crownWork",
    name: "王権工作",
    magicCost: 0,
    effect: {
      crown: [11, 17],
      church: [-2, 0],
      people: [-2, 0],
      gold: [3, 6],
    },
  },
  {
    id: "peopleWork",
    name: "民衆工作",
    magicCost: 0,
    effect: {
      people: [11, 17],
      church: [-2, 0],
      crown: [-2, 0],
      gold: [3, 6],
    },
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
      gold: [6, 12],
    },
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
      gold: [6, 12],
    },
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
      gold: [6, 12],
    },
  },
  {
    id: "magicResearch",
    name: "魔術研究",
    magicCost: 0,
    effect: {
      magic: [5, 8],
      gold: [0, 2],
    },
  },
  {
    id: "fundraising",
    name: "金策",
    magicCost: 0,
    effect: {
      gold: [12, 20],
      church: [-1, 0],
      crown: [-1, 0],
      people: [-1, 0],
    },
  },
];

const events = [
  {
    name: "疫病の噂",
    effect: {
      people: [-10, -6],
      church: [0, 4],
    },
  },
  {
    name: "王の増税",
    effect: {
      crown: [3, 8],
      people: [-12, -8],
      gold: [4, 8],
    },
  },
  {
    name: "司教の介入",
    effect: {
      church: [5, 10],
      crown: [-6, -2],
    },
  },
  {
    name: "豊作",
    effect: {
      people: [5, 10],
      gold: [3, 8],
    },
  },
  {
    name: "宮廷の陰謀",
    effect: {
      crown: [-10, -6],
      church: [-2, 2],
    },
  },
];

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeState(s) {
  for (const key of SUPPORT_KEYS) {
    s[key] = clamp(s[key], 0, 100);
  }

  s.magic = Math.max(0, s.magic);
  s.gold = Math.max(0, s.gold);
}

function getMinSupport(s) {
  return Math.min(s.church, s.crown, s.people);
}

function getAvgSupport(s) {
  return (s.church + s.crown + s.people) / 3;
}

function getLowestSupportKey(s) {
  let lowest = "church";

  for (const key of SUPPORT_KEYS) {
    if (s[key] < s[lowest]) {
      lowest = key;
    }
  }

  return lowest;
}

function canUseAction(s, action) {
  return s.magic >= action.magicCost;
}

function applyEffect(s, effect) {
  const applied = {};

  for (const [key, range] of Object.entries(effect)) {
    const value = randInt(range[0], range[1]);
    s[key] += value;
    applied[key] = value;
  }

  normalizeState(s);
  return applied;
}

function checkGameOver(s) {
  if (s.church <= 0) return "異端審問";
  if (s.crown <= 0) return "追放";
  if (s.people <= 0) return "暴動";
  return "";
}

function calculateScore(s) {
  const minSupport = getMinSupport(s);
  const avgSupport = getAvgSupport(s);

  return Math.round(
    s.gold * 5 +
      minSupport * 10 +
      avgSupport * 3 +
      s.magic * 2
  );
}

function getEnding(s) {
  if (s.gameOver) return "敗北：" + s.defeatReason;

  const all55 = s.church >= 55 && s.crown >= 55 && s.people >= 55;
  const all65 = s.church >= 65 && s.crown >= 65 && s.people >= 65;
  const all75 = s.church >= 75 && s.crown >= 75 && s.people >= 75;

  if (all75 && s.gold >= 180) return "完全勝利";
  if (all65 && s.gold >= 140) return "大成功";
  if (all55) return "良好";
  return "生存";
}

function isCompleteVictory(s) {
  return (
    !s.gameOver &&
    s.church >= 75 &&
    s.crown >= 75 &&
    s.people >= 75 &&
    s.gold >= 180
  );
}

function applyEndTurn(s) {
  const next = clone(s);

  next.church -= 4;
  next.crown -= 4;
  next.people -= 4;

  normalizeState(next);

  const eventRoll = Math.random();

  if (eventRoll < EVENT_RATE) {
    const event = events[randInt(0, events.length - 1)];
    const applied = applyEffect(next, event.effect);

    next.history.push({
      turn: s.turn,
      phase: "event",
      name: event.name,
      applied,
      after: snapshot(next),
    });
  } else {
    next.history.push({
      turn: s.turn,
      phase: "event",
      name: "イベントなし",
      applied: {},
      after: snapshot(next),
    });
  }

  const reason = checkGameOver(next);

  if (reason) {
    next.gameOver = true;
    next.defeatReason = reason;
    return next;
  }

  if (next.turn >= MAX_TURNS) {
    next.turn = MAX_TURNS + 1;
    next.actionsLeft = 0;
    return next;
  }

  next.turn += 1;
  next.actionsLeft = ACTIONS_PER_TURN;

  return next;
}

function applyActionAndAdvance(s, action) {
  const next = clone(s);

  if (!canUseAction(next, action)) {
    return null;
  }

  const applied = applyEffect(next, action.effect);

  next.actionsLeft -= 1;

  next.history.push({
    turn: s.turn,
    phase: "action",
    name: action.name,
    applied,
    after: snapshot(next),
  });

  const reason = checkGameOver(next);

  if (reason) {
    next.gameOver = true;
    next.defeatReason = reason;
    return next;
  }

  if (next.actionsLeft <= 0) {
    return applyEndTurn(next);
  }

  return next;
}

function snapshot(s) {
  return {
    turn: s.turn,
    actionsLeft: s.actionsLeft,
    church: s.church,
    crown: s.crown,
    people: s.people,
    gold: s.gold,
    magic: s.magic,
  };
}

function evaluateState(s) {
  const minSupport = getMinSupport(s);
  const avgSupport = getAvgSupport(s);
  const score = calculateScore(s);
  const turnsLeft = Math.max(0, MAX_TURNS - s.turn + 1);
  const actionsRemaining = Math.max(0, turnsLeft * ACTIONS_PER_TURN + s.actionsLeft - ACTIONS_PER_TURN);

  if (s.gameOver) {
    return -999999;
  }

  let value = score;

  // 完全勝利条件への接近度
  const supportGap =
    Math.max(0, 75 - s.church) +
    Math.max(0, 75 - s.crown) +
    Math.max(0, 75 - s.people);

  const goldGap = Math.max(0, 180 - s.gold);

  value -= supportGap * 28;
  value -= goldGap * 2.5;

  // 最低支持は特に重要
  value += minSupport * 8;

  // 平均支持も少し評価
  value += avgSupport * 2;

  // 魔力は将来の伸びしろ
  value += s.magic * 6;

  // 完全勝利達成状態なら大きく加点
  if (isCompleteVictory(s)) {
    value += 5000;
  }

  // 終盤で完全勝利条件未達なら厳しめに減点
  if (s.turn >= 8) {
    value -= supportGap * 45;
    value -= goldGap * 4;
  }

  // 最終状態ではエンディングを強く評価
  if (s.turn > MAX_TURNS || s.actionsLeft <= 0 && s.turn === MAX_TURNS) {
    const ending = getEnding(s);

    if (ending === "完全勝利") value += 10000;
    if (ending === "大成功") value += 3000;
    if (ending === "良好") value += 1000;
    if (ending === "生存") value += 200;
  }

  // 行動が残っているほど可能性があるので少しだけ加点
  value += actionsRemaining * 3;

  return value;
}

function stateKey(s) {
  // 近い状態をまとめて重複削減する。
  // 数値を細かくしすぎると枝が増えすぎるため、軽く丸める。
  const round5 = (n) => Math.round(n / 5) * 5;
  const round10 = (n) => Math.round(n / 10) * 10;

  return [
    s.turn,
    s.actionsLeft,
    round5(s.church),
    round5(s.crown),
    round5(s.people),
    round5(s.magic),
    round10(s.gold),
  ].join("|");
}

function pruneBeam(states) {
  const bestByKey = new Map();

  for (const s of states) {
    const key = stateKey(s);
    const value = evaluateState(s);
    const existing = bestByKey.get(key);

    if (!existing || value > existing.value) {
      bestByKey.set(key, { state: s, value });
    }
  }

  return [...bestByKey.values()]
    .sort((a, b) => b.value - a.value)
    .slice(0, BEAM_WIDTH)
    .map((item) => item.state);
}

function optimize() {
  let beam = [clone(initialState)];
  let bestFinal = null;
  let bestCompleteVictory = null;

  const totalSteps = MAX_TURNS * ACTIONS_PER_TURN;

  for (let step = 0; step < totalSteps; step++) {
    const candidates = [];

    for (const state of beam) {
      if (state.gameOver || state.turn > MAX_TURNS) {
        candidates.push(state);
        continue;
      }

      for (const action of actions) {
        if (!canUseAction(state, action)) continue;

        for (let sample = 0; sample < SAMPLES_PER_ACTION; sample++) {
          const next = applyActionAndAdvance(state, action);
          if (next) candidates.push(next);
        }
      }
    }

    beam = pruneBeam(candidates);

    for (const state of beam) {
      if (state.turn > MAX_TURNS || state.gameOver) {
        const score = calculateScore(state);

        if (!bestFinal || score > calculateScore(bestFinal)) {
          bestFinal = state;
        }

        if (isCompleteVictory(state)) {
          if (
            !bestCompleteVictory ||
            score > calculateScore(bestCompleteVictory)
          ) {
            bestCompleteVictory = state;
          }
        }
      }
    }

    const top = beam[0];
    console.log(
      `step ${step + 1}/${totalSteps} | beam=${beam.length} | top=${summarizeState(top)}`
    );
  }

  // ビーム内に最終状態が残っている場合も評価
  for (const state of beam) {
    if (state.turn > MAX_TURNS || state.gameOver) {
      const score = calculateScore(state);

      if (!bestFinal || score > calculateScore(bestFinal)) {
        bestFinal = state;
      }

      if (isCompleteVictory(state)) {
        if (
          !bestCompleteVictory ||
          score > calculateScore(bestCompleteVictory)
        ) {
          bestCompleteVictory = state;
        }
      }
    }
  }

  console.log("");
  console.log("=== 探索結果 ===");

  if (bestCompleteVictory) {
    console.log("完全勝利の最高候補を発見しました。");
    printFinalResult(bestCompleteVictory);
    printHistory(bestCompleteVictory);
  } else {
    console.log("完全勝利候補は見つかりませんでした。最高スコア候補を表示します。");

    if (bestFinal) {
      printFinalResult(bestFinal);
      printHistory(bestFinal);
    } else {
      console.log("最終状態が見つかりませんでした。BEAM_WIDTHやSAMPLES_PER_ACTIONを増やしてください。");
    }
  }
}

function summarizeState(s) {
  return `T${s.turn} A${s.actionsLeft} 教${s.church} 王${s.crown} 民${s.people} 金${s.gold} 魔${s.magic} score=${calculateScore(s)} ending=${getEnding(s)}`;
}

function printFinalResult(s) {
  console.log("");
  console.log("=== 最終状態 ===");
  console.log({
    ending: getEnding(s),
    score: calculateScore(s),
    church: s.church,
    crown: s.crown,
    people: s.people,
    gold: s.gold,
    magic: s.magic,
    defeatReason: s.defeatReason,
  });
}

function printHistory(s) {
  console.log("");
  console.log("=== 行動履歴 ===");

  for (const item of s.history) {
    if (item.phase === "action") {
      console.log(
        `T${item.turn} 行動: ${item.name} | ${formatApplied(item.applied)} | ` +
          `結果: 教${item.after.church} 王${item.after.crown} 民${item.after.people} 金${item.after.gold} 魔${item.after.magic}`
      );
    } else {
      console.log(
        `T${item.turn} イベント: ${item.name} | ${formatApplied(item.applied)} | ` +
          `結果: 教${item.after.church} 王${item.after.crown} 民${item.after.people} 金${item.after.gold} 魔${item.after.magic}`
      );
    }
  }
}

function formatApplied(applied) {
  const labels = {
    church: "教会",
    crown: "王権",
    people: "民衆",
    gold: "金貨",
    magic: "魔力",
  };

  const entries = Object.entries(applied);

  if (entries.length === 0) {
    return "変化なし";
  }

  return entries
    .map(([key, value]) => {
      const sign = value > 0 ? "+" : "";
      return `${labels[key] || key}${sign}${value}`;
    })
    .join(" / ");
}

optimize();