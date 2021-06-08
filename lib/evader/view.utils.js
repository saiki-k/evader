Evader.extend('view.utils', {
	setElementPosition: (element, position) => {
		element.style.left = `${position.x}px`;
		element.style.top = `${position.y}px`;
	},
	setElementPositions: (elementObj, elementPositions) => {
		for ([elementId, elementPosition] of Object.entries(elementPositions)) {
			Evader.view.utils.setElementPosition(elementObj[elementId], elementPosition);
		}
	},
	getImgHtml: (imjObj, className) =>
		`<img alt=${imjObj.alt} class=${imjObj.className || className} src=${imjObj.src}>`,

	isSmallerGameArea: () => window.matchMedia('( max-width: 768px )').matches,

	getBoundingRect: (element) => element.getBoundingClientRect(),
	getBorderWidth: (element) => parseInt(getComputedStyle(element).borderWidth),

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
});
