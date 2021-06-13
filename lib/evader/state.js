Evader.extend(
	'state',
	(function () {
		let gameState = null;

		function shuffleArray(array) {
			const copy = [...array];
			let elementsLeftToShuffle = copy.length,
				temp,
				randomIdx;
			while (elementsLeftToShuffle) {
				randomIdx = Math.floor(Math.random() * elementsLeftToShuffle--);
				temp = copy[elementsLeftToShuffle];
				copy[elementsLeftToShuffle] = copy[randomIdx];
				copy[randomIdx] = temp;
			}
			return copy;
		}

		function allocPosDirSpeedsToEnemyKeys(enemyKeys, values, randomiseEnemies) {
			const shuffledEnemyKeys = {
				positionAllocOrder: randomiseEnemies.positions ? shuffleArray(enemyKeys) : enemyKeys,
				speedAllocOrder: randomiseEnemies.speeds ? shuffleArray(enemyKeys) : enemyKeys,
			};
			const { enemyPositions, enemyDirectionVectors } = shuffledEnemyKeys.positionAllocOrder.reduce(
				(acc, enemyKey, idx) => {
					const { direction, position } = values.positions[idx];
					acc.enemyPositions[enemyKey] = position;
					acc.enemyDirectionVectors[enemyKey] = direction;
					return acc;
				},
				{ enemyPositions: {}, enemyDirectionVectors: {} }
			);
			const { enemySpeeds } = shuffledEnemyKeys.speedAllocOrder.reduce(
				(acc, enemyKey, idx) => {
					acc.enemySpeeds[enemyKey] = values.speeds[idx];
					return acc;
				},
				{ enemySpeeds: {} }
			);
			return { enemyPositions, enemyDirectionVectors, enemySpeeds };
		}

		function initGameState(options = { randomiseEnemies: { positions: true, speeds: true } }) {
			const { isGameAreaSmaller, getGameAreaBorderWidth, getGameAreaBoundingRect } = Evader.view;
			const isSmallerGameArea = isGameAreaSmaller();
			const gameAreaDescriptor = isSmallerGameArea ? 'smallerGameArea' : 'defaultGameArea';

			const {
				enemyKeys,
				[gameAreaDescriptor]: {
					initialPlayerPosition: playerPosition,
					initalEnemyPositionValues,
					enemySpeedValues,
				},
			} = Evader.constants.entity;

			const { randomiseEnemies } = options;

			const { enemyPositions, enemyDirectionVectors, enemySpeeds } = allocPosDirSpeedsToEnemyKeys(
				enemyKeys,
				{ positions: initalEnemyPositionValues, speeds: enemySpeedValues },
				randomiseEnemies
			);

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
				playerPosition: { ...playerPosition },
				enemyPositions,
				enemyDirectionVectors,
				enemySpeeds,
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
