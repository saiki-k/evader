Evader.extend(
	'view',
	(function () {
		const {
			view: {
				getEventCoordinates,
				getBorderWidth,
				getBoundingRect,
				isElementAtBounds,
				setElementPosition,
				setElementPositions,
			},
			game: { getMedalType },
		} = Evader.utils;
		const {
			view: { events },
		} = Evader.config;

		const html = {
			gameOverlay: (gameMode, isDarkModeEnabled, isRandomiserAbsolutelyEnabled, isGameOver, volume) => {
				return `
					<button id='play-btn' class='game-btn' onclick=${isGameOver ? 'Evader.view.playAgain()' : 'Evader.view.play()'}>
						<div class="sprite sprite-chequeredFlag"></div>
					</button>
		
					<button id='game-mode-btn' class='game-btn' onclick='Evader.game.options.changeGameMode()'>
						<div class="sprite sprite-${gameMode}Mode"></div>
					</button>
		
					<button id='randomiser-btn' class='game-btn' onclick='Evader.game.options.toggleRandomiser()'>
						<div class="sprite sprite-randomiser ${isRandomiserAbsolutelyEnabled ? '' : ' sprite-grayscale'}"></div>
					</button>

					<button id='dark-mode-btn' class='game-btn' onclick='Evader.game.options.toggleDarkMode()'>
						<div class="sprite sprite-${isDarkModeEnabled ? 'cloud' : 'sunBehindCloud'}"></div>
					</button>

					<button id='clear-stats-btn' class='game-btn' onclick='Evader.game.options.clearPlayerStats()'>
						<div class="sprite sprite-skullAndCrossbones"></div>
					</button>

					<button id='volume-btn' class='game-btn' onclick='Evader.game.options.toggleVolume()'>
						<div class="sprite sprite-${
							['mutedSpeaker', 'lowVolumeSpeaker', 'mediumVolumeSpeaker', 'highVolumeSpeaker'][volume]
						}"></div>
					</button>
				`;
			},
		};

		const elements = {
			gameOptions: {
				godModeSwitch: document.getElementById('god-mode-status'),
			},
			meta: {
				bestScore: document.getElementById('game-best-score'),
				lastScore: document.getElementById('game-last-score'),
				gameMode: document.getElementById('game-mode'),
				gameAreaSize: document.getElementById('game-area-size'),
				gameRandomiserStatus: document.getElementById('game-randomiser-status'),
			},
			gameArea: document.getElementById('game-area'),
			player: document.getElementById('player'),
			enemies: {
				enemy0: document.getElementById('enemy0'),
				enemy1: document.getElementById('enemy1'),
				enemy2: document.getElementById('enemy2'),
				enemy3: document.getElementById('enemy3'),
			},
			gameOverlay: document.getElementById('game-overlay'),
		};

		const eventListeners = {
			register(target, events, listener, options) {
				events.forEach((event) => target.addEventListener(event, listener, options));
			},

			unregister(target, events, listener) {
				events.forEach((event) => target.removeEventListener(event, listener));
			},

			toggleDarkMode(e) {
				e.preventDefault();
				Evader.game.options.toggleDarkMode();
			},

			toggleGodMode(e) {
				e.preventDefault();
				Evader.game.options.toggleGodMode();
			},

			handleHold(e) {
				e.preventDefault();
				if (
					(e.button !== undefined && e.button !== 0) ||
					e.target.parentNode.id === 'dark-mode-switch' ||
					e.target.parentNode.id === 'god-mode-status'
				) {
					// Ignore non-left clicks, and clicks on game-option meta icons
					return;
				}

				Evader.game.holdPlayer(getEventCoordinates(e));

				const { register, handleMove, handleRelease } = eventListeners;
				register(document, events.move, handleMove, { passive: false });
				register(document, events.release, handleRelease, { passive: false });
			},

			handleMove(e) {
				e.preventDefault();
				Evader.game.movePlayer(getEventCoordinates(e));
			},

			handleRelease(e) {
				e.preventDefault();

				const { unregister, handleMove, handleRelease } = eventListeners;
				unregister(document, events.move, handleMove);
				unregister(document, events.release, handleRelease);

				Evader.game.releasePlayer(getEventCoordinates(e, { changedTouchEvent: true }));
			},
		};

		const renderers = {
			updateEventListeners(
				gameState,
				oldGameState,
				options = {
					renderCondition: ['INIT', 'GAME_INIT', 'GAME_OVER'].includes(gameState.updateType),
				}
			) {
				if (!options.renderCondition) {
					return;
				}

				const { register, unregister, toggleGodMode, handleHold, handleMove, handleRelease } = eventListeners;
				if (gameState.updateType === 'INIT') {
					register(elements.gameOptions.godModeSwitch, events.release, toggleGodMode);
				}
				if (gameState.updateType === 'GAME_INIT') {
					register(document, events.hold, handleHold, { passive: false });
				}
				if (gameState.updateType === 'GAME_OVER') {
					unregister(document, events.hold, handleHold);
					unregister(document, events.move, handleMove);
					unregister(document, events.release, handleRelease);
				}
			},

			resetView(
				gameState,
				oldGameState,
				options = {
					renderCondition: ['GAME_RESET'].includes(gameState.updateType),
				}
			) {
				if (!options.renderCondition) {
					return;
				}

				const {
					game: { gameLoopIntervalId },
				} = gameState;

				clearTimeout(gameLoopIntervalId);

				const { unregister, handleHold, handleMove, handleRelease } = eventListeners;
				unregister(document, events.hold, handleHold);
				unregister(document, events.move, handleMove);
				unregister(document, events.release, handleRelease);
				Evader.view.initView();
			},

			renderGameMeta(
				gameState,
				oldGameState,
				options = {
					renderCondition: [
						'INIT',
						'GAME_LOOP_UPDATE',
						'GAME_OVER',
						'CLEAR_PLAYER_STATS',
						'OPTIONS_DARK_THEME_TOGGLE',
						'OPTIONS_GAME_MODE_CHANGE',
						'OPTIONS_GAME_RANDOMISER_TOGGLE',
						'OPTIONS_GOD_MODE_TOGGLE',
					].includes(gameState.updateType),
				}
			) {
				if (!options.renderCondition) {
					return;
				}

				const {
					view: { gameAreaDescriptor },
					game: { elapsedTime, isOver: gameIsOver },
					player,
					enemy,
					misc: {
						gameOptions: { isDarkModeEnabled, gameMode, isRandomiserEnabled, godMode },
						playerStats: { lastScore, bestScore },
					},
					updateType,
				} = gameState;

				const renderGameAreaSizeMeta = (gameAreaDescriptor) => {
					const { gameAreaDimensions } = Evader.config.entity[gameAreaDescriptor];
					elements.meta.gameAreaSize.innerHTML = gameAreaDimensions;
				};

				const renderDarkModeMeta = (isDarkModeEnabled) => {
					document.body.classList[isDarkModeEnabled ? 'add' : 'remove']('dark');
				};

				const renderGameModeMeta = (gameMode) => {
					const gameModeImg = `<div class="sprite-meta sprite-${gameMode}Mode sprite-left"></div>`;
					const gameModeDescriptor = `<span class="game-meta-left-text">· ${
						gameMode === 'meditation' ? 'meditator' : 'sprinter'
					}</span>`;

					elements.meta.gameMode.innerHTML = `${gameModeImg}${gameModeDescriptor}`;
				};

				const renderGameRandomiserMeta = (isRandomiserEnabled) => {
					const isRandomiserAbsolutelyEnabled = !Object.values(isRandomiserEnabled).some((v) => !v);

					const randomiserImg = `<div class="sprite-meta sprite-randomiser sprite-right${
						isRandomiserAbsolutelyEnabled ? '' : ' sprite-grayscale'
					}"></div>`;
					const randomiserStatusDescriptor = `<span class="game-meta-right-text">${
						isRandomiserAbsolutelyEnabled ? 'randomised' : 'engineered'
					} ·</span>`;

					elements.meta.gameRandomiserStatus.innerHTML = `${randomiserStatusDescriptor}${randomiserImg}`;
				};

				const renderBestScoreMeta = (bestScore, gameAreaDescriptor, gameMode) => {
					const prevBestScore = bestScore[gameAreaDescriptor][gameMode];

					const bestMedalImg = `<div class="sprite-meta sprite-${
						prevBestScore ? getMedalType(gameMode, prevBestScore) : 'apprentice'
					}Medal sprite-left"></div>`;
					const bestScoreDescriptor = prevBestScore
						? `<span class="game-meta-left-text">· ${prevBestScore}</span>`
						: '';

					elements.meta.bestScore.innerHTML = `${bestMedalImg}${bestScoreDescriptor}`;
				};

				const renderLastScoreMeta = (lastScore, gameAreaDescriptor, gameMode) => {
					const prevLastScore = lastScore[gameAreaDescriptor][gameMode];

					const victoryHandImg = `<div class="sprite-meta sprite-victoryHand sprite-right"></div>`;
					const lastScoreDescriptor = `<span class="game-meta-right-text">${
						prevLastScore || 'a new you'
					} ·</span>`;

					elements.meta.lastScore.innerHTML = `${lastScoreDescriptor}${victoryHandImg}`;
				};

				const renderRunningScoreMeta = (elapsedTime) => {
					const runningScore = (elapsedTime / 1000).toFixed(3);

					const victoryHandImg = `<div class="sprite-meta sprite-victoryHand sprite-right"></div>`;
					const runningScoreDescriptor = `<span class="game-meta-right-text">${runningScore} ·</span>`;

					elements.meta.lastScore.innerHTML = `${runningScoreDescriptor}${victoryHandImg}`;
				};

				const renderGodModeMeta = (godModeIsActive) => {
					const godModeImg = `<div class="sprite-meta sprite-godMode sprite-center"></div>`;
					elements.gameOptions.godModeSwitch.innerHTML = godModeIsActive ? godModeImg : '';
				};

				if (updateType === 'INIT') {
					renderGameAreaSizeMeta(gameAreaDescriptor);

					renderDarkModeMeta(isDarkModeEnabled);
					renderGameModeMeta(gameMode);
					renderGameRandomiserMeta(isRandomiserEnabled);

					renderBestScoreMeta(bestScore, gameAreaDescriptor, gameMode);
					renderLastScoreMeta(lastScore, gameAreaDescriptor, gameMode);

					renderGodModeMeta(godMode.isActive);
				}

				if (['GAME_OVER', 'CLEAR_PLAYER_STATS'].includes(updateType)) {
					renderBestScoreMeta(bestScore, gameAreaDescriptor, gameMode);
					renderLastScoreMeta(lastScore, gameAreaDescriptor, gameMode);
				}

				if (updateType === 'GAME_LOOP_UPDATE') {
					renderRunningScoreMeta(elapsedTime);
				}

				if (updateType === 'OPTIONS_DARK_THEME_TOGGLE') {
					renderDarkModeMeta(isDarkModeEnabled);
				}

				if (updateType === 'OPTIONS_GAME_MODE_CHANGE') {
					renderGameModeMeta(gameMode);
					renderBestScoreMeta(bestScore, gameAreaDescriptor, gameMode);
					renderLastScoreMeta(lastScore, gameAreaDescriptor, gameMode);

					if (!gameIsOver) {
						setElementPositions(elements.enemies, enemy.poses);
					}
				}

				if (updateType === 'OPTIONS_GAME_RANDOMISER_TOGGLE') {
					renderGameRandomiserMeta(isRandomiserEnabled);

					if (!gameIsOver) {
						setElementPositions(elements.enemies, enemy.poses);
					}
				}

				if (updateType === 'OPTIONS_GOD_MODE_TOGGLE') {
					renderGodModeMeta(godMode.isActive);
				}
			},

			renderPlayer(
				gameState,
				oldGameState,
				options = {
					renderCondition: ['INIT', 'GAME_PLAYER_MOVE'].includes(gameState.updateType),
				}
			) {
				if (!options.renderCondition) {
					return;
				}
				setElementPosition(elements.player, gameState.player.position);
			},

			renderEnemies(
				gameState,
				oldGameState,
				options = {
					renderCondition: ['INIT', 'GAME_LOOP_UPDATE'].includes(gameState.updateType),
				}
			) {
				if (!options.renderCondition) {
					return;
				}
				setElementPositions(elements.enemies, gameState.enemy.poses);
			},

			renderGameOverlay(
				gameState,
				oldGameState,
				options = {
					renderCondition:
						[
							'INIT',
							'GAME_INIT',
							'GAME_OVER',
							'OPTIONS_GAME_MODE_CHANGE',
							'OPTIONS_GAME_RANDOMISER_TOGGLE',
							'OPTIONS_DARK_THEME_TOGGLE',
							'OPTIONS_VOLUME_TOGGLE',
						].includes(gameState.updateType) && !gameState.game.isInProgress,
				}
			) {
				if (!options.renderCondition) {
					return;
				}

				const {
					game,
					misc: {
						gameOptions: { gameMode, isDarkModeEnabled, isRandomiserEnabled, volume },
					},
					updateType,
				} = gameState;

				const isRandomiserAbsolutelyEnabled = !Object.values(isRandomiserEnabled).some((v) => !v);

				if (updateType === 'GAME_INIT') {
					elements.gameOverlay.classList.add('invisible');
					elements.gameOverlay.innerHTML = '';
				} else {
					if (elements.gameOverlay.classList.contains('invisible')) {
						elements.gameOverlay.classList.remove('invisible');
					}
					elements.gameOverlay.innerHTML = html.gameOverlay(
						gameMode,
						isDarkModeEnabled,
						isRandomiserAbsolutelyEnabled,
						game.isOver,
						volume
					);
				}
			},

			renderCursor(
				gameState,
				oldGameState,
				options = {
					renderCondition: [
						'GAME_START',
						'GAME_PLAYER_HOLD',
						'GAME_PLAYER_RELEASE',
						'GAME_OVER',
						'GAME_RESET',
					].includes(gameState.updateType),
				}
			) {
				if (!options.renderCondition) {
					return;
				}

				if (['GAME_START', 'GAME_PLAYER_HOLD'].includes(gameState.updateType)) {
					document.documentElement.style.cursor = 'none';
					elements.player.style.cursor = 'none';
				} else {
					document.documentElement.style.cursor = 'default';
					elements.player.style.cursor = 'grab';
				}
			},
		};

		return {
			isGameAreaSmaller: () => window.matchMedia('(max-width: 600px), (max-height: 600px)').matches,

			getGameAreaBorderWidth() {
				return getBorderWidth(elements.gameArea);
			},

			getGameAreaBoundingRect() {
				return getBoundingRect(elements.gameArea);
			},

			isPlayerAtBounds(gameBound) {
				return isElementAtBounds(elements.player, {
					boundAreaBorderWidth: gameBound.borderWidth,
					boundAreaBoundingRect: gameBound.boundingRect,
				});
			},

			isEnemyAtBounds(enemy, gameBound) {
				return isElementAtBounds(elements.enemies[enemy], {
					boundAreaBorderWidth: gameBound.borderWidth,
					boundAreaBoundingRect: gameBound.boundingRect,
				});
			},

			initView(gameState = Evader.state.initGameState()) {
				this.render(gameState);
			},

			play() {
				Evader.audio.play('bgm');
				Evader.game.init();
			},

			playAgain() {
				const { game } = Evader.state.getGameState();
				if (game.isOver) {
					Evader.view.initView();
				}
				Evader.game.init();
			},

			render(gameState, oldGameState) {
				for (const renderer of Object.values(renderers)) {
					renderer(gameState, oldGameState);
				}
			},
		};
	})()
);
