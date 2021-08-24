Evader.extend(
	'game',
	(function () {
		const getGameAreaBoundStateUpdates = (gameAreaBoundWillShift) => {
			if (!gameAreaBoundWillShift) {
				return [];
			}

			const { getGameAreaBoundingRect } = Evader.view;

			return [
				{
					statePath: 'view.gameAreaBound.boundingRect',
					newState: getGameAreaBoundingRect(),
				},
				{
					statePath: 'view.gameAreaBound.boundWillShift',
					newState: false,
				},
			];
		};

		const getTimeMetricsForGameLoop = (gameMode, gameTick, startTimeMark) => {
			const {
				[gameMode]: { gameLoopIntervals },
				gameTicksPerInterval,
			} = Evader.config.game;

			const newGameTick = gameTick + 1;

			const maxIntervalChanges = gameLoopIntervals.length - 1;
			const intervalIndex = Math.min(maxIntervalChanges, Math.floor(newGameTick / gameTicksPerInterval));

			const { gameLoopInterval: newGameLoopInterval, accumulatedTime: accTimeFromPastIntervals } =
				gameLoopIntervals[intervalIndex];

			const gameTicksSinceNewInterval = newGameTick - gameTicksPerInterval * intervalIndex;
			const expectedTime = accTimeFromPastIntervals + newGameLoopInterval * gameTicksSinceNewInterval;

			const elapsedTime = startTimeMark ? performance.now() - startTimeMark : 0;
			const gameLoopTimerDrift = elapsedTime ? elapsedTime - expectedTime : 0;
			return { newGameTick, newGameLoopInterval, elapsedTime, gameLoopTimerDrift };
		};

		const getNewEnemyPose = (enemy) => {
			const {
				view: { gameAreaBound },
				enemy: { poses: enemyPoses, speeds: enemySpeeds },
			} = Evader.state.getGameState();
			const { isEnemyAtBounds } = Evader.view;

			const enemySpeed = enemySpeeds[enemy];
			const { position: enemyPosition, orientation: enemyOrientation } = enemyPoses[enemy];

			const enemyAtBounds = isEnemyAtBounds(enemy, gameAreaBound);
			if (enemyAtBounds.x || enemyAtBounds.y) {
				Evader.audio.play('enemyWallCollision');
			}

			const newOrientation = {
				x: (enemyAtBounds.x ? -1 : 1) * enemyOrientation.x,
				y: (enemyAtBounds.y ? -1 : 1) * enemyOrientation.y,
			};

			const newPosition = {
				x: enemyPosition.x + enemySpeed.x * newOrientation.x,
				y: enemyPosition.y + enemySpeed.y * newOrientation.y,
			};

			return { position: newPosition, orientation: newOrientation };
		};

		const getNewEnemyPoses = (prevEnemyPoses) => {
			const newEnemyPoses = {};
			for ([enemy, enemyPose] of Object.entries(prevEnemyPoses)) {
				newEnemyPoses[enemy] = getNewEnemyPose(enemy);
			}
			return newEnemyPoses;
		};

		const checkForPlayerCollisions = () => {
			const {
				view: { gameAreaDescriptor, gameAreaBound },
				player: { position: playerPosition },
				enemy: { poses: enemyPoses },
				misc: {
					gameOptions: { godMode },
				},
			} = Evader.state.getGameState();

			if (godMode.isActive) {
				return { withWall: false, withEnemy: false };
			}

			const { playerDimensions, enemyDimensions } = Evader.config.entity[gameAreaDescriptor];
			const { isPlayerAtBounds } = Evader.view;

			let playerHasCollisionWithEnemy = null;
			for (const [enemy, enemyPose] of Object.entries(enemyPoses)) {
				const { position: enemyPosition } = enemyPose;
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
					Evader.audio.play('playerEnemyCollision');
					break;
				}
			}

			const playerAtBounds = isPlayerAtBounds(gameAreaBound);
			const playerHasCollisionWithWall = playerAtBounds.x || playerAtBounds.y;

			if (playerHasCollisionWithWall) {
				Evader.audio.play('playerWallCollision');
			}

			return { withWall: playerHasCollisionWithWall, withEnemy: playerHasCollisionWithEnemy };
		};

		const runGameLoop = () => {
			const {
				view: { gameAreaBound },
				game: { startTimeMark, gameTick, gameLoopIntervalId },
				enemy: { poses: enemyPoses },
				misc: {
					gameOptions: { gameMode },
				},
				updateType,
			} = Evader.state.getGameState();

			if (updateType === 'GAME_RESET' || updateType === 'INIT') {
				// Handle rogue game loops, after 'GAME_RESET' state updates...
				clearTimeout(gameLoopIntervalId);
				return;
			}

			const playerHasCollision = checkForPlayerCollisions();
			if (playerHasCollision.withWall || playerHasCollision.withEnemy) {
				clearTimeout(gameLoopIntervalId);
				return Evader.game.endGame(playerHasCollision);
			}

			const gameStateUpdates = getGameAreaBoundStateUpdates(gameAreaBound.boundWillShift);

			const newEnemyPoses = getNewEnemyPoses(enemyPoses);

			const { newGameTick, newGameLoopInterval, elapsedTime, gameLoopTimerDrift } = getTimeMetricsForGameLoop(
				gameMode,
				gameTick,
				startTimeMark
			);

			const newGameLoopIntervalId = setTimeout(
				runGameLoop,
				Math.max(0, newGameLoopInterval - gameLoopTimerDrift)
			);
			gameStateUpdates.push(
				{ statePath: 'game.elapsedTime', newState: elapsedTime },
				{ statePath: 'game.gameTick', newState: newGameTick },
				{ statePath: 'game.gameLoopIntervalId', newState: newGameLoopIntervalId },
				{ statePath: 'game.gameLoopInterval', newState: newGameLoopInterval },
				{ statePath: 'enemy.poses', newState: newEnemyPoses },

				{ statePath: 'updateType', newState: 'GAME_LOOP_UPDATE' }
			);
			Evader.state.updateGameState(gameStateUpdates);
		};

		return {
			init() {
				Evader.state.updateGameState([{ statePath: 'updateType', newState: 'GAME_INIT' }]);
			},
			holdPlayer(cursor) {
				const {
					game: { startTime, gameLoopInterval },
				} = Evader.state.getGameState();
				const gameStateUpdates = [{ statePath: 'player.cursor', newState: cursor }];
				if (!startTime) {
					const gameLoopIntervalId = setTimeout(runGameLoop, gameLoopInterval);
					gameStateUpdates.push(
						{ statePath: 'game.isInProgress', newState: true },
						{ statePath: 'game.startTime', newState: new Date().getTime() },
						{ statePath: 'game.startTimeMark', newState: performance.now() },
						{ statePath: 'game.gameLoopIntervalId', newState: gameLoopIntervalId },
						{ statePath: 'updateType', newState: 'GAME_START' }
					);
				} else {
					gameStateUpdates.push({ statePath: 'updateType', newState: 'GAME_PLAYER_HOLD' });
				}

				Evader.state.updateGameState(gameStateUpdates);
			},
			movePlayer(newCursor) {
				const {
					player: { cursor, position: playerPosition },
				} = Evader.state.getGameState();

				const cursorDelta = {
					x: cursor.x - newCursor.x,
					y: cursor.y - newCursor.y,
				};
				const newPlayerPosition = {
					x: playerPosition.x - cursorDelta.x,
					y: playerPosition.y - cursorDelta.y,
				};

				Evader.state.updateGameState([
					{ statePath: 'player.cursor', newState: newCursor },
					{ statePath: 'player.position', newState: newPlayerPosition },
					{ statePath: 'updateType', newState: 'GAME_PLAYER_MOVE' },
				]);
			},
			releasePlayer(cursor) {
				Evader.state.updateGameState([
					{ statePath: 'player.cursor', newState: cursor },
					{ statePath: 'updateType', newState: 'GAME_PLAYER_RELEASE' },
				]);
			},
			endGame(collisionState) {
				const {
					view: { gameAreaDescriptor },
					game: { elapsedTime },
					misc: {
						gameOptions: { isRandomiserEnabled, gameMode, isDarkModeEnabled, godMode },
						playerStats: { bestScore, gameHistory },
					},
				} = Evader.state.getGameState();

				const finalScore = parseFloat((elapsedTime / 1000).toFixed(3));

				const gameStateUpdates = [
					{ statePath: 'game.isInProgress', newState: false },
					{ statePath: 'game.isOver', newState: true },
					{ statePath: 'game.gameLoopIntervalId', newState: null },
					{ statePath: 'player.hasCollision', newState: collisionState },
					{ statePath: `misc.playerStats.lastScore.${gameAreaDescriptor}.${gameMode}`, newState: finalScore },
					{ statePath: 'misc.gameOptions.godMode', newState: { isActive: false, wasToggled: false } },

					{ statePath: 'updateType', newState: 'GAME_OVER' },
				];

				const isRandomiserAbsolutelyEnabled = !Object.values(isRandomiserEnabled).some((v) => !v);
				const prevBestScore = bestScore[gameAreaDescriptor][gameMode];
				const isNewBestScore = !prevBestScore || finalScore > prevBestScore;
				const isBestScoreGame = isNewBestScore && isRandomiserAbsolutelyEnabled && !godMode.wasToggled;

				if (isBestScoreGame) {
					gameStateUpdates.push({
						statePath: `misc.playerStats.bestScore.${gameAreaDescriptor}.${gameMode}`,
						newState: finalScore,
					});
				}

				gameStateUpdates.push({
					statePath: `misc.playerStats.gameHistory`,
					newState: [
						...gameHistory,
						{
							timestamp: Date.now(),
							finalScore,
							gameAreaDescriptor,
							gameMode,
							randomiserWasEnabled: isRandomiserAbsolutelyEnabled,
							godModeWasToggled: godMode.wasToggled,
							darkModeWasEnabled: isDarkModeEnabled,
							isBestScoreGame,
						},
					],
				});

				Evader.state.updateGameState(gameStateUpdates);
			},
		};
	})()
);
