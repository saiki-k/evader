Evader.extend(
	'view',
	(function () {
		const {
			view: {
				getImgHtml,
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
			view: { events, emoji },
		} = Evader.config;

		const html = {
			apprenticeMetaImg: getImgHtml(emoji.apprenticeMedal),
			bronzeMetaImg: getImgHtml(emoji.bronzeMedal),
			silverMetaImg: getImgHtml(emoji.silverMedal),
			goldMetaImg: getImgHtml(emoji.goldMedal),
			distinctionMetaImg: getImgHtml(emoji.distinctionMedal),

			victoryHandImg: getImgHtml(emoji.victoryHand),
			indexFingerPointingDownImg: getImgHtml(emoji.indexFingerPointingDown),

			cloudImg: getImgHtml(emoji.cloud),
			sunBehindCloudImg: getImgHtml(emoji.sunBehindCloud),

			sprintModeImg: getImgHtml(emoji.sprintMode),
			meditationModeImg: getImgHtml(emoji.meditationMode),

			randomiserOnImg: getImgHtml(emoji.randomiserOn),
			randomiserOffImg: getImgHtml(emoji.randomiserOff),

			godModeImg: getImgHtml(emoji.godMode),

			gameComment: {
				beforeGameStart: () => `
					<br>Hey there, Player!
					<br>
					<br>Move the red square to start the game. 
					<br>Evade the blues, and avoid the walls.
					<br>
					<br>
					<button class='game-btn game-play-btn' onclick='Evader.game.init()'>Let's Go?</button>
					<button class='game-btn' onclick='Evader.game.options.changeGameMode()'>Change Game Mode</button>
					<button class='game-btn' onclick='Evader.game.options.toggleRandomiser()'>Toggle Randomiser</button>
					<button class='game-btn' onclick='Evader.game.options.clearPlayerStats()'>Clear Scores</button>
				`,
				atGameInit: () => '',
				atGameStart: () => '',
				atGameEnd: (gameMode, finalScore, playerCollision) => {
					const medalType = getMedalType(gameMode, finalScore);
					const collisionMessage = `You've been ${
						playerCollision.withWall ? 'electrocuted out of focus' : 'captured in focus'
					}.`;
					const scoreMessage = `You've survived for ${finalScore} seconds.`;
					const medalMessage = medalType
						? `You've won the ${medalType} medal.`
						: 'You have not won any medals.';

					return `
						<br>${collisionMessage}
						<!-- <br>${scoreMessage} -->
						<br>${medalMessage}
						<br>
						<br>
						<button class='game-btn game-play-btn' onclick='Evader.view.playAgain()'>Play again?</button>
						<button class='game-btn' onclick='Evader.game.options.changeGameMode()'>Change Game Mode</button>
						<button class='game-btn' onclick='Evader.game.options.toggleRandomiser()'>Toggle Randomiser</button>
						<button class='game-btn' onclick='Evader.game.options.clearPlayerStats()'>Clear Scores</button>
					`;
				},
			},
		};

		const elements = {
			gameOptions: {
				darkThemeSwitch: document.getElementById('dark-theme-switch'),
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
			gameComment: document.getElementById('game-comment'),
			// gameOverlay: document.getElementById('game-overlay'),
		};

		const eventListeners = {
			register(target, events, listener, options) {
				events.forEach((event) => target.addEventListener(event, listener, options));
			},

			unregister(target, events, listener) {
				events.forEach((event) => target.removeEventListener(event, listener));
			},

			toggleDarkTheme(e) {
				e.preventDefault();
				Evader.game.options.toggleDarkTheme();
			},

			toggleGodMode(e) {
				e.preventDefault();
				Evader.game.options.toggleGodMode();
			},

			handleHold(e) {
				e.preventDefault();
				if (
					(e.button !== undefined && e.button !== 0) ||
					e.target.parentNode.id === 'dark-theme-switch' ||
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

				const { register, unregister, toggleDarkTheme, toggleGodMode, handleHold, handleMove, handleRelease } =
					eventListeners;
				if (gameState.updateType === 'INIT') {
					register(elements.gameOptions.darkThemeSwitch, events.release, toggleDarkTheme);
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
						gameOptions: { isDarkThemeEnabled, gameMode, isRandomiserEnabled, godMode },
						playerStats: { lastScore, bestScore },
					},
					updateType,
				} = gameState;

				const renderGameAreaSizeMeta = (gameAreaDescriptor) => {
					const { gameAreaDimensions } = Evader.config.entity[gameAreaDescriptor];
					elements.meta.gameAreaSize.innerHTML = gameAreaDimensions;
				};

				const renderDarkThemeMeta = (isDarkThemeEnabled) => {
					const darkThemeSwitchHtml = isDarkThemeEnabled ? html.cloudImg : html.sunBehindCloudImg;
					elements.gameOptions.darkThemeSwitch.innerHTML = darkThemeSwitchHtml;
					document.body.classList[isDarkThemeEnabled ? 'add' : 'remove']('dark');
				};

				const renderGameModeMeta = (gameMode) => {
					elements.meta.gameMode.innerHTML = html[`${gameMode}ModeImg`];
				};

				const renderGameRandomiserMeta = (isRandomiserEnabled) => {
					const randomiserStatus = Object.values(isRandomiserEnabled).some((v) => !v) ? 'Off' : 'On';
					elements.meta.gameRandomiserStatus.innerHTML = html[`randomiser${randomiserStatus}Img`];
				};

				const renderBestScoreMeta = (bestScore, gameAreaDescriptor, gameMode) => {
					const prevBestScore = bestScore[gameAreaDescriptor][gameMode];

					if (prevBestScore) {
						const medalType = getMedalType(gameMode, prevBestScore);
						const bestScoreImg = html[`${medalType}MetaImg`];
						elements.meta.bestScore.innerHTML = `${bestScoreImg} · ${prevBestScore}`;
					} else {
						elements.meta.bestScore.innerHTML = html.apprenticeMetaImg;
					}
				};
				const renderLastScoreMeta = (lastScore, gameAreaDescriptor, gameMode) => {
					const prevLastScore = lastScore[gameAreaDescriptor][gameMode];

					if (prevLastScore) {
						elements.meta.lastScore.innerHTML = `${prevLastScore} · ${html.victoryHandImg}`;
					} else {
						elements.meta.lastScore.innerHTML = html.victoryHandImg;
					}
				};

				const renderRunningScoreMeta = (elapsedTime) => {
					elements.meta.lastScore.innerHTML = `${(elapsedTime / 1000).toFixed(3)} · ${
						html.indexFingerPointingDownImg
					}`;
				};

				const renderGodModeMeta = (godModeIsActive) => {
					elements.gameOptions.godModeSwitch.innerHTML = godModeIsActive ? html.godModeImg : '';
				};

				if (updateType === 'INIT') {
					renderGameAreaSizeMeta(gameAreaDescriptor);

					renderDarkThemeMeta(isDarkThemeEnabled);
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
					renderDarkThemeMeta(isDarkThemeEnabled);
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

			renderGameComment(
				gameState,
				oldGameState,
				options = {
					renderCondition:
						['INIT', 'GAME_INIT', 'GAME_START', 'GAME_OVER'].includes(gameState.updateType) ||
						(gameState.updateType === 'OPTIONS_DARK_THEME_TOGGLE' && !gameState.startTime),
				}
			) {
				if (!options.renderCondition) {
					return;
				}

				const {
					view: { gameAreaDescriptor },
					player,
					misc: {
						gameOptions: { gameMode },
						playerStats: { lastScore },
					},
					updateType,
				} = gameState;

				if (updateType === 'INIT') {
					elements.gameComment.innerHTML = html.gameComment.beforeGameStart();
				}

				if (updateType === 'GAME_INIT') {
					elements.gameComment.innerHTML = html.gameComment.atGameInit();
				}

				if (updateType === 'GAME_START') {
					elements.gameComment.innerHTML = html.gameComment.atGameStart();
				}

				if (updateType === 'GAME_OVER') {
					const finalScore = lastScore[gameAreaDescriptor][gameMode];
					elements.gameComment.innerHTML = html.gameComment.atGameEnd(
						gameMode,
						finalScore,
						player.hasCollision
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
				document.documentElement.style.cursor = ['GAME_START', 'GAME_PLAYER_HOLD'].includes(
					gameState.updateType
				)
					? 'none'
					: 'default';
			},
		};

		return {
			isGameAreaSmaller: () => window.matchMedia('( max-width: 600px )').matches,

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
