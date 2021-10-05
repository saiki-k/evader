Evader.extend(
	'audio',
	(function () {
		const howler = new Howl({
			src: ['assets/audio/audiosprite.webm', 'assets/audio/audiosprite.mp3'],
			/* NOTE
			 **
			 ** The 'sprite.bgm' array below, must always have a third element set to 'true'...
			 ** ...this boolean indicates the 'loop' attribute of the sprite.
			 **
			 ** Do NOT forget to update sprite.bgm when the following sprite map is updated.
			 */
			sprite: {
				bgm: [0, 510374.6031746032, true],
				bronze: [512000, 574.6938775509989],
				clearStatsTone: [514000, 754.8979591837224],
				enemyWallCollision: [516000, 284.2857142857156],
				extraordinaire: [518000, 1018.7755102041365],
				gameOver: [521000, 1410.6122448979477],
				gameStartTone: [524000, 3995.5555555555975],
				gold: [529000, 470.2040816326871],
				optionSelect: [531000, 31.81405895691114],
				optionToggle: [533000, 73.33333333338032],
				playerEnemyCollision: [535000, 989.5238095238028],
				playerWallCollision: [537000, 1875.6009070294795],
				silver: [540000, 626.9387755102116],
				superb: [542000, 679.1836734694243],
			},
		});

		const volumeValues = [0, 0.125, 0.25, 0.5];
		const delayValues = {
			FADE_DURATION: 500,
		};

		howler.once('load', function () {
			// Set initial volume...
			howler.volume(volumeValues[Evader.state.getGameState().misc.gameOptions.volume ?? 3]);

			// Initialise the game, after all assets are loaded...
			Evader.initialiser.run();
		});

		return {
			totalVolumeValues: volumeValues.length,
			play(sound) {
				if (sound === 'bgm' || Evader.state.getGameState().misc.gameOptions.volume) {
					howler.play(sound);
				}
			},
			setVolume(oldValueIndex, newValueIndex, fadeDuration = delayValues.FADE_DURATION) {
				if (newValueIndex === volumeValues.length - 1) {
					return howler.volume(volumeValues[newValueIndex]);
				}
				howler.fade(volumeValues[oldValueIndex], volumeValues[newValueIndex], fadeDuration);
			},
			pause(sound) {
				howler.pause(sound);
			},
			isPlaying() {
				howler.playing();
			},
		};
	})()
);
