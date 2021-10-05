Evader.extend(
	'state',
	(function () {
		let gameState = null;

		const { deepClone, shuffleArray } = Evader.utils.general;

		function getInitialViewState() {
			const { isGameAreaSmaller, getGameAreaBorderWidth, getGameAreaBoundingRect } = Evader.view;

			const gameAreaIsSmaller = isGameAreaSmaller();
			const gameAreaDescriptor = gameAreaIsSmaller ? 'smallerGameArea' : 'defaultGameArea';

			return {
				gameAreaIsSmaller,
				gameAreaDescriptor,
				gameAreaBound: {
					boundingRect: getGameAreaBoundingRect(),
					borderWidth: getGameAreaBorderWidth(),
					/* NOTE
					 **
					 ** The bounding rect. of the game area square is calculated during game state's initialisation.
					 ** However, the game area square might be pushed down a bit, as the scores' meta get rendered above it.
					 ** The need for recalculation of the game area bounding rect. -- before the start of a game --
					 ** is hence marked, to account for proper `is(Player | Enemy)AtBounds` calculations.
					 **
					 ** The game area bounds are recalculated during the first tick of the game loop.
					 */
					boundMightShift: true,
				},
			};
		}

		function getInitialGameOptions() {
			return {
				randomiserEnabledOn: { enemyPoses: true, enemySpeeds: true },
				gameMode: 'meditation', // enum { 'meditation', 'sprint' }
				darkModeIsEnabled: true,
				godMode: { isActive: false, wasToggled: false },
				volume: 3, // enum { 0 ('muted'), 1 ('low'), 2 ('medium'), 3 ('high') }
			};
		}

		function getInitialPlayerStats() {
			return {
				bestScore: {
					smallerGameArea: { meditation: null, sprint: null },
					defaultGameArea: { meditation: null, sprint: null },
				},
				lastScore: {
					smallerGameArea: { meditation: null, sprint: null },
					defaultGameArea: { meditation: null, sprint: null },
				},
			};
		}

		function clearPlayerStats() {
			Evader.state.persistence.remove('PLAYER_STATS');
			Evader.state.persistence.remove('GAME_HISTORY');
		}

		function setPersistedState(gameState) {
			if (
				![
					'GAME_OVER',
					'OPTIONS_DARK_THEME_TOGGLE',
					'OPTIONS_GAME_MODE_CHANGE',
					'OPTIONS_GAME_RANDOMISER_TOGGLE',
					'OPTIONS_VOLUME_TOGGLE',
					'OPTIONS_GOD_MODE_TOGGLE',
				].includes(gameState.updateType)
			) {
				return;
			}

			if (gameState.updateType === 'GAME_OVER') {
				Evader.state.persistence.set('PLAYER_STATS', gameState.misc.playerStats);
				Evader.state.persistence.set('GAME_HISTORY', [
					...Evader.state.persistence.get('GAME_HISTORY', []),
					gameState.misc.lastGame,
				]);
			}
			Evader.state.persistence.set('GAME_OPTIONS', gameState.misc.gameOptions);
		}

		function getPersistedState(gameState) {
			if (gameState) {
				const { gameOptions, playerStats } = gameState.misc;
				return { initialGameOptions: gameOptions, initialPlayerStats: playerStats };
			}

			const persistedGameOptions = Evader.state.persistence.get('GAME_OPTIONS');
			const persistedPlayerStats = Evader.state.persistence.get('PLAYER_STATS');

			return {
				initialGameOptions: persistedGameOptions || getInitialGameOptions(),
				initialPlayerStats: persistedPlayerStats || getInitialPlayerStats(),
			};
		}

		function getInitialGameControllerState(gameMode) {
			const {
				[gameMode]: { gameLoopIntervals },
			} = Evader.config.game;
			const [{ gameLoopInterval }] = gameLoopIntervals;

			return {
				isInProgress: false,
				isOver: false,
				startTime: null,
				startTimeMark: null,
				elapsedTime: null,
				gameTick: 0,
				gameLoopIntervalId: null,
				gameLoopInterval,
			};
		}

		function getInitialEntitiesState(gameAreaDescriptor, randomiserEnabledOn) {
			const {
				[gameAreaDescriptor]: { initialPlayerPosition, initalEnemyPoseValues, enemySpeedValues },
				enemyKeys,
			} = Evader.config.entity;

			const initialPlayerState = {
				cursor: { x: null, y: null },
				position: deepClone(initialPlayerPosition),
				hasCollision: { withWall: null, withEnemy: null },
			};

			const poseAllocOrder = randomiserEnabledOn.enemyPoses ? shuffleArray(enemyKeys) : enemyKeys;
			const speedAllocOrder = randomiserEnabledOn.enemySpeeds ? shuffleArray(enemyKeys) : enemyKeys;

			const initialEnemyState = enemyKeys.reduce(
				(acc, _, idx) => {
					acc.poses[poseAllocOrder[idx]] = initalEnemyPoseValues[idx];
					acc.speeds[speedAllocOrder[idx]] = enemySpeedValues[idx];
					return acc;
				},
				{ poses: {}, speeds: {} }
			);

			return {
				initialPlayerState,
				initialEnemyState,
			};
		}

		function getInitialGameState(existingGameState = gameState) {
			const initialViewState = getInitialViewState();

			const { initialGameOptions, initialPlayerStats } = getPersistedState(existingGameState);

			const initialGameControllerState = getInitialGameControllerState(initialGameOptions.gameMode);

			const { initialPlayerState, initialEnemyState } = getInitialEntitiesState(
				initialViewState.gameAreaDescriptor,
				initialGameOptions.randomiserEnabledOn
			);

			const initialGameState = {
				view: initialViewState,
				game: initialGameControllerState,
				player: initialPlayerState,
				enemy: initialEnemyState,
				misc: {
					gameOptions: initialGameOptions,
					playerStats: initialPlayerStats,
					lastGame: existingGameState?.misc.lastGame || null,
				},

				updateType: 'INIT',
			};

			return initialGameState;
		}

		const updateTypeValidStatePathsMap = {
			GAME_INIT: ['view.gameAreaBound.boundingRect'],
			GAME_START: [
				'player.cursor',
				'game.isInProgress',
				'game.startTime',
				'game.startTimeMark',
				'game.gameLoopIntervalId',
			],
			GAME_LOOP_UPDATE: [
				'view.gameAreaBound.boundingRect',
				'view.gameAreaBound.boundMightShift',
				'game.elapsedTime',
				'game.gameTick',
				'game.gameLoopIntervalId',
				'game.gameLoopInterval',
				'enemy.poses',
			],
			GAME_PLAYER_HOLD: [
				'player.cursor',
				'game.isInProgress',
				'game.startTime',
				'game.startTimeMark',
				'game.gameLoopIntervalId',
			],
			GAME_PLAYER_MOVE: ['player.cursor', 'player.position'],
			GAME_PLAYER_RELEASE: ['player.cursor'],
			GAME_OVER: [
				'game.isInProgress',
				'game.isOver',
				'game.gameLoopIntervalId',
				'player.hasCollision',
				'misc.playerStats.lastScore.defaultGameArea.meditation',
				'misc.playerStats.lastScore.defaultGameArea.sprint',
				'misc.playerStats.lastScore.smallerGameArea.meditation',
				'misc.playerStats.lastScore.smallerGameArea.sprint',
				'misc.playerStats.bestScore.defaultGameArea.meditation',
				'misc.playerStats.bestScore.defaultGameArea.sprint',
				'misc.playerStats.bestScore.smallerGameArea.meditation',
				'misc.playerStats.bestScore.smallerGameArea.sprint',
				'misc.lastGame',
				'misc.gameOptions.godMode',
			],
			OPTIONS_DARK_THEME_TOGGLE: ['misc.gameOptions.darkModeIsEnabled'],
			OPTIONS_GAME_MODE_CHANGE: ['misc.gameOptions.gameMode'],
			OPTIONS_GAME_RANDOMISER_TOGGLE: ['misc.gameOptions.randomiserEnabledOn'],
			OPTIONS_CLEAR_PLAYER_STATS: [],
			OPTIONS_GOD_MODE_TOGGLE: ['misc.gameOptions.godMode.wasToggled', 'misc.gameOptions.godMode.isActive'],
			OPTIONS_VOLUME_TOGGLE: ['misc.gameOptions.volume'],
		};

		function validateStateUpdateDescriptors(stateUpdateDescriptors) {
			const statePaths = [];
			let updateType = null;
			for (let i = 0, len = stateUpdateDescriptors.length; i < len; i++) {
				const { statePath, newState } = stateUpdateDescriptors[i];
				if (statePath == null) {
					return false;
				}
				if (statePath === 'updateType') {
					updateType = newState;
				} else {
					statePaths.push(statePath);
				}
			}

			if (!updateType) {
				return false;
			}

			const nonValidStatePaths = statePaths.filter(
				(statePath) => !updateTypeValidStatePathsMap[updateType].includes(statePath)
			);

			return !nonValidStatePaths.length;
		}

		return {
			initGameState: () => {
				gameState = getInitialGameState();
				return deepClone(gameState);
			},

			getGameState: () => deepClone(gameState ?? getInitialGameState()),

			updateGameState(stateUpdateDescriptors) {
				if (!validateStateUpdateDescriptors(stateUpdateDescriptors)) {
					return console.error('Illegal state update!');
				}

				let newGameState = deepClone(gameState);
				stateUpdateDescriptors.forEach((descriptor) => {
					if (!descriptor) {
						return;
					}

					const { statePath, newState } = descriptor;

					const stateKeys = statePath.split('.');
					let path = newGameState;
					stateKeys.forEach((key, index) => {
						if (index === stateKeys.length - 1) {
							path[key] = newState;
							return;
						}
						path = path[key];
					});
				});

				setPersistedState(newGameState);

				if (['OPTIONS_GAME_MODE_CHANGE', 'OPTIONS_GAME_RANDOMISER_TOGGLE'].includes(newGameState.updateType)) {
					const { initialPlayerState, initialEnemyState } = getInitialEntitiesState(
						newGameState.view.gameAreaDescriptor,
						newGameState.misc.gameOptions.randomiserEnabledOn
					);

					newGameState = {
						...newGameState,
						player: initialPlayerState,
						enemy: initialEnemyState,
						updateType: newGameState.game.isInProgress ? 'GAME_RESET' : newGameState.updateType,
					};
				}

				if (newGameState.updateType === 'OPTIONS_CLEAR_PLAYER_STATS') {
					clearPlayerStats();
					/* NOTE
					 **
					 ** Even though the 'GAME_RESET' update-type re-initialises a fresh state,
					 ** gameState.misc.playerStats and gameState.misc.lastGame need to be manually reset.
					 **
					 ** This is because those attributes favour values from existing game state.
					 **
					 ** Refer the function impl. -- getInitialGameState
					 */
					newGameState.misc = { ...newGameState.misc, playerStats: getInitialPlayerStats(), lastGame: null };
					newGameState.updateType = 'GAME_RESET';
				}

				let oldGameState = gameState;
				gameState = newGameState;
				Evader.view.render(gameState, oldGameState);
			},
		};
	})()
);
