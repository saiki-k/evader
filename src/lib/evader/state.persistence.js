Evader.extend(
	'state.persistence',
	(function () {
		const STORE_PREFIX = 'EVADER_STATE_STORE_';

		return {
			get(key, defaultValue = null) {
				if (!window.localStorage) {
					return defaultValue;
				}

				let value = window.localStorage.getItem(`${STORE_PREFIX}${key}`);

				if (!value) {
					return defaultValue;
				}

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

				return window.localStorage.setItem(`${STORE_PREFIX}${key}`, JSON.stringify(value));
			},

			remove(key) {
				if (!window.localStorage) {
					return;
				}

				return window.localStorage.removeItem(`${STORE_PREFIX}${key}`);
			},
		};
	})()
);
