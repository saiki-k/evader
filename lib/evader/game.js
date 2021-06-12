Evader.extend(
	'game',
	(function () {
		const getGameAreaBoundStateUpdates = (gameTick, finalScoreState, gameAreaBoundWillShift) => {
			if (gameTick > 1 || finalScoreState) {
				return [];
			}

			const { getGameAreaBoundingRect } = Evader.view;

			/*
			 ** When a game is started afresh; with no previous (best / last game) scores,
			 ** the game area square is pushed down a bit as the scores' meta get populated above it.
			 ** We mark the need for recalculation of the game area bounding rectangle in such instances,
			 ** to account for proper `is(Player | Enemy)AtBounds` calculations.
			 **
			 ** The game area bounds are then recalculated in the next tick.
			 */
			if (gameTick === 0 && !finalScoreState) {
				return [
					{
						statePath: 'gameArea.boundWillShift',
						newState: true,
					},
				];
			}

			if (gameTick === 1 && gameAreaBoundWillShift) {
				return [
					{
						statePath: 'gameArea.boundingRect',
						newState: getGameAreaBoundingRect(),
					},
					{
						statePath: 'gameArea.boundWillShift',
						newState: false,
					},
				];
			}
		};

		const getTimeMetricsForGameLoop = (gameTick, startTimeMark) => {
			const { gameLoopIntervals, gameTicksPerInterval } = Evader.constants.game;

			const newGameTick = gameTick + 1;

			const maxIntervalChanges = gameLoopIntervals.length - 1;
			const intervalIndex = Math.min(maxIntervalChanges, Math.floor(newGameTick / gameTicksPerInterval));

			const { gameLoopInterval: newGameLoopInterval, accumulatedTime: accTimeFromPastIntervals } =
				gameLoopIntervals[intervalIndex];

			const gameTicksSinceNewInterval = newGameTick - gameTicksPerInterval * intervalIndex;
			const expectedTime = accTimeFromPastIntervals + newGameLoopInterval * gameTicksSinceNewInterval;

			const elapsedTime = performance.now() - startTimeMark;
			const gameLoopTimerDrift = elapsedTime - expectedTime;
			return { newGameTick, newGameLoopInterval, elapsedTime, gameLoopTimerDrift };
		};

		const getNewEnemyPosition = (enemy) => {
			const { gameArea, enemyStepIncrements, enemyPositions, enemyDirectionVectors } =
				Evader.state.getGameState();
			const { isEnemyAtBounds } = Evader.view;
			const enemyStepIncrement = enemyStepIncrements[enemy];

			const enemyAtBounds = isEnemyAtBounds(enemy, gameArea);

			const newDirectionVector = {
				x: (enemyAtBounds.x ? -1 : 1) * enemyDirectionVectors[enemy].x,
				y: (enemyAtBounds.y ? -1 : 1) * enemyDirectionVectors[enemy].y,
			};

			const newPosition = {
				x: enemyPositions[enemy].x + enemyStepIncrement.x * newDirectionVector.x,
				y: enemyPositions[enemy].y + enemyStepIncrement.y * newDirectionVector.y,
			};

			return { newDirectionVector, newPosition };
		};

		const getNewEnemyPositions = (prevEnemyPositions) => {
			const newEnemyPositions = {};
			const newEnemyDirectionVectors = {};

			for ([enemy, enemyPosition] of Object.entries(prevEnemyPositions)) {
				const { newDirectionVector, newPosition } = getNewEnemyPosition(enemy);
				newEnemyPositions[enemy] = newPosition;
				newEnemyDirectionVectors[enemy] = newDirectionVector;
			}

			return { newEnemyPositions, newEnemyDirectionVectors };
		};

		const checkForPlayerCollisions = () => {
			const { gameArea, playerPosition, enemyPositions } = Evader.state.getGameState();
			const { playerDimensions, enemyDimensions } = Evader.constants.entity[gameArea.descriptor];
			const { isPlayerAtBounds } = Evader.view;

			let playerHasCollisionWithEnemy = null;
			for (const [enemy, enemyPosition] of Object.entries(enemyPositions)) {
				const delta = {
					x: playerPosition.x - enemyPosition.x,
					y: playerPosition.y - enemyPosition.y,
				};

				playerHasCollisionWithEnemy =
					delta.x > -playerDimensions.width &&
					delta.x < enemyDimensions[enemy].width &&
					delta.y > -playerDimensions.height &&
					delta.y < enemyDimensions[enemy].height
						? enemy
						: null;

				if (playerHasCollisionWithEnemy) {
					break;
				}
			}

			const playerAtBounds = isPlayerAtBounds(gameArea);

			return { withWall: playerAtBounds.x || playerAtBounds.y, withEnemy: playerHasCollisionWithEnemy };
		};

		const runGameLoop = () => {
			const { gameArea, startTimeMark, gameTick, gameLoopIntervalId, enemyPositions, finalScore } =
				Evader.state.getGameState();

			const gameStateUpdates = getGameAreaBoundStateUpdates(
				gameTick,
				finalScore[gameArea.descriptor],
				gameArea.boundWillShift
			);

			const playerHasCollision = checkForPlayerCollisions();
			if (playerHasCollision.withWall || playerHasCollision.withEnemy) {
				clearTimeout(gameLoopIntervalId);
				return Evader.game.endGame(playerHasCollision);
			}

			const { newEnemyPositions, newEnemyDirectionVectors } = getNewEnemyPositions(enemyPositions);

			const { newGameTick, newGameLoopInterval, elapsedTime, gameLoopTimerDrift } = getTimeMetricsForGameLoop(
				gameTick,
				startTimeMark
			);

			const newGameLoopIntervalId = setTimeout(
				runGameLoop,
				Math.max(0, newGameLoopInterval - gameLoopTimerDrift)
			);
			gameStateUpdates.push(
				{ statePath: 'gameTick', newState: newGameTick },
				{ statePath: 'gameLoopInterval', newState: newGameLoopInterval },
				{ statePath: 'gameLoopIntervalId', newState: newGameLoopIntervalId },
				{ statePath: 'enemyPositions', newState: newEnemyPositions },
				{ statePath: 'enemyDirectionVectors', newState: newEnemyDirectionVectors },
				{ statePath: 'elapsedTime', newState: elapsedTime },

				{ statePath: 'updateType', newState: 'GAME_LOOP_UPDATE' }
			);
			Evader.state.updateGameState(gameStateUpdates);
		};

		return {
			holdPlayer(cursor) {
				const { startTime, gameLoopInterval } = Evader.state.getGameState();
				const gameStateUpdates = [{ statePath: 'cursor', newState: cursor }];
				if (!startTime) {
					const gameLoopIntervalId = setTimeout(runGameLoop, gameLoopInterval);
					gameStateUpdates.push(
						{ statePath: 'startTime', newState: new Date().getTime() },
						{ statePath: 'startTimeMark', newState: performance.now() },
						{ statePath: 'gameLoopIntervalId', newState: gameLoopIntervalId },
						{ statePath: 'updateType', newState: 'GAME_START' }
					);
				} else {
					gameStateUpdates.push({ statePath: 'updateType', newState: 'GAME_PLAYER_HOLD' });
				}

				Evader.state.updateGameState(gameStateUpdates);
			},
			movePlayer(newCursor) {
				const { cursor, playerPosition, updateType } = Evader.state.getGameState();

				if (updateType === 'GAME_OVER') {
					return;
				}

				const cursorDelta = {
					x: cursor.x - newCursor.x,
					y: cursor.y - newCursor.y,
				};
				const newPlayerPosition = {
					x: playerPosition.x - cursorDelta.x,
					y: playerPosition.y - cursorDelta.y,
				};

				Evader.state.updateGameState([
					{ statePath: 'cursor', newState: newCursor },
					{ statePath: 'playerPosition', newState: newPlayerPosition },
					{ statePath: 'updateType', newState: 'GAME_PLAYER_MOVE' },
				]);
			},
			releasePlayer(cursor) {
				Evader.state.updateGameState([
					{ statePath: 'cursor', newState: cursor },
					{ statePath: 'updateType', newState: 'GAME_PLAYER_RELEASE' },
				]);
			},
			endGame(collisionState) {
				const { gameArea, elapsedTime, bestScore } = Evader.state.getGameState();
				const finalScore = parseFloat((elapsedTime / 1000).toFixed(3));
				const prevBestScore = bestScore[gameArea.descriptor];
				const isNewBestScore = !prevBestScore || finalScore > prevBestScore;

				const gameStateUpdates = [
					{ statePath: 'gameLoopIntervalId', newState: null },
					{ statePath: 'playerHasCollision', newState: collisionState },

					// TODO: Persist finalScore
					{ statePath: `finalScore.${gameArea.descriptor}`, newState: finalScore },

					{ statePath: 'updateType', newState: 'GAME_OVER' },
				];

				if (isNewBestScore) {
					// TODO: Persist bestScore
					gameStateUpdates.push({ statePath: `bestScore.${gameArea.descriptor}`, newState: finalScore });
				}

				Evader.state.updateGameState(gameStateUpdates);
			},
			toggleDarkMode() {
				const { isViewInDarkMode } = Evader.state.getGameState();
				// TODO: Persist isViewInDarkMode
				Evader.state.updateGameState([
					{ statePath: 'isViewInDarkMode', newState: !isViewInDarkMode },
					{ statePath: 'updateType', newState: 'VIEW_DARK_MODE_TOGGLE' },
				]);
			},
		};
	})()
);
