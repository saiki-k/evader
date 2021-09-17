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
					/*
					 ** The bounding rect. of the game area square is calculated during game state's initialisation.
					 ** However, the game area square might be pushed down a bit, as the scores' meta get rendered above it.
					 ** The need for recalculation of the game area bounding rect. -- before the start of a game --
					 ** is hence marked, to account for proper `is(Player | Enemy)AtBounds` calculations.
					 **
					 ** The game area bounds are recalculated during the first tick of the game loop.
					 */
					boundMightShift: true,
				},
				gameAreaOverlay: 'game-start', // enum { 'game-start', 'game-end' }
			};
		}

		function getInitialGameOptions() {
			return {
				isRandomiserEnabled: { enemyPoses: true, enemySpeeds: true },
				gameMode: 'meditation', // enum { 'meditation', 'sprint' }
				isDarkModeEnabled: true,
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
				/*
				 ** gameHistory would be an array of:
				 ** {
				 ** 	timestamp: number,
				 ** 	finalScore: number,
				 ** 	gameAreaDescriptor: string,
				 ** 	gameMode: string,
				 ** 	randomiserWasDisabled: boolean,
				 ** 	godModeWasToggled: boolean,
				 ** 	darkModeWasEnabled: boolean,
				 ** 	isBestScoreGame: boolean,
				 ** }
				 */
				gameHistory: [],
			};
		}

		function clearPlayerStats() {
			Evader.state.persistence.remove('PLAYER_STATS');
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

		function getInitialEntitiesState(gameAreaDescriptor, isRandomiserEnabled) {
			const {
				[gameAreaDescriptor]: { initialPlayerPosition, initalEnemyPoseValues, enemySpeedValues },
				enemyKeys,
			} = Evader.config.entity;

			const initialPlayerState = {
				cursor: { x: null, y: null },
				position: deepClone(initialPlayerPosition),
				hasCollision: { withWall: null, withEnemy: null },
			};

			const poseAllocOrder = isRandomiserEnabled.enemyPoses ? shuffleArray(enemyKeys) : enemyKeys;
			const speedAllocOrder = isRandomiserEnabled.enemySpeeds ? shuffleArray(enemyKeys) : enemyKeys;

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
				initialGameOptions.isRandomiserEnabled
			);

			const initialGameState = {
				view: initialViewState,
				game: initialGameControllerState,
				player: initialPlayerState,
				enemy: initialEnemyState,
				misc: { gameOptions: initialGameOptions, playerStats: initialPlayerStats },

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
				'misc.playerStats.gameHistory',
				'misc.gameOptions.godMode',
			],
			OPTIONS_DARK_THEME_TOGGLE: ['misc.gameOptions.isDarkModeEnabled'],
			OPTIONS_GAME_MODE_CHANGE: ['misc.gameOptions.gameMode'],
			OPTIONS_GAME_RANDOMISER_TOGGLE: ['misc.gameOptions.isRandomiserEnabled'],
			OPTIONS_CLEAR_PLAYER_STATS: [],
			OPTIONS_GOD_MODE_TOGGLE: ['misc.gameOptions.godMode.wasToggled', 'misc.gameOptions.godMode.isActive'],
			OPTIONS_VOLUME_TOGGLE: ['misc.gameOptions.volume'],
		};

		function validateStateDescriptors(descriptors) {
			const statePaths = [];
			let updateType = null;
			for (let i = 0, len = descriptors.length; i < len; i++) {
				const { statePath, newState } = descriptors[i];
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

			updateGameState(newStateDescriptors) {
				if (!validateStateDescriptors(newStateDescriptors)) {
					return console.error('Illegal state update!');
				}

				let newGameState = deepClone(gameState);
				newStateDescriptors.forEach((descriptor) => {
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
						newGameState.misc.gameOptions.isRandomiserEnabled
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
					newGameState.misc = { ...newGameState.misc, playerStats: getInitialPlayerStats() };
				}

				let oldGameState = gameState;
				gameState = newGameState;
				Evader.view.render(gameState, oldGameState);
			},
		};
	})()
);
