// simulate.js
// 宮廷魔術師の均衡術 シミュレーションツール
// 新ルール調整版：支持変動をプラス寄りに修正
// 実行: node simulate.js

const RUNS = 5000;

const actionCounts = {};
const actionGoldTotals = {};
const eventCounts = {};

const initialState = {
  turn: 1,
  actionsLeft: 2,

  church: 50,
  crown: 50,
  people: 50,

  // 魔力はブースト用リソース
  mana: 3,

  // 金貨はスコア用
  gold: 0,

  gameOver: false,
  defeatReason: "",
};

const SUPPORT_KEYS = ["church", "crown", "people"];

const actions = [
  {
    id: "churchWork",
    name: "教会工作",
    type: "normal",
    target: "church",
    manaCost: 0,
    effect: {
      church: [11, 17],
      crown: [-2, 0],
      people: [-2, 0],
      gold: [3, 6],
      mana: [0, 0],
    },
  },
  {
    id: "crownWork",
    name: "王権工作",
    type: "normal",
    target: "crown",
    manaCost: 0,
    effect: {
      crown: [11, 17],
      church: [-2, 0],
      people: [-2, 0],
      gold: [3, 6],
      mana: [0, 0],
    },
  },
  {
    id: "peopleWork",
    name: "民衆工作",
    type: "normal",
    target: "people",
    manaCost: 0,
    effect: {
      people: [11, 17],
      church: [-2, 0],
      crown: [-2, 0],
      gold: [3, 6],
      mana: [0, 0],
    },
  },
  {
    id: "magicChurchWork",
    name: "魔力：教会工作",
    type: "magic",
    target: "church",
    manaCost: 3,
    effect: {
      mana: [-3, -3],
      church: [22, 32],
      crown: [-3, 1],
      people: [-3, 1],
      gold: [6, 12],
    },
  },
  {
    id: "magicCrownWork",
    name: "魔力：王権工作",
    type: "magic",
    target: "crown",
    manaCost: 3,
    effect: {
      mana: [-3, -3],
      crown: [22, 32],
      church: [-3, 1],
      people: [-3, 1],
      gold: [6, 12],
    },
  },
  {
    id: "magicPeopleWork",
    name: "魔力：民衆工作",
    type: "magic",
    target: "people",
    manaCost: 3,
    effect: {
      mana: [-3, -3],
      people: [22, 32],
      church: [-3, 1],
      crown: [-3, 1],
      gold: [6, 12],
    },
  },
  {
    id: "magicResearch",
    name: "魔術研究",
    type: "research",
    target: null,
    manaCost: 0,
    effect: {
      mana: [5, 8],
      gold: [0, 2],
    },
  },
  {
    id: "fundraising",
    name: "金策",
    type: "gold",
    target: null,
    manaCost: 0,
    effect: {
      gold: [12, 20],
      church: [-1, 0],
      crown: [-1, 0],
      people: [-1, 0],
      mana: [0, 0],
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

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function clampState(s) {
  s.church = clamp(s.church, 0, 100);
  s.crown = clamp(s.crown, 0, 100);
  s.people = clamp(s.people, 0, 100);
  s.mana = Math.max(0, s.mana);
  s.gold = Math.max(0, s.gold);
}

function getMinSupport(s) {
  return Math.min(s.church, s.crown, s.people);
}

function getAvgSupport(s) {
  return (s.church + s.crown + s.people) / 3;
}

function getLowestSupportKey(s) {
  const values = {
    church: s.church,
    crown: s.crown,
    people: s.people,
  };

  let lowestKey = "church";

  for (const key of SUPPORT_KEYS) {
    if (values[key] < values[lowestKey]) {
      lowestKey = key;
    }
  }

  return lowestKey;
}

function getActionById(id) {
  return actions.find((action) => action.id === id);
}

function canUseAction(s, action) {
  return s.mana >= action.manaCost;
}

function applyEffect(s, effect) {
  const applied = {};

  for (const [key, range] of Object.entries(effect)) {
    const value = randInt(range[0], range[1]);
    s[key] += value;
    applied[key] = value;
  }

  clampState(s);

  return applied;
}

function checkGameOver(s) {
  if (s.church <= 0) return "異端審問";
  if (s.crown <= 0) return "追放";
  if (s.people <= 0) return "暴動";
  return "";
}

function endTurn(s) {
  // ターン終了時の自然減少
  s.church -= 4;
  s.crown -= 4;
  s.people -= 4;

  // 魔力の自然回復はなし
  // 魔力は「魔術研究」で確保する

  clampState(s);

  // ランダムイベント 40%
  if (Math.random() < 0.4) {
    const event = events[Math.floor(Math.random() * events.length)];
    eventCounts[event.name] = (eventCounts[event.name] || 0) + 1;
    applyEffect(s, event.effect);
  }

  clampState(s);

  const reason = checkGameOver(s);

  if (reason) {
    s.gameOver = true;
    s.defeatReason = reason;
  }

  s.turn += 1;
  s.actionsLeft = 2;
}

function chooseAction(s) {
  // 完全勝利狙いAI：
  // 目標：全支持75以上 + 金貨180以上
  //
  // 方針：
  // 1. 支持が危険なら即回復
  // 2. 終盤は金貨より支持を優先
  // 3. 金貨が180に届きそうなら金策を控える
  // 4. 魔力は最低支持を押し上げるために使う
  // 5. 魔力が足りないときは、支持に余裕があれば魔術研究

  const lowestKey = getLowestSupportKey(s);
  const minSupport = getMinSupport(s);
  const avgSupport = getAvgSupport(s);

  const normalActionMap = {
    church: "churchWork",
    crown: "crownWork",
    people: "peopleWork",
  };

  const magicActionMap = {
    church: "magicChurchWork",
    crown: "magicCrownWork",
    people: "magicPeopleWork",
  };

  const normalAction = getActionById(normalActionMap[lowestKey]);
  const magicAction = getActionById(magicActionMap[lowestKey]);
  const research = getActionById("magicResearch");
  const fundraising = getActionById("fundraising");

  const turnsLeft = 11 - s.turn;
  const actionsRemaining = turnsLeft * 2;

  const completeVictoryGoldTarget = 180;
  const completeVictorySupportTarget = 75;

  const goldEnough = s.gold >= completeVictoryGoldTarget;
  const supportEnough =
    s.church >= completeVictorySupportTarget &&
    s.crown >= completeVictorySupportTarget &&
    s.people >= completeVictorySupportTarget;

  // かなり危険：ゲームオーバー回避を最優先
  if (minSupport <= 25 && s.mana >= 3) {
    return magicAction;
  }

  if (minSupport <= 25) {
    return normalAction;
  }

  // 終盤：完全勝利条件を満たすために支持を最優先
  if (s.turn >= 8) {
    // 金貨が十分なら、金策せず支持を押し上げる
    if (minSupport < completeVictorySupportTarget) {
      if (s.mana >= 3) {
        return magicAction;
      }
      return normalAction;
    }

    // 支持は足りていて、金貨が足りないなら金策
    if (!goldEnough) {
      return fundraising;
    }

    // 両方足りているなら、最低支持をさらに安定させる
    if (s.mana >= 3 && minSupport < 85) {
      return magicAction;
    }

    return normalAction;
  }

  // 中盤：最低支持が低いなら回復
  if (minSupport <= 45) {
    if (s.mana >= 3) {
      return magicAction;
    }
    return normalAction;
  }

  // 中盤：完全勝利のために、支持を70台へ押し上げる
  if (minSupport < 70) {
    if (s.mana >= 3) {
      return magicAction;
    }

    // 魔力がないが支持に少し余裕があるなら研究
    if (minSupport >= 55 && s.mana < 3) {
      return research;
    }

    return normalAction;
  }

  // 支持が70以上あるが、75未満ならまだ支持優先
  if (minSupport < 75) {
    if (s.mana >= 3) {
      return magicAction;
    }

    if (s.mana < 3 && minSupport >= 60) {
      return research;
    }

    return normalAction;
  }

  // ここからは支持が75以上ある状態

  // 金貨が不足しているなら金策
  if (s.gold < completeVictoryGoldTarget) {
    return fundraising;
  }

  // 金貨も支持も足りているが、終盤の自然減とイベントに備えて支持を盛る
  if (minSupport < 85) {
    if (s.mana >= 3) {
      return magicAction;
    }

    if (s.mana < 6 && minSupport >= 70) {
      return research;
    }

    return normalAction;
  }

  // 支持も金貨も十分なら、最後にスコアを伸ばす
  if (minSupport >= 85 && avgSupport >= 85) {
    return fundraising;
  }

  return normalAction;
}

function calculateScore(s) {
  const minSupport = getMinSupport(s);
  const avgSupport = getAvgSupport(s);

  return Math.round(
    s.gold * 5 +
      minSupport * 10 +
      avgSupport * 3 +
      s.mana * 2
  );
}

function getEnding(s) {
  if (s.gameOver) return "敗北：" + s.defeatReason;

  const all55 = s.church >= 55 && s.crown >= 55 && s.people >= 55;
  const all65 = s.church >= 65 && s.crown >= 65 && s.people >= 65;
  const all75 = s.church >= 75 && s.crown >= 75 && s.people >= 75;

  if (all75 && s.gold >= 180) {
    return "完全勝利";
  }

  if (all65 && s.gold >= 140) {
    return "大成功";
  }

  if (all55) {
    return "良好";
  }

  return "生存";
}

function simulateOne() {
  const s = clone(initialState);

  while (!s.gameOver && s.turn <= 10) {
    for (let i = 0; i < 2; i++) {
      const action = chooseAction(s);

      if (!action) break;

      if (!canUseAction(s, action)) {
        const fallback = getActionById("magicResearch");
        applyAndCountAction(s, fallback);
      } else {
        applyAndCountAction(s, action);
      }

      const reason = checkGameOver(s);

      if (reason) {
        s.gameOver = true;
        s.defeatReason = reason;
        break;
      }
    }

    if (!s.gameOver) {
      endTurn(s);
    }
  }

  s.score = calculateScore(s);
  s.ending = getEnding(s);

  return s;
}

function applyAndCountAction(s, action) {
  actionCounts[action.name] = (actionCounts[action.name] || 0) + 1;

  const beforeGold = s.gold;
  applyEffect(s, action.effect);
  const gainedGold = s.gold - beforeGold;

  actionGoldTotals[action.name] =
    (actionGoldTotals[action.name] || 0) + gainedGold;
}

function summarize(results) {
  const endingCounts = {};

  for (const r of results) {
    endingCounts[r.ending] = (endingCounts[r.ending] || 0) + 1;
  }

  const avgScore = Math.round(
    results.reduce((sum, r) => sum + r.score, 0) / results.length
  );

  const best = results.reduce((a, b) =>
    a.score > b.score ? a : b
  );

  const worst = results.reduce((a, b) =>
    a.score < b.score ? a : b
  );

  console.log("=== シミュレーション結果 ===");
  console.log(`試行回数: ${results.length}`);
  console.log(`平均スコア: ${avgScore}`);
  console.log("");

  console.log("=== エンディング内訳 ===");
  for (const [ending, count] of Object.entries(endingCounts)) {
    const rate = ((count / results.length) * 100).toFixed(1);
    console.log(`${ending}: ${count}回 (${rate}%)`);
  }

  console.log("");
  console.log("=== 行動回数 ===");
  for (const [name, count] of Object.entries(actionCounts)) {
    const avg = (count / results.length).toFixed(2);
    const goldTotal = actionGoldTotals[name] || 0;
    const goldAvg = (goldTotal / count).toFixed(2);

    console.log(
      `${name}: ${count}回 / 1プレイ平均 ${avg}回 / 1回あたり金貨平均 ${goldAvg}`
    );
  }

  console.log("");
  console.log("=== ランダムイベント発生回数 ===");
  for (const [name, count] of Object.entries(eventCounts)) {
    const avg = (count / results.length).toFixed(2);
    console.log(`${name}: ${count}回 / 1プレイ平均 ${avg}回`);
  }

  console.log("");
  console.log("=== 最高スコア ===");
  printResult(best);

  console.log("");
  console.log("=== 最低スコア ===");
  printResult(worst);
}

function printResult(r) {
  console.log({
    ending: r.ending,
    score: r.score,
    church: r.church,
    crown: r.crown,
    people: r.people,
    gold: r.gold,
    mana: r.mana,
  });
}

const results = [];

for (let i = 0; i < RUNS; i++) {
  results.push(simulateOne());
}

summarize(results);