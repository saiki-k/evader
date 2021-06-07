function deepClone(obj, cloneMap = new Map()) {
	// Ensure objects with circular references are properly cloned
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
}
