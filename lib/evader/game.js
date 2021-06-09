Evader.extend(
	'game',
	(function () {
		const checkForGameAreaBoundShift = (gameTick, finalScoreState, gameAreaBoundWillShift) => {
			if (gameTick > 1 || finalScoreState) {
				return [];
			}

			const {
				elements: { gameArea },
				utils: { getBoundingRect },
			} = Evader.view;

			/*
			 ** When a game is started afresh; with no previous (best / last game) scores,
			 ** the game area square is pushed down a bit as the scores' meta get populated above it.
			 ** We mark the need for recalculation of the game area bounding rectangle in such instances,
			 ** to account for proper `isElementAtBounds` calculations.
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
						newState: getBoundingRect(gameArea),
					},
					{
						statePath: 'gameArea.boundWillShift',
						newState: false,
					},
				];
			}
		};

		const getTimeMetricsForGameLoop = (gameTick, startTimeMark) => {
			const newGameTick = gameTick + 1;

			let expectedTime;
			if (newGameTick > 0 && newGameTick <= 100) {
				newUpdateInterval = 80;
				expectedTime = newUpdateInterval * newGameTick;
			} else if (newGameTick > 100 && newGameTick <= 200) {
				newUpdateInterval = 60;
				expectedTime = 8000 + newUpdateInterval * (newGameTick - 100);
			} else if (newGameTick > 200 && newGameTick <= 300) {
				newUpdateInterval = 40;
				expectedTime = 14000 + newUpdateInterval * (newGameTick - 200);
			} else if (newGameTick > 300 && newGameTick <= 400) {
				newUpdateInterval = 30;
				expectedTime = 18000 + newUpdateInterval * (newGameTick - 300);
			} else if (newGameTick > 400 && newGameTick <= 500) {
				newUpdateInterval = 20;
				expectedTime = 21000 + newUpdateInterval * (newGameTick - 400);
			} else {
				newUpdateInterval = 10;
				expectedTime = 23000 + newUpdateInterval * (newGameTick - 400);
			}

			const elapsedTime = performance.now() - startTimeMark;
			const gameLoopTimerDrift = elapsedTime - expectedTime;
			return { newGameTick, newUpdateInterval, elapsedTime, gameLoopTimerDrift };
		};

		const getNewEnemyPosition = (enemy) => {
			const { gameArea, enemyStepIncrements, enemyPositions, enemyDirectionVectors } =
				Evader.state.getGameState();
			const {
				elements,
				utils: { isElementAtBounds },
			} = Evader.view;
			const enemyStepIncrement = enemyStepIncrements[enemy];

			const isEnemyAtBounds = isElementAtBounds(elements.enemies[enemy], {
				boundAreaBorderWidth: gameArea.borderWidth,
				boundAreaBoundingRect: gameArea.boundingRect,
			});

			const newDirectionVector = {
				x: (isEnemyAtBounds.x ? -1 : 1) * enemyDirectionVectors[enemy].x,
				y: (isEnemyAtBounds.y ? -1 : 1) * enemyDirectionVectors[enemy].y,
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
			const {
				constants: { playerDimensions, enemyDimensions },
				gameArea,
				playerPosition,
				enemyPositions,
			} = Evader.state.getGameState();
			const {
				elements,
				utils: { isElementAtBounds },
			} = Evader.view;

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

			const isPlayerAtBounds = isElementAtBounds(elements.player, {
				boundAreaBorderWidth: gameArea.borderWidth,
				boundAreaBoundingRect: gameArea.boundingRect,
			});

			return { withWall: isPlayerAtBounds.x || isPlayerAtBounds.y, withEnemy: playerHasCollisionWithEnemy };
		};

		const runGameLoop = () => {
			const {
				constants: { gameAreaDescriptor },
				gameArea: { boundWillShift },
				startTimeMark,
				gameTick,
				gameLoopTimerId,
				enemyPositions,
				finalScore,
			} = Evader.state.getGameState();

			const gameStateUpdates = checkForGameAreaBoundShift(
				gameTick,
				finalScore[gameAreaDescriptor],
				boundWillShift
			);

			const playerHasCollision = checkForPlayerCollisions();
			if (playerHasCollision.withWall || playerHasCollision.withEnemy) {
				clearTimeout(gameLoopTimerId);
				return Evader.game.endGame(playerHasCollision);
			}

			const { newEnemyPositions, newEnemyDirectionVectors } = getNewEnemyPositions(enemyPositions);

			const { newGameTick, newUpdateInterval, elapsedTime, gameLoopTimerDrift } = getTimeMetricsForGameLoop(
				gameTick,
				startTimeMark
			);

			const newGameLoopTimer = setTimeout(runGameLoop, Math.max(0, newUpdateInterval - gameLoopTimerDrift));
			gameStateUpdates.push(
				{ statePath: 'gameLoopTimerId', newState: newGameLoopTimer },
				{ statePath: 'gameTick', newState: newGameTick },
				{ statePath: 'updateInterval', newState: newUpdateInterval },
				{ statePath: 'enemyPositions', newState: newEnemyPositions },
				{ statePath: 'enemyDirectionVectors', newState: newEnemyDirectionVectors },
				{ statePath: 'elapsedTime', newState: elapsedTime },

				{ statePath: 'updateType', newState: 'GAME_LOOP_UPDATE' }
			);
			Evader.state.updateGameState(gameStateUpdates);
		};

		return {
			holdPlayer(cursor) {
				const { startTime, updateInterval } = Evader.state.getGameState();
				const gameStateUpdates = [{ statePath: 'cursor', newState: cursor }];
				if (!startTime) {
					const gameLoopTimerId = setTimeout(runGameLoop, updateInterval);
					gameStateUpdates.push(
						{ statePath: 'startTime', newState: new Date().getTime() },
						{ statePath: 'startTimeMark', newState: performance.now() },
						{ statePath: 'gameLoopTimerId', newState: gameLoopTimerId },
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
				const {
					constants: { gameAreaDescriptor },
					elapsedTime,
					bestScore,
				} = Evader.state.getGameState();
				const finalScore = parseFloat((elapsedTime / 1000).toFixed(3));
				const prevBestScore = bestScore[gameAreaDescriptor];
				const isNewBestScore = !prevBestScore || finalScore > prevBestScore;

				const gameStateUpdates = [
					{ statePath: 'gameLoopTimerId', newState: null },
					{ statePath: 'playerHasCollision', newState: collisionState },

					// TODO: Persist finalScore
					{ statePath: `finalScore.${gameAreaDescriptor}`, newState: finalScore },

					{ statePath: 'updateType', newState: 'GAME_OVER' },
				];

				if (isNewBestScore) {
					// TODO: Persist bestScore
					gameStateUpdates.push({ statePath: `bestScore.${gameAreaDescriptor}`, newState: finalScore });
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
