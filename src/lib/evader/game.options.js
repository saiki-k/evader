Evader.extend(
	'game.options',
	(function () {
		return {
			toggleDarkMode() {
				const {
					misc: {
						gameOptions: { darkModeIsEnabled },
					},
				} = Evader.state.getGameState();
				Evader.state.updateGameState([
					{ statePath: 'misc.gameOptions.darkModeIsEnabled', newState: !darkModeIsEnabled },
					{ statePath: 'updateType', newState: 'OPTIONS_DARK_MODE_TOGGLE' },
				]);
				Evader.audio.play('gameOptionDarkModeToggle');
			},
			changeGameMode() {
				const {
					misc: {
						gameOptions: { gameMode },
					},
				} = Evader.state.getGameState();
				const newGameMode = gameMode === 'sprint' ? 'meditation' : 'sprint';
				Evader.state.updateGameState([
					{ statePath: 'misc.gameOptions.gameMode', newState: newGameMode },
					{ statePath: 'updateType', newState: 'OPTIONS_GAME_MODE_CHANGE' },
				]);
				const audioSpriteKey = `gameOption${newGameMode === 'sprint' ? 'SprintMode' : 'MeditationMode'}`;
				Evader.audio.play(audioSpriteKey);
			},
			toggleRandomiser() {
				const {
					misc: {
						gameOptions: { randomiserEnabledOn },
					},
				} = Evader.state.getGameState();
				const newRandomiserState = Object.entries(randomiserEnabledOn).reduce((acc, curr) => {
					const [key, value] = curr;
					acc[key] = !value;
					return acc;
				}, {});
				Evader.state.updateGameState([
					{ statePath: 'misc.gameOptions.randomiserEnabledOn', newState: newRandomiserState },
					{ statePath: 'updateType', newState: 'OPTIONS_GAME_RANDOMISER_TOGGLE' },
				]);
				const randomiserIsAbsolutelyEnabled = !Object.values(newRandomiserState).some((v) => !v);
				Evader.audio.play(`gameOptionRandomiser${randomiserIsAbsolutelyEnabled ? 'On' : 'Off'}`);
			},
			clearPlayerStats() {
				Evader.state.updateGameState([{ statePath: 'updateType', newState: 'OPTIONS_CLEAR_PLAYER_STATS' }]);
				Evader.audio.play('gameOptionClearStats');
			},
			toggleGodMode() {
				const {
					game,
					misc: {
						gameOptions: { godMode },
					},
				} = Evader.state.getGameState();

				Evader.state.updateGameState([
					{
						statePath: 'misc.gameOptions.godMode.wasToggled',
						newState: !godMode.isActive || game.isInProgress,
					},
					{ statePath: 'misc.gameOptions.godMode.isActive', newState: !godMode.isActive },
					{ statePath: 'updateType', newState: 'OPTIONS_GOD_MODE_TOGGLE' },
				]);
			},

			toggleVolume() {
				const { totalVolumeValues, setVolume } = Evader.audio;

				const oldVolumeIndex = Evader.state.getGameState().misc.gameOptions.volume;
				const newVolumeIndex = (totalVolumeValues + oldVolumeIndex - 1) % totalVolumeValues;

				setVolume(oldVolumeIndex, newVolumeIndex);
				Evader.state.updateGameState([
					{ statePath: 'misc.gameOptions.volume', newState: newVolumeIndex },
					{ statePath: 'updateType', newState: 'OPTIONS_VOLUME_TOGGLE' },
				]);
				Evader.audio.play('gameOptionVolumeToggle');
			},
		};
	})()
);
