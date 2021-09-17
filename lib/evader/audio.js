Evader.extend(
	'audio',
	(function () {
		const howler = new Howl({
			src: ['assets/audio/audiosprite.webm', 'assets/audio/audiosprite.mp3'],
			sprite: {
				bgm: [0, 510374.6031746032, true],
				enemyWallCollision: [514000, 284.2857142857156],
				playerEnemyCollision: [524000, 989.5238095238028],
				playerWallCollision: [526000, 1875.6009070294795],
				bronze: [512000, 574.6938775509989],
				silver: [529000, 626.9387755102116],
				gold: [522000, 470.2040816326871],
				gameOver: [519000, 1410.6122448979477],
				superb: [531000, 679.1836734694243],
				extraordinaire: [516000, 1018.7755102041365],
			},
		});

		const volumeValues = [0, 0.125, 0.25, 0.5];

		howler.once('load', function () {
			// Set initial volume...
			howler.volume(volumeValues[Evader.state.getGameState().misc.gameOptions.volume ?? 3]);
			Evader.initialiser.run();
		});

		return {
			totalVolumeValues: volumeValues.length,
			play(sound) {
				if (sound === 'bgm' || Evader.state.getGameState().misc.gameOptions.volume) {
					howler.play(sound);
				}
			},
			setVolume(oldValueIndex, newValueIndex, fadeDuration = 500) {
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
