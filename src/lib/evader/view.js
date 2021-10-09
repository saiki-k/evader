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
			gameOverlayWrapper: document.getElementById('game-overlay'),
			gameOverlayButtons: {
				playBtn: document.getElementById('play-btn'),
				gameModeBtn: document.getElementById('game-mode-btn'),
				randomiserBtn: document.getElementById('randomiser-btn'),
				darkModeBtn: document.getElementById('dark-mode-btn'),
				clearStatsBtn: document.getElementById('clear-stats-btn'),
				volumeBtn: document.getElementById('volume-btn'),
			},
		};

		const innerHTMLSetter = {
			gameOverlay: {
				playBtn(lastGame, gameMode, gameAreaDescriptor) {
					const displayMedal =
						lastGame?.gameMode === gameMode && lastGame?.gameAreaDescriptor === gameAreaDescriptor;
					elements.gameOverlayButtons.playBtn.innerHTML = `
						<div class="sprite sprite-${displayMedal ? lastGame.medal : 'chequeredFlag'}"></div>
						<span>${displayMedal ? 'Play Again?' : 'Play?'}</span>
					`;
				},
				gameModeBtn(gameMode) {
					elements.gameOverlayButtons.gameModeBtn.innerHTML = `
						<div class="sprite sprite-${gameMode}Mode"></div>
						<span>${gameMode === 'meditation' ? 'Meditation' : 'Sprint'}</span>
					`;
				},
				randomiserBtn(randomiserIsAbsolutelyEnabled) {
					elements.gameOverlayButtons.randomiserBtn.innerHTML = `
						<div class="sprite sprite-randomiser${randomiserIsAbsolutelyEnabled ? '' : ' sprite-grayscale'}"></div>
						<span>${randomiserIsAbsolutelyEnabled ? 'Randomiser On' : 'Randomiser Off'}</span>
					`;
				},
				darkModeBtn(darkModeIsEnabled) {
					elements.gameOverlayButtons.darkModeBtn.innerHTML = `
						<div class="sprite sprite-${darkModeIsEnabled ? 'cloud' : 'sunBehindCloud'}"></div>
						<span>${darkModeIsEnabled ? 'Dark' : 'Light'}</span>
					`;
				},
				clearStatsBtn() {
					elements.gameOverlayButtons.clearStatsBtn.innerHTML = `
						<div class="sprite sprite-broom"></div>
						<span>Clear Stats?</span>
					`;
				},
				volumeBtn(volume) {
					const volumeSpriteKey = [
						'mutedVolumeSpeaker',
						'lowVolumeSpeaker',
						'mediumVolumeSpeaker',
						'highVolumeSpeaker',
					][volume ?? 3];
					const [volumeLevel] = volumeSpriteKey.split('VolumeSpeaker');
					elements.gameOverlayButtons.volumeBtn.innerHTML = `
						<div class="sprite sprite-${volumeSpriteKey}"></div>
						<span>${volumeLevel}</span>
					`;
				},
			},
		};

		const eventHandlers = {
			createGameOverlayButtonHandler(
				buttonKey,
				correspondingButtonEventHandler,
				options = { shouldDeactivateButtonAfterClick: false }
			) {
				const activateButtonElement = (buttonElement, playOptionSelectAudio = false) => {
					if (playOptionSelectAudio) {
						Evader.audio.play('optionSelect');
					}
					buttonElement.classList.add('active');
				};

				const deactivateButtonElement = (buttonElement, playOptionSelectAudio = false) => {
					buttonElement.classList.remove('active');
					buttonElement.blur();
					if (playOptionSelectAudio) {
						Evader.audio.play('optionSelect');
					}
				};

				return function (e) {
					e.preventDefault();
					const eventIsNotLeftClick = e.button !== undefined && e.button !== 0;
					if (eventIsNotLeftClick) {
						return;
					}

					Object.keys(elements.gameOverlayButtons).forEach((key) => {
						if (key === buttonKey) return;
						const otherButtonElement = elements.gameOverlayButtons[key];
						otherButtonElement.classList.remove('active');
					});

					const buttonElement = elements.gameOverlayButtons[buttonKey];
					const buttonIsNotActive = !buttonElement.classList.contains('active');

					if (buttonIsNotActive) {
						return activateButtonElement(buttonElement, (playOptionSelectAudio = true));
					}
					const eventTargetIsNotButtonSpan = e.target.nodeName !== 'SPAN';
					if (eventTargetIsNotButtonSpan) {
						return deactivateButtonElement(buttonElement, (playOptionSelectAudio = true));
					}

					correspondingButtonEventHandler();
					if (options.audioOnClick) {
						Evader.audio.play(options.audioOnClick);
					}

					if (options.shouldDeactivateButtonAfterClick) {
						return deactivateButtonElement(buttonElement);
					}
				};
			},

			toggleGodMode(e) {
				e.preventDefault();
				const eventIsNotLeftClick = e.button !== undefined && e.button !== 0;
				if (eventIsNotLeftClick) {
					return;
				}

				Evader.game.options.toggleGodMode();
			},

			handleHold(e) {
				e.preventDefault();
				const eventIsNotLeftClick = e.button !== undefined && e.button !== 0;
				const pointerEventTargetIsGodModeButton = e.target.parentNode.id === 'god-mode-status';
				if (eventIsNotLeftClick || pointerEventTargetIsGodModeButton) {
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

			resizeHandler(e) {
				const state = Evader.state.getGameState();
				if (state.game.isInProgress) {
					Evader.game.reset();
				}
				const gameAreaIsAlreadySmaller = document.body.classList.contains('smaller');
				const newGameAreaIsSmaller = window.matchMedia(
					Evader.config.entity.smallerGameArea.mediaQueryString
				).matches;

				if (!gameAreaIsAlreadySmaller && newGameAreaIsSmaller) {
					document.body.classList.add('smaller');
				}

				if (gameAreaIsAlreadySmaller && !newGameAreaIsSmaller) {
					document.body.classList.remove('smaller');
				}

				elements.meta.gameAreaSize.classList[newGameAreaIsSmaller ? 'remove' : 'add']('toggleable');
			},

			toggleGameAreaSize(e) {
				e.preventDefault();
				const eventIsNotLeftClick = e.button !== undefined && e.button !== 0;
				if (eventIsNotLeftClick) {
					return;
				}

				const toggleIsNotPossible = window.matchMedia(
					Evader.config.entity.smallerGameArea.mediaQueryString
				).matches;
				if (toggleIsNotPossible) {
					return;
				}
				const gameAreaIsSmaller = document.body.classList.contains('smaller');
				document.body.classList[gameAreaIsSmaller ? 'remove' : 'add']('smaller');
			},

			bodyClassMutationObserver: new MutationObserver(function (mutationsList, observer) {
				const state = Evader.state.getGameState();
				if (state.game.isInProgress) {
					Evader.game.reset();
				}
				const newGameAreaIsSmaller = document.body.classList.contains('smaller');
				for (const mutation of mutationsList) {
					const oldGameAreaIsSmaller = mutation.oldValue?.includes('smaller');
					if (
						(oldGameAreaIsSmaller && !newGameAreaIsSmaller) ||
						(!oldGameAreaIsSmaller && newGameAreaIsSmaller)
					) {
						Evader.game.reset();
					}
				}
			}),
		};

		const eventRegister = {
			registerEvents(eventRegisterRecords) {
				eventRegisterRecords.forEach((eventRegisterRecord) => {
					const { target, events, handler, options } = eventRegisterRecord;
					events.forEach((event) => target.addEventListener(event, handler, options));
				});
			},

			unregisterEvents(eventRegisterRecords) {
				eventRegisterRecords.forEach((eventRegisterRecord) => {
					const { target, events, handler } = eventRegisterRecord;
					events.forEach((event) => target.removeEventListener(event, handler));
				});
			},

			gameOverlayButtons: [
				{
					target: elements.gameOverlayButtons.playBtn,
					events: ['click'],
					handler: eventHandlers.createGameOverlayButtonHandler(
						'playBtn',
						() => {
							const {
								misc: { lastGame },
							} = Evader.state.getGameState();
							if (lastGame) {
								Evader.game.reset();
							}
							Evader.game.init();
						},
						{ shouldDeactivateButtonAfterClick: true, audioOnClick: 'gameStartTone' }
					),
				},
				{
					target: elements.gameOverlayButtons.gameModeBtn,
					events: ['click'],
					handler: eventHandlers.createGameOverlayButtonHandler(
						'gameModeBtn',
						() => Evader.game.options.changeGameMode(),
						{ audioOnClick: 'optionToggle' }
					),
				},
				{
					target: elements.gameOverlayButtons.randomiserBtn,
					events: ['click'],
					handler: eventHandlers.createGameOverlayButtonHandler(
						'randomiserBtn',
						() => Evader.game.options.toggleRandomiser(),
						{ audioOnClick: 'optionToggle' }
					),
				},
				{
					target: elements.gameOverlayButtons.clearStatsBtn,
					events: ['click'],
					handler: eventHandlers.createGameOverlayButtonHandler(
						'clearStatsBtn',
						() => Evader.game.options.clearPlayerStats(),
						{ shouldDeactivateButtonAfterClick: true, audioOnClick: 'clearStatsTone' }
					),
				},
				{
					target: elements.gameOverlayButtons.darkModeBtn,
					events: ['click'],
					handler: eventHandlers.createGameOverlayButtonHandler(
						'darkModeBtn',
						() => Evader.game.options.toggleDarkMode(),
						{ audioOnClick: 'optionToggle' }
					),
				},
				{
					target: elements.gameOverlayButtons.volumeBtn,
					events: ['click'],
					handler: eventHandlers.createGameOverlayButtonHandler(
						'volumeBtn',
						() => Evader.game.options.toggleVolume(),
						{ audioOnClick: 'optionToggle' }
					),
				},
			],
			playerHold: [
				{
					target: document,
					events: ['touchstart'],
					handler: eventHandlers.handleHold,
					options: { passive: false },
				},
				{ target: elements.player, events: ['mousedown'], handler: eventHandlers.handleHold },
			],
			playerMove: [
				{
					target: document,
					events: ['touchmove', 'mousemove'],
					handler: eventHandlers.handleMove,
					options: { passive: false },
				},
			],
			playerRelease: [
				{
					target: document,
					events: ['touchend'],
					handler: eventHandlers.handleRelease,
					options: { passive: false },
				},
				{
					target: elements.player,
					events: ['mousedown'],
					handler: eventHandlers.handleRelease,
					options: { passive: false },
				},
			],
			windowResize: [{ target: window, events: ['resize'], handler: eventHandlers.resizeHandler }],
			godModeToggle: [
				{
					target: elements.gameOptions.godModeSwitch,
					events: ['click'],
					handler: eventHandlers.toggleGodMode,
				},
				{
					target: document,
					events: ['keydown'],
					handler: (e) => {
						if (e.code === 'KeyG') {
							eventHandlers.toggleGodMode(e);
						}
					},
				},
			],
			gameAreaResizeToggle: [
				{
					target: elements.meta.gameAreaSize,
					events: ['click'],
					handler: eventHandlers.toggleGameAreaSize,
				},
			],
		};

		const renderers = {
			registerEventHandlers(gameState) {
				const renderCondition = ['INIT', 'GAME_INIT', 'GAME_OVER'].includes(gameState.updateType);
				if (!renderCondition) {
					return;
				}

				const {
					registerEvents,
					unregisterEvents,
					gameOverlayButtons,
					godModeToggle,
					windowResize,
					gameAreaResizeToggle,
					playerHold,
					playerMove,
					playerRelease,
				} = eventRegister;
				const { bodyClassMutationObserver } = eventHandlers;
				if (gameState.updateType === 'INIT') {
					registerEvents(gameOverlayButtons);
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

			resetView(gameState) {
				const renderCondition = ['GAME_RESET'].includes(gameState.updateType);
				if (!renderCondition) {
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

			renderGameMeta(gameState) {
				const renderCondition = [
					'INIT',
					'GAME_INIT',
					'GAME_LOOP_UPDATE',
					'GAME_OVER',
					'OPTIONS_CLEAR_PLAYER_STATS',
					'OPTIONS_DARK_THEME_TOGGLE',
					'OPTIONS_GAME_MODE_CHANGE',
					'OPTIONS_GAME_RANDOMISER_TOGGLE',
					'OPTIONS_GOD_MODE_TOGGLE',
				].includes(gameState.updateType);
				if (!renderCondition) {
					return;
				}

				const {
					view: { gameAreaDescriptor },
					game: { elapsedTime, isOver: gameIsOver },
					enemy,
					misc: {
						gameOptions: { darkModeIsEnabled, gameMode, randomiserEnabledOn, godMode },
						playerStats: { lastScore, bestScore },
					},
					updateType,
				} = gameState;

				const renderGameAreaSizeMeta = (gameAreaDescriptor) => {
					const { gameAreaDimensions } = Evader.config.entity[gameAreaDescriptor];
					elements.meta.gameAreaSize.innerHTML = gameAreaDimensions;
				};

				const renderDarkModeMeta = (darkModeIsEnabled) => {
					document.body.classList[darkModeIsEnabled ? 'add' : 'remove']('dark');
				};

				const renderGameModeMeta = (gameMode) => {
					const gameModeImg = `<div class="sprite-meta sprite-${gameMode}Mode sprite-left"></div>`;
					const gameModeDescriptor = `<span class="game-meta-left-text">· ${
						gameMode === 'meditation' ? 'meditator' : 'sprinter'
					}</span>`;

					elements.meta.gameMode.innerHTML = `${gameModeImg}${gameModeDescriptor}`;
				};

				const renderGameRandomiserMeta = (randomiserEnabledOn) => {
					const randomiserIsAbsolutelyEnabled = !Object.values(randomiserEnabledOn).some((v) => !v);

					const randomiserImg = `<div class="sprite-meta sprite-randomiser sprite-right${
						randomiserIsAbsolutelyEnabled ? '' : ' sprite-grayscale'
					}"></div>`;
					const randomiserStatusDescriptor = `<span class="game-meta-right-text">${
						randomiserIsAbsolutelyEnabled ? 'randomised' : 'engineered'
					} ·</span>`;

					elements.meta.gameRandomiserStatus.innerHTML = `${randomiserStatusDescriptor}${randomiserImg}`;
				};

				const renderBestScoreMeta = (bestScore, gameAreaDescriptor, gameMode) => {
					const prevBestScore = bestScore[gameAreaDescriptor][gameMode];

					const bestMedalImg = prevBestScore
						? `<div class="sprite-meta sprite-${getMedalType(
								gameMode,
								prevBestScore
						  )}Medal sprite-left"></div>`
						: '';
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
					const runningScore = elapsedTime ? (elapsedTime / 1000).toFixed(3) : 'GO';

					const runningScorePulsateClass = runningScore === 'GO' ? ' pulsate' : '';
					const indexFingerPointingDownImg = `<div class="sprite-meta sprite-indexFingerPointingDown sprite-right${runningScorePulsateClass}"></div>`;
					const runningScoreDescriptor = `<span class="game-meta-right-text${runningScorePulsateClass}">${runningScore} ·</span>`;

					elements.meta.lastScore.innerHTML = `${runningScoreDescriptor}${indexFingerPointingDownImg}`;
				};

				const renderGodModeMeta = (godModeIsActive) => {
					const godModeImg = `<div class="sprite-meta sprite-godMode sprite-center"></div>`;
					elements.gameOptions.godModeSwitch.innerHTML = godModeIsActive ? godModeImg : '';
				};

				if (updateType === 'INIT') {
					renderGameAreaSizeMeta(gameAreaDescriptor);

					renderDarkModeMeta(darkModeIsEnabled);
					renderGameModeMeta(gameMode);
					renderGameRandomiserMeta(randomiserEnabledOn);

					renderBestScoreMeta(bestScore, gameAreaDescriptor, gameMode);
					renderLastScoreMeta(lastScore, gameAreaDescriptor, gameMode);

					renderGodModeMeta(godMode.isActive);
				}

				if (updateType === 'GAME_INIT') {
					renderRunningScoreMeta(elapsedTime);
				}

				if (['GAME_OVER', 'OPTIONS_CLEAR_PLAYER_STATS'].includes(updateType)) {
					renderBestScoreMeta(bestScore, gameAreaDescriptor, gameMode);
					renderLastScoreMeta(lastScore, gameAreaDescriptor, gameMode);
				}

				if (updateType === 'GAME_LOOP_UPDATE') {
					renderRunningScoreMeta(elapsedTime);
				}

				if (updateType === 'OPTIONS_DARK_THEME_TOGGLE') {
					renderDarkModeMeta(darkModeIsEnabled);
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
					renderGameRandomiserMeta(randomiserEnabledOn);

					if (!gameIsOver) {
						setElementPositions(elements.enemies, enemy.poses);
					}
				}

				if (updateType === 'OPTIONS_GOD_MODE_TOGGLE') {
					renderGodModeMeta(godMode.isActive);
				}
			},

			renderPlayer(gameState) {
				const renderCondition = ['INIT', 'GAME_PLAYER_MOVE'].includes(gameState.updateType);
				if (!renderCondition) {
					return;
				}
				setElementPosition(elements.player, gameState.player.position);
			},

			renderEnemies(gameState) {
				const renderCondition = ['INIT', 'GAME_LOOP_UPDATE'].includes(gameState.updateType);
				if (!renderCondition) {
					return;
				}
				setElementPositions(elements.enemies, gameState.enemy.poses);
			},

			renderGameOverlay(gameState) {
				const renderCondition =
					!gameState.game.isInProgress &&
					[
						'INIT',
						'GAME_INIT',
						'GAME_OVER',
						'OPTIONS_GAME_MODE_CHANGE',
						'OPTIONS_GAME_RANDOMISER_TOGGLE',
						'OPTIONS_DARK_THEME_TOGGLE',
						'OPTIONS_VOLUME_TOGGLE',
					].includes(gameState.updateType);
				if (!renderCondition) {
					return;
				}

				const {
					view: { gameAreaDescriptor },
					misc: {
						gameOptions: { gameMode, darkModeIsEnabled, randomiserEnabledOn, volume },
						lastGame,
					},
					updateType,
				} = gameState;

				if (updateType === 'INIT') {
					const randomiserIsAbsolutelyEnabled = !Object.values(randomiserEnabledOn).some((v) => !v);

					elements.gameOverlayWrapper.classList.remove('invisible');

					innerHTMLSetter.gameOverlay.playBtn(lastGame, gameMode, gameAreaDescriptor);
					innerHTMLSetter.gameOverlay.gameModeBtn(gameMode);
					innerHTMLSetter.gameOverlay.randomiserBtn(randomiserIsAbsolutelyEnabled);
					innerHTMLSetter.gameOverlay.clearStatsBtn();
					innerHTMLSetter.gameOverlay.darkModeBtn(darkModeIsEnabled);
					innerHTMLSetter.gameOverlay.volumeBtn(volume);
				}

				if (updateType === 'GAME_INIT') {
					elements.gameOverlayWrapper.classList.add('invisible');
				}

				if (updateType === 'GAME_OVER') {
					innerHTMLSetter.gameOverlay.playBtn(lastGame, gameMode, gameAreaDescriptor);
					elements.gameOverlayWrapper.classList.remove('invisible');
				}

				if (updateType === 'OPTIONS_GAME_MODE_CHANGE') {
					innerHTMLSetter.gameOverlay.playBtn(lastGame, gameMode, gameAreaDescriptor);
					innerHTMLSetter.gameOverlay.gameModeBtn(gameMode);
				}

				if (updateType === 'OPTIONS_GAME_RANDOMISER_TOGGLE') {
					const randomiserIsAbsolutelyEnabled = !Object.values(randomiserEnabledOn).some((v) => !v);
					innerHTMLSetter.gameOverlay.randomiserBtn(randomiserIsAbsolutelyEnabled);
				}

				if (updateType === 'OPTIONS_DARK_THEME_TOGGLE') {
					innerHTMLSetter.gameOverlay.darkModeBtn(darkModeIsEnabled);
				}

				if (updateType === 'OPTIONS_VOLUME_TOGGLE') {
					innerHTMLSetter.gameOverlay.volumeBtn(volume);
				}
			},

			renderCursor(gameState) {
				const renderCondition = [
					'GAME_START',
					'GAME_PLAYER_HOLD',
					'GAME_PLAYER_RELEASE',
					'GAME_OVER',
					'GAME_RESET',
				].includes(gameState.updateType);
				if (!renderCondition) {
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

			render(gameState, oldGameState) {
				for (const renderer of Object.values(renderers)) {
					renderer(gameState, oldGameState);
				}
			},
		};
	})()
);
