Evader.extend(
	'audio',
	(function () {
		const howler = new Howl({
			src: ['assets/audio/audiosprite.webm', 'assets/audio/audiosprite.mp3'],
			sprite: {
				bgm: [0, 510374.6031746032, true],
				enemyWallCollision: [512000, 284.2857142857156],
				playerEnemyCollision: [514000, 989.5238095238028],
				playerWallCollision: [516000, 1875.6009070294795],
			},
		});

		const volumeValues = [0, 0.125, 0.25, 0.5];
		howler.volume(0.5);

		return {
			volumeValues,
			play(sound) {
				howler.play(sound);
			},
			setVolume(oldValue, newValue, fadeDuration = 500) {
				howler.fade(oldValue, newValue, fadeDuration);
			},
			pause(sound) {
				howler.pause(sound);
			},
		};
	})()
);
