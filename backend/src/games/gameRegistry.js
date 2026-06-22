const gameStrategies = {
  generic: {
    calculatePoints: (winner, isDraw) => {
      if (isDraw) return { pointsA: 1, pointsB: 1, winsA: 0, winsB: 0, lossesA: 0, lossesB: 0, drawsA: 1, drawsB: 1 };
      if (winner === 'A') return { pointsA: 2, pointsB: 0, winsA: 1, winsB: 0, lossesA: 0, lossesB: 1, drawsA: 0, drawsB: 0 };
      return { pointsA: 0, pointsB: 2, winsA: 0, winsB: 1, lossesA: 1, lossesB: 0, drawsA: 0, drawsB: 0 };
    },
    calculateNetScore: (scoreA, scoreB) => {
      return { netA: scoreA - scoreB, netB: scoreB - scoreA };
    }
  },
  badminton: {
    calculatePoints: (winner, isDraw) => {
      if (winner === 'A') return { pointsA: 1, pointsB: 0, winsA: 1, winsB: 0, lossesA: 0, lossesB: 1, drawsA: 0, drawsB: 0 };
      return { pointsA: 0, pointsB: 1, winsA: 0, winsB: 1, lossesA: 1, lossesB: 0, drawsA: 0, drawsB: 0 };
    },
    calculateNetScore: (scoreA, scoreB) => {
      // Score represents sets won, e.g. 2-1 or 2-0
      return { netA: scoreA - scoreB, netB: scoreB - scoreA };
    }
  },
  table_tennis: {
    calculatePoints: (winner, isDraw) => {
      if (winner === 'A') return { pointsA: 1, pointsB: 0, winsA: 1, winsB: 0, lossesA: 0, lossesB: 1, drawsA: 0, drawsB: 0 };
      return { pointsA: 0, pointsB: 1, winsA: 0, winsB: 1, lossesA: 1, lossesB: 0, drawsA: 0, drawsB: 0 };
    },
    calculateNetScore: (scoreA, scoreB) => {
      // Score represents sets won, e.g. 3-0, 3-2
      return { netA: scoreA - scoreB, netB: scoreB - scoreA };
    }
  },
  chess: {
    calculatePoints: (winner, isDraw) => {
      if (isDraw) return { pointsA: 0.5, pointsB: 0.5, winsA: 0, winsB: 0, lossesA: 0, lossesB: 0, drawsA: 1, drawsB: 1 };
      if (winner === 'A') return { pointsA: 1, pointsB: 0, winsA: 1, winsB: 0, lossesA: 0, lossesB: 1, drawsA: 0, drawsB: 0 };
      return { pointsA: 0, pointsB: 1, winsA: 0, winsB: 1, lossesA: 1, lossesB: 0, drawsA: 0, drawsB: 0 };
    },
    calculateNetScore: (scoreA, scoreB) => {
      // Chess net score is usually points difference directly
      return { netA: scoreA - scoreB, netB: scoreB - scoreA };
    }
  },
  carrom: {
    calculatePoints: (winner, isDraw) => {
      if (winner === 'A') return { pointsA: 1, pointsB: 0, winsA: 1, winsB: 0, lossesA: 0, lossesB: 1, drawsA: 0, drawsB: 0 };
      return { pointsA: 0, pointsB: 1, winsA: 0, winsB: 1, lossesA: 1, lossesB: 0, drawsA: 0, drawsB: 0 };
    },
    calculateNetScore: (scoreA, scoreB) => {
      // Boards or queen points
      return { netA: scoreA - scoreB, netB: scoreB - scoreA };
    }
  },
  pool: {
    calculatePoints: (winner, isDraw) => {
      if (winner === 'A') return { pointsA: 1, pointsB: 0, winsA: 1, winsB: 0, lossesA: 0, lossesB: 1, drawsA: 0, drawsB: 0 };
      return { pointsA: 0, pointsB: 1, winsA: 0, winsB: 1, lossesA: 1, lossesB: 0, drawsA: 0, drawsB: 0 };
    },
    calculateNetScore: (scoreA, scoreB) => {
      // Frames won, e.g. 5-3
      return { netA: scoreA - scoreB, netB: scoreB - scoreA };
    }
  },
  snooker: {
    calculatePoints: (winner, isDraw) => {
      if (winner === 'A') return { pointsA: 1, pointsB: 0, winsA: 1, winsB: 0, lossesA: 0, lossesB: 1, drawsA: 0, drawsB: 0 };
      return { pointsA: 0, pointsB: 1, winsA: 0, winsB: 1, lossesA: 1, lossesB: 0, drawsA: 0, drawsB: 0 };
    },
    calculateNetScore: (scoreA, scoreB) => {
      // Frames won, e.g. 4-2
      return { netA: scoreA - scoreB, netB: scoreB - scoreA };
    }
  }
};

const getStrategy = (gameType) => {
  return gameStrategies[gameType] || gameStrategies.generic;
};

module.exports = { getStrategy };
