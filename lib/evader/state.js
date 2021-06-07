Evader.extend(
	'state',
	(function () {
		const createInitialGameState = () => {
			const {
				utils: { isSmallerGameArea },
				elements: { gameArea },
			} = Evader.view;
			const gameAreaDescriptor = isSmallerGameArea() ? 'smallerGameArea' : 'defaultGameArea';
			const {
				initialPlayerPosition: playerPosition,
				initialEnemyPositions: enemyPositions,
				initialEnemyDirectionVectors: enemyDirectionVectors,
				playerDimensions,
				enemyDimensions,
				radScore,
			} = deepClone(Evader.constants.gameState[gameAreaDescriptor]);
			return {
				constants: {
					gameAreaDescriptor,
					playerDimensions,
					enemyDimensions,
					radScore,
					gameArea: {
						borderWidth: parseInt(getComputedStyle(gameArea).borderWidth),
						boundingRect: gameArea.getBoundingClientRect(),
					},
				},
				startTime: null,
				elapsedTime: null,
				updateInterval: 80,
				gameTick: 0,
				playerPosition,
				enemyPositions,
				enemyDirectionVectors,
				enemyStepIncrements: {
					enemy0: { x: -10, y: 12 },
					enemy1: { x: -12, y: -20 },
					enemy2: { x: 15, y: -13 },
					enemy3: { x: 17, y: 11 },
				},
				cursor: { x: null, y: null },
				playerHasCollision: {
					withWall: null,
					withEnemy: null,
				},

				// TODO: Hydrate the following values from the chosen persisted store
				bestScore: null,
				finalScore: null,
				isViewInDarkMode: true,

				updateType: 'GAME_INIT',
			};
		};

		let gameState;
		return {
			initGameState() {
				const initialGameState = createInitialGameState();

				let preservedState = {};
				if (gameState) {
					const { isViewInDarkMode, bestScore, finalScore } = gameState;
					preservedState = { isViewInDarkMode, bestScore, finalScore };
				}

				gameState = { ...initialGameState, ...preservedState };
				return gameState;
			},

			getGameState: () => gameState,

			updateGameState(newStateDescriptors) {
				let newGameState = { ...gameState };
				newStateDescriptors.forEach((descriptor) => {
					if (!descriptor) {
						return;
					}

					const { statePath, newState } = descriptor;

					const stateKeys = statePath.split('.');
					stateKeys.forEach((key, index) => {
						if (index === stateKeys.length - 1) {
							newGameState[key] = newState;
							return;
						}
						newGameState = newGameState[key];
					});
				});

				let oldGameState = gameState;
				gameState = newGameState;
				Evader.view.render(gameState, oldGameState);
			},
		};
	})()
);
