Evader.extend(
	'initialiser',
	(function () {
		const splashMessageElement = document.getElementById('splash-message');

		const readyStateChangeListener = () => {
			if (document.readyState === 'interactive') {
				splashMessageElement.innerHTML = 'loading resources...';
			}
			if (document.readyState === 'complete') {
				splashMessageElement.innerHTML = 'loading audio...';
				document.removeEventListener('readystatechange', readyStateChangeListener);
			}
		};

		document.addEventListener('readystatechange', readyStateChangeListener);

		return {
			run: function () {
				if (window.matchMedia('(max-width: 600px), (max-height: 600px)').matches) {
					document.body.classList.add('smaller');
				} else {
					document.getElementById('game-area-size').classList.add('toggleable');
				}
				Evader.view.initView();

				setTimeout(() => {
					document.getElementById('game-title-splash').classList.add('no-display');
					document.body.classList.remove('loading');
					document.getElementById('game').classList.remove('no-display');
				}, 1000);
			},
		};
	})()
);
