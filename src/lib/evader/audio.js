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
				enemyWallCollision: [514000, 284.2857142857156],
				extraordinaire: [516000, 1018.7755102041365],
				gameOptionClearStats: [519000, 754.8979591837224],
				gameOptionDarkModeToggle: [521000, 73.33333333338032],
				gameOptionDeselect: [523000, 589.2970521541656],
				gameOptionMeditationMode: [525000, 3995.5555555555975],
				gameOptionPlay: [530000, 3995.5555555555975],
				gameOptionRandomiserOff: [535000, 625.0113378685],
				gameOptionRandomiserOn: [537000, 625.0113378685],
				gameOptionSelect: [539000, 732.1541950113897],
				gameOptionSprintMode: [541000, 3598.2086167800844],
				gameOptionVolumeToggle: [546000, 220.34013605446034],
				gameOver: [548000, 1410.6122448979477],
				gold: [551000, 470.2040816326871],
				playerEnemyCollision: [553000, 989.5238095238028],
				playerWallCollision: [555000, 1875.6009070294795],
				silver: [558000, 626.9387755102116],
				superb: [560000, 679.1836734694243],
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
