window.onload = (event) => {
	setTimeout(() => {
		document.getElementById('game-title-splash').classList.add('no-display');
		document.getElementById('game').classList.remove('no-display');

		Evader.view.initView();
	}, 1000);
};
