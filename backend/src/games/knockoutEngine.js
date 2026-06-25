const shuffle = (array) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const chooseByePlayer = (players, byeHistory = []) => {
  if (players.length % 2 === 0) {
    return null;
  }

  const neverHadBye = players.filter((playerId) => !byeHistory.includes(playerId));
  const candidates = neverHadBye.length > 0 ? neverHadBye : players;
  return candidates[Math.floor(Math.random() * candidates.length)];
};

const createKnockoutRound = ({ players, byeHistory = [], shufflePlayers = true }) => {
  if (!Array.isArray(players)) {
    throw new Error('players must be an array');
  }

  const uniquePlayers = [...new Set(players.filter(Boolean))];
  const orderedPlayers = shufflePlayers ? shuffle(uniquePlayers) : [...uniquePlayers];
  const byePlayerId = chooseByePlayer(orderedPlayers, byeHistory);
  const pairedPlayers = byePlayerId
    ? orderedPlayers.filter((playerId) => playerId !== byePlayerId)
    : orderedPlayers;

  const matches = [];
  for (let i = 0; i < pairedPlayers.length; i += 2) {
    matches.push({
      matchNumber: matches.length + 1,
      player1Id: pairedPlayers[i],
      player2Id: pairedPlayers[i + 1],
      winnerId: null,
      status: 'scheduled',
      isBye: false,
    });
  }

  return { byePlayerId, matches };
};

module.exports = {
  shuffle,
  chooseByePlayer,
  createKnockoutRound,
};
