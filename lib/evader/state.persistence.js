Evader.extend(
	'state.persistence',
	(function () {
		const EVADER_STATE_STORE_PREFIX = 'EVADER_STATE_STORE_';

		return {
			get(key) {
				if (!window.localStorage) {
					return defaultValue;
				}

				let value = window.localStorage.getItem(`${EVADER_STATE_STORE_PREFIX}${key}`);

				try {
					value = JSON.parse(value);
				} catch (e) {
					if (console && console.warn) {
						console.warn(`'${key}' isn't valid JSON: ${value}`);
					}
				}

				return value;
			},

			set(key, value) {
				if (!window.localStorage) {
					return;
				}

				return window.localStorage.setItem(`${EVADER_STATE_STORE_PREFIX}${key}`, JSON.stringify(value));
			},

			remove(key) {
				if (!window.localStorage) {
					return;
				}

				return window.localStorage.removeItem(`${EVADER_STATE_STORE_PREFIX}${key}`);
			},
		};
	})()
);
