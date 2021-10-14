Evader.extend(
	'initialiser',
	(function () {
		const splashMessageElement = document.getElementById('splash-message');
		const shouldInitWithLightMode =
			Evader.state.persistence.get('GAME_OPTIONS') &&
			!Evader.state.persistence.get('GAME_OPTIONS').darkModeIsEnabled;
		if (shouldInitWithLightMode) {
			document.body.classList.remove('dark');
		}
		const readyStateChangeListener = () => {
			if (document.readyState === 'interactive') {
				splashMessageElement.innerHTML = 'loading resources...';
			}
			if (document.readyState === 'complete') {
				splashMessageElement.innerHTML = 'loading audio...&nbsp;&nbsp;&nbsp;&nbsp;';
				document.removeEventListener('readystatechange', readyStateChangeListener);
			}
		};

		document.addEventListener('readystatechange', readyStateChangeListener);

		return {
			run: function () {
				if (window.matchMedia(Evader.config.entity.smallerGameArea.mediaQueryString).matches) {
					document.body.classList.add('smaller');
				} else {
					document.getElementById('game-area-size').classList.add('toggleable');
				}
				Evader.view.initView();

				setTimeout(() => {
					document.body.click();

					document.getElementById('game-title-splash').classList.add('no-display');
					document.body.classList.remove('loading');
					document.getElementById('game').classList.remove('no-display');

					Evader.audio.play('bgm');
				}, 1000);
			},
		};
	})()
);
