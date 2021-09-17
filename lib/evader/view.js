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
						<div class="sprite sprite-broom"></div>
					</button>

					<button id='volume-btn' class='game-btn' onclick='Evader.game.options.toggleVolume()'>
						<div class="sprite sprite-${
							['mutedSpeaker', 'lowVolumeSpeaker', 'mediumVolumeSpeaker', 'highVolumeSpeaker'][
								volume ?? 3
							]
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

				const { registerEvents, playerMove, playerRelease } = eventRegister;
				registerEvents(playerMove);
				registerEvents(playerRelease);
			},

			handleMove(e) {
				e.preventDefault();
				Evader.game.movePlayer(getEventCoordinates(e));
			},

			handleRelease(e) {
				e.preventDefault();
				const { unregisterEvents, playerMove, playerRelease } = eventRegister;
				unregisterEvents(playerMove);
				unregisterEvents(playerRelease);
				Evader.game.releasePlayer(getEventCoordinates(e, { changedTouchEvent: true }));
			},

			resizeListener(e) {
				const state = Evader.state.getGameState();
				if (state.game.isInProgress) {
					Evader.game.reset();
				}
				const isGameAreaAlreadySmaller = document.body.classList.contains('smaller');
				const isNewGameAreaSmaller = window.matchMedia('(max-width: 600px), (max-height: 600px)').matches;

				if (!isGameAreaAlreadySmaller && isNewGameAreaSmaller) {
					document.body.classList.add('smaller');
				}

				if (isGameAreaAlreadySmaller && !isNewGameAreaSmaller) {
					document.body.classList.remove('smaller');
				}

				elements.meta.gameAreaSize.classList[isNewGameAreaSmaller ? 'remove' : 'add']('toggleable');
			},

			toggleGameAreaSize(e) {
				e.preventDefault();
				const isToggleNotPossible = window.matchMedia('(max-width: 600px), (max-height: 600px)').matches;
				if (isToggleNotPossible) {
					return;
				}
				const isGameAreaSmaller = document.body.classList.contains('smaller');
				document.body.classList[isGameAreaSmaller ? 'remove' : 'add']('smaller');
			},

			bodyClassMutationObserver: new MutationObserver(function (mutationsList, observer) {
				const state = Evader.state.getGameState();
				if (state.game.isInProgress) {
					Evader.game.reset();
				}
				const isNewGameAreaSmaller = document.body.classList.contains('smaller');
				for (const mutation of mutationsList) {
					const isOldGameAreaSmaller = mutation.oldValue?.includes('smaller');
					if (
						(isOldGameAreaSmaller && !isNewGameAreaSmaller) ||
						(!isOldGameAreaSmaller && isNewGameAreaSmaller)
					) {
						Evader.game.reset();
					}
				}
			}),
		};

		const eventRegister = {
			registerEvents(eventRegisters) {
				eventRegisters.forEach((eventRegisterRecord) => {
					const { target, events, listener, options } = eventRegisterRecord;
					events.forEach((event) => target.addEventListener(event, listener, options));
				});
			},

			unregisterEvents(eventRegisters) {
				eventRegisters.forEach((eventRegisterRecord) => {
					const { target, events, listener } = eventRegisterRecord;
					events.forEach((event) => target.removeEventListener(event, listener));
				});
			},

			playerHold: [
				{
					target: document,
					events: ['touchstart'],
					listener: eventListeners.handleHold,
					options: { passive: false },
				},
				{ target: elements.player, events: ['mousedown'], listener: eventListeners.handleHold },
			],
			playerMove: [
				{
					target: document,
					events: ['touchmove', 'mousemove'],
					listener: eventListeners.handleMove,
					options: { passive: false },
				},
			],
			playerRelease: [
				{
					target: document,
					events: ['touchend'],
					listener: eventListeners.handleRelease,
					options: { passive: false },
				},
				{
					target: elements.player,
					events: ['mousedown'],
					listener: eventListeners.handleRelease,
					options: { passive: false },
				},
			],
			windowResize: [{ target: window, events: ['resize'], listener: eventListeners.resizeListener }],
			godModeToggle: [
				{
					target: elements.gameOptions.godModeSwitch,
					events: ['touchend', 'mouseup'],
					listener: eventListeners.toggleGodMode,
				},
				{
					target: document,
					events: ['keydown'],
					listener: (e) => {
						if (e.code === 'KeyG') {
							eventListeners.toggleGodMode(e);
						}
					},
				},
			],
			gameAreaResizeToggle: [
				{
					target: elements.meta.gameAreaSize,
					events: ['touchend', 'mouseup'],
					listener: eventListeners.toggleGameAreaSize,
				},
			],
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

				const {
					registerEvents,
					unregisterEvents,
					godModeToggle,
					windowResize,
					gameAreaResizeToggle,
					playerHold,
					playerMove,
					playerRelease,
				} = eventRegister;
				const { bodyClassMutationObserver } = eventListeners;
				if (gameState.updateType === 'INIT') {
					registerEvents(godModeToggle);
					registerEvents(windowResize);
					registerEvents(gameAreaResizeToggle);
					bodyClassMutationObserver.observe(document.body, {
						attributes: true,
						attributeFilter: ['class'],
						attributeOldValue: true,
					});
				}
				if (gameState.updateType === 'GAME_INIT') {
					registerEvents(playerHold);
				}
				if (gameState.updateType === 'GAME_OVER') {
					unregisterEvents(playerHold);
					unregisterEvents(playerMove);
					unregisterEvents(playerRelease);
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

				const { unregisterEvents, playerHold, playerMove, playerRelease } = eventRegister;
				unregisterEvents(playerHold);
				unregisterEvents(playerMove);
				unregisterEvents(playerRelease);
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
						'OPTIONS_CLEAR_PLAYER_STATS',
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

					const indexFingerPointingDownImg = `<div class="sprite-meta sprite-indexFingerPointingDown sprite-right"></div>`;
					const runningScoreDescriptor = `<span class="game-meta-right-text">${runningScore} ·</span>`;

					elements.meta.lastScore.innerHTML = `${runningScoreDescriptor}${indexFingerPointingDownImg}`;
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

				if (['GAME_OVER', 'OPTIONS_CLEAR_PLAYER_STATS'].includes(updateType)) {
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
					document.documentElement.classList.add('no-cursor');
					elements.player.classList.add('no-cursor', 'hold');
				} else {
					document.documentElement.classList.remove('no-cursor');
					elements.player.classList.remove('no-cursor', 'hold');
				}
			},
		};

		return {
			isGameAreaSmaller: () => document.body.classList.contains('smaller'),

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
