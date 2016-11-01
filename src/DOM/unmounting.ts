import {
	isNullOrUndef,
	isArray,
	isNull,
	isInvalid,
	isFunction,
	throwError,
	isObject
} from '../shared';
import { removeChild } from './utils';
import { componentToDOMNodeMap } from './rendering';
// import {
// 	poolOptVElement,
// 	poolVComponent,
// 	recyclingEnabled
// } from './recycling';
import { VNodeFlags } from '../core/shapes';

export function unmount(vNode, parentDom, lifecycle, canRecycle, shallowUnmount) {
	const flags = vNode.flags;

	switch (flags) {
		case VNodeFlags.ComponentClass:
		case VNodeFlags.ComponentFunction:
			unmountVComponent(vNode, parentDom, lifecycle, canRecycle, shallowUnmount);
			break;
		case VNodeFlags.HtmlElement:
		case VNodeFlags.SvgElement:
		case VNodeFlags.InputElement:
		case VNodeFlags.TextAreaElement:
			unmountVElement(vNode, parentDom, lifecycle, shallowUnmount);
			break;
		case VNodeFlags.Fragment:
			unmountVFragment(vNode, parentDom, true, lifecycle, shallowUnmount);
			break;
		case VNodeFlags.Text:
			unmountVText(vNode, parentDom);
			break;
		case VNodeFlags.Void:
			unmountVPlaceholder(vNode, parentDom);
			break;
		default:
			// TODO
	}
}

function unmountVPlaceholder(vPlaceholder, parentDom) {
	if (parentDom) {
		removeChild(parentDom, vPlaceholder.dom);
	}
}

function unmountVText(vText, parentDom) {
	if (parentDom) {
		removeChild(parentDom, vText.dom);
	}
}

export function unmountVFragment(vFragment, parentDom, removePointer, lifecycle, shallowUnmount) {
	const children = vFragment.children;
	const childrenLength = children.length;
	const pointer = vFragment.pointer;

	if (!shallowUnmount && childrenLength > 0) {
		for (let i = 0; i < childrenLength; i++) {
			const child = children[i];

			if (child.nodeType === FRAGMENT) {
				unmountVFragment(child, parentDom, true, lifecycle, false);
			} else {
				unmount(child, parentDom, lifecycle, false, shallowUnmount);
			}
		}
	}
	if (parentDom && removePointer) {
		removeChild(parentDom, pointer);
	}
}

export function unmountVComponent(vComponent, parentDom, lifecycle, canRecycle, shallowUnmount) {
	const instance = vComponent.instance;

	if (!shallowUnmount) {
		let instanceHooks = null;

		vComponent.unmounted = true;
		if (!isNullOrUndef(instance)) {
			const ref = vComponent.ref;

			if (ref) {
				ref(null);
			}
			instanceHooks = instance.hooks;
			if (instance.render !== undefined) {
				instance.componentWillUnmount();
				instance._unmounted = true;
				componentToDOMNodeMap.delete(instance);
				unmount(instance._lastInput, null, lifecycle, false, shallowUnmount);
			} else {
				unmount(instance, null, lifecycle, false, shallowUnmount);
			}
		}
		const hooks = vComponent.hooks || instanceHooks;

		if (!isNullOrUndef(hooks)) {
			if (!isNullOrUndef(hooks.onComponentWillUnmount)) {
				hooks.onComponentWillUnmount();
			}
		}
	}
	if (parentDom) {
		let lastInput = instance._lastInput;

		if (isNullOrUndef(lastInput)) {
			lastInput = instance;
		}
		if (lastInput.nodeType === FRAGMENT) {
			unmountVFragment(lastInput, parentDom, true, lifecycle, true);
		} else {
			removeChild(parentDom, vComponent.dom);
		}
	}
	if (recyclingEnabled && (parentDom || canRecycle)) {
		poolVComponent(vComponent);
	}
}

export function unmountVElement(vElement, parentDom, lifecycle, shallowUnmount) {
	const dom = vElement.dom;
	const ref = vElement.ref;

	if (!shallowUnmount) {
		if (ref) {
			unmountRef(ref);
		}
		const children = vElement.children;

		if (!isNullOrUndef(children)) {
			unmountChildren(children, lifecycle, shallowUnmount);
		}
	}
	if (parentDom) {
		removeChild(parentDom, dom);
	}
}

function unmountChildren(children, lifecycle, shallowUnmount) {
	if (isArray(children)) {
		for (let i = 0; i < children.length; i++) {
			const child = children[i];

			if (isObject(child)) {
				unmount(child, null, lifecycle, false, shallowUnmount);
			}
		}
	} else if (isObject(children)) {
		unmount(children, null, lifecycle, false, shallowUnmount);
	}
}

function unmountRef(ref) {
	if (isFunction(ref)) {
		ref(null);
	} else {
		if (isInvalid(ref)) {
			return;
		}
		if (process.env.NODE_ENV !== 'production') {
			throwError('string "refs" are not supported in Inferno 0.8+. Use callback "refs" instead.');
		}
		throwError();
	}
}
