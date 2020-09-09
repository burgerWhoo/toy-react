const RENDER_TO_DOM = Symbol("render to dom");

export class Component {
    constructor() {
        this.props = Object.create(null);
        this.children = [];
        this._root = null;
        this._range = null;
    }

    setAttribute(name, value) {
        this.props[name] = value;
    }

    appendChild(component) {
        this.children.push(component);
    }

    get vdom() {
        return this.render().vdom;
    }

    [RENDER_TO_DOM](range) {
        this._range = range;
        this._vdom = this.vdom;
        this._vdom[RENDER_TO_DOM](range);
    }

    update() {
        let isSameNode = (oldNode, newNode) => {
            if (oldNode.type !== newNode.type) {
                return false;
            }

            for (const name in newNode.props) {
                const element = newNode.props[name];
                if (oldNode.props[name] !== element) {
                    return false;
                }
            }

            if (Object.keys(oldNode.props).length > Object.keys(newNode.props).length)
                return false;

            if (newNode.type === "#text") {
                if (newNode.content !== oldNode.content) return false;
            }

            return true;
        };

        let update = (oldNode, newNode) => {
            // element vdom需要具备的属性  type  props  children
            // text 还有content属性
            if (!isSameNode(oldNode, newNode)) {
                newNode[RENDER_TO_DOM](oldNode._range);
                return;
            }
            newNode._range = oldNode._range;

            let newChildren = newNode.vchildren;
            let oldChildren = oldNode.vchildren;

            if (!newChildren || !newChildren.length) {
                return;
            }

            let tailRange = oldChildren[oldChildren.length - 1]._range;

            for (let i = 0; i < newChildren.length; i++) {
                const newChild = newChildren[i];
                const oldChild = oldChildren[i];
                if (i < oldChildren.length) {
                    update(oldChild, newChild);
                } else {
                    let range = document.createRange();
                    range.setStart(tailRange.endContainer, tailRange.endOffset);
                    range.setEnd(tailRange.endContainer, tailRange.endOffset);
                    newChild[RENDER_TO_DOM](range);
                    tailRange = range;
                }
            }
        };

        let vdom = this.vdom;
        update(this._vdom, vdom);
        this._vdom = vdom;
    }

    setState(newState) {
        if (this.state === null || typeof this.state !== "object") {
            this.state = newState;
            return;
        }
        let merge = (oldState, newState) => {
            for (const key in newState) {
                const element = newState[key];
                if (oldState[key] === null || typeof oldState[key] !== "object") {
                    oldState[key] = element;
                } else {
                    merge(oldState[key], element);
                }
            }
        };
        merge(this.state, newState);
        this.update();
    }
}
class ElementWarpper extends Component {
    constructor(type) {
        super(type);
        this.type = type;
    }

    get vdom() {
        this.vchildren = this.children.map((child) => child.vdom);
        return this;
    }

    [RENDER_TO_DOM](range) {
        this._range = range;
        let root = document.createElement(this.type);

        for (const name in this.props) {
            const value = this.props[name];
            if (name.match(/^on([\s\S]+)$/)) {
                root.addEventListener(
                    RegExp.$1.replace(/^([\s\S])/, (i) => i.toLowerCase()),
                    value
                );
            } else {
                if (name === "className") {
                    root.setAttribute("class", value);
                } else {
                    root.setAttribute(name, value);
                }
            }
        }

        if (!this.vchildren) {
            this.vchildren = this.children.map((child) => child.vdom);
        }

        for (const child of this.vchildren) {
            let childRange = document.createRange();
            childRange.setStart(root, root.childNodes.length);
            childRange.setEnd(root, root.childNodes.length);
            child[RENDER_TO_DOM](childRange);
        }

        replaceContent(range, root);
    }
}

function replaceContent(range, node) {
    range.insertNode(node);
    range.setStartAfter(node);
    range.deleteContents();

    range.setStartBefore(node);
    range.setEndAfter(node);
}

class TextWarpper extends Component {
    constructor(content) {
        super(content);
        this.type = "#text";
        this.content = content;
    }

    get vdom() {
        return this;
    }

    [RENDER_TO_DOM](range) {
        this._range = range;

        const root = document.createTextNode(this.content);
        replaceContent(range, root);
    }
}

export function createElement(type, attributes, ...children) {
    let e;
    if (typeof type === "string") {
        e = new ElementWarpper(type);
    } else {
        e = new type();
    }
    for (const p in attributes) {
        e.setAttribute(p, attributes[p]);
    }

    let insertChild = (children) => {
        for (const iterator of children) {
            if (typeof iterator === "string" || typeof iterator === "number") {
                iterator = new TextWarpper(iterator);
            }
            if (iterator === null) {
                continue;
            }
            if (typeof iterator === "object" && iterator instanceof Array) {
                insertChild(iterator);
            } else {
                e.appendChild(iterator);
            }
        }
    };
    insertChild(children);

    return e;
}

export function render(component, parentElement) {
    let range = document.createRange();
    range.setStart(parentElement, 0);
    range.setEnd(parentElement, parentElement.childNodes.length);
    range.deleteContents();
    component[RENDER_TO_DOM](range);
}