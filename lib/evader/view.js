Evader.extend(
	'view',
	(function () {
		const { getImgHtml, getEventCoordinates } = Evader.view.utils;
		const {
			emoji: {
				victoryHand,
				firstPlaceMedal,
				indexFingerPointingDown,
				cloud,
				sunBehindCloud,
				beamingFace,
				starStruck,
			},
		} = Evader.constants;

		const html = {
			firstPlaceMedalImg: getImgHtml(firstPlaceMedal),
			victoryHandImg: getImgHtml(victoryHand),
			indexFingerPointingDownImg: getImgHtml(indexFingerPointingDown),
			cloudImg: getImgHtml(cloud),
			sunBehindCloudImg: getImgHtml(sunBehindCloud),
			beamingFaceImg: getImgHtml(beamingFace),
			starStruckImg: getImgHtml(starStruck),
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
					Evader.constants.events.hold.forEach((event) =>
						eventListeners.register(document, event, eventListeners.handleHold, {
							eventOptions: { passive: false },
						})
					);
				}
				if (gameState.updateType === 'GAME_OVER') {
					Evader.constants.events.hold.forEach((event) =>
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

				const { finalScore, bestScore } = gameState;

				if (['GAME_INIT', 'GAME_OVER'].includes(gameState.updateType)) {
					elements.meta.bestScore.innerHTML = bestScore ? `${html.firstPlaceMedalImg} · ${bestScore}` : '';
					elements.meta.currentScore.innerHTML = finalScore
						? `${finalScore} · ${html.victoryHandImg}`
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

				if (
					gameState.updateType === 'GAME_INIT' ||
					(gameState.updateType === 'VIEW_DARK_MODE_TOGGLE' && !gameState.startTime)
				) {
					elements.gameComment.innerHTML = `
						<br>Hey there, Player!
						<br>
						<br>Move the red square to start the game. 
						<br>Evade the blues, and avoid the ${wallColor}s.
					`;
				}

				if (gameState.updateType === 'GAME_START') {
					elements.gameComment.innerHTML = `
						<br>Can you survive ${gameState.constants.radScore} seconds?
						<br>That... would be super rad, Player!
						<!--<br>
						<br>P.S.: The speed maxes out at ~25 seconds.-->
					`;
				}

				if (gameState.updateType === 'GAME_OVER') {
					elements.gameComment.innerHTML = `
						<br>You've survived for ${gameState.finalScore} seconds.
						<br>${
							gameState.finalScore >= gameState.constants.radScore
								? 'WOW, Player! You. Are. Awesome. ' + html.starStruckImg
								: 'Not too shabby, Player! ' + html.beamingFaceImg
						}
						<br>
						<br><button class='game-play-again-btn' onclick='Evader.view.initView()'>Play again?</button>
					`;

					const collisionMessage = gameState.playerHasCollision.withWall
						? `electrocuted as you came into contact with the ${wallColor} wall`
						: `captured by the enemy (${gameState.playerHasCollision.withEnemy.split('enemy').join('#')})`;
					console.log(`You've been ${collisionMessage}.`);
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
					: target.addEventListener(event, listener, eventOptions);
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
				Evader.constants.events.move.forEach((event) =>
					register(document, event, handleMove, { eventOptions: { passive: false } })
				);
				Evader.constants.events.release.forEach((event) =>
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
				Evader.constants.events.move.forEach((event) =>
					register(document, event, handleMove, { removeListener: true })
				);
				Evader.constants.events.release.forEach((event) =>
					register(document, event, handleRelease, { removeListener: true })
				);

				Evader.game.releasePlayer(getEventCoordinates(e, { changedTouchEvent: true }));
			},
		};

		return {
			elements,

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
