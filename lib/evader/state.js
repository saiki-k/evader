Evader.extend(
	'state',
	(function () {
		let gameState = null;

		function initGameState() {
			const { isGameAreaSmaller, getGameAreaBorderWidth, getGameAreaBoundingRect } = Evader.view;
			const isSmallerGameArea = isGameAreaSmaller();
			const gameAreaDescriptor = isSmallerGameArea ? 'smallerGameArea' : 'defaultGameArea';
			const {
				initialPlayerPosition: playerPosition,
				initialEnemyPositions: enemyPositions,
				initialEnemyDirectionVectors: enemyDirectionVectors,
			} = deepClone(Evader.constants.entity[gameAreaDescriptor]);

			const prevGameState = gameState;
			let preservedState = {};
			if (prevGameState) {
				const { isViewInDarkMode, bestScore, finalScore } = prevGameState;
				preservedState = { isViewInDarkMode, bestScore, finalScore };
			}

			const initialGameState = {
				gameArea: {
					boundingRect: getGameAreaBoundingRect(),
					borderWidth: getGameAreaBorderWidth(),
					boundWillShift: false,
					isSmaller: isSmallerGameArea,
					descriptor: gameAreaDescriptor,
				},
				startTime: null,
				startTimeMark: null,
				elapsedTime: null,
				gameTick: 0,
				gameLoopInterval: 80,
				gameLoopIntervalId: null,
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
				bestScore: { smallerGameArea: null, defaultGameArea: null },
				finalScore: { smallerGameArea: null, defaultGameArea: null },
				isViewInDarkMode: true,

				updateType: 'GAME_INIT',
			};

			gameState = { ...initialGameState, ...preservedState };
			return gameState;
		}

		return {
			initGameState,

			getGameState: () => gameState,

			updateGameState(newStateDescriptors) {
				let newGameState = { ...gameState };
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

				let oldGameState = gameState;
				gameState = newGameState;
				Evader.view.render(gameState, oldGameState);
			},
		};
	})()
);
