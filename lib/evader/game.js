Evader.extend(
	'game',
	(function () {
		const getNewEnemyPosition = (enemy) => {
			const {
				enemyStepIncrements,
				enemyPositions,
				enemyDirectionVectors,
				constants: { gameArea },
			} = Evader.state.getGameState();
			const {
				elements,
				utils: { isElementAtBounds, getBoundingRect },
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

		const checkForPlayerCollisions = () => {
			const {
				playerPosition,
				enemyPositions,
				constants: { playerDimensions, enemyDimensions, gameArea },
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

		let gameLoopTimer = null;
		const runGameLoop = () => {
			const { gameTick, enemyPositions, startTime, updateInterval } = Evader.state.getGameState();

			const playerHasCollision = checkForPlayerCollisions();

			if (playerHasCollision.withWall || playerHasCollision.withEnemy) {
				gameLoopTimer = null;
				return Evader.game.endGame(playerHasCollision);
			}

			const newGameTick = gameTick + 1;
			let newUpdateInterval = updateInterval;
			if (newGameTick >= 0 && newGameTick < 100) {
				newUpdateInterval = 80;
			} else if (newGameTick >= 100 && newGameTick < 200) {
				newUpdateInterval = 60;
			} else if (newGameTick >= 200 && newGameTick < 300) {
				newUpdateInterval = 40;
			} else if (newGameTick >= 300 && newGameTick < 400) {
				newUpdateInterval = 30;
			} else if (newGameTick >= 400 && newGameTick < 500) {
				newUpdateInterval = 20;
			} else {
				newUpdateInterval = 10;
			}

			const newEnemyPositions = {},
				newEnemyDirectionVectors = {};
			for ([enemy, enemyPosition] of Object.entries(enemyPositions)) {
				const { newDirectionVector, newPosition } = getNewEnemyPosition(enemy);
				newEnemyPositions[enemy] = newPosition;
				newEnemyDirectionVectors[enemy] = newDirectionVector;
			}

			Evader.state.updateGameState([
				{ statePath: 'gameTick', newState: newGameTick },
				{ statePath: 'updateInterval', newState: newUpdateInterval },
				{ statePath: 'enemyPositions', newState: newEnemyPositions },
				{ statePath: 'enemyDirectionVectors', newState: newEnemyDirectionVectors },
				{ statePath: 'elapsedTime', newState: new Date().getTime() - startTime },

				{ statePath: 'updateType', newState: 'GAME_LOOP_UPDATE' },
			]);

			gameLoopTimer = setTimeout(runGameLoop, newUpdateInterval);
		};

		return {
			holdPlayer(cursor) {
				const { startTime, updateInterval } = Evader.state.getGameState();
				const gameStateUpdates = [{ statePath: 'cursor', newState: cursor }];
				if (!startTime) {
					gameStateUpdates.push(
						{ statePath: 'startTime', newState: new Date().getTime() },
						{ statePath: 'updateType', newState: 'GAME_START' }
					);
					setTimeout(runGameLoop, updateInterval);
				} else {
					gameStateUpdates.push({ statePath: 'updateType', newState: 'GAME_PLAYER_HOLD' });
				}

				Evader.state.updateGameState(gameStateUpdates);
			},
			movePlayer(newCursor) {
				const { cursor, playerPosition, updateType } = Evader.state.getGameState();
				const cursorDelta = {
					x: cursor.x - newCursor.x,
					y: cursor.y - newCursor.y,
				};
				const newPlayerPosition = {
					x: playerPosition.x - cursorDelta.x,
					y: playerPosition.y - cursorDelta.y,
				};

				if (updateType === 'GAME_OVER') {
					return;
				}

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
				const { elapsedTime, bestScore } = Evader.state.getGameState();
				const finalScore = parseFloat((elapsedTime / 1000).toFixed(3));
				const isNewBestScore = !bestScore || finalScore > bestScore;

				const gameStateUpdates = [
					{ statePath: 'playerHasCollision', newState: collisionState },
					// TODO: Persist this value
					{ statePath: 'finalScore', newState: finalScore },
					{ statePath: 'updateType', newState: 'GAME_OVER' },
				];

				if (isNewBestScore) {
					// TODO: Persist this value
					gameStateUpdates.push({ statePath: 'bestScore', newState: finalScore });
				}

				Evader.state.updateGameState(gameStateUpdates);
			},
			toggleDarkMode() {
				const { isViewInDarkMode } = Evader.state.getGameState();
				// TODO: Persist this value
				Evader.state.updateGameState([
					{ statePath: 'isViewInDarkMode', newState: !isViewInDarkMode },
					{ statePath: 'updateType', newState: 'VIEW_DARK_MODE_TOGGLE' },
				]);
			},
		};
	})()
);
