const assert = require('assert');
const { createKnockoutRound } = require('./knockoutEngine');

const players = (count) => Array.from({ length: count }, (_, index) => `P${String(index + 1).padStart(3, '0')}`);

const completeRound = (round, byeHistory) => {
  const winners = round.matches.map((match) => match.player1Id);
  if (round.byePlayerId) {
    winners.push(round.byePlayerId);
    byeHistory.push(round.byePlayerId);
  }
  return winners;
};

const simulate = (count) => {
  let activePlayers = players(count);
  const byeHistory = [];
  const rounds = [];

  while (activePlayers.length > 1) {
    const round = createKnockoutRound({
      players: activePlayers,
      byeHistory,
      shufflePlayers: false,
    });
    rounds.push(round);
    activePlayers = completeRound(round, byeHistory);
  }

  return { rounds, byeHistory, champion: activePlayers[0] };
};

{
  const { rounds, champion } = simulate(8);
  assert.deepStrictEqual(rounds.map((round) => round.matches.length), [4, 2, 1]);
  assert.ok(champion);
}

{
  const { rounds, byeHistory } = simulate(9);
  assert.strictEqual(rounds[0].matches.length, 4);
  assert.strictEqual(Boolean(rounds[0].byePlayerId), true);
  assert.strictEqual(new Set(byeHistory).size, byeHistory.length);
}

{
  const { rounds, champion } = simulate(15);
  assert.strictEqual(rounds[0].matches.length, 7);
  assert.strictEqual(Boolean(rounds[0].byePlayerId), true);
  assert.ok(champion);
}

{
  const { rounds, byeHistory } = simulate(16);
  assert.deepStrictEqual(rounds.map((round) => round.matches.length), [8, 4, 2, 1]);
  assert.strictEqual(byeHistory.length, 0);
}

console.log('Knockout engine tests passed for 8, 9, 15, and 16 Chess players.');
