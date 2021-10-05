Evader.extend('utils', {
	general: {
		shuffleArray(array) {
			const copy = [...array];
			let elementsLeftToShuffle = copy.length,
				temp,
				randomIdx;
			while (elementsLeftToShuffle) {
				randomIdx = Math.floor(Math.random() * elementsLeftToShuffle--);
				temp = copy[elementsLeftToShuffle];
				copy[elementsLeftToShuffle] = copy[randomIdx];
				copy[randomIdx] = temp;
			}
			return copy;
		},
		deepClone(obj, cloneMap = new Map()) {
			const { deepClone } = Evader.utils.general;

			// Ensure objects with circular references are properly cloned...
			// cloneMap avoids endless recursion in case of circular references
			const seen = cloneMap.get(obj);
			if (seen) return seen;

			if (!obj || typeof obj !== 'object') {
				return obj;
			}

			if (Array.isArray(obj)) {
				return obj.map((e) => deepClone(e, cloneMap));
			}

			if (obj instanceof Date) {
				return new Date(obj.valueOf());
			}

			const objClone = {};
			cloneMap.set(obj, objClone);

			// Ensure that the values of all properties ...are deeply cloned
			// ...along with a shallow clone of their descriptors
			const propertyDescriptors = Object.getOwnPropertyDescriptors(obj);
			for (const prop in propertyDescriptors) {
				Object.defineProperty(objClone, prop, {
					...propertyDescriptors[prop],
					value: deepClone(propertyDescriptors[prop].value, cloneMap),
				});
			}

			// Ensure that the cloned object inherits from the same prototype chain...
			// ...as that of the original object
			objClone.__proto__ = obj.__proto__;

			return objClone;
		},
	},
	view: {
		setElementPosition(element, position) {
			element.style.left = `${position.x}px`;
			element.style.top = `${position.y}px`;
		},
		setElementPositions(idElementMap, elementInfoMap) {
			for ([elementId, { position: elementPosition }] of Object.entries(elementInfoMap)) {
				Evader.utils.view.setElementPosition(idElementMap[elementId], elementPosition);
			}
		},

		getBoundingRect(element) {
			const { bottom, height, left, right, top, width, x, y } = element.getBoundingClientRect();
			return { bottom, height, left, right, top, width, x, y };
		},
		getBorderWidth(element) {
			return parseInt(getComputedStyle(element).getPropertyValue('border-left-width'));
		},

		isElementAtBounds(element, { boundAreaBoundingRect, boundAreaBorderWidth }) {
			const elementBoundingRect = element.getBoundingClientRect();
			return {
				x:
					elementBoundingRect.right > boundAreaBoundingRect.right - boundAreaBorderWidth ||
					elementBoundingRect.left < boundAreaBoundingRect.left + boundAreaBorderWidth,
				y:
					elementBoundingRect.bottom > boundAreaBoundingRect.bottom - boundAreaBorderWidth ||
					elementBoundingRect.top < boundAreaBoundingRect.top + boundAreaBorderWidth,
			};
		},

		getEventCoordinates(e, options = { changedTouchEvent: false }) {
			let eventObject = e;
			if (e.touches || e.changedTouches) {
				[eventObject] = options.changedTouchEvent ? e.changedTouches : e.touches;
			}
			return { x: eventObject.pageX, y: eventObject.pageY };
		},
	},
	game: {
		getMedalType(gameMode, finalScore) {
			const { medalScoreMap } = Evader.config.game[gameMode];

			const medalTypes = Object.keys(medalScoreMap).sort(
				(typeA, typeB) => medalScoreMap[typeB] - medalScoreMap[typeA]
			);
			const medalIndex = medalTypes.findIndex((medalType) => finalScore > medalScoreMap[medalType]);
			const medalType = medalTypes[medalIndex];

			return medalType;
		},
	},
});
