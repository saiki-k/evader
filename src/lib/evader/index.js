const Evader = {};

Evader.namespace = function (moduleName) {
	let moduleRoot = Evader;
	let moduleParts = moduleName.split('.');

	// strip redundant / leading global, if any...
	moduleParts = moduleParts[0] === 'Evader' ? moduleParts.slice(1) : moduleParts;

	for (let i = 0, noOfParts = moduleParts.length; i < noOfParts; i++) {
		if (typeof moduleRoot[moduleParts[i]] === 'undefined') {
			moduleRoot[moduleParts[i]] = {};
		}
		moduleRoot = moduleRoot[moduleParts[i]];
	}
	return moduleRoot;
};

Evader.extend = function (moduleName, extension) {
	const module = Evader.namespace(moduleName);
	Object.assign(module, extension);
};
