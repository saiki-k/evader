Evader.extend('config', {
	game: (function () {
		const getGameLoopIntervals = (gameMode, gameTicksPerInterval = 100) => {
			const gameModeIntervalTimesMap = {
				// sprint: [80, 70, 60, 50, 40, 30],
				sprint: [80, 60, 40, 30],
				meditation: [90, 80, 70, 60, 50, 50, 50, 50, 50, 50, 40],
			};
			const intervalTimes = gameModeIntervalTimesMap[gameMode];
			return intervalTimes.reduce(
				(acc, curr, idx) => {
					if (idx < 1) {
						return acc;
					}
					const { gameLoopInterval: prevInterval, accumulatedTime: prevAccTime } = acc[idx - 1];
					acc.push({
						gameLoopInterval: curr,
						accumulatedTime: prevAccTime + prevInterval * gameTicksPerInterval,
					});
					return acc;
				},
				[{ gameLoopInterval: intervalTimes[0], accumulatedTime: 0 }]
			);
		};

		/* NOTE
		 **
		 **	Two sources of truth are used below for awarding a medal -- medalScoreMap, and gameTickMedalMap
		 ** Both of them should be updated whenever there is a change in "when a medal is awarded"
		 **
		 ** These can be later (ideally) coupled into a single scource of truth
		 ** (e.g.: medalScoreMap (used by Evader.utils.game.getMedalType) can be derived from gameTickMedalMap)
		 */
		return {
			gameTicksPerInterval: 100,
			meditation: {
				medalScoreMap: { apprentice: -1, bronze: 9, silver: 30, gold: 48, extraordinaire: 60 },
				gameTickMedalMap: { 100: 'bronze', 400: 'silver', 760: 'gold', 1000: 'extraordinaire' },
				gameLoopIntervals: getGameLoopIntervals('meditation'),
			},
			sprint: {
				medalScoreMap: { apprentice: -1, bronze: 8, silver: 14, gold: 18, extraordinaire: 21 },
				gameTickMedalMap: { 100: 'bronze', 200: 'silver', 300: 'gold', 400: 'extraordinaire' },
				gameLoopIntervals: getGameLoopIntervals('sprint'),
			},
		};
	})(),

	entity: (function () {
		const enemyKeys = ['enemy0', 'enemy1', 'enemy2', 'enemy3'];
		const smallerGameAreaSpeedMultiplier = 2 / 3;

		return {
			enemyKeys,

			defaultGameArea: {
				gameAreaDimensions: '(450px)²',
				playerDimensions: { width: 40, height: 40 },
				enemyDimensions: {
					enemy0: { width: 60, height: 50 },
					enemy1: { width: 100, height: 20 },
					enemy2: { width: 30, height: 60 },
					enemy3: { width: 60, height: 60 },
				},

				initialPlayerPosition: { x: 205, y: 205 },

				initalEnemyPoseValues: [
					{ orientation: { x: -1, y: +1 }, position: { x: 270, y: 60 } },
					{ orientation: { x: -1, y: -1 }, position: { x: 300, y: 330 } },
					{ orientation: { x: +1, y: -1 }, position: { x: 70, y: 320 } },
					{ orientation: { x: +1, y: +1 }, position: { x: 70, y: 70 } },
				],
				enemySpeedValues: [
					{ x: 10, y: 12 },
					{ x: 12, y: 20 },
					{ x: 15, y: 13 },
					{ x: 17, y: 11 },
				],
			},

			smallerGameArea: {
				mediaQueryString: '(max-width: 599px), (max-height: 699px)',
				gameAreaDimensions: '(350px)²',
				playerDimensions: { width: 31.11, height: 31.11 },
				enemyDimensions: {
					enemy0: { width: 46.67, height: 38.89 },
					enemy1: { width: 77.78, height: 15.56 },
					enemy2: { width: 23.33, height: 46.67 },
					enemy3: { width: 46.67, height: 46.67 },
				},

				initialPlayerPosition: { x: 159.44, y: 159.44 },

				initalEnemyPoseValues: [
					{ orientation: { x: -1, y: +1 }, position: { x: 210, y: 46.67 } },
					{ orientation: { x: -1, y: -1 }, position: { x: 233.33, y: 256.67 } },
					{ orientation: { x: +1, y: -1 }, position: { x: 54.44, y: 248.89 } },
					{ orientation: { x: +1, y: +1 }, position: { x: 54.44, y: 54.44 } },
				],
				enemySpeedValues: [
					{ x: 10 * smallerGameAreaSpeedMultiplier, y: 12 * smallerGameAreaSpeedMultiplier },
					{ x: 12 * smallerGameAreaSpeedMultiplier, y: 20 * smallerGameAreaSpeedMultiplier },
					{ x: 15 * smallerGameAreaSpeedMultiplier, y: 13 * smallerGameAreaSpeedMultiplier },
					{ x: 17 * smallerGameAreaSpeedMultiplier, y: 11 * smallerGameAreaSpeedMultiplier },
				],
			},
		};
	})(),
});
