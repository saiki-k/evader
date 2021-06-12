Evader.extend(
	'view',
	(function () {
		const { getImgHtml, getEventCoordinates, getBorderWidth, getBoundingRect, isElementAtBounds } =
			Evader.view.utils;
		const {
			events,
			emoji: {
				victoryHand,
				firstPlaceMedal,
				sportsMedal,
				indexFingerPointingDown,
				cloud,
				sunBehindCloud,
				beamingFace,
				starStruck,
			},
		} = Evader.constants.view;

		const html = {
			victoryHandImg: getImgHtml(victoryHand),
			firstPlaceMedalImg: getImgHtml(firstPlaceMedal),
			sportsMedalImg: getImgHtml(sportsMedal),
			indexFingerPointingDownImg: getImgHtml(indexFingerPointingDown),
			cloudImg: getImgHtml(cloud),
			sunBehindCloudImg: getImgHtml(sunBehindCloud),
			beamingFaceImg: getImgHtml(beamingFace),
			starStruckImg: getImgHtml(starStruck),

			gameComment: {
				beforeGameStart: (wallColor) => `
					<br>Hey there, Player!
					<br>
					<br>Move the red square to start the game. 
					<br>Evade the blues, and avoid the ${wallColor}s.
				`,
				atGameStart: (radScore) => `
					<br>Can you survive ${radScore} seconds?
					<br>That... would be super rad, Player!
					<!--<br>
					<br>P.S.: The speed maxes out at ~25 seconds.-->
				`,
				atGameEnd: (finalScore, radScore) => `
					<br>You've survived for ${finalScore} seconds.
					<br>${
						finalScore >= radScore
							? 'WOW, Player! You. Are. Awesome. ' + html.starStruckImg
							: 'Not too shabby, Player! ' + html.beamingFaceImg
					}
					<br>
					<br><button class='game-play-again-btn' onclick='Evader.view.initView()'>Play again?</button>
				`,
			},
		};

		const logGameOverMessage = (playerCollision, wallColor) => {
			const collisionMessage = playerCollision.withWall
				? `electrocuted as you came into contact with the ${wallColor} wall`
				: `captured by the enemy (${playerCollision.withEnemy.split('enemy').join('#')})`;
			console.log(`You've been ${collisionMessage}.`);
		};

		const elements = {
			darkModeSwitch: document.getElementById('dark-mode-switch'),
			meta: {
				bestScore: document.getElementById('game-best-score'),
				currentScore: document.getElementById('game-current-score'),
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
		};

		const renderers = {
			updateEventListeners(
				gameState,
				oldGameState,
				options = {
					renderCondition: ['GAME_INIT', 'GAME_OVER'].includes(gameState.updateType),
				}
			) {
				if (!options.renderCondition) {
					return;
				}

				if (gameState.updateType === 'GAME_INIT') {
					eventListeners.register(
						document.getElementById('dark-mode-switch'),
						'click',
						eventListeners.toggleDarkMode
					);
					events.hold.forEach((event) =>
						eventListeners.register(document, event, eventListeners.handleHold, {
							eventOptions: { passive: false },
						})
					);
				}
				if (gameState.updateType === 'GAME_OVER') {
					events.hold.forEach((event) =>
						eventListeners.register(document, event, eventListeners.handleHold, { removeListener: true })
					);
				}
			},

			renderGameMeta(
				gameState,
				oldGameState,
				options = {
					renderCondition: ['GAME_INIT', 'GAME_LOOP_UPDATE', 'GAME_OVER'].includes(gameState.updateType),
				}
			) {
				if (!options.renderCondition) {
					return;
				}

				const { finalScore, bestScore, gameArea } = gameState;

				if (['GAME_INIT', 'GAME_OVER'].includes(gameState.updateType)) {
					const bestScoreImg = gameArea.isSmaller ? html.sportsMedalImg : html.firstPlaceMedalImg;
					const prevBestScore = bestScore[gameArea.descriptor];
					const prevFinalScore = finalScore[gameArea.descriptor];
					elements.meta.bestScore.innerHTML = prevBestScore ? `${bestScoreImg} · ${prevBestScore}` : '';
					elements.meta.currentScore.innerHTML = prevFinalScore
						? `${prevFinalScore} · ${html.victoryHandImg}`
						: html.victoryHandImg;
				}

				if (gameState.updateType === 'GAME_LOOP_UPDATE') {
					elements.meta.currentScore.innerHTML = `${(gameState.elapsedTime / 1000).toFixed(3)} · ${
						html.indexFingerPointingDownImg
					}`;
				}
			},

			renderPlayer(
				gameState,
				oldGameState,
				options = {
					renderCondition: ['GAME_INIT', 'GAME_PLAYER_MOVE', 'GAME_OVER'].includes(gameState.updateType),
				}
			) {
				if (!options.renderCondition) {
					return;
				}
				Evader.view.utils.setElementPosition(elements.player, gameState.playerPosition);
			},

			renderEnemies(
				gameState,
				oldGameState,
				options = {
					renderCondition: ['GAME_INIT', 'GAME_LOOP_UPDATE', 'GAME_OVER'].includes(gameState.updateType),
				}
			) {
				if (!options.renderCondition) {
					return;
				}
				Evader.view.utils.setElementPositions(elements.enemies, gameState.enemyPositions);
			},

			renderGameComment(
				gameState,
				oldGameState,
				options = {
					renderCondition:
						['GAME_INIT', 'GAME_START', 'GAME_OVER'].includes(gameState.updateType) ||
						(gameState.updateType === 'VIEW_DARK_MODE_TOGGLE' && !gameState.startTime),
				}
			) {
				if (!options.renderCondition) {
					return;
				}

				const wallColor = gameState.isViewInDarkMode ? 'white' : 'black';
				const { radScore } = Evader.constants.game;

				if (
					gameState.updateType === 'GAME_INIT' ||
					(gameState.updateType === 'VIEW_DARK_MODE_TOGGLE' && !gameState.startTime)
				) {
					elements.gameComment.innerHTML = html.gameComment.beforeGameStart(wallColor);
				}

				if (gameState.updateType === 'GAME_START') {
					elements.gameComment.innerHTML = html.gameComment.atGameStart(radScore);
				}

				if (gameState.updateType === 'GAME_OVER') {
					const finalScore = gameState.finalScore[gameState.gameArea.descriptor];
					elements.gameComment.innerHTML = html.gameComment.atGameEnd(finalScore, radScore);
					logGameOverMessage(gameState.playerHasCollision, wallColor);
				}
			},

			renderDarkModeToggle(
				gameState,
				oldGameState,
				options = {
					renderCondition: ['GAME_INIT', 'VIEW_DARK_MODE_TOGGLE'].includes(gameState.updateType),
				}
			) {
				if (!options.renderCondition) {
					return;
				}
				const darkModeSwitchHtml = gameState.isViewInDarkMode ? html.cloudImg : html.sunBehindCloudImg;
				elements.darkModeSwitch.innerHTML = darkModeSwitchHtml;

				if (gameState.updateType === 'VIEW_DARK_MODE_TOGGLE') {
					document.body.classList.toggle('dark');
				}
			},

			renderCursor(
				gameState,
				oldGameState,
				options = {
					renderCondition: ['GAME_START', 'GAME_PLAYER_HOLD', 'GAME_PLAYER_RELEASE'].includes(
						gameState.updateType
					),
				}
			) {
				if (!options.renderCondition) {
					return;
				}
				document.documentElement.style.cursor =
					gameState.updateType === 'GAME_PLAYER_RELEASE' ? 'default' : 'none';
			},
		};

		const eventListeners = {
			register(target, event, listener, options = { removeListener: false, eventOptions: null }) {
				return options.removeListener
					? target.removeEventListener(event, listener)
					: target.addEventListener(event, listener, options.eventOptions);
			},

			toggleDarkMode(e) {
				e.preventDefault();
				Evader.game.toggleDarkMode();
			},

			handleHold(e) {
				e.preventDefault();
				if ((e.button !== undefined && e.button !== 0) || e.target.parentNode.id === 'dark-mode-switch') {
					// Ignore non-left clicks, and clicks on dark mode switch
					return;
				}

				Evader.game.holdPlayer(getEventCoordinates(e));

				const { register, handleMove, handleRelease } = eventListeners;
				events.move.forEach((event) =>
					register(document, event, handleMove, { eventOptions: { passive: false } })
				);
				events.release.forEach((event) =>
					register(document, event, handleRelease, { eventOptions: { passive: false } })
				);
			},

			handleMove(e) {
				e.preventDefault();
				Evader.game.movePlayer(getEventCoordinates(e));
			},

			handleRelease(e) {
				e.preventDefault();

				const { register, handleMove, handleRelease } = eventListeners;
				events.move.forEach((event) => register(document, event, handleMove, { removeListener: true }));
				events.release.forEach((event) => register(document, event, handleRelease, { removeListener: true }));

				Evader.game.releasePlayer(getEventCoordinates(e, { changedTouchEvent: true }));
			},
		};

		return {
			isGameAreaSmaller: () => window.matchMedia('( max-width: 768px )').matches,

			getGameAreaBorderWidth() {
				return getBorderWidth(elements.gameArea);
			},

			getGameAreaBoundingRect() {
				return getBoundingRect(elements.gameArea);
			},

			isPlayerAtBounds(gameArea) {
				return isElementAtBounds(elements.player, {
					boundAreaBorderWidth: gameArea.borderWidth,
					boundAreaBoundingRect: gameArea.boundingRect,
				});
			},

			isEnemyAtBounds(enemy, gameArea) {
				return isElementAtBounds(elements.enemies[enemy], {
					boundAreaBorderWidth: gameArea.borderWidth,
					boundAreaBoundingRect: gameArea.boundingRect,
				});
			},

			initView() {
				this.render(Evader.state.initGameState());
			},

			render(gameState, oldGameState) {
				for (const [_, renderer] of Object.entries(renderers)) {
					renderer(gameState);
				}
			},
		};
	})()
);
